import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { tap } from "@/lib/feedback";
import { brandGradient, fontSize, radius, spacing, useTheme, authenticityColors, type AuthenticityLevel } from "@/theme";

export type IconName = React.ComponentProps<typeof Feather>["name"];

// ---------------------------------------------------------------------------

export function Screen({
  children,
  scroll = false,
  edges = ["top"],
  contentStyle,
}: {
  /** Omitted while a screen is still loading its data. */
  children?: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[{ padding: spacing.lg, paddingBottom: spacing.xxxl }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.background }}>
      {body}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------

type TextVariant = "display" | "title" | "heading" | "body" | "caption" | "label";

const VARIANT_STYLE: Record<TextVariant, TextStyle> = {
  display: { fontSize: fontSize.display, fontWeight: "800", letterSpacing: -0.8 },
  title: { fontSize: fontSize.xxl, fontWeight: "800", letterSpacing: -0.5 },
  heading: { fontSize: fontSize.lg, fontWeight: "700", letterSpacing: -0.2 },
  body: { fontSize: fontSize.base, fontWeight: "400", lineHeight: 23 },
  caption: { fontSize: fontSize.sm, fontWeight: "400", lineHeight: 19 },
  label: { fontSize: fontSize.xs, fontWeight: "700", letterSpacing: 1.1, textTransform: "uppercase" },
};

export function ThemedText({
  children,
  variant = "body",
  muted = false,
  color,
  style,
  numberOfLines,
  selectable,
}: {
  children: React.ReactNode;
  variant?: TextVariant;
  muted?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /** Allow the user to select & copy the text (long-press). */
  selectable?: boolean;
}) {
  const { colors } = useTheme();
  const resolved = color ?? (muted ? colors.textMuted : colors.text);
  return (
    <Text
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[VARIANT_STYLE[variant], { color: resolved }, style]}
    >
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------

export function Card({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  const base: ViewStyle = {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.lg,
    padding: spacing.lg,
  };

  // The pressable IS the card. Wrapping a styled View in an unstyled Pressable
  // would strip layout props (notably `flex: 1`) from the element the parent
  // actually lays out, so two grid tiles would size to their content instead
  // of splitting the row evenly.
  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          tap();
          onPress();
        }}
        style={({ pressed }) => [base, style, { opacity: pressed ? 0.72 : 1 }]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[base, style]}>{children}</View>;
}

// ---------------------------------------------------------------------------

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  const inner = (
    <View style={styles.buttonInner}>
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : colors.tint} size="small" />
      ) : (
        <>
          {icon ? (
            <Feather
              name={icon}
              size={17}
              color={variant === "primary" ? "#fff" : variant === "danger" ? colors.danger : colors.text}
            />
          ) : null}
          <Text
            style={[
              styles.buttonLabel,
              {
                color:
                  variant === "primary" ? "#fff" : variant === "danger" ? colors.danger : colors.text,
              },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [{ opacity: inactive ? 0.45 : pressed ? 0.85 : 1 }, style]}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={[...brandGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.button,
            {
              backgroundColor: variant === "ghost" ? "transparent" : colors.card,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: variant === "danger" ? colors.danger : colors.cardBorder,
            },
          ]}
        >
          {inner}
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------

const AUTHENTICITY_LABEL: Record<AuthenticityLevel, string> = {
  genuine: "Genuine",
  uncertain: "Uncertain",
  simulant: "Simulant",
  synthetic: "Synthetic",
};

export function AuthenticityBadge({ level, large = false }: { level: AuthenticityLevel; large?: boolean }) {
  const color = authenticityColors[level];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: `${color}22`,
        borderColor: color,
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingHorizontal: large ? spacing.lg : spacing.md,
        paddingVertical: large ? 7 : 4,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      <Text
        style={{
          color,
          fontSize: large ? fontSize.sm : fontSize.xs,
          fontWeight: "800",
          letterSpacing: 0.9,
          textTransform: "uppercase",
        }}
      >
        {AUTHENTICITY_LABEL[level]}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------

export function Chip({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={{
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.tint : colors.card,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: active ? colors.tint : colors.cardBorder,
      }}
    >
      <Text
        style={{
          color: active ? "#fff" : colors.textMuted,
          fontSize: fontSize.sm,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText variant="label" muted>
        {title}
      </ThemedText>
      {action}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Feather name={icon} size={26} color={colors.textMuted} />
      </View>
      <ThemedText variant="heading" style={{ textAlign: "center" }}>
        {title}
      </ThemedText>
      <ThemedText variant="caption" muted style={{ textAlign: "center", maxWidth: 300 }}>
        {body}
      </ThemedText>
      {action ? <View style={{ marginTop: spacing.sm }}>{action}</View> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------

export function Row({
  icon,
  label,
  value,
  onPress,
  destructive = false,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  const tone = destructive ? colors.danger : colors.text;

  return (
    <Pressable
      disabled={!onPress}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [styles.row, { opacity: pressed && onPress ? 0.7 : 1 }]}
    >
      <Feather name={icon} size={18} color={destructive ? colors.danger : colors.textMuted} />
      <Text style={{ flex: 1, color: tone, fontSize: fontSize.base, fontWeight: "500" }}>{label}</Text>
      {value ? <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>{value}</Text> : null}
      {onPress ? <Feather name="chevron-right" size={17} color={colors.textFaint} /> : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonInner: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  buttonLabel: { fontSize: fontSize.base, fontWeight: "700", letterSpacing: 0.2 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  empty: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxxl },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 15,
  },
});
