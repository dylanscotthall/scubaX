import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ScreenHeader } from "../components/ScreenHeader";
import { ConditionReadout } from "../components/ConditionReadout";
import { ErrorBanner } from "../components/ErrorBanner";
import { HeroPanel } from "../components/HeroPanel";
import { EmptyState } from "../components/EmptyState";
import { NoticeBanner } from "../components/NoticeBanner";

import { colors, fontFamily, radii, shadows, spacing, useThemedStyles } from "../theme";

import { ApiError, apiRequest } from "../api/client";
import { SiteConditionReading } from "../api/types";
import { degreesToCompass } from "../utils/format";

function useConditionsStyles() {
  return useThemedStyles((p) => ({
    screen: {
      flex: 1,
      backgroundColor: colors.deepSea900,
    },
    content: {
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    heroEyebrow: {
      fontSize: 9,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 1.7,
      color: colors.highlight500,
    },
    heroTitle: {
      marginTop: 4,
      maxWidth: 260,
      fontSize: 23,
      lineHeight: 28,
      fontFamily: fontFamily.display,
      color: colors.white,
    },
    stationBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      borderRadius: radii.pill,
      backgroundColor: "rgba(255,255,255,0.1)",
    },
    stationDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      marginRight: 6,
      backgroundColor: colors.warning600,
    },
    stationBadgeText: {
      fontSize: 8,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 0.8,
      color: colors.white,
    },
    heroDescription: {
      marginTop: spacing.md,
      maxWidth: 320,
      fontSize: 13,
      lineHeight: 19,
      color: colors.sand100,
    },
    locationStrip: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.xl,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "rgba(255,255,255,0.2)",
    },
    locationItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    locationText: {
      marginLeft: spacing.xs,
      fontFamily: fontFamily.readoutBold,
      fontSize: 9,
      letterSpacing: 0.8,
      color: colors.white,
    },
    locationDivider: {
      width: StyleSheet.hairlineWidth,
      height: 18,
      marginHorizontal: spacing.md,
      backgroundColor: "rgba(255,255,255,0.2)",
    },
    instrumentPanel: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.border,
      ...shadows.card,
    },
    panelHeading: {
      flexDirection: "row",
      alignItems: "center",
    },
    panelHeadingIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.sm,
      backgroundColor: p.warningBg,
    },
    panelEyebrow: {
      fontSize: 8,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 1.3,
      color: colors.warning600,
    },
    panelTitle: {
      marginTop: 2,
      fontSize: 18,
      fontFamily: fontFamily.display,
      color: p.textPrimary,
    },
    conditionGrid: {
      flexDirection: "row",
      alignItems: "stretch",
      marginTop: spacing.lg,
    },
    verticalRule: {
      width: StyleSheet.hairlineWidth,
      marginVertical: spacing.sm,
      backgroundColor: p.borderStrong,
    },
    panelFooterNote: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.borderStrong,
    },
    panelFooterText: {
      flex: 1,
      marginLeft: spacing.xs,
      fontSize: 10,
      lineHeight: 14,
      color: p.textTertiary,
    },
    directionReadout: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radii.sm,
      backgroundColor: p.backgroundAlt,
    },
    directionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.border,
    },
    directionText: {
      flex: 1,
      marginLeft: spacing.sm,
    },
    directionLabel: {
      fontSize: 8,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 1,
      color: p.textTertiary,
    },
    directionValue: {
      marginTop: 3,
      fontFamily: fontFamily.readoutBold,
      fontSize: 13,
      color: p.textPrimary,
    },
    compassNeedle: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    sourcePanel: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.md,
      backgroundColor: colors.navy900,
    },
    sourceTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    sourceEyebrow: {
      fontSize: 8,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 1.3,
      color: colors.sky400,
    },
    sourceTitle: {
      marginTop: 3,
      fontSize: 17,
      fontFamily: fontFamily.display,
      color: colors.white,
    },
    sourceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "rgba(255,255,255,0.15)",
    },
    sourceLabel: {
      fontSize: 8,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 1,
      color: colors.sky400,
    },
    sourceValue: {
      flex: 1,
      marginLeft: spacing.md,
      fontFamily: fontFamily.readout,
      fontSize: 10,
      textAlign: "right",
      color: colors.white,
    },
    disclaimer: {
      marginTop: spacing.md,
      fontSize: 10,
      lineHeight: 15,
      color: colors.slate200,
    },
  }));
}

