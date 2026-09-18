import React from "react";
import { View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { radii, shadows, spacing, useThemedStyles, useTheme } from "../theme";

interface RivetProps {
  position: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
}

const RIVET_INSET = 10;

export function Rivet({ position }: RivetProps) {
  const styles = useThemedStyles(() => ({
    rivet: {
      position: "absolute",
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    rivetCenter: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: "rgba(255,255,255,0.5)",
    },
    topLeft: { top: RIVET_INSET, left: RIVET_INSET },
    topRight: { top: RIVET_INSET, right: RIVET_INSET },
    bottomLeft: { bottom: RIVET_INSET, left: RIVET_INSET },
    bottomRight: { bottom: RIVET_INSET, right: RIVET_INSET },
  }));

  return (
    <View style={[styles.rivet, styles[position]]}>
      <View style={styles.rivetCenter} />
    </View>
  );
}

interface HeroPanelProps {
  children: React.ReactNode;
  rivets?: boolean;
  style?: ViewStyle;
}

// Shared outer chrome for every screen's "hero" panel — the oceanHeader
// gradient, corner radius and shadow, so those stay pixel-identical across
// screens instead of drifting file to file. Each screen supplies its own
// inner content (readouts, stats, CTA, ...) as children.
export function HeroPanel({ children, rivets = false, style }: HeroPanelProps) {
  const { gradients } = useTheme();
  const styles = useThemedStyles(() => ({
    panel: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      borderRadius: radii.xl,
      padding: spacing.xl,
      overflow: "hidden",
      ...shadows.hero,
    },
  }));

  return (
    <LinearGradient
      colors={gradients.oceanHeader}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.panel, style]}
    >
      {rivets && (
        <>
          <Rivet position="topLeft" />
          <Rivet position="topRight" />
          <Rivet position="bottomLeft" />
          <Rivet position="bottomRight" />
        </>
      )}
      {children}
    </LinearGradient>
  );
}
