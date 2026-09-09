import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { colors, readoutFontFamily, spacing } from "../theme";

export type ConditionType =
  | "waveHeight"
  | "wavePeriod"
  | "windSpeed"
  | "airTemperature"
  | "seaTemperature"
  | "currentSpeed"
  | "pressure";

interface ConditionReadoutProps {
  type: ConditionType;
  value: number | null | undefined;
  label?: string;
  size?: number;
}

interface ConditionPresentation {
  status: string;
  color: string;
  formattedValue: string;
  defaultLabel: string;
}

const fallbackColor = colors.ocean600;

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function getWaveHeightPresentation(value: number): ConditionPresentation {
  if (value < 0.5) {
    return {
      status: "Low",
      color: colors.sky400,
      formattedValue: `${value.toFixed(1)} m`,
      defaultLabel: "Wave height",
    };
  }

  if (value < 1.0) {
    return {
      status: "Small",
      color: colors.ocean600,
      formattedValue: `${value.toFixed(1)} m`,
      defaultLabel: "Wave height",
    };
  }

  if (value < 2.0) {
    return {
      status: "Moderate",
      color: colors.warning600,
      formattedValue: `${value.toFixed(1)} m`,
      defaultLabel: "Wave height",
    };
  }

  if (value < 3.0) {
    return {
      status: "Large",
      color: colors.red600,
      formattedValue: `${value.toFixed(1)} m`,
      defaultLabel: "Wave height",
    };
  }

  return {
    status: "Very large",
    color: colors.red600,
    formattedValue: `${value.toFixed(1)} m`,
    defaultLabel: "Wave height",
  };
}

function getWavePeriodPresentation(value: number): ConditionPresentation {
  if (value < 6) {
    return {
      status: "Short period",
      color: colors.sky400,
      formattedValue: `${value.toFixed(0)} s`,
      defaultLabel: "Wave period",
    };
  }

  if (value < 10) {
    return {
      status: "Medium period",
      color: colors.ocean600,
      formattedValue: `${value.toFixed(0)} s`,
      defaultLabel: "Wave period",
    };
  }

  if (value < 14) {
    return {
      status: "Long period",
      color: colors.warning600,
      formattedValue: `${value.toFixed(0)} s`,
      defaultLabel: "Wave period",
    };
  }

  return {
    status: "Very long period",
    color: colors.red600,
    formattedValue: `${value.toFixed(0)} s`,
    defaultLabel: "Wave period",
  };
}

function getWindPresentation(value: number): ConditionPresentation {
  // Approximate Beaufort categories using metres per second.
  if (value < 0.5) {
    return {
      status: "Calm",
      color: colors.sky400,
      formattedValue: `${value.toFixed(1)} m/s`,
      defaultLabel: "Wind",
    };
  }

  if (value < 3.4) {
    return {
      status: "Light breeze",
      color: colors.sky400,
      formattedValue: `${value.toFixed(1)} m/s`,
      defaultLabel: "Wind",
    };
  }

  if (value < 5.5) {
    return {
      status: "Gentle breeze",
      color: colors.ocean600,
      formattedValue: `${value.toFixed(1)} m/s`,
      defaultLabel: "Wind",
    };
  }

  if (value < 8.0) {
    return {
      status: "Moderate breeze",
      color: colors.ocean600,
      formattedValue: `${value.toFixed(1)} m/s`,
      defaultLabel: "Wind",
    };
  }

  if (value < 10.8) {
    return {
      status: "Fresh breeze",
      color: colors.warning600,
      formattedValue: `${value.toFixed(1)} m/s`,
      defaultLabel: "Wind",
    };
  }

  if (value < 13.9) {
    return {
      status: "Strong breeze",
      color: colors.red600,
      formattedValue: `${value.toFixed(1)} m/s`,
      defaultLabel: "Wind",
    };
  }

  return {
    status: "Very strong",
    color: colors.red600,
    formattedValue: `${value.toFixed(1)} m/s`,
    defaultLabel: "Wind",
  };
}

