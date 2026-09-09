import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radii } from "../theme";

export type PillTone = "success" | "warning" | "danger" | "neutral" | "info";

const TONE_STYLES: Record<PillTone, { bg: string; fg: string }> = {
  success: { bg: colors.successBg, fg: colors.success600 },
  warning: { bg: colors.warningBg, fg: colors.warning600 },
  danger: { bg: colors.dangerBg, fg: colors.danger600 },
  neutral: { bg: colors.neutralBg, fg: colors.slate600 },
  info: { bg: "#E3EEF6", fg: colors.ocean600 },
};

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: PillTone }) {
  const t = TONE_STYLES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
