import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { ScreenHeader } from "../components/ScreenHeader";
import { GaugeRing } from "../components/GaugeRing";
import { StatusPill } from "../components/StatusPill";
import { ConditionReadout } from "../components/ConditionReadout";
import { ErrorBanner } from "../components/ErrorBanner";
import { HeroPanel } from "../components/HeroPanel";
import { EmptyState } from "../components/EmptyState";

import { colors, fontFamily, radii, shadows, spacing, useThemedStyles } from "../theme";

import { ApiError, apiRequest } from "../api/client";
import { SiteConditionReading, Trip } from "../api/types";
import { useAuth } from "../context/AuthContext";

import {
  daysUntil,
  formatTripDate,
  formatTripDateFull,
  todayIsoDate,
} from "../utils/format";

interface InstrumentReadoutProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

function useHomeStyles() {
  return useThemedStyles((p) => ({
    screen: {
      flex: 1,
      backgroundColor: colors.deepSea900,
    },

    headerActions: {
      flexDirection: "row",
      gap: spacing.sm,
    },

    logoutButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.14)",
    },

    logoutButtonPressed: {
      backgroundColor: "rgba(255,255,255,0.26)",
    },

    scrollContent: {
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxxl,
    },

    heroTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.md,
    },

    eyebrow: {
      fontSize: 10,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 1.8,
      color: colors.highlight500,
    },

    heroSite: {
      marginTop: spacing.xs,
      maxWidth: 250,
      fontSize: 25,
      lineHeight: 29,
      fontFamily: fontFamily.display,
      color: colors.highlight400,
    },

    heroDate: {
      marginTop: spacing.sm,
      fontFamily: fontFamily.readout,
      fontSize: 13,
      color: colors.highlight500,
    },

    heroDivider: {
      height: StyleSheet.hairlineWidth,
      marginVertical: spacing.lg,
      backgroundColor: "rgba(255,255,255,0.24)",
    },

    heroBody: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.lg,
    },

    heroReadouts: {
      flex: 1,
      gap: spacing.sm,
    },

    instrumentReadout: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: radii.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      backgroundColor: "rgba(7,23,39,0.32)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.13)",
    },

    instrumentIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(59,166,214,0.12)",
    },

    instrumentText: {
      flex: 1,
      marginLeft: spacing.sm,
    },

    instrumentLabel: {
      fontSize: 9,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 1,
      color: colors.sky400,
    },

    instrumentValue: {
      marginTop: 2,
      fontFamily: fontFamily.readoutBold,
      fontSize: 14,
      color: colors.white,
    },

    capacityPanel: {
      width: 116,
      alignItems: "center",
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: "rgba(255,255,255,0.2)",
      paddingLeft: spacing.md,
    },

    capacityCaption: {
      marginTop: spacing.xs,
      fontSize: 9,
      lineHeight: 12,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 0.8,
      textAlign: "center",
      color: colors.sand100,
    },

    coordinateStrip: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "rgba(255,255,255,0.18)",
    },

    coordinateText: {
      fontFamily: fontFamily.readout,
      fontSize: 9,
      letterSpacing: 0.8,
      color: "rgba(255,255,255,0.62)",
    },

    bookNowButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.highlight400,
      borderRadius: radii.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      marginTop: spacing.lg,
      minHeight: 64,
      shadowColor: colors.navy900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },

    bookNowButtonPressed: {
      opacity: 0.88,
    },

    bookNowTextColumn: {
      flex: 1,
      marginLeft: spacing.md,
    },

    bookNowLabel: {
      fontSize: 17,
      fontFamily: fontFamily.display,
      letterSpacing: 0.5,
      color: colors.navy900,
    },

    bookNowSubtext: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.navy900,
      opacity: 0.75,
      marginTop: 1,
    },

    conditionsPanel: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.border,
      ...shadows.card,
    },

    panelHeadingRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },

    panelEyebrow: {
      fontSize: 9,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 1.4,
      color: colors.warning600,
    },

    panelTitle: {
      marginTop: 3,
      fontSize: 18,
      fontFamily: fontFamily.display,
      color: p.textPrimary,
    },

    signalBadge: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: radii.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      backgroundColor: p.backgroundAlt,
    },

    signalDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 5,
    },

    signalText: {
      fontSize: 9,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 0.9,
      color: p.textSecondary,
    },

    conditionsRow: {
      flexDirection: "row",
      alignItems: "stretch",
      justifyContent: "space-between",
      marginTop: spacing.lg,
    },

    conditionDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: "stretch",
      marginVertical: spacing.sm,
      backgroundColor: p.borderStrong,
    },

    conditionsFooter: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.borderStrong,
    },

    conditionsFooterText: {
      flex: 1,
      marginLeft: spacing.xs,
      fontSize: 10,
      lineHeight: 14,
      color: p.textTertiary,
    },

    noConditions: {
      marginTop: spacing.lg,
      fontSize: 13,
      color: p.textSecondary,
    },

    sectionHeadingRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginHorizontal: spacing.lg,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },

    sectionEyebrow: {
      fontSize: 9,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 1.4,
      color: colors.warning600,
    },

    sectionTitle: {
      marginTop: 3,
      fontSize: 18,
      fontFamily: fontFamily.display,
      color: colors.mist50,
    },

    tripCount: {
      fontFamily: fontFamily.readout,
      fontSize: 10,
      color: colors.mist300,
    },

    manifestPanel: {
      marginHorizontal: spacing.lg,
      borderRadius: radii.md,
      overflow: "hidden",
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.border,
    },

    manifestHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.navy900,
    },

    manifestHeaderText: {
      fontSize: 9,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 1,
      color: colors.sky400,
    },

    manifestHeaderTrip: {
      flex: 1,
      marginLeft: spacing.md,
    },

    manifestRow: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },

    manifestIndex: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: p.backgroundAlt,
      borderWidth: 1,
      borderColor: p.border,
    },

    manifestIndexText: {
      fontFamily: fontFamily.readoutBold,
      fontSize: 11,
      color: colors.warning600,
    },

    manifestMain: {
      flex: 1,
      marginLeft: spacing.md,
    },

    manifestSite: {
      fontSize: 14,
      fontFamily: fontFamily.display,
      color: p.textPrimary,
    },

    manifestMeta: {
      marginTop: 3,
      fontSize: 11,
      color: p.textSecondary,
    },

    manifestCapacity: {
      alignItems: "flex-end",
      marginLeft: spacing.sm,
    },

    manifestCount: {
      fontFamily: fontFamily.readoutBold,
      fontSize: 15,
      color: p.accentPrimary,
    },

    manifestAvailability: {
      marginTop: 2,
      fontSize: 9,
      fontFamily: fontFamily.displayMedium,
      textTransform: "uppercase",
      color: colors.success600,
    },

    manifestAvailabilityLow: {
      color: colors.warning600,
    },

    manifestSeparator: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 58,
      backgroundColor: p.borderStrong,
    },

    noMoreTrips: {
      marginHorizontal: spacing.lg,
      padding: spacing.lg,
      borderRadius: radii.md,
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.border,
    },

    noMoreTripsText: {
      fontSize: 13,
      color: p.textSecondary,
      textAlign: "center",
    },

    brandFooter: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: spacing.xl,
      marginTop: spacing.xxl,
      gap: spacing.sm,
    },

    brandRule: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.deepSeaBorder,
    },

    brandFooterText: {
      fontSize: 8,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 1.2,
      color: colors.mist300,
    },
  }));
}

