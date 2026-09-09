import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import { colors, radii, spacing } from "../theme";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = "primary", loading, disabled, style }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? colors.ocean600 : colors.white} />
      ) : (
        <Text style={[styles.label, textVariantStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 13,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
});

const variantStyles: Record<string, ViewStyle> = {
  primary: { backgroundColor: colors.ocean600 },
  secondary: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.ocean600 },
  danger: { backgroundColor: colors.brick600 },
  ghost: { backgroundColor: "transparent" },
};

const textVariantStyles: Record<string, { color: string }> = {
  primary: { color: colors.white },
  secondary: { color: colors.ocean600 },
  danger: { color: colors.white },
  ghost: { color: colors.ocean600 },
};