function getTemperaturePresentation(
  value: number,
  type: "airTemperature" | "seaTemperature",
): ConditionPresentation {
  const defaultLabel = type === "seaTemperature" ? "Sea temp" : "Air temp";

  if (value < 15) {
    return {
      status: "Cold",
      color: colors.sky400,
      formattedValue: `${value.toFixed(1)}°C`,
      defaultLabel,
    };
  }

  if (value < 20) {
    return {
      status: "Cool",
      color: colors.ocean600,
      formattedValue: `${value.toFixed(1)}°C`,
      defaultLabel,
    };
  }

  if (value < 25) {
    return {
      status: "Mild",
      color: colors.ocean600,
      formattedValue: `${value.toFixed(1)}°C`,
      defaultLabel,
    };
  }

  if (value < 29) {
    return {
      status: "Warm",
      color: colors.warning600,
      formattedValue: `${value.toFixed(1)}°C`,
      defaultLabel,
    };
  }

  return {
    status: "Very warm",
    color: colors.red600,
    formattedValue: `${value.toFixed(1)}°C`,
    defaultLabel,
  };
}

function getCurrentPresentation(value: number): ConditionPresentation {
  if (value < 0.15) {
    return {
      status: "Very light",
      color: colors.sky400,
      formattedValue: `${value.toFixed(1)} m/s`,
      defaultLabel: "Current",
    };
  }

  if (value < 0.4) {
    return {
      status: "Light",
      color: colors.ocean600,
      formattedValue: `${value.toFixed(1)} m/s`,
      defaultLabel: "Current",
    };
  }

  if (value < 0.7) {
    return {
      status: "Moderate",
      color: colors.warning600,
      formattedValue: `${value.toFixed(1)} m/s`,
      defaultLabel: "Current",
    };
  }

  if (value < 1.0) {
    return {
      status: "Strong",
      color: colors.red600,
      formattedValue: `${value.toFixed(1)} m/s`,
      defaultLabel: "Current",
    };
  }

  return {
    status: "Very strong",
    color: colors.red600,
    formattedValue: `${value.toFixed(1)} m/s`,
    defaultLabel: "Current",
  };
}

function getPressurePresentation(value: number): ConditionPresentation {
  if (value < 1000) {
    return {
      status: "Low",
      color: colors.warning600,
      formattedValue: `${value.toFixed(0)} hPa`,
      defaultLabel: "Pressure",
    };
  }

  if (value <= 1025) {
    return {
      status: "Typical",
      color: colors.ocean600,
      formattedValue: `${value.toFixed(0)} hPa`,
      defaultLabel: "Pressure",
    };
  }

  return {
    status: "High",
    color: colors.sky400,
    formattedValue: `${value.toFixed(0)} hPa`,
    defaultLabel: "Pressure",
  };
}

function getPresentation(
  type: ConditionType,
  value: number,
): ConditionPresentation {
  switch (type) {
    case "waveHeight":
      return getWaveHeightPresentation(value);

    case "wavePeriod":
      return getWavePeriodPresentation(value);

    case "windSpeed":
      return getWindPresentation(value);

    case "airTemperature":
    case "seaTemperature":
      return getTemperaturePresentation(value, type);

    case "currentSpeed":
      return getCurrentPresentation(value);

    case "pressure":
      return getPressurePresentation(value);

    default:
      return {
        status: "Unknown",
        color: fallbackColor,
        formattedValue: String(value),
        defaultLabel: "Condition",
      };
  }
}

function WaveHeightIcon({
  value,
  size,
  color,
}: {
  value: number;
  size: number;
  color: string;
}) {
  const normalized = clamp(value / 3);
  const amplitude = 4 + normalized * 10;
  const middleY = size * 0.48;

  const wavePath = [
    `M 4 ${middleY}`,
    `C ${size * 0.17} ${middleY - amplitude}`,
    `${size * 0.31} ${middleY - amplitude}`,
    `${size * 0.45} ${middleY}`,
    `C ${size * 0.59} ${middleY + amplitude}`,
    `${size * 0.73} ${middleY + amplitude}`,
    `${size - 4} ${middleY}`,
  ].join(" ");

  return (
    <Svg width={size} height={size}>
      <Path
        d={wavePath}
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />

      <Path
        d={wavePath}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
        opacity={0.3}
        transform={`translate(0 ${size * 0.2})`}
      />

      <Line
        x1={4}
        y1={size - 5}
        x2={size - 4}
        y2={size - 5}
        stroke={colors.sand100}
        strokeWidth={2}
      />
    </Svg>
  );
}

