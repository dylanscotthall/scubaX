import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fontFamily, radii, spacing, useThemedStyles, useTheme } from "../theme";

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { palette } = useTheme();
  const styles = useThemedStyles((p) => ({
    container: {
      flexDirection: "row",
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: p.danger,
      backgroundColor: p.surface,
    },
    textWrap: { flex: 1 },
    message: {
      color: p.textPrimary,
      fontSize: 13,
      lineHeight: 18,
    },
    retry: {
      color: p.accentPrimary,
      fontSize: 13,
      fontFamily: fontFamily.displayMedium,
      marginTop: spacing.xs,
    },
  }));

  return (
    <View style={styles.container}>
      <Ionicons name="warning-outline" size={19} color={palette.danger} />
      <View style={styles.textWrap}>
        <Text style={styles.message}>{message}</Text>
        {onRetry && (
          <Pressable onPress={onRetry} accessibilityRole="button">
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
