import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { ScreenHeader } from "../components/ScreenHeader";
import { StatusPill } from "../components/StatusPill";
import { ErrorBanner } from "../components/ErrorBanner";

import { colors, gradients, radii, readoutFontFamily, spacing } from "../theme";

import { ApiError, apiRequest } from "../api/client";
import { Trip } from "../api/types";
import { formatTripDate, todayIsoDate } from "../utils/format";
import { useAuth } from "../context/AuthContext";

// Same roles the backend's POST /trips actually allows (trips.ts's
// tripStaffRoles) — deliberately narrower than who can see the Staff tab,
// so the "+" button never shows to someone who'd just get a 403.
const CAN_CREATE_TRIP_ROLES = [
  "ADMIN",
  "OWNER",
  "SKIPPER",
  "DIVEMASTER",
  "INSTRUCTOR",
];

function tripStatusTone(
  status: Trip["status"],
): "success" | "danger" | "neutral" {
  if (status === "CANCELLED") {
    return "danger";
  }

  if (status === "COMPLETED") {
    return "neutral";
  }

  return "success";
}

function getCapacity(trip: Trip) {
  return trip.capacity;
}

function getAvailability(trip: Trip) {
  return Math.max(0, getCapacity(trip) - trip.confirmedCount);
}

function getCapacityColor(trip: Trip) {
  const capacity = getCapacity(trip);

  if (capacity <= 0) {
    return colors.slate400;
  }

  const ratio = trip.confirmedCount / capacity;

  if (ratio >= 0.9) {
    return colors.danger600;
  }

  if (ratio >= 0.75) {
    return colors.warning600;
  }

  if (ratio >= 0.5) {
    return colors.success600;
  }

  return colors.ocean600;
}

