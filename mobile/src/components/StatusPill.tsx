import React from "react";
import { View, Text } from "react-native";
import { fontFamily, radii, useThemedStyles, useTheme, SemanticPalette } from "../theme";

export type PillTone = "success" | "warning" | "danger" | "neutral" | "info";

function getToneStyles(palette: SemanticPalette): Record<PillTone, { bg: string; fg: string }> {
  return {
    success: { bg: palette.successBg, fg: palette.success },
    warning: { bg: palette.warningBg, fg: palette.warning },
    danger: { bg: palette.dangerBg, fg: palette.danger },
    neutral: { bg: palette.neutralBg, fg: palette.textSecondary },
    info: { bg: palette.neutralBg, fg: palette.accentPrimary },
  };
}

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: PillTone }) {
  const { palette } = useTheme();
  const styles = useThemedStyles(() => ({
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.pill,
      alignSelf: "flex-start",
    },
    text: {
      fontSize: 11,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
  }));

  const t = getToneStyles(palette)[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}
