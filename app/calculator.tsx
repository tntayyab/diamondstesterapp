import React, { useMemo, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { Card, Chip, Screen, SectionHeader, ThemedText } from "@/components/ui";
import { FilterDropdown } from "@/components/FilterDropdown";
import { ScreenHero } from "@/components/ScreenHero";
import { appImages } from "@/content/appImages";
import { radius, spacing, useTheme } from "@/theme";

const SHAPES = ["Round", "Princess", "Oval", "Cushion", "Emerald", "Pear"] as const;
type Shape = (typeof SHAPES)[number];

/** Rough 1-carat baseline $/carat by shape — round commands the highest premium for its brilliance. */
const SHAPE_BASE_PRICE: Record<Shape, number> = {
  Round: 8000,
  Princess: 6500,
  Cushion: 6200,
  Emerald: 6800,
  Oval: 6000,
  Pear: 5800,
};

const COLOR_GRADES = "DEFGHIJKLMNOPQRSTUVWXYZ".split("");

function colorFactor(grade: string): number {
  const index = COLOR_GRADES.indexOf(grade);
  return Math.max(0.2, 1.15 - Math.max(0, index) * 0.045);
}

const CLARITY_GRADES = ["FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1", "I2", "I3"];

const CLARITY_FACTOR: Record<string, number> = {
  FL: 1.3,
  IF: 1.2,
  VVS1: 1.1,
  VVS2: 1.05,
  VS1: 1.0,
  VS2: 0.92,
  SI1: 0.8,
  SI2: 0.68,
  I1: 0.5,
  I2: 0.35,
  I3: 0.2,
};

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function CalculatorScreen() {
  const { colors } = useTheme();
  const [shape, setShape] = useState<Shape>("Round");
  const [caratText, setCaratText] = useState("1.00");
  const [color, setColor] = useState("G");
  const [clarity, setClarity] = useState("VS1");

  const carat = useMemo(() => {
    const parsed = Number.parseFloat(caratText);
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 30) : 0;
  }, [caratText]);

  const estimate = useMemo(() => {
    if (!carat) return null;
    const pricePerCarat = SHAPE_BASE_PRICE[shape] * colorFactor(color) * (CLARITY_FACTOR[clarity] ?? 0.8);
    // Larger stones command a disproportionate premium per carat, not a linear one.
    const total = pricePerCarat * Math.pow(carat, 1.5);
    return { low: Math.round(total * 0.75), mid: Math.round(total), high: Math.round(total * 1.3) };
  }, [carat, shape, color, clarity]);

  return (
    <Screen scroll>
      <ScreenHero image={appImages.scale} />
      <ThemedText variant="title">Value estimator</ThemedText>
      <ThemedText variant="caption" muted style={{ marginTop: 2 }}>
        A rough, ballpark estimate — not an appraisal, quote, or offer to buy or sell.
      </ThemedText>

      <SectionHeader title="Shape" />
      <View style={styles.chipRow}>
        {SHAPES.map((s) => (
          <Chip key={s} label={s} active={s === shape} onPress={() => setShape(s)} />
        ))}
      </View>

      <SectionHeader title="Carat weight" />
      <TextInput
        value={caratText}
        onChangeText={setCaratText}
        keyboardType="decimal-pad"
        placeholder="e.g. 1.00"
        placeholderTextColor={colors.textFaint}
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
      />

      <SectionHeader title="Color grade" />
      <ThemedText variant="caption" muted style={{ marginBottom: spacing.md }}>
        D is colorless (most valuable); Z has noticeable warm tint.
      </ThemedText>
      <FilterDropdown label="Color grade" value={color} options={COLOR_GRADES} onChange={setColor} />

      <SectionHeader title="Clarity grade" />
      <ThemedText variant="caption" muted style={{ marginBottom: spacing.md }}>
        FL (Flawless) is the top grade; I1-I3 have inclusions visible to the naked eye.
      </ThemedText>
      <FilterDropdown label="Clarity grade" value={clarity} options={CLARITY_GRADES} onChange={setClarity} />

      <SectionHeader title="Estimated value range" />
      {estimate ? (
        <Card style={{ alignItems: "center", paddingVertical: spacing.xl }}>
          <ThemedText variant="caption" muted>
            Rough estimate
          </ThemedText>
          <ThemedText variant="display" color={colors.tint} style={{ marginTop: spacing.sm, fontSize: 30 }}>
            {currency(estimate.low)} – {currency(estimate.high)}
          </ThemedText>
          <ThemedText variant="caption" muted style={{ marginTop: spacing.sm }}>
            Midpoint: {currency(estimate.mid)}
          </ThemedText>
        </Card>
      ) : (
        <Card>
          <ThemedText variant="body" muted>
            Enter a valid carat weight to see an estimate.
          </ThemedText>
        </Card>
      )}

      <ThemedText variant="caption" muted style={styles.disclaimer}>
        This is a simplified formula for rough orientation only — actual prices vary widely by jeweller,
        market, certification, fluorescence, and individual stone characteristics a formula can't capture.
        For a real number, get a professional appraisal or a quote from a certified jeweller.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    fontSize: 17,
  },
  disclaimer: { marginTop: spacing.xl, marginBottom: spacing.xl, fontSize: 12, lineHeight: 17, textAlign: "center" },
});
