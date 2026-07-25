import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, useWindowDimensions } from "react-native";

/**
 * Lightweight, dependency-free quiz animations built on the RN Animated API
 * (same approach as SplashAnimation). `ReactionEmoji` gives a big animated face
 * per mood; `Confetti` rains celebratory pieces for correct answers / great
 * scores.
 */

export type Mood = "happy" | "medium" | "sad";

const DEFAULT_EMOJI: Record<Mood, string> = { happy: "🥳", medium: "🙂", sad: "😢" };

export function ReactionEmoji({
  mood,
  emoji,
  size = 72,
  loop = true,
}: {
  mood: Mood;
  emoji?: string;
  size?: number;
  loop?: boolean;
}) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    v.setValue(0);
    let anim: Animated.CompositeAnimation;

    if (mood === "happy") {
      const bounce = Animated.sequence([
        Animated.spring(v, { toValue: 1, friction: 3, tension: 120, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]);
      anim = loop
        ? Animated.loop(bounce)
        : Animated.spring(v, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true });
    } else if (mood === "sad") {
      if (loop) {
        anim = Animated.loop(
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(v, { toValue: -1, duration: 800, useNativeDriver: true }),
            Animated.timing(v, { toValue: 0, duration: 800, useNativeDriver: true }),
          ]),
        );
      } else {
        // Quick one-shot shake for a wrong answer.
        anim = Animated.sequence(
          [1, -1, 1, -1, 0].map((to) =>
            Animated.timing(v, { toValue: to, duration: 65, useNativeDriver: true }),
          ),
        );
      }
    } else {
      const pulse = Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 650, useNativeDriver: true }),
      ]);
      anim = loop ? Animated.loop(pulse) : pulse;
    }

    anim.start();
    return () => anim.stop();
  }, [mood, loop, v]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let transform: any[];
  if (mood === "happy") {
    transform = [
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.22] }) },
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
    ];
  } else if (mood === "sad") {
    transform = [
      { rotate: v.interpolate({ inputRange: [-1, 1], outputRange: ["-10deg", "10deg"] }) },
      { translateX: v.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.06, size * 0.06] }) },
    ];
  } else {
    transform = [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }];
  }

  return (
    <Animated.Text style={{ fontSize: size, lineHeight: size * 1.2, textAlign: "center", transform }}>
      {emoji ?? DEFAULT_EMOJI[mood]}
    </Animated.Text>
  );
}

const CONFETTI_COLORS = ["#6366F1", "#38E1FF", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7", "#ec4899"];

/** A one-shot rain of confetti covering its parent. Re-mount (via `key`) to replay. */
export function Confetti({ count = 26 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useRef(
    Array.from({ length: count }).map((_, i) => ({
      driver: new Animated.Value(0),
      left: Math.random() * width,
      drift: (Math.random() - 0.5) * 150,
      fall: height * 0.5 + Math.random() * height * 0.4,
      size: 7 + Math.random() * 7,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 250,
      spins: (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3)),
      duration: 1500 + Math.random() * 900,
    })),
  ).current;

  useEffect(() => {
    Animated.parallel(
      pieces.map((p) =>
        Animated.timing(p.driver, {
          toValue: 1,
          duration: p.duration,
          delay: p.delay,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [pieces]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: p.left,
            top: -24,
            width: p.size,
            height: p.size * 1.5,
            borderRadius: 2,
            backgroundColor: p.color,
            opacity: p.driver.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.driver.interpolate({ inputRange: [0, 1], outputRange: [0, p.fall] }) },
              { translateX: p.driver.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: p.driver.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.spins * 360}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}