function InstrumentReadout({ icon, label, value }: InstrumentReadoutProps) {
  const styles = useHomeStyles();
  return (
    <View style={styles.instrumentReadout}>
      <View style={styles.instrumentIcon}>
        <Ionicons name={icon} size={15} color={colors.sky400} />
      </View>

      <View style={styles.instrumentText}>
        <Text style={styles.instrumentLabel}>{label}</Text>

        <Text
          style={styles.instrumentValue}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function TripManifestRow({ trip, index }: { trip: Trip; index: number }) {
  const styles = useHomeStyles();
  const available = trip.capacity - trip.confirmedCount;

  return (
    <View style={styles.manifestRow}>
      <View style={styles.manifestIndex}>
        <Text style={styles.manifestIndexText}>
          {String(index + 1).padStart(2, "0")}
        </Text>
      </View>

      <View style={styles.manifestMain}>
        <Text style={styles.manifestSite}>
          {trip.site?.name ??
            (trip.siteEstimated ? "Destination TBD" : "Site not set")}
        </Text>

        <Text style={styles.manifestMeta}>
          {formatTripDate(trip.date)} · {trip.boat.name}
        </Text>
      </View>

      <View style={styles.manifestCapacity}>
        <Text style={styles.manifestCount}>
          {trip.confirmedCount}/{trip.capacity}
        </Text>

        <Text
          style={[
            styles.manifestAvailability,
            available <= 2 && styles.manifestAvailabilityLow,
          ]}
        >
          {available > 0 ? `${available} open` : "Full"}
        </Text>
      </View>
    </View>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const styles = useHomeStyles();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [conditions, setConditions] = useState<SiteConditionReading | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [tripResponse, conditionResponse] = await Promise.all([
        apiRequest<{ trips: Trip[] }>(
          `/trips?from=${encodeURIComponent(todayIsoDate())}`,
        ),
        apiRequest<{ siteCondition: SiteConditionReading | null }>(
          "/conditions/latest",
        ),
      ]);
      setTrips(tripResponse.trips);
      setConditions(conditionResponse.siteCondition);
    } catch (loadError) {
      setError(
        loadError instanceof ApiError
          ? loadError.message
          : "Could not load the latest dive information.",
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

  function confirmLogout() {
    Alert.alert("Log out?", "You will need to sign in again on this device.", [
      { text: "Stay signed in", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => void logout(),
      },
    ]);
  }

  const upcoming = trips
    .filter((trip) => trip.status === "SCHEDULED")
    .sort((a, b) => a.date.localeCompare(b.date));

  const nextTrip = upcoming[0];
  const followingTrips = upcoming.slice(1, 4);

  const nextTripDays = nextTrip ? daysUntil(nextTrip.date) : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={user ? `Welcome back, ${user.name}` : "Welcome back"}
        subtitle="Aliwal Shoal dive operations"
        showLogo
        right={
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => navigation.navigate("Profile")}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.logoutButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="My certification"
            >
              <Ionicons name="ribbon-outline" size={21} color={colors.white} />
            </Pressable>
            <Pressable
              onPress={confirmLogout}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.logoutButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            >
              <Ionicons name="log-out-outline" size={21} color={colors.white} />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.sky400}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {error && <ErrorBanner message={error} onRetry={load} />}

        {nextTrip ? (
          <>
            <HeroPanel rivets>
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.eyebrow}>NEXT EXPEDITION</Text>

                  <Text style={styles.heroSite}>
                    {nextTrip.site?.name ??
                      (nextTrip.siteEstimated
                        ? "Destination TBD"
                        : "Site not set")}
                  </Text>
                </View>

                <StatusPill
                  label={nextTripDays === 0 ? "Today" : `In ${nextTripDays}d`}
                  tone="info"
                />
              </View>

              <Text style={styles.heroDate}>
                {formatTripDateFull(nextTrip.date)}
              </Text>

              <View style={styles.heroDivider} />

              <View style={styles.heroBody}>
                <View style={styles.heroReadouts}>
                  <InstrumentReadout
                    icon="people-outline"
                    label="MEET"
                    value={nextTrip.meetTime}
                  />

                  <InstrumentReadout
                    icon="navigate-outline"
                    label="LAUNCH"
                    value={nextTrip.launchTime}
                  />

                  <InstrumentReadout
                    icon="boat-outline"
                    label="VESSEL"
                    value={nextTrip.boat.name}
                  />
                </View>

                <View style={styles.capacityPanel}>
                  <GaugeRing
                    value={
                      nextTrip.capacity > 0
                        ? nextTrip.confirmedCount / nextTrip.capacity
                        : 0
                    }
                    label="Manifest"
                    valueLabel={`${nextTrip.confirmedCount}/${nextTrip.capacity}`}
                    slots={Math.max(1, nextTrip.capacity)}
                    size={96}
                    centerColor={colors.navy900}
                  />

                  <Text style={styles.capacityCaption}>
                    {Math.max(0, nextTrip.capacity - nextTrip.confirmedCount)}{" "}
                    PLACES OPEN
                  </Text>
                </View>
              </View>

              <View style={styles.coordinateStrip}>
                <Text style={styles.coordinateText}>
                  UMKOMAAS · ALIWAL SHOAL
                </Text>

                <Text style={styles.coordinateText}>30°S · 31°E</Text>
              </View>

              <Pressable
                onPress={() =>
                  navigation.navigate("TripDetail", { tripId: nextTrip.id })
                }
                style={({ pressed }) => [
                  styles.bookNowButton,
                  pressed && styles.bookNowButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`View booking options for ${nextTrip.site?.name ?? "your next dive"}`}
              >
                <Ionicons name="open-outline" size={20} color={colors.navy900} />
                <View style={styles.bookNowTextColumn}>
                  <Text style={styles.bookNowLabel}>VIEW TRIP</Text>
                  <Text style={styles.bookNowSubtext}>
                    Open booking and waitlist options
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={colors.navy900}
                />
              </Pressable>
            </HeroPanel>

            <View style={styles.conditionsPanel}>
              <View style={styles.panelHeadingRow}>
                <View>
                  <Text style={styles.panelEyebrow}>LATEST OBSERVATION</Text>

                  <Text style={styles.panelTitle}>Sea conditions</Text>
                </View>

                <View style={styles.signalBadge}>
                  <View
                    style={[
                      styles.signalDot,
                      { backgroundColor: colors.success600 },
                    ]}
                  />

                  <Text style={styles.signalText}>API</Text>
                </View>
              </View>

              {conditions ? (
                <View style={styles.conditionsRow}>
                  <ConditionReadout
                    type="waveHeight"
                    value={conditions.significantWaveHeightM}
                    label="Wave height"
                    size={62}
                  />

                  <View style={styles.conditionDivider} />

                  <ConditionReadout
                    type="wavePeriod"
                    value={conditions.meanWavePeriodS}
                    label="Wave period"
                    size={62}
                  />

                  <View style={styles.conditionDivider} />

                  <ConditionReadout
                    type="seaTemperature"
                    value={conditions.seaSurfaceTempC}
                    label="Sea temp"
                    size={62}
                  />
                </View>
              ) : (
                <Text style={styles.noConditions}>
                  No sea-condition reading available.
                </Text>
              )}

              <View style={styles.conditionsFooter}>
                <Ionicons
                  name="information-circle-outline"
                  size={15}
                  color={colors.slate400}
                />

                <Text style={styles.conditionsFooterText}>
                  Conditions are observational and should not replace skipper
                  guidance.
                </Text>
              </View>
            </View>
          </>
        ) : (
          <EmptyState
            icon="boat-outline"
            title="No upcoming dives"
            body="Your next scheduled expedition will appear here."
          />
        )}

        <View style={styles.sectionHeadingRow}>
          <View>
            <Text style={styles.sectionEyebrow}>TRIP MANIFEST</Text>

            <Text style={styles.sectionTitle}>Upcoming departures</Text>
          </View>

          <Text style={styles.tripCount}>{upcoming.length} TOTAL</Text>
        </View>

        {followingTrips.length > 0 ? (
          <View style={styles.manifestPanel}>
            <View style={styles.manifestHeader}>
              <Text style={styles.manifestHeaderText}>REF</Text>

              <Text
                style={[styles.manifestHeaderText, styles.manifestHeaderTrip]}
              >
                DEPARTURE
              </Text>

              <Text style={styles.manifestHeaderText}>LOAD</Text>
            </View>

            {followingTrips.map((trip, index) => (
              <React.Fragment key={trip.id}>
                <TripManifestRow trip={trip} index={index} />

                {index < followingTrips.length - 1 && (
                  <View style={styles.manifestSeparator} />
                )}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={styles.noMoreTrips}>
            <Text style={styles.noMoreTripsText}>
              No additional scheduled departures.
            </Text>
          </View>
        )}

        <View style={styles.brandFooter}>
          <View style={styles.brandRule} />

          <Ionicons
            name="compass-outline"
            size={18}
            color={colors.warning600}
          />

          <Text style={styles.brandFooterText}>SCUBAXCURSIONS OPERATIONS</Text>

          <View style={styles.brandRule} />
        </View>
      </ScrollView>
    </View>
  );
}