function CapacityTrack({ trip }: { trip: Trip }) {
  const capacity = Math.max(1, getCapacity(trip));
  const filled = Math.min(capacity, Math.max(0, trip.confirmedCount));

  const visibleSlots = Math.min(capacity, 14);

  return (
    <View style={styles.capacityTrack}>
      {Array.from({ length: visibleSlots }).map((_, index) => {
        const slotRatio = (index + 1) / visibleSlots;
        const filledRatio = filled / capacity;

        return (
          <View
            key={index}
            style={[
              styles.capacitySlot,
              {
                backgroundColor:
                  slotRatio <= filledRatio
                    ? getCapacityColor(trip)
                    : colors.sand100,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const capacity = getCapacity(trip);
  const available = getAvailability(trip);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tripCard,
        pressed && styles.tripCardPressed,
      ]}
    >
      <View style={styles.tripAccent} />

      <View style={styles.tripCardBody}>
        <View style={styles.tripTopRow}>
          <View style={styles.tripTitleArea}>
            <Text style={styles.tripReference}>VESSEL DEPARTURE</Text>

            <Text style={styles.siteName}>
              {trip.site?.name ??
                (trip.siteEstimated ? "Destination TBD" : "Site not set")}
            </Text>
          </View>

          <StatusPill label={trip.status} tone={tripStatusTone(trip.status)} />
        </View>

        <View style={styles.tripReadoutGrid}>
          <View style={styles.tripReadout}>
            <Ionicons name="people-outline" size={15} color={colors.ocean600} />

            <View style={styles.tripReadoutText}>
              <Text style={styles.readoutLabel}>MEET</Text>

              <Text style={styles.readoutValue}>{trip.meetTime}</Text>
            </View>
          </View>

          <View style={styles.tripReadout}>
            <Ionicons
              name="navigate-outline"
              size={15}
              color={colors.ocean600}
            />

            <View style={styles.tripReadoutText}>
              <Text style={styles.readoutLabel}>LAUNCH</Text>

              <Text style={styles.readoutValue}>{trip.launchTime}</Text>
            </View>
          </View>

          <View style={styles.tripReadout}>
            <Ionicons name="boat-outline" size={15} color={colors.ocean600} />

            <View style={styles.tripReadoutText}>
              <Text style={styles.readoutLabel}>VESSEL</Text>

              <Text style={styles.readoutValue} numberOfLines={1}>
                {trip.boat.name}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.manifestBlock}>
          <View style={styles.manifestHeaderRow}>
            <Text style={styles.manifestLabel}>BOAT MANIFEST</Text>

            <Text
              style={[
                styles.manifestValue,
                {
                  color: getCapacityColor(trip),
                },
              ]}
            >
              {trip.confirmedCount}/{capacity}
            </Text>
          </View>

          <CapacityTrack trip={trip} />

          <View style={styles.manifestFooterRow}>
            <Text style={styles.manifestMeta}>
              {available > 0
                ? `${available} place${available === 1 ? "" : "s"} open`
                : "Boat full"}
            </Text>

            <View style={styles.openDetails}>
              <Text style={styles.openDetailsText}>OPEN LOG</Text>

              <Ionicons
                name="chevron-forward"
                size={14}
                color={colors.warning600}
              />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function TripsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const canCreateTrip =
    user?.roles.some((role) => CAN_CREATE_TRIP_ROLES.includes(role)) ?? false;

  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await apiRequest<{ trips: Trip[] }>(
        `/trips?from=${encodeURIComponent(todayIsoDate())}`,
      );
      setTrips(response.trips);
    } catch (loadError) {
      setError(
        loadError instanceof ApiError
          ? loadError.message
          : "Could not load upcoming trips.",
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);

    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const sections = useMemo(
    () =>
      Object.entries(
        trips.reduce<Record<string, Trip[]>>((accumulator, trip) => {
          const key = trip.date;

          accumulator[key] = accumulator[key] ?? [];

          accumulator[key].push(trip);

          return accumulator;
        }, {}),
      )
        .sort(([firstDate], [secondDate]) =>
          firstDate.localeCompare(secondDate),
        )
        .map(([date, data]) => ({
          title: date,
          data,
        })),
    [trips],
  );

  const scheduledCount = trips.filter(
    (trip) => trip.status === "SCHEDULED",
  ).length;

  const totalPlacesOpen = trips.reduce(
    (total, trip) => total + getAvailability(trip),
    0,
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Dive calendar"
        subtitle="Scheduled boats and launch manifests"
      />

      <SectionList
        style={styles.screen}
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.sky400}
          />
        }
        ListHeaderComponent={
          <>
            {error && <ErrorBanner message={error} onRetry={load} />}

            <LinearGradient
              colors={gradients.oceanHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryPanel}
            >
              <View style={styles.summaryTopRow}>
                <View>
                  <Text style={styles.summaryEyebrow}>OPERATIONS BOARD</Text>

                  <Text style={styles.summaryTitle}>Upcoming departures</Text>
                </View>

                <View style={styles.liveBadge}>
                  <View
                    style={[
                      styles.liveDot,
                      { backgroundColor: colors.success600 },
                    ]}
                  />

                  <Text style={styles.liveText}>API</Text>
                </View>
              </View>

              <View style={styles.summaryStats}>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryValue}>{scheduledCount}</Text>

                  <Text style={styles.summaryLabel}>SCHEDULED</Text>
                </View>

                <View style={styles.summaryRule} />

                <View style={styles.summaryStat}>
                  <Text style={styles.summaryValue}>{totalPlacesOpen}</Text>

                  <Text style={styles.summaryLabel}>OPEN PLACES</Text>
                </View>

                <View style={styles.summaryRule} />

                <View style={styles.summaryStat}>
                  <Text style={styles.summaryValue}>{sections.length}</Text>

                  <Text style={styles.summaryLabel}>DIVE DAYS</Text>
                </View>
              </View>
            </LinearGradient>

            {canCreateTrip && (
              <Pressable
                onPress={() => navigation.navigate("CreateLaunch")}
                style={({ pressed }) => [
                  styles.createLaunchButton,
                  pressed && styles.createLaunchButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create a new launch"
              >
                <View style={styles.createLaunchIcon}>
                  <Ionicons name="add" size={22} color={colors.white} />
                </View>

                <View style={styles.createLaunchText}>
                  <Text style={styles.createLaunchEyebrow}>
                    STAFF OPERATION
                  </Text>
                  <Text style={styles.createLaunchTitle}>
                    Create new launch
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.sky400}
                />
              </Pressable>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyPanel}>
            <Ionicons
              name="calendar-outline"
              size={32}
              color={colors.ocean600}
            />

            <Text style={styles.emptyTitle}>No trips scheduled</Text>

            <Text style={styles.emptyBody}>
              New departures will appear here once added.
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>DEPARTURE DATE</Text>

              <Text style={styles.sectionDate}>
                {formatTripDate(section.title)}
              </Text>
            </View>

            <Text style={styles.sectionCount}>
              {section.data.length} BOAT
              {section.data.length === 1 ? "" : "S"}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            onPress={() =>
              navigation.navigate("TripDetail", {
                tripId: item.id,
              })
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.deepSea900,
  },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  createLaunchButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.deepSeaBorder,
    backgroundColor: colors.deepSea950,
  },
  createLaunchButtonPressed: {
    opacity: 0.8,
  },
  createLaunchIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ocean600,
  },
  createLaunchText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  createLaunchEyebrow: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: colors.sky400,
  },
  createLaunchTitle: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: "800",
    color: colors.white,
  },
  summaryPanel: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: radii.lg,
    padding: spacing.xl,
    overflow: "hidden",
    shadowColor: colors.navy900,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 7,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  summaryEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.7,
    color: colors.sky400,
  },
  summaryTitle: {
    marginTop: 4,
    fontSize: 23,
    fontWeight: "800",
    color: colors.white,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  liveText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.white,
  },
  summaryStats: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  summaryStat: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontFamily: readoutFontFamily,
    fontSize: 24,
    fontWeight: "700",
    color: colors.white,
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.sky400,
  },
  summaryRule: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionEyebrow: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: colors.warning600,
  },
  sectionDate: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: "800",
    color: colors.mist50,
  },
  sectionCount: {
    fontFamily: readoutFontFamily,
    fontSize: 9,
    fontWeight: "700",
    color: colors.mist300,
  },
  tripCard: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sand100,
    shadowColor: colors.navy900,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tripCardPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  tripAccent: {
    width: 6,
    backgroundColor: colors.warning600,
  },
  tripCardBody: {
    flex: 1,
    padding: spacing.lg,
  },
  tripTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  tripTitleArea: {
    flex: 1,
  },
  tripReference: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.3,
    color: colors.slate400,
  },
  siteName: {
    marginTop: 4,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "800",
    color: colors.navy900,
  },
  tripReadoutGrid: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  tripReadout: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.sand50,
  },
  tripReadoutText: {
    flex: 1,
    marginLeft: 6,
  },
  readoutLabel: {
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.slate400,
  },
  readoutValue: {
    marginTop: 2,
    fontFamily: readoutFontFamily,
    fontSize: 11,
    fontWeight: "700",
    color: colors.navy900,
  },
  manifestBlock: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.slate200,
  },
  manifestHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  manifestLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.slate600,
  },
  manifestValue: {
    fontFamily: readoutFontFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  capacityTrack: {
    flexDirection: "row",
    gap: 3,
    marginTop: spacing.sm,
  },
  capacitySlot: {
    flex: 1,
    height: 7,
    borderRadius: 2,
  },
  manifestFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  manifestMeta: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.slate600,
  },
  openDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  openDetailsText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.warning600,
  },
  emptyPanel: {
    alignItems: "center",
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sand100,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy900,
  },
  emptyBody: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.slate600,
    textAlign: "center",
  },
});