function WavePeriodIcon({
  value,
  size,
  color,
}: {
  value: number;
  size: number;
  color: string;
}) {
  const normalized = clamp((value - 3) / 13);

  // Longer periods produce wider-spaced waves.
  const waveCount = 3 - normalized * 1.5;
  const width = size - 8;
  const centerY = size * 0.5;
  const amplitude = size * 0.13;

  let path = `M 4 ${centerY}`;

  const points = 36;

  for (let index = 1; index <= points; index += 1) {
    const progress = index / points;
    const x = 4 + progress * width;
    const y =
      centerY + Math.sin(progress * Math.PI * 2 * waveCount) * amplitude;

    path += ` L ${x} ${y}`;
  }

  return (
    <Svg width={size} height={size}>
      <Path
        d={path}
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      <Line
        x1={size * 0.18}
        y1={size * 0.77}
        x2={size * 0.82}
        y2={size * 0.77}
        stroke={colors.slate400}
        strokeWidth={1.5}
      />

      <Line
        x1={size * 0.18}
        y1={size * 0.71}
        x2={size * 0.18}
        y2={size * 0.83}
        stroke={colors.slate400}
        strokeWidth={1.5}
      />

      <Line
        x1={size * 0.82}
        y1={size * 0.71}
        x2={size * 0.82}
        y2={size * 0.83}
        stroke={colors.slate400}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

function WindIcon({
  value,
  size,
  color,
}: {
  value: number;
  size: number;
  color: string;
}) {
  const normalized = clamp(value / 15);
  const strokeWidth = 2.5 + normalized * 2;

  return (
    <Svg width={size} height={size}>
      <Path
        d={[
          `M 6 ${size * 0.34}`,
          `H ${size * 0.66}`,
          `C ${size * 0.88} ${size * 0.34}`,
          `${size * 0.88} ${size * 0.13}`,
          `${size * 0.7} ${size * 0.13}`,
        ].join(" ")}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />

      <Path
        d={[`M 6 ${size * 0.52}`, `H ${size * 0.88}`].join(" ")}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />

      <Path
        d={[
          `M 6 ${size * 0.7}`,
          `H ${size * 0.59}`,
          `C ${size * 0.79} ${size * 0.7}`,
          `${size * 0.8} ${size * 0.88}`,
          `${size * 0.64} ${size * 0.88}`,
        ].join(" ")}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

function ThermometerIcon({
  value,
  size,
  color,
  gradientId,
}: {
  value: number;
  size: number;
  color: string;
  gradientId: string;
}) {
  const normalized = clamp((value - 5) / 30);

  const tubeTop = size * 0.1;
  const tubeBottom = size * 0.69;
  const tubeHeight = tubeBottom - tubeTop;
  const fillHeight = Math.max(4, tubeHeight * normalized);
  const fillY = tubeBottom - fillHeight;

  const tubeX = size * 0.42;
  const tubeWidth = size * 0.16;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={color} stopOpacity={0.6} />
        </LinearGradient>
      </Defs>

      <Rect
        x={tubeX}
        y={tubeTop}
        width={tubeWidth}
        height={tubeHeight}
        rx={tubeWidth / 2}
        fill={colors.sand100}
      />

      <Rect
        x={tubeX}
        y={fillY}
        width={tubeWidth}
        height={fillHeight}
        rx={tubeWidth / 2}
        fill={`url(#${gradientId})`}
      />

      <Circle cx={size / 2} cy={size * 0.77} r={size * 0.17} fill={color} />

      {[0.24, 0.41, 0.58].map((position) => (
        <Line
          key={position}
          x1={size * 0.63}
          y1={size * position}
          x2={size * 0.73}
          y2={size * position}
          stroke={colors.slate600}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.5}
        />
      ))}
    </Svg>
  );
}

function CurrentIcon({
  value,
  size,
  color,
}: {
  value: number;
  size: number;
  color: string;
}) {
  const normalized = clamp(value / 1.2);
  const arrowLength = size * (0.4 + normalized * 0.32);
  const startX = (size - arrowLength) / 2;
  const endX = startX + arrowLength;
  const centerY = size / 2;

  return (
    <Svg width={size} height={size}>
      <Path
        d={[
          `M ${startX} ${centerY}`,
          `H ${endX}`,
          `M ${endX} ${centerY}`,
          `L ${endX - size * 0.18} ${centerY - size * 0.16}`,
          `M ${endX} ${centerY}`,
          `L ${endX - size * 0.18} ${centerY + size * 0.16}`,
        ].join(" ")}
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      <Path
        d={[
          `M ${size * 0.12} ${size * 0.76}`,
          `C ${size * 0.27} ${size * 0.67}`,
          `${size * 0.42} ${size * 0.85}`,
          `${size * 0.58} ${size * 0.76}`,
          `C ${size * 0.7} ${size * 0.69}`,
          `${size * 0.8} ${size * 0.77}`,
          `${size * 0.9} ${size * 0.72}`,
        ].join(" ")}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
        opacity={0.35}
      />
    </Svg>
  );
}

function PressureIcon({
  value,
  size,
  color,
}: {
  value: number;
  size: number;
  color: string;
}) {
  const normalized = clamp((value - 980) / 60);
  const center = size / 2;
  const radius = size * 0.34;

  const startAngle = -140;
  const endAngle = 140;
  const needleAngle = startAngle + normalized * (endAngle - startAngle);
  const radians = (needleAngle * Math.PI) / 180;

  const needleX = center + Math.cos(radians) * radius * 0.72;
  const needleY = center + Math.sin(radians) * radius * 0.72;

  return (
    <Svg width={size} height={size}>
      <Circle cx={center} cy={center} r={radius} fill={colors.sand100} />

      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={3}
        fill="none"
      />

      <Line
        x1={center}
        y1={center}
        x2={needleX}
        y2={needleY}
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
      />

      <Circle cx={center} cy={center} r={4} fill={color} />
    </Svg>
  );
}

function ConditionIcon({
  type,
  value,
  size,
  color,
}: {
  type: ConditionType;
  value: number;
  size: number;
  color: string;
}) {
  switch (type) {
    case "waveHeight":
      return <WaveHeightIcon value={value} size={size} color={color} />;

    case "wavePeriod":
      return <WavePeriodIcon value={value} size={size} color={color} />;

    case "windSpeed":
      return <WindIcon value={value} size={size} color={color} />;

    case "airTemperature":
      return (
        <ThermometerIcon
          value={value}
          size={size}
          color={color}
          gradientId="airTemperatureGradient"
        />
      );

    case "seaTemperature":
      return (
        <ThermometerIcon
          value={value}
          size={size}
          color={color}
          gradientId="seaTemperatureGradient"
        />
      );

    case "currentSpeed":
      return <CurrentIcon value={value} size={size} color={color} />;

    case "pressure":
      return <PressureIcon value={value} size={size} color={color} />;

    default:
      return null;
  }
}

export function ConditionReadout({
  type,
  value,
  label,
  size = 68,
}: ConditionReadoutProps) {
  const hasValue = typeof value === "number" && Number.isFinite(value);

  const presentation: ConditionPresentation = hasValue
    ? getPresentation(type, value)
    : {
        status: "Unavailable",
        color: fallbackColor,
        formattedValue: "—",
        defaultLabel: label ?? "Condition",
      };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconContainer,
          {
            width: size,
            height: size,
            opacity: hasValue ? 1 : 0.35,
          },
        ]}
      >
        {hasValue && (
          <ConditionIcon
            type={type}
            value={value}
            size={size}
            color={presentation.color}
          />
        )}
      </View>

      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {presentation.formattedValue}
      </Text>

      <Text
        style={[styles.status, { color: presentation.color }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {presentation.status}
      </Text>

      <Text style={styles.label} numberOfLines={2}>
        {label ?? presentation.defaultLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    minWidth: 88,
    maxWidth: 130,
    paddingHorizontal: spacing.xs,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  value: {
    fontFamily: readoutFontFamily,
    fontSize: 17,
    fontWeight: "700",
    color: colors.navy900,
    textAlign: "center",
  },
  status: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.25,
    textAlign: "center",
  },
  label: {
    marginTop: spacing.xs,
    minHeight: 28,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    color: colors.slate600,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.25,
  },
});
