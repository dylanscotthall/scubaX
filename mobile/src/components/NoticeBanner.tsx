import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fontFamily, radii, spacing, useThemedStyles, useTheme } from "../theme";

interface NoticeBannerProps {
  icon: keyof typeof Ionicons.glyphMap;
  title?: string;
  body: string;
}

// Shared "advisory" banner — amber/warning tinted, for informational notices
// that aren't errors. ErrorBanner stays separate: that's for load failures.
export function NoticeBanner({ icon, title, body }: NoticeBannerProps) {
  const { palette } = useTheme();
  const styles = useThemedStyles((p) => ({
    container: {
      flexDirection: "row",
      gap: spacing.sm,
      alignItems: "flex-start",
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.md,
      backgroundColor: p.warningBg,
      borderWidth: 1,
      borderColor: p.warning,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: p.background,
    },
    textWrap: {
      flex: 1,
    },
    title: {
      fontSize: 13,
      fontFamily: fontFamily.displayMedium,
      color: p.warning,
    },
    body: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 18,
      color: p.warning,
    },
    bodyStandalone: {
      marginTop: 0,
      fontSize: 13,
    },
  }));

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={19} color={palette.warning} />
      </View>
      <View style={styles.textWrap}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={[styles.body, !title && styles.bodyStandalone]}>{body}</Text>
      </View>
    </View>
  );
}
