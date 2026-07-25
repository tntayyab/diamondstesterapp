import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { RewardedAdModal } from "@/components/RewardedAdModal";
import { Button, ThemedText } from "@/components/ui";
import { Screen } from "@/components/ui";
import { adsAvailable, showRewardedAd } from "@/lib/ads";
import { useAuth } from "@/lib/auth";
import { askGemologist, ChatError, CREDITS_PER_QUESTION, grantAdCredits, type ChatMessage } from "@/lib/chat";
import { success, tap, warn } from "@/lib/feedback";
import { clearChatMessages, getChatMessages, saveChatMessages } from "@/lib/storage";
import { brandGradient, fontSize, radius, spacing, useTheme } from "@/theme";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm your gemologist 💎 Ask me anything about diamonds and gemstones — the 4Cs, simulants like moissanite or cubic zirconia, manual tests, UV fluorescence, or how to read a lab certificate. I can't certify a stone from chat alone, but I can point you in the right direction.",
};

export default function ChatScreen() {
  const { colors } = useTheme();
  const { credits, refreshProfile } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [adOpen, setAdOpen] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  // Don't persist until the saved history has loaded, or the first render would
  // overwrite it with an empty log (mount race).
  const loadedRef = useRef(false);

  const questionsLeft = Math.floor((credits ?? 0) / CREDITS_PER_QUESTION);
  const outOfCredits = questionsLeft < 1;

  // Restore the saved conversation once on mount.
  useEffect(() => {
    let alive = true;
    void getChatMessages().then((saved) => {
      if (!alive) return;
      if (saved.length) setMessages([GREETING, ...saved]);
      loadedRef.current = true;
    });
    return () => {
      alive = false;
    };
  }, []);

  // Persist the real conversation (without the local greeting) as it changes.
  useEffect(() => {
    if (!loadedRef.current) return;
    void saveChatMessages(messages.filter((m) => m !== GREETING));
  }, [messages]);

  const clearChat = useCallback(() => {
    tap();
    setMessages([GREETING]);
    void clearChatMessages();
  }, []);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;
    if (outOfCredits) return;

    tap();
    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setDraft("");
    setSending(true);
    scrollDown();

    try {
      // Send only the recent real conversation (skip the local greeting) — the
      // full log is persisted for display, but we cap what goes to the server so
      // long histories don't bloat the request.
      const history = next.filter((m) => m !== GREETING).slice(-12);
      const res = await askGemologist(history);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply, offTopic: !res.onTopic }]);
      await refreshProfile();
    } catch (error) {
      warn();
      const message =
        error instanceof ChatError
          ? error.code === "no_credits"
            ? "You've used all your questions. Watch a short ad below to earn more credits."
            : error.message
          : "Something went wrong. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: message, offTopic: true }]);
    } finally {
      setSending(false);
      scrollDown();
    }
  }, [draft, sending, outOfCredits, messages, refreshProfile, scrollDown]);

  // Watch a rewarded ad for more credits. Uses a real AdMob ad when the native
  // SDK is available; falls back to the simulated modal in Expo Go / on no-fill
  // so the user always has a way to earn credits.
  const watchAd = useCallback(async () => {
    tap();
    if (!adsAvailable()) {
      setAdOpen(true);
      return;
    }
    setAdLoading(true);
    try {
      const res = await showRewardedAd();
      if (res.earned) {
        await grantAdCredits();
        success();
        await refreshProfile();
      } else if (!res.shown) {
        // The ad could not be displayed (no fill / offline) — let the user earn
        // via the simulated reward instead of leaving them stuck.
        setAdOpen(true);
      }
      // shown-but-not-earned (dismissed early) grants nothing, intentionally.
    } catch {
      setAdOpen(true);
    } finally {
      setAdLoading(false);
    }
  }, [refreshProfile]);

  const header = useMemo(
    () => (
      <LinearGradient colors={[...brandGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroIcon}>
          <Feather name="message-circle" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText variant="heading" color="#fff">
            Ask the Gemologist
          </ThemedText>
          <ThemedText variant="caption" color="rgba(255,255,255,0.85)">
            {questionsLeft} {questionsLeft === 1 ? "question" : "questions"} left · {CREDITS_PER_QUESTION} credits each
          </ThemedText>
        </View>
        {messages.length > 1 ? (
          <Pressable onPress={clearChat} hitSlop={10} accessibilityLabel="Clear chat">
            <Feather name="trash-2" size={18} color="rgba(255,255,255,0.9)" />
          </Pressable>
        ) : null}
      </LinearGradient>
    ),
    [questionsLeft, messages.length, clearChat],
  );

  return (
    <Screen edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          ListHeaderComponent={header}
          renderItem={({ item }) => <Bubble message={item} />}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.lg }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollDown}
          ListFooterComponent={
            sending ? (
              <View style={styles.typing}>
                <ActivityIndicator size="small" color={colors.tint} />
                <ThemedText variant="caption" muted>
                  Thinking…
                </ThemedText>
              </View>
            ) : null
          }
        />

        {/* Out-of-credits panel with the watch-ad reward */}
        {outOfCredits ? (
          <View style={[styles.limit, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <ThemedText variant="body" style={{ fontWeight: "700", textAlign: "center" }}>
              You're out of questions
            </ThemedText>
            <ThemedText variant="caption" muted style={{ textAlign: "center", marginTop: 4 }}>
              Watch a short ad to earn {CREDITS_PER_QUESTION} credits — enough for one more question. You can do this
              again whenever you like.
            </ThemedText>
            <Button
              label={adLoading ? "Loading ad…" : `Watch ad · +${CREDITS_PER_QUESTION} credits`}
              icon="film"
              loading={adLoading}
              onPress={watchAd}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : (
          <View style={[styles.composer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask about a diamond or gemstone…"
              placeholderTextColor={colors.textFaint}
              multiline
              editable={!sending}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
            />
            <Pressable onPress={send} disabled={sending || !draft.trim()} style={{ opacity: draft.trim() && !sending ? 1 : 0.4 }}>
              <View style={[styles.sendBtn, { backgroundColor: colors.tint }]}>
                <Feather name="arrow-up" size={20} color="#fff" />
              </View>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>

      <RewardedAdModal
        visible={adOpen}
        onClose={() => setAdOpen(false)}
        onRewarded={async () => {
          await refreshProfile();
        }}
      />
    </Screen>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const { colors } = useTheme();
  const mine = message.role === "user";
  return (
    <View style={[styles.bubbleRow, { justifyContent: mine ? "flex-end" : "flex-start" }]}>
      <View
        style={[
          styles.bubble,
          mine
            ? { backgroundColor: colors.tint, borderTopRightRadius: 4 }
            : { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: StyleSheet.hairlineWidth * 2, borderTopLeftRadius: 4 },
        ]}
      >
        <ThemedText variant="body" color={mine ? "#fff" : colors.text} selectable>
          {message.content}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  heroIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  bubbleRow: { flexDirection: "row" },
  bubble: { maxWidth: "84%", borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  typing: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md, paddingLeft: spacing.sm },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, maxHeight: 120, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, paddingHorizontal: spacing.lg, paddingVertical: 10, fontSize: fontSize.base },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  limit: { padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
