import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { Card, EmptyState, Screen, ThemedText } from "@/components/ui";
import { tap } from "@/lib/feedback";
import { dateTime } from "@/lib/format";
import { deleteQuizAttempt, getQuizAttempts, type QuizAttempt } from "@/lib/storage";
import { spacing, useTheme } from "@/theme";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function QuizHistoryScreen() {
  const { colors } = useTheme();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  const load = useCallback(async () => {
    setAttempts(await getQuizAttempts());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Leaderboard: highest score first; ties go to the most recent attempt.
  const ranked = [...attempts].sort(
    (a, b) => b.correct - a.correct || new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const remove = useCallback(async (id: string) => {
    tap();
    setAttempts(await deleteQuizAttempt(id));
  }, []);

  return (
    <Screen edges={["bottom"]}>
      <FlatList
        style={{ flex: 1 }}
        data={ranked}
        keyExtractor={(a) => a.id}
        ListHeaderComponent={
          <View style={{ paddingBottom: spacing.md }}>
            <ThemedText variant="title">Quiz leaderboard</ThemedText>
            <ThemedText variant="caption" muted style={{ marginTop: 4 }}>
              {attempts.length} saved {attempts.length === 1 ? "attempt" : "attempts"} · ranked by score
            </ThemedText>
          </View>
        }
        renderItem={({ item, index }) => (
          <Card style={styles.row}>
            <View style={styles.rank}>
              <ThemedText
                variant="heading"
                color={index < 3 ? colors.text : colors.textMuted}
                style={{ fontSize: index < 3 ? 26 : 15 }}
              >
                {index < 3 ? MEDALS[index] : `#${index + 1}`}
              </ThemedText>
            </View>

            <View style={{ flex: 1 }}>
              <ThemedText variant="body" style={{ fontWeight: "700" }} numberOfLines={1}>
                {item.name}
              </ThemedText>
              <ThemedText variant="caption" muted style={{ fontSize: 12, marginTop: 2 }}>
                {dateTime(item.date)}
              </ThemedText>
            </View>

            <ThemedText variant="heading" color={colors.tint} style={{ fontSize: 18 }}>
              {item.correct}/{item.total}
            </ThemedText>

            <Pressable onPress={() => remove(item.id)} hitSlop={10} style={{ paddingLeft: spacing.md }}>
              <Feather name="trash-2" size={16} color={colors.textFaint} />
            </Pressable>
          </Card>
        )}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="award"
            title="No saved attempts yet"
            body="Finish a quiz and tap “Save to leaderboard” to record your score here."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  rank: { width: 46, alignItems: "center", justifyContent: "center" },
});
