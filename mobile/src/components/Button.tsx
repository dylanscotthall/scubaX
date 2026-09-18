import React from "react";
import { Pressable, Text, ActivityIndicator, ViewStyle } from "react-native";
import { fontFamily, radii, spacing, useThemedStyles, useTheme, SemanticPalette } from "../theme";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

function getVariantStyles(variant: ButtonProps["variant"], palette: SemanticPalette) {
  const variantStyles: Record<string, ViewStyle> = {
    primary: { backgroundColor: palette.accentPrimary },
    secondary: { backgroundColor: palette.surface, borderWidth: 1.5, borderColor: palette.accentPrimary },
    danger: { backgroundColor: palette.danger },
    ghost: { backgroundColor: "transparent" },
  };
  const textVariantStyles: Record<string, { color: string }> = {
    primary: { color: palette.textOnAccent },
    secondary: { color: palette.accentPrimary },
    danger: { color: palette.textOnAccent },
    ghost: { color: palette.accentPrimary },
  };
  return { variantStyles, textVariantStyles };
}

export function Button({ label, onPress, variant = "primary", loading, disabled, style }: ButtonProps) {
  const { palette } = useTheme();
  const { variantStyles, textVariantStyles } = getVariantStyles(variant, palette);
  const styles = useThemedStyles(() => ({
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
      fontFamily: fontFamily.displayMedium,
    },
  }));

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
        <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? palette.accentPrimary : palette.textOnAccent} />
      ) : (
        <Text style={[styles.label, textVariantStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}
