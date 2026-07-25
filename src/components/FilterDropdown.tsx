import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ui";
import { tap } from "@/lib/feedback";
import { radius, spacing, useTheme } from "@/theme";

/**
 * A compact dropdown chip + modal option list, styled like the Species venom
 * picker. `options[0]` is treated as the "All …" default (chip stays neutral);
 * any other selection highlights the chip in the brand colour.
 */
export function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const active = options.length > 0 && value !== options[0];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        onPress={() => {
          tap();
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.card,
            borderColor: active ? colors.tint : colors.cardBorder,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <ThemedText
          variant="caption"
          numberOfLines={1}
          color={active ? colors.tint : colors.text}
          style={{ fontWeight: "600" }}
        >
          {value}
        </ThemedText>
        <Feather name="chevron-down" size={14} color={active ? colors.tint : colors.textFaint} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={(event) => event.stopPropagation()}
          >
            <ThemedText variant="label" muted style={{ marginBottom: spacing.md }}>
              {label}
            </ThemedText>
            {options.map((option) => {
              const isActive = option === value;
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    tap();
                    onChange(option);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.option, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <ThemedText variant="body" style={{ flex: 1, fontWeight: isActive ? "700" : "400" }}>
                    {option}
                  </ThemedText>
                  {isActive ? <Feather name="check" size={17} color={colors.tint} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  backdrop: { flex: 1, justifyContent: "flex-end", padding: spacing.lg },
  sheet: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 14 },
});
