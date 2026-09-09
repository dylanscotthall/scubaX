import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "../theme";

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.container}>
      <Ionicons name="warning-outline" size={19} color={colors.danger600} />
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

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.danger600,
    backgroundColor: colors.white,
  },
  textWrap: { flex: 1 },
  message: {
    color: colors.navy900,
    fontSize: 13,
    lineHeight: 18,
  },
  retry: {
    color: colors.ocean600,
    fontSize: 13,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
});
