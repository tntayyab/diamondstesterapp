import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable } from "react-native";

import { useDrawer } from "@/components/DrawerContext";
import { tap } from "@/lib/feedback";
import { spacing, useTheme } from "@/theme";

/** Opens the app-wide slide-out menu. Drop it at the start of a screen's title row. */
export function HamburgerButton() {
  const { colors } = useTheme();
  const { open } = useDrawer();

  return (
    <Pressable
      onPress={() => {
        tap();
        open();
      }}
      hitSlop={10}
      style={{ marginRight: spacing.md }}
    >
      <Feather name="menu" size={24} color={colors.text} />
    </Pressable>
  );
}
