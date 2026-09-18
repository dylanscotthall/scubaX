import React from "react";
import { View, ViewStyle } from "react-native";
import { radii, shadows, spacing, useThemedStyles } from "../theme";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const styles = useThemedStyles((palette) => ({
    card: {
      backgroundColor: palette.surface,
      borderRadius: radii.md,
      padding: spacing.lg,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      ...shadows.card,
      borderWidth: 1,
      borderColor: palette.border,
    },
  }));

  return <View style={[styles.card, style]}>{children}</View>;
}
