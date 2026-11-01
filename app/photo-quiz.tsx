import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { HouseInterstitialModal } from "@/components/HouseInterstitialModal";
import { Confetti, ReactionEmoji, type Mood } from "@/components/QuizAnimations";
import { ScreenHero } from "@/components/ScreenHero";
import { Button, Card, Screen, ThemedText } from "@/components/ui";
import { appImages } from "@/content/appImages";
import { getSpecies } from "@/content/species";
import { speciesImage } from "@/content/speciesImages";
import { presentInterstitial } from "@/lib/ads";
import { success, tap, warn } from "@/lib/feedback";
import { radius, spacing, useTheme } from "@/theme";

// The genuine stone the player must find, paired against a look-alike each round.
const CORRECT_SLUG = "diamond";
const DISTRACTORS = ["moissanite", "cubic-zirconia", "glass", "quartz", "white-sapphire"];

interface PhotoQuestion {
  wrongSlug: string;
  /** Whether the real diamond is the LEFT card this round (randomised). */
  diamondLeft: boolean;
}

function buildPhotoQuiz(): PhotoQuestion[] {
  return [...DISTRACTORS]
    .sort(() => Math.random() - 0.5)
    .map((wrongSlug) => ({ wrongSlug, diamondLeft: Math.random() < 0.5 }));
}

type Side = "left" | "right";

export default function PhotoQuizScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [questions, setQuestions] = useState<PhotoQuestion[]>(() => buildPhotoQuiz());
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Side | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const [houseAdVisible, setHouseAdVisible] = useState(false);
  const interstitialShownRef = useRef(false);

  const question = questions[index];
  const correctSide: Side = question.diamondLeft ? "left" : "right";
  const gotItRight = picked !== null && picked === correctSide;

  const leftSlug = question.diamondLeft ? CORRECT_SLUG : question.wrongSlug;
  const rightSlug = question.diamondLeft ? question.wrongSlug : CORRECT_SLUG;

  const answer = useCallback(
    (side: Side) => {
      if (picked !== null) return;
      tap();
      setPicked(side);
      if (side === correctSide) {
        setCorrect((v) => v + 1);
        success();
      } else {
        warn();
      }
    },
    [picked, correctSide],
  );

  const next = useCallback(() => {
    if (index + 1 >= questions.length) {
      setDone(true);
      if (!interstitialShownRef.current) {
        interstitialShownRef.current = true;
        presentInterstitial(() => setHouseAdVisible(true));
      }
      return;
    }
    setIndex((v) => v + 1);
    setPicked(null);
  }, [index, questions.length]);

  const restart = useCallback(() => {
    tap();
    setQuestions(buildPhotoQuiz());
    setIndex(0);
    setPicked(null);
    setCorrect(0);
    setDone(false);
    interstitialShownRef.current = false;
  }, []);

  // ── Result ─────────────────────────────────────────────────────────────────
  if (done) {
    const ratio = correct / questions.length;
    const perfect = correct === questions.length;
    const tier: Mood = ratio >= 0.75 ? "happy" : ratio >= 0.4 ? "medium" : "sad";
    const title = perfect
      ? "Perfect eye — you spotted every diamond!"
      : tier === "happy"
        ? "Sharp eye for the real thing!"
        : tier === "medium"
          ? "Getting there — keep looking closely!"
          : "Simulants are tricky — try again!";

    return (
      <Screen scroll>
        {tier === "happy" ? <Confetti /> : null}
        <Card style={[styles.centerCard, { marginTop: spacing.xl }]}>
          <ReactionEmoji mood={tier} emoji={perfect ? "🏆" : "💎"} size={78} />
          <ThemedText variant="display" color={colors.tint}>
            {correct}/{questions.length}
          </ThemedText>
          <ThemedText variant="heading" style={{ textAlign: "center" }}>
            {title}
          </ThemedText>
          <ThemedText variant="caption" muted style={styles.blurb}>
            Every pair shows a genuine diamond next to a common look-alike. The more you play, the quicker
            you get at spotting the tells.
          </ThemedText>
        </Card>

        <Button label="Play again" icon="refresh-cw" onPress={restart} style={{ marginTop: spacing.lg }} />
        <View style={styles.resultLinks}>
          <Pressable
            onPress={() => {
              tap();
              router.replace("/");
            }}
            style={styles.linkBtn}
            hitSlop={8}
          >
            <Feather name="home" size={16} color={colors.textMuted} />
            <ThemedText variant="body" color={colors.textMuted} style={{ fontWeight: "600" }}>
              Go home
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => { tap(); router.push("/quiz"); }} style={styles.linkBtn} hitSlop={8}>
            <Feather name="help-circle" size={16} color={colors.textMuted} />
            <ThemedText variant="body" color={colors.textMuted} style={{ fontWeight: "600" }}>
              Knowledge quiz
            </ThemedText>
          </Pressable>
        </View>

        <HouseInterstitialModal visible={houseAdVisible} onClose={() => setHouseAdVisible(false)} />
      </Screen>
    );
  }

  // ── Playing ──────────────────────────────────────────────────────────────
  const wrong = getSpecies(question.wrongSlug);
  const tip = wrong?.identification?.[0];

  return (
    <Screen scroll>
      {gotItRight ? <Confetti key={`confetti-${index}`} count={20} /> : null}

      <ScreenHero image={appImages.quizBanner} height={120} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <ThemedText variant="label" muted>
          Pair {index + 1} of {questions.length}
        </ThemedText>
        <View style={{ flex: 1 }} />
        <ThemedText variant="label" color={colors.tint}>
          {correct} correct
        </ThemedText>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.card }]}>
        <View
          style={[styles.progressFill, { backgroundColor: colors.tint, width: `${((index + 1) / questions.length) * 100}%` }]}
        />
      </View>

      <Card style={{ marginTop: spacing.xl }}>
        <ThemedText variant="label" muted>
          Spot the diamond
        </ThemedText>
        <ThemedText variant="heading" style={{ marginTop: spacing.sm }}>
          Which one is the real diamond?
        </ThemedText>
      </Card>

      <View style={styles.cards}>
        <PhotoOption
          slug={leftSlug}
          side="left"
          picked={picked}
          correctSide={correctSide}
          onPress={() => answer("left")}
        />
        <PhotoOption
          slug={rightSlug}
          side="right"
          picked={picked}
          correctSide={correctSide}
          onPress={() => answer("right")}
        />
      </View>

      {picked !== null ? (
        <>
          <Card style={{ marginTop: spacing.xl }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <ReactionEmoji mood={gotItRight ? "happy" : "sad"} emoji={gotItRight ? "🎉" : "😅"} size={34} loop={false} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="label" color={gotItRight ? colors.tint : colors.danger}>
                  {gotItRight ? "Correct!" : "Not quite"}
                </ThemedText>
                <ThemedText variant="caption" style={{ marginTop: 4 }}>
                  The other stone is {wrong?.commonName ?? "a look-alike"}.
                  {tip ? ` Tip: ${tip.charAt(0).toLowerCase() + tip.slice(1)}` : ""}
                </ThemedText>
              </View>
            </View>
          </Card>

          <Button
            label={index + 1 >= questions.length ? "See my score" : "Next pair"}
            icon="arrow-right"
            onPress={next}
            style={{ marginTop: spacing.lg }}
          />
        </>
      ) : null}
    </Screen>
  );
}

