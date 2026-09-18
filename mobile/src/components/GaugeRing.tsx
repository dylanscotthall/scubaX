import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { fontFamily, useThemedStyles, useTheme, SemanticPalette } from "../theme";

interface GaugeRingProps {
  value: number;
  label: string;
  valueLabel: string;
  color?: string;
  centerColor?: string;
  size?: number;
  slots?: number;
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
) {
  const radians = ((angle - 90) * Math.PI) / 180;

  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeDonutSegment(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);

  const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);

  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);

  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);

  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function getCapacityColor(value: number, palette: SemanticPalette) {
  if (value >= 0.9) {
    return palette.danger;
  }

  if (value >= 0.75) {
    return palette.warning;
  }

  if (value >= 0.5) {
    // Premium "healthy/best" highlight instead of a generic green
    return palette.accentGlow;
  }

  if (value >= 0.25) {
    return palette.accentPrimary;
  }

  return palette.accentPrimaryPressed;
}

export function GaugeRing({
  value,
  label,
  valueLabel,
  color,
  centerColor,
  size = 84,
  slots = 8,
}: GaugeRingProps) {
  const { palette } = useTheme();
  const styles = useThemedStyles((p) => ({
    wrap: {
      alignItems: "center",
    },
    centerLabel: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    valueText: {
      fontFamily: fontFamily.readoutBold,
      fontSize: 13,
      textAlign: "center",
      paddingHorizontal: 4,
    },
    label: {
      paddingTop: 10,
      fontSize: 11,
      fontFamily: fontFamily.displayMedium,
      color: p.textSecondary,
      marginTop: 4,
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
  }));

  const center = size / 2;
  const outerRadius = size / 2;
  const innerRadius = size * 0.28;

  const clamped = Math.max(0, Math.min(1, value));

  const safeSlots = Math.max(1, Math.round(slots));
  const filledSlots = Math.round(clamped * safeSlots);

  const slotAngle = 360 / safeSlots;
  const gapAngle = Math.min(4, slotAngle * 0.18);

  const activeColor = color ?? getCapacityColor(clamped, palette);
  const resolvedCenterColor = centerColor ?? palette.surface;

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {Array.from({ length: safeSlots }).map((_, index) => {
            const startAngle = index * slotAngle + gapAngle / 2;

            const endAngle = (index + 1) * slotAngle - gapAngle / 2;

            const isFilled = index < filledSlots;

            return (
              <Path
                key={index}
                d={describeDonutSegment(
                  center,
                  center,
                  outerRadius,
                  innerRadius,
                  startAngle,
                  endAngle,
                )}
                fill={isFilled ? activeColor : palette.surfaceAlt}
              />
            );
          })}

          <Circle
            cx={center}
            cy={center}
            r={innerRadius - 1}
            fill={resolvedCenterColor}
          />
        </Svg>

        <View style={styles.centerLabel}>
          <Text
            style={[styles.valueText, { color: activeColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {valueLabel}
          </Text>
        </View>
      </View>

      <Text style={styles.label}>{label}</Text>
    </View>
  );
}
