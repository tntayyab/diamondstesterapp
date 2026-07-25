import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Card, Screen, ThemedText } from "@/components/ui";
import { achievements, type AchievementStats } from "@/content/reference";
import type { IconName } from "@/components/ui";
import { getHistory, getQuizStats, getSavedSpecies, getSightings, getStreak } from "@/lib/storage";
import { radius, spacing, useTheme } from "@/theme";

const EMPTY: AchievementStats = {
  scans: 0,
  savedSpecies: 0,
  sightings: 0,
  streak: 0,
  quizBest: 0,
  dangerousFound: 0,
};

export default function AchievementsScreen() {
  const { colors } = useTheme();
  const [stats, setStats] = useState<AchievementStats>(EMPTY);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.all([getHistory(), getSavedSpecies(), getSightings(), getStreak(), getQuizStats()]).then(
        ([history, saved, sightings, streak, quiz]) => {
          if (!active) return;
          setStats({
            scans: history.length,
            savedSpecies: saved.length,
            sightings: sightings.length,
            streak: streak.current,
            quizBest: quiz.bestScore,
            dangerousFound: history.filter(
              (scan) => scan.result.authenticityLevel === "simulant" || scan.result.authenticityLevel === "synthetic",
            ).length,
          });
        },
      );
      return () => {
        active = false;
      };
    }, []),
  );

  const unlocked = achievements.filter((item) => {
    const { value, goal } = item.progress(stats);
    return value >= goal;
  }).length;

  return (
    <Screen scroll>
      <ThemedText variant="title">Achievements</ThemedText>
      <ThemedText variant="caption" muted style={{ marginTop: 2 }}>
        {unlocked} of {achievements.length} unlocked
      </ThemedText>

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        {achievements.map((item) => {
          const { value, goal } = item.progress(stats);
          const done = value >= goal;
          const pct = Math.min(100, Math.round((value / goal) * 100));

          return (
            <Card key={item.key} style={done ? { borderColor: colors.tint } : undefined}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <View
                  style={[
                    styles.medal,
                    {
                      backgroundColor: done ? colors.tint : colors.backgroundElevated,
                      borderColor: done ? colors.tint : colors.cardBorder,
                    },
                  ]}
                >
                  <Feather
                    name={item.icon as IconName}
                    size={18}
                    color={done ? "#fff" : colors.textFaint}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <ThemedText variant="body" style={{ fontWeight: "600" }}>
                    {item.title}
                  </ThemedText>
                  <ThemedText variant="caption" muted style={{ fontSize: 12, marginTop: 1 }}>
                    {item.description}
                  </ThemedText>
                </View>

                {done ? <Feather name="check-circle" size={18} color={colors.tint} /> : null}
              </View>

              {!done ? (
                <>
                  <View style={[styles.track, { backgroundColor: colors.backgroundElevated }]}>
                    <View style={[styles.fill, { backgroundColor: colors.tint, width: `${pct}%` }]} />
                  </View>
                  <ThemedText variant="caption" muted style={{ fontSize: 11, marginTop: 5 }}>
                    {value} / {goal}
                  </ThemedText>
                </>
              ) : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  medal: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  track: { height: 4, borderRadius: radius.pill, marginTop: spacing.md, overflow: "hidden" },
  fill: { height: 4, borderRadius: radius.pill },
});