/** One tappable photo. After a pick, the real diamond turns green and the wrong pick turns red. */
function PhotoOption({
  slug,
  side,
  picked,
  correctSide,
  onPress,
}: {
  slug: string;
  side: Side;
  picked: Side | null;
  correctSide: Side;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const photo = speciesImage(slug);
  const species = getSpecies(slug);
  const revealed = picked !== null;
  const isCorrect = side === correctSide;
  const isPicked = side === picked;

  const borderColor = revealed
    ? isCorrect
      ? colors.tint
      : isPicked
        ? colors.danger
        : colors.cardBorder
    : colors.cardBorder;

  return (
    <Pressable
      onPress={onPress}
      disabled={revealed}
      style={({ pressed }) => [
        styles.photoCard,
        { backgroundColor: colors.card, borderColor, opacity: pressed && !revealed ? 0.8 : 1 },
      ]}
    >
      {photo ? (
        <Image source={photo} style={styles.photo} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.photo, { backgroundColor: colors.backgroundElevated }]} />
      )}
      {revealed ? (
        <View style={{ padding: spacing.md, gap: 4 }}>
          <ThemedText variant="body" numberOfLines={1} style={{ fontWeight: "700" }}>
            {species?.commonName ?? slug}
          </ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Feather
              name={isCorrect ? "check-circle" : "x-circle"}
              size={13}
              color={isCorrect ? colors.tint : colors.textFaint}
            />
            <ThemedText variant="caption" muted style={{ fontSize: 12 }}>
              {isCorrect ? "Real diamond" : "Look-alike"}
            </ThemedText>
          </View>
        </View>
      ) : (
        <View style={styles.tapHint}>
          <Feather name="maximize" size={14} color={colors.textFaint} />
          <ThemedText variant="caption" muted style={{ fontSize: 12 }}>
            Tap to pick
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 5, borderRadius: radius.pill, marginTop: spacing.md, overflow: "hidden" },
  progressFill: { height: 5, borderRadius: radius.pill },
  cards: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
  photoCard: { flex: 1, borderRadius: radius.lg, borderWidth: 2, overflow: "hidden" },
  photo: { width: "100%", height: 150 },
  tapHint: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: spacing.md },
  centerCard: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl, marginTop: spacing.xxl },
  blurb: { textAlign: "center", maxWidth: 300 },
  resultLinks: { flexDirection: "row", justifyContent: "center", gap: spacing.xl, marginTop: spacing.md },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
});
