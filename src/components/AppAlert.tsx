import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { Confetti, ReactionEmoji } from "@/components/QuizAnimations";
import { ThemedText } from "@/components/ui";
import { radius, spacing, useTheme } from "@/theme";

/**
 * Custom, on-brand replacement for the OS `Alert.alert`. Same call shape so it's
 * a near drop-in, plus an optional `mood` that plays a happy 🥳 (with confetti)
 * or sad 😢 animation for good / bad news. A single `<AppAlertHost/>` at the app
 * root listens for `showAlert(...)` calls.
 */

export type AlertButton = { text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" };
export type AlertMood = "happy" | "sad" | "neutral";

interface AlertState {
  title: string;
  message?: string;
  buttons: AlertButton[];
  mood: AlertMood;
}

let emit: ((s: AlertState | null) => void) | null = null;

// Good-news vs bad-news keywords, so most messages animate correctly without
// every call site having to pass a mood. Explicit `{ mood }` always wins.
const HAPPY_RE = /welcome|aboard|success|cleared|active|almost there|great|congrat|saved|added/i;
const SAD_RE = /fail|could ?n'?t|could not|wrong|invalid|\berror\b|denied|not found|out of|unable/i;

function inferMood(title: string, message?: string): AlertMood {
  const text = `${title} ${message ?? ""}`;
  if (HAPPY_RE.test(text)) return "happy";
  if (SAD_RE.test(text)) return "sad";
  return "neutral";
}

/** Drop-in for Alert.alert. Pass `{ mood }` as the 4th arg to force an animation. */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  opts?: { mood?: AlertMood },
): void {
  emit?.({
    title,
    message,
    buttons: buttons && buttons.length ? buttons : [{ text: "OK" }],
    mood: opts?.mood ?? inferMood(title, message),
  });
}

export function AppAlertHost() {
  const { colors } = useTheme();
  const [state, setState] = useState<AlertState | null>(null);

  useEffect(() => {
    emit = setState;
    return () => {
      emit = null;
    };
  }, []);

  const close = () => setState(null);
  if (!state) return null;

  const single = state.buttons.length === 1;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={close}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        {state.mood === "happy" ? <Confetti count={16} /> : null}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {state.mood !== "neutral" ? (
            <View style={{ alignItems: "center", marginBottom: spacing.sm }}>
              <ReactionEmoji mood={state.mood} size={52} loop={false} />
            </View>
          ) : null}

          <ThemedText variant="heading" style={{ textAlign: "center" }}>
            {state.title}
          </ThemedText>
          {state.message ? (
            <ThemedText variant="body" muted style={{ textAlign: "center", marginTop: spacing.sm, lineHeight: 21 }}>
              {state.message}
            </ThemedText>
          ) : null}

          <View style={[styles.actions, { flexDirection: single ? "column" : "row" }]}>
            {state.buttons.map((b, i) => {
              const color =
                b.style === "destructive" ? colors.danger : b.style === "cancel" ? colors.textMuted : colors.tint;
              return (
                <Pressable
                  key={`${b.text}-${i}`}
                  onPress={() => {
                    close();
                    b.onPress?.();
                  }}
                  style={({ pressed }) => [
                    styles.btn,
                    single ? styles.btnFull : styles.btnFlex,
                    { backgroundColor: pressed ? colors.background : "transparent", borderColor: colors.border },
                  ]}
                >
                  <ThemedText variant="body" color={color} style={{ fontWeight: "700" }}>
                    {b.text}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.xl,
  },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
  btn: { alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: radius.md },
  btnFull: { borderWidth: StyleSheet.hairlineWidth * 2 },
  btnFlex: { flex: 1, borderWidth: StyleSheet.hairlineWidth * 2 },
});
