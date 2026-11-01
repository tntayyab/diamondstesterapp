import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";

import { AuthGate } from "@/components/AuthGate";
import { useCreditGate } from "@/components/CreditGate";
import { HouseInterstitialModal } from "@/components/HouseInterstitialModal";
import { Confetti, ReactionEmoji, type Mood } from "@/components/QuizAnimations";
import { presentInterstitial } from "@/lib/ads";
import { Button, Card, Screen, ThemedText } from "@/components/ui";
import { buildQuiz } from "@/content/reference";
import { useAuth } from "@/lib/auth";
import { QUIZ_COST, spendCredits } from "@/lib/credits";
import { success, tap, warn } from "@/lib/feedback";
import { recordQuiz, saveQuizAttempt } from "@/lib/storage";
import { radius, spacing, useTheme } from "@/theme";

const QUESTION_COUNT = 8;

type Phase = "playing" | "reveal" | "result";

export default function QuizScreen() {
  return (
    <AuthGate
      title="Sign in to take the quiz"
      body="The 4Cs & diamond quiz records your best score and counts toward your achievements, so it needs an account."
    >
      <Quiz />
    </AuthGate>
  );
}

function Quiz() {
  const { colors } = useTheme();
  const router = useRouter();
  const creditGate = useCreditGate();
  const { refreshProfile } = useAuth();

  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000) + 1);
  const questions = useMemo(() => buildQuiz(QUESTION_COUNT, seed), [seed]);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [attemptName, setAttemptName] = useState("");
  const [saved, setSaved] = useState(false);
  // The quiz costs credits; `ready` gates play until the charge succeeds.
  const [ready, setReady] = useState(false);
  const [houseAdVisible, setHouseAdVisible] = useState(false);
  const payRef = useRef<() => void>(() => {});
  const interstitialShownRef = useRef(false);

  const question = questions[index];
  const gotItRight = picked !== null && picked === question.answerIndex;

  const answer = useCallback(
    (choice: number) => {
      if (picked !== null) return;
      setPicked(choice);
      if (choice === question.answerIndex) {
        setCorrect((value) => value + 1);
        success();
      } else {
        warn();
      }
    },
    [picked, question],
  );

  const next = useCallback(async () => {
    if (index + 1 >= questions.length) {
      await recordQuiz(correct, questions.length);
      setPhase("reveal");
      return;
    }
    setIndex((value) => value + 1);
    setPicked(null);
  }, [index, questions.length, correct]);

  const startFresh = useCallback(() => {
    setSeed(Math.floor(Math.random() * 100000) + 1);
    setIndex(0);
    setPicked(null);
    setCorrect(0);
    setPhase("playing");
    setAttemptName("");
    setSaved(false);
  }, []);

  // Charge the quiz cost, then start a fresh round. Falls open when Supabase or
  // the spend RPC isn't available, so the quiz never breaks.
  const payAndStart = useCallback(async () => {
    const res = await spendCredits(QUIZ_COST);
    if (!res.ok) {
      creditGate.showOutOfCredits({
        message: `The diamond quiz costs ${QUIZ_COST} credits per attempt. Watch a short ad to earn some.`,
        onCredited: () => payRef.current(),
      });
      return;
    }
    await refreshProfile();
    startFresh();
    setReady(true);
  }, [creditGate, refreshProfile, startFresh]);
  payRef.current = payAndStart;

  // Charge + start once when the quiz opens.
  useEffect(() => {
    void payAndStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restart = useCallback(() => {
    tap();
    setReady(false);
    void payAndStart();
  }, [payAndStart]);

  const goHome = useCallback(() => {
    tap();
    router.replace("/");
  }, [router]);

  const saveResult = useCallback(async () => {
    tap();
    const name = attemptName.trim() || `Attempt · ${new Date().toLocaleDateString()}`;
    await saveQuizAttempt({ name, correct, total: questions.length });
    success();
    setSaved(true);
  }, [attemptName, correct, questions.length]);

  const ratio = correct / questions.length;
  const perfect = correct === questions.length;
  const tier: Mood = ratio >= 0.75 ? "happy" : ratio >= 0.4 ? "medium" : "sad";

  // --- Not ready: charging credits (or waiting on the out-of-credits gate) -----
  if (!ready) {
    return (
      <Screen scroll>
        <Card style={{ alignItems: "center", gap: spacing.md, marginTop: spacing.xxl, paddingVertical: spacing.xxl }}>
          <ActivityIndicator color={colors.tint} />
          <ThemedText variant="body" muted>
            Starting quiz…
          </ThemedText>
          <ThemedText variant="caption" muted style={{ textAlign: "center", maxWidth: 260 }}>
            The quiz costs {QUIZ_COST} credits per attempt.
          </ThemedText>
        </Card>
        <Pressable
          onPress={() => {
            tap();
            router.back();
          }}
          style={styles.linkBtn}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={16} color={colors.textMuted} />
          <ThemedText variant="body" color={colors.textMuted} style={{ fontWeight: "600" }}>
            Go back
          </ThemedText>
        </Pressable>
      </Screen>
    );
  }

  // --- Reveal: a short suspense screen before the score is shown ---------------
  if (phase === "reveal") {
    return (
      <Screen scroll>
        <Card style={styles.centerCard}>
          <ReactionEmoji mood="medium" emoji="💎" size={64} />
          <ThemedText variant="heading" style={{ textAlign: "center" }}>
            Quiz complete!
          </ThemedText>
          <ThemedText variant="caption" muted style={styles.blurb}>
            You answered all {questions.length} questions. Ready to see how you did?
          </ThemedText>
        </Card>

        <Button
          label="See my result"
          icon="eye"
          onPress={() => {
            tap();
            success();
            // Interstitial at this natural break (quiz just finished), frequency-capped.
            if (!interstitialShownRef.current) {
              interstitialShownRef.current = true;
              presentInterstitial(() => setHouseAdVisible(true));
            }
            setPhase("result");
          }}
          style={{ marginTop: spacing.xl }}
        />
      </Screen>
    );
  }

  // --- Result: score with a mood-matched animation ----------------------------
  if (phase === "result") {
    const title = perfect
      ? "Flawless — you're a gemologist!"
      : tier === "happy"
        ? "Excellent eye for detail!"
        : tier === "medium"
          ? "Not bad — you're getting there!"
          : "Keep practising";

    return (
      <Screen scroll>
        {tier === "happy" ? <Confetti /> : null}

        <Card style={[styles.centerCard, { marginTop: spacing.xl }]}>
          <ReactionEmoji mood={tier} emoji={perfect ? "🏆" : undefined} size={78} />
          <ThemedText variant="display" color={colors.tint}>
            {correct}/{questions.length}
          </ThemedText>
          <ThemedText variant="heading" style={{ textAlign: "center" }}>
            {title}
          </ThemedText>
          <ThemedText variant="caption" muted style={styles.blurb}>
            {tier === "sad"
              ? "Don't worry — every question is drawn from real 4Cs, glossary and simulant knowledge. Give it another go!"
              : "Every question is drawn from real 4Cs, glossary and simulant knowledge."}
          </ThemedText>
        </Card>

        {/* Save this attempt to the leaderboard under a name of your choice. */}
        {saved ? (
          <Card style={{ marginTop: spacing.lg, alignItems: "center", gap: spacing.sm }}>
            <ThemedText variant="body" color={colors.tint} style={{ fontWeight: "700" }}>
              Saved to leaderboard ✓
            </ThemedText>
            <Pressable onPress={() => router.push("/quiz-history")} hitSlop={8}>
              <ThemedText variant="caption" color={colors.tint} style={{ fontWeight: "700" }}>
                View leaderboard →
              </ThemedText>
            </Pressable>
          </Card>
        ) : (
          <Card style={{ marginTop: spacing.lg }}>
            <ThemedText variant="label" muted>
              Save this result
            </ThemedText>
            <TextInput
              value={attemptName}
              onChangeText={setAttemptName}
              placeholder="Name this attempt (e.g. Morning try)"
              placeholderTextColor={colors.textFaint}
              maxLength={40}
              style={[styles.nameInput, { backgroundColor: colors.background, borderColor: colors.cardBorder, color: colors.text }]}
            />
            <Button label="Save to leaderboard" icon="award" onPress={saveResult} style={{ marginTop: spacing.md }} />
          </Card>
        )}

        <Button label="Play again" icon="refresh-cw" onPress={restart} style={{ marginTop: spacing.lg }} />

        <View style={styles.resultLinks}>
          <Pressable onPress={goHome} style={styles.linkBtn} hitSlop={8}>
            <Feather name="home" size={16} color={colors.textMuted} />
            <ThemedText variant="body" color={colors.textMuted} style={{ fontWeight: "600" }}>
              Go home
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push("/quiz-history")} style={styles.linkBtn} hitSlop={8}>
            <Feather name="award" size={16} color={colors.textMuted} />
            <ThemedText variant="body" color={colors.textMuted} style={{ fontWeight: "600" }}>
              Leaderboard
            </ThemedText>
          </Pressable>
        </View>

        <HouseInterstitialModal visible={houseAdVisible} onClose={() => setHouseAdVisible(false)} />
      </Screen>
    );
  }

  // --- Playing ----------------------------------------------------------------
  return (
    <Screen scroll>
      {/* Confetti rains over the question when the pick is correct. */}
      {gotItRight ? <Confetti key={`confetti-${index}`} count={20} /> : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <ThemedText variant="label" muted>
          Question {index + 1} of {questions.length}
        </ThemedText>
        <View style={{ flex: 1 }} />
        <ThemedText variant="label" color={colors.tint}>
          {correct} correct
        </ThemedText>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.card }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: colors.tint, width: `${((index + 1) / questions.length) * 100}%` },
          ]}
        />
      </View>

      <Card style={{ marginTop: spacing.xl }}>
        <ThemedText variant="label" muted>
          Diamond knowledge
        </ThemedText>
        <ThemedText variant="heading" style={{ marginTop: spacing.sm }}>
          {question.prompt}
        </ThemedText>
      </Card>

      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        {question.options.map((option, choice) => {
          const isAnswer = choice === question.answerIndex;
          const isPicked = choice === picked;
          const revealed = picked !== null;

          const borderColor =
            revealed && isAnswer ? colors.tint : revealed && isPicked ? colors.danger : colors.cardBorder;

          return (
            <Pressable
              key={option}
              onPress={() => {
                tap();
                answer(choice);
              }}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: colors.card, borderColor, opacity: pressed && !revealed ? 0.75 : 1 },
              ]}
            >
              <ThemedText variant="body" style={{ flex: 1 }}>
                {option}
              </ThemedText>
              {revealed && isAnswer ? <Feather name="check" size={18} color={colors.tint} /> : null}
              {revealed && isPicked && !isAnswer ? <Feather name="x" size={18} color={colors.danger} /> : null}
            </Pressable>
          );
        })}
      </View>

      {picked !== null ? (
        <>
          <Card style={{ marginTop: spacing.xl }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <ReactionEmoji
                mood={gotItRight ? "happy" : "sad"}
                emoji={gotItRight ? "🎉" : "😢"}
                size={34}
                loop={false}
              />
              <View style={{ flex: 1 }}>
                <ThemedText variant="label" color={gotItRight ? colors.tint : colors.danger}>
                  {gotItRight ? "Correct!" : "Not quite"}
                </ThemedText>
                <ThemedText variant="caption" style={{ marginTop: 4 }}>
                  {question.explanation}
                </ThemedText>
              </View>
            </View>
          </Card>

          <Button
            label={index + 1 >= questions.length ? "Finish quiz" : "Next question"}
            icon="arrow-right"
            onPress={next}
            style={{ marginTop: spacing.lg }}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 5, borderRadius: radius.pill, marginTop: spacing.md, overflow: "hidden" },
  progressFill: { height: 5, borderRadius: radius.pill },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  centerCard: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl, marginTop: spacing.xxl },
  blurb: { textAlign: "center", maxWidth: 280 },
  nameInput: {
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
  },
  resultLinks: { flexDirection: "row", justifyContent: "center", gap: spacing.xl, marginTop: spacing.md },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
});
