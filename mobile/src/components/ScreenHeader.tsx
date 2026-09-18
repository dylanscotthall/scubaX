import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fontFamily, gradients, spacing } from "../theme";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, showLogo = false, right }: ScreenHeaderProps) {
  return (
    <LinearGradient
      colors={gradients.oceanHeader}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView edges={["top"]}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {showLogo && (
            <Image
              source={require("../../assets/sx_logo_transparent.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          )}
          {right}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    minHeight: 48,
  },
  title: {
    color: colors.white,
    fontSize: 22,
    fontFamily: fontFamily.display,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginTop: 2,
  },
  logo: {
    width: 42,
    height: 42,
  },
});