function DirectionReadout({
  icon,
  label,
  degrees,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  degrees: number | null | undefined;
}) {
  const styles = useConditionsStyles();
  const hasValue = typeof degrees === "number" && Number.isFinite(degrees);

  return (
    <View style={styles.directionReadout}>
      <View style={styles.directionIcon}>
        <Ionicons name={icon} size={18} color={colors.ocean600} />
      </View>

      <View style={styles.directionText}>
        <Text style={styles.directionLabel}>{label}</Text>

        <Text style={styles.directionValue}>
          {hasValue
            ? `${degreesToCompass(degrees)} · ${degrees}°`
            : "Unavailable"}
        </Text>
      </View>

      <View
        style={[
          styles.compassNeedle,
          {
            transform: [
              {
                rotate: `${hasValue ? degrees : 0}deg`,
              },
            ],
            opacity: hasValue ? 1 : 0.25,
          },
        ]}
      >
        <Ionicons name="navigate" size={19} color={colors.warning600} />
      </View>
    </View>
  );
}

function PanelHeading({
  eyebrow,
  title,
  icon,
}: {
  eyebrow: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const styles = useConditionsStyles();
  return (
    <View style={styles.panelHeading}>
      <View style={styles.panelHeadingIcon}>
        <Ionicons name={icon} size={17} color={colors.warning600} />
      </View>

      <View>
        <Text style={styles.panelEyebrow}>{eyebrow}</Text>

        <Text style={styles.panelTitle}>{title}</Text>
      </View>
    </View>
  );
}

export function ConditionsScreen() {
  const styles = useConditionsStyles();
  const [reading, setReading] = useState<SiteConditionReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await apiRequest<{
        siteCondition: SiteConditionReading | null;
      }>("/conditions/latest");
      setReading(response.siteCondition);
    } catch (loadError) {
      setError(
        loadError instanceof ApiError
          ? loadError.message
          : "Could not load sea conditions.",
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);

    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Sea conditions" subtitle="Umkomaas / Aliwal Shoal" />

      <ScrollView
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.sky400}
          />
        }
      >
        {error && <ErrorBanner message={error} onRetry={load} />}

        <HeroPanel>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroEyebrow}>MARINE OBSERVATION</Text>

              <Text style={styles.heroTitle}>Offshore instrument panel</Text>
            </View>

            <View style={styles.stationBadge}>
              <View style={styles.stationDot} />

              <Text style={styles.stationBadgeText}>RECORDED</Text>
            </View>
          </View>

          <Text style={styles.heroDescription}>
            Latest recorded conditions for the Aliwal Shoal operating area.
          </Text>

          <View style={styles.locationStrip}>
            <View style={styles.locationItem}>
              <Ionicons
                name="location-outline"
                size={15}
                color={colors.sky400}
              />

              <Text style={styles.locationText}>UMKOMAAS</Text>
            </View>

            <View style={styles.locationDivider} />

            <View style={styles.locationItem}>
              <Ionicons
                name="compass-outline"
                size={15}
                color={colors.sky400}
              />

              <Text style={styles.locationText}>ALIWAL SHOAL</Text>
            </View>
          </View>
        </HeroPanel>

        <NoticeBanner
          icon="radio-outline"
          title="Latest recorded feed"
          body="Readings come from the latest condition record in the backend. Staff can replace this source with a live feed later."
        />

        {!reading ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="No readings available"
            body="Pull down to check for a new observation."
          />
        ) : (
          <>
            <View style={styles.instrumentPanel}>
              <PanelHeading
                eyebrow="SEA STATE"
                title="Waves"
                icon="water-outline"
              />

              <View style={styles.conditionGrid}>
                <ConditionReadout
                  type="waveHeight"
                  value={reading.significantWaveHeightM}
                  label="Significant"
                  size={64}
                />

                <View style={styles.verticalRule} />

                <ConditionReadout
                  type="waveHeight"
                  value={reading.maxWaveHeightM}
                  label="Maximum"
                  size={64}
                />

                <View style={styles.verticalRule} />

                <ConditionReadout
                  type="wavePeriod"
                  value={reading.meanWavePeriodS}
                  label="Mean period"
                  size={64}
                />
              </View>

              <View style={styles.panelFooterNote}>
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={colors.slate400}
                />

                <Text style={styles.panelFooterText}>
                  Maximum wave height may exceed the significant-wave reading.
                </Text>
              </View>
            </View>

            <View style={styles.instrumentPanel}>
              <PanelHeading
                eyebrow="ATMOSPHERIC"
                title="Weather"
                icon="partly-sunny-outline"
              />

              <View style={styles.conditionGrid}>
                <ConditionReadout
                  type="windSpeed"
                  value={reading.windSpeedMps}
                  label="Wind speed"
                  size={64}
                />

                <View style={styles.verticalRule} />

                <ConditionReadout
                  type="airTemperature"
                  value={reading.airTemperatureC}
                  label="Air temp"
                  size={64}
                />

                <View style={styles.verticalRule} />

                <ConditionReadout
                  type="pressure"
                  value={reading.airPressureHpa}
                  label="Pressure"
                  size={64}
                />
              </View>

              <DirectionReadout
                icon="flag-outline"
                label="Wind direction"
                degrees={reading.windDirectionDeg}
              />
            </View>

            <View style={styles.instrumentPanel}>
              <PanelHeading
                eyebrow="SUBSURFACE"
                title="Current and temperature"
                icon="navigate-circle-outline"
              />

              <View style={styles.conditionGrid}>
                <ConditionReadout
                  type="currentSpeed"
                  value={reading.meanCurrentSpeedMps}
                  label="Mean Current speed"
                  size={70}
                />

                <View style={styles.verticalRule} />

                <ConditionReadout
                  type="currentSpeed"
                  value={reading.surfaceCurrentSpeedMps}
                  label="Surface Current speed"
                  size={70}
                />

                <View style={styles.verticalRule} />

                <ConditionReadout
                  type="seaTemperature"
                  value={reading.seaSurfaceTempC}
                  label="Sea temperature"
                  size={70}
                />
              </View>

              <DirectionReadout
                icon="compass-outline"
                label="Current direction"
                degrees={reading.currentDirectionDeg}
              />
            </View>

            <View style={styles.sourcePanel}>
              <View style={styles.sourceTopRow}>
                <View>
                  <Text style={styles.sourceEyebrow}>OBSERVATION RECORD</Text>

                  <Text style={styles.sourceTitle}>Data provenance</Text>
                </View>

                <Ionicons
                  name="document-text-outline"
                  size={22}
                  color={colors.warning600}
                />
              </View>

              <View style={styles.sourceRow}>
                <Text style={styles.sourceLabel}>SOURCE</Text>

                <Text style={styles.sourceValue}>{reading.source}</Text>
              </View>

              <View style={styles.sourceRow}>
                <Text style={styles.sourceLabel}>RECORDED</Text>

                <Text style={styles.sourceValue}>
                  {new Date(reading.recordedAt).toLocaleString()}
                </Text>
              </View>

              <Text style={styles.disclaimer}>
                Conditions are observational only. Skipper assessment and local
                operational guidance take priority.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
