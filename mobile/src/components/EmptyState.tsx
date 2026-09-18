import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fontFamily, radii, spacing, useThemedStyles, useTheme } from "../theme";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

export function EmptyState({ icon, title, body }: EmptyStateProps) {
  const { palette } = useTheme();
  const styles = useThemedStyles((p) => ({
    panel: {
      alignItems: "center",
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      padding: spacing.xl,
      borderRadius: radii.lg,
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.border,
    },
    icon: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: p.backgroundAlt,
    },
    title: {
      marginTop: spacing.md,
      fontSize: 18,
      fontFamily: fontFamily.display,
      color: p.textPrimary,
    },
    body: {
      marginTop: spacing.xs,
      fontSize: 13,
      color: p.textSecondary,
      textAlign: "center",
    },
  }));

  return (
    <View style={styles.panel}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={30} color={palette.accentPrimary} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}
