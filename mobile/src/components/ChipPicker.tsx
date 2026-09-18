import React from "react";
import { Pressable, Text, View } from "react-native";
import { fontFamily, radii, spacing, useThemedStyles } from "../theme";

export interface ChipOption {
  label: string;
  value: string;
}

interface ChipPickerProps {
  options: ChipOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
}

export function ChipPicker({
  options,
  value,
  onChange,
  allowNone,
  noneLabel = "None",
}: ChipPickerProps) {
  const styles = useThemedStyles((p) => ({
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      borderRadius: radii.sm,
      borderWidth: 1.5,
      borderColor: p.borderStrong,
      backgroundColor: p.surface,
    },
    chipActive: {
      backgroundColor: p.accentPrimary,
      borderColor: p.accentPrimary,
    },
    chipText: {
      fontSize: 13,
      fontFamily: fontFamily.displayMedium,
      color: p.textPrimary,
    },
    chipTextActive: {
      color: p.textOnAccent,
    },
  }));

  return (
    <View style={styles.chipRow}>
      {allowNone && (
        <Pressable
          onPress={() => onChange(null)}
          style={[styles.chip, value === null && styles.chipActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: value === null }}
        >
          <Text style={[styles.chipText, value === null && styles.chipTextActive]}>
            {noneLabel}
          </Text>
        </Pressable>
      )}
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
