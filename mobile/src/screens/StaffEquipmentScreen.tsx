import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ApiError, apiRequest } from "../api/client";
import {
  EquipmentCategory,
  StaffEquipmentManifest,
  StaffEquipmentManifestRequest,
  Trip,
} from "../api/types";
import { Card } from "../components/Card";
import { ErrorBanner } from "../components/ErrorBanner";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors, fontFamily, radii, spacing, useTheme, useThemedStyles } from "../theme";
import { formatTripDate, todayIsoDate } from "../utils/format";

const CATEGORY_ORDER: Record<EquipmentCategory, number> = {
  BCD: 0,
  REGULATOR: 1,
  CYLINDER: 2,
  WEIGHTS: 3,
  WETSUIT: 4,
  FINS: 5,
  MASK: 6,
  DIVE_COMPUTER: 7,
};

const EQUIPMENT_ICONS: Record<
  EquipmentCategory,
  keyof typeof Ionicons.glyphMap
> = {
  BCD: "layers-outline",
  REGULATOR: "git-network-outline",
  CYLINDER: "flask-outline",
  WEIGHTS: "barbell-outline",
  WETSUIT: "body-outline",
  FINS: "footsteps-outline",
  MASK: "glasses-outline",
  DIVE_COMPUTER: "hardware-chip-outline",
};

type EquipmentNeed = {
  key: string;
  category: EquipmentCategory;
  name: string;
  detail: string | null;
  quantity: number;
  quantityLabel: string;
};

type GuestRequestGroup = {
  bookingGuestId: string;
  label: string;
  requests: StaffEquipmentManifestRequest[];
};

type ClientRequestGroup = {
  bookingId: string;
  client: StaffEquipmentManifestRequest["client"];
  selfRequests: StaffEquipmentManifestRequest[];
  guestGroups: GuestRequestGroup[];
};

function displayNumber(value: number): string {
  return Number(value.toFixed(1)).toString();
}

function detailForRequest(
  request: StaffEquipmentManifestRequest,
): string | null {
  switch (request.equipmentItem.category) {
    case "BCD":
    case "WETSUIT":
      return request.requestedSize
        ? `Size ${request.requestedSize}`
        : "Size not set";
    case "CYLINDER": {
      const gas =
        request.gasType === "NITROX"
          ? `Nitrox ${request.nitroxPercent ?? "?"}%`
          : request.gasType === "AIR"
            ? "Air"
            : "Gas not set";
      return [
        request.cylinderVolumeLitres
          ? `${request.cylinderVolumeLitres}L`
          : null,
        request.cylinderForm === "TALL"
          ? "Tall"
          : request.cylinderForm === "STANDARD"
            ? "Standard"
            : null,
        gas,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    case "WEIGHTS":
      return request.requestedWeightKg == null
        ? "Weight not set"
        : `${displayNumber(request.requestedWeightKg)} kg · ${
            request.weightCarryMethod === "POCKETS"
              ? "own pockets"
              : "weight belt"
          }`;
    case "FINS":
      return (
        [
          request.shoeSizeUk == null ? null : `UK ${request.shoeSizeUk}`,
          request.finStyle === "OPEN_HEEL"
            ? "Open heel"
            : request.finStyle === "FULL_FOOT"
              ? "Full foot"
              : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Size and style not set"
      );
    default:
      return null;
  }
}

function buildEquipmentNeeds(
  requests: StaffEquipmentManifestRequest[],
): EquipmentNeed[] {
  const grouped = new Map<string, EquipmentNeed>();
  const totalWeightKgByMethod: Record<"BELT" | "POCKETS", number> = {
    BELT: 0,
    POCKETS: 0,
  };
  let weightName = "Weights";

  for (const request of requests) {
    const quantity = Math.max(1, request.quantity);

    if (
      request.equipmentItem.category === "WEIGHTS" &&
      request.requestedWeightKg != null
    ) {
      // Default to BELT for any pre-existing rows from before this field
      // existed — belt was the only option then in practice.
      const method = request.weightCarryMethod ?? "BELT";
      totalWeightKgByMethod[method] += request.requestedWeightKg * quantity;
      weightName = request.equipmentItem.name;
      continue;
    }

    const detail = detailForRequest(request);
    const key = `${request.equipmentItem.id}|${detail ?? ""}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.quantity += quantity;
      existing.quantityLabel = `× ${existing.quantity}`;
      continue;
    }

    grouped.set(key, {
      key,
      category: request.equipmentItem.category,
      name: request.equipmentItem.name,
      detail,
      quantity,
      quantityLabel: `× ${quantity}`,
    });
  }

  if (totalWeightKgByMethod.BELT > 0) {
    grouped.set("total-weight-belt", {
      key: "total-weight-belt",
      category: "WEIGHTS",
      name: weightName,
      detail: "On weight belts",
      quantity: 1,
      quantityLabel: `${displayNumber(totalWeightKgByMethod.BELT)} kg`,
    });
  }

  if (totalWeightKgByMethod.POCKETS > 0) {
    grouped.set("total-weight-pockets", {
      key: "total-weight-pockets",
      category: "WEIGHTS",
      name: weightName,
      detail: "Loose, for own pockets",
      quantity: 1,
      quantityLabel: `${displayNumber(totalWeightKgByMethod.POCKETS)} kg`,
    });
  }

  return [...grouped.values()].sort((left, right) => {
    const categoryDifference =
      CATEGORY_ORDER[left.category] - CATEGORY_ORDER[right.category];
    if (categoryDifference !== 0) return categoryDifference;

    const nameDifference = left.name.localeCompare(right.name);
    if (nameDifference !== 0) return nameDifference;

    return (left.detail ?? "").localeCompare(right.detail ?? "");
  });
}

function sortRequests(
  requests: StaffEquipmentManifestRequest[],
): StaffEquipmentManifestRequest[] {
  return [...requests].sort((left, right) => {
    const categoryDifference =
      CATEGORY_ORDER[left.equipmentItem.category] -
      CATEGORY_ORDER[right.equipmentItem.category];
    if (categoryDifference !== 0) return categoryDifference;
    return left.equipmentItem.name.localeCompare(right.equipmentItem.name);
  });
}

function groupRequestsByClient(
  requests: StaffEquipmentManifestRequest[],
): ClientRequestGroup[] {
  const groups = new Map<string, ClientRequestGroup>();

  for (const request of requests) {
    let group = groups.get(request.bookingId);
    if (!group) {
      group = {
        bookingId: request.bookingId,
        client: request.client,
        selfRequests: [],
        guestGroups: [],
      };
      groups.set(request.bookingId, group);
    }

    const owner = request.owner;
    if (owner.type === "SELF") {
      group.selfRequests.push(request);
    } else {
      let guestGroup = group.guestGroups.find(
        (candidate) => candidate.bookingGuestId === owner.bookingGuestId,
      );
      if (!guestGroup) {
        guestGroup = {
          bookingGuestId: owner.bookingGuestId,
          label: owner.label,
          requests: [],
        };
        group.guestGroups.push(guestGroup);
      }
      guestGroup.requests.push(request);
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      selfRequests: sortRequests(group.selfRequests),
      guestGroups: group.guestGroups
        .map((guestGroup) => ({
          ...guestGroup,
          requests: sortRequests(guestGroup.requests),
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    }))
    .sort((left, right) => left.client.name.localeCompare(right.client.name));
}

function useStaffEquipmentStyles() {
  return useThemedStyles((p) => ({
    fill: { flex: 1, backgroundColor: colors.deepSea900 },
    content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
    loadingPanel: {
      minHeight: 180,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionLabel: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      color: colors.mist200,
      fontSize: 11,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 0.7,
      textTransform: "uppercase",
    },
    tripPicker: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
    },
    tripChip: {
      width: 190,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.deepSea800,
      borderWidth: 1,
      borderColor: colors.deepSeaBorder,
    },
    tripChipActive: {
      backgroundColor: colors.ocean600,
      borderColor: colors.sky400,
    },
    tripChipDate: { fontSize: 12, fontFamily: fontFamily.readoutBold, color: colors.sky400 },
    tripChipSite: {
      fontSize: 15,
      fontFamily: fontFamily.display,
      color: colors.mist50,
      marginTop: 3,
    },
    tripChipBoat: { fontSize: 12, color: colors.mist300, marginTop: 4 },
    tripChipTextActive: { color: colors.white },
    cardEyebrow: {
      color: colors.ocean600,
      fontSize: 10,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 0.8,
    },
    cardTitle: {
      color: p.textPrimary,
      fontSize: 22,
      fontFamily: fontFamily.display,
      marginTop: 4,
    },
    cardMeta: { color: p.textSecondary, fontSize: 13, marginTop: 3 },
    clientCount: {
      color: p.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      marginTop: spacing.sm,
    },
    summaryGroup: {
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.borderStrong,
    },
    summaryGroupTitle: {
      color: p.textPrimary,
      fontSize: 15,
      fontFamily: fontFamily.display,
      marginBottom: spacing.xs,
    },
    needRow: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm,
    },
    needRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.borderStrong,
    },
    needIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: p.backgroundAlt,
      marginRight: spacing.md,
    },
    needText: { flex: 1 },
    needName: { color: p.textPrimary, fontSize: 14, fontFamily: fontFamily.display },
    needDetail: { color: p.textSecondary, fontSize: 12, marginTop: 2 },
    needQuantity: {
      color: colors.ocean600,
      fontSize: 14,
      fontFamily: fontFamily.readoutBold,
      marginLeft: spacing.md,
    },
    requestHeader: { flexDirection: "row", alignItems: "center" },
    requestIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: p.backgroundAlt,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
    },
    requestClient: { flex: 1 },
    requestName: { color: p.textPrimary, fontSize: 16, fontFamily: fontFamily.display },
    requestContact: { color: p.textSecondary, fontSize: 12, marginTop: 2 },
    itemCountBadge: {
      borderRadius: radii.pill,
      backgroundColor: p.backgroundAlt,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      marginLeft: spacing.sm,
    },
    itemCountText: {
      color: p.textSecondary,
      fontSize: 10,
      fontFamily: fontFamily.readoutBold,
    },
    clientEquipmentList: {
      marginTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.borderStrong,
    },
    guestSubGroup: {
      marginTop: spacing.md,
      marginLeft: spacing.lg,
      paddingLeft: spacing.md,
      borderLeftWidth: 2,
      borderLeftColor: p.border,
    },
    guestSubHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    guestSubLabel: {
      color: p.textSecondary,
      fontSize: 12,
      fontFamily: fontFamily.displayMedium,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    requestRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: spacing.md,
    },
    requestRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.borderStrong,
    },
    requestEquipmentIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: p.backgroundAlt,
      marginRight: spacing.md,
    },
    requestEquipmentBody: { flex: 1 },
    requestItemRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    requestItem: {
      flex: 1,
      color: p.textPrimary,
      fontSize: 14,
      fontFamily: fontFamily.display,
    },
    requestQuantity: { color: colors.ocean600, fontSize: 13, fontFamily: fontFamily.readoutBold },
    requestDetail: { color: p.textSecondary, fontSize: 13, marginTop: 3 },
    requestNote: {
      color: p.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      marginTop: spacing.sm,
      padding: spacing.sm,
      borderRadius: radii.sm,
      backgroundColor: p.backgroundAlt,
    },
    emptyTitle: { color: p.textPrimary, fontSize: 17, fontFamily: fontFamily.display },
    emptyBody: {
      color: p.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      marginTop: spacing.xs,
    },
  }));
}

function RequestRow({
  request,
  showTopBorder,
}: {
  request: StaffEquipmentManifestRequest;
  showTopBorder: boolean;
}) {
  const styles = useStaffEquipmentStyles();
  const detail = detailForRequest(request);
  return (
    <View style={[styles.requestRow, showTopBorder && styles.requestRowBorder]}>
      <View style={styles.requestEquipmentIcon}>
        <Ionicons
          name={EQUIPMENT_ICONS[request.equipmentItem.category]}
          size={17}
          color={colors.ocean600}
        />
      </View>
      <View style={styles.requestEquipmentBody}>
        <View style={styles.requestItemRow}>
          <Text style={styles.requestItem}>{request.equipmentItem.name}</Text>
          {request.quantity > 1 ? (
            <Text style={styles.requestQuantity}>× {request.quantity}</Text>
          ) : null}
        </View>
        {detail ? <Text style={styles.requestDetail}>{detail}</Text> : null}
        {request.clientNote ? (
          <Text style={styles.requestNote}>Note: {request.clientNote}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function StaffEquipmentScreen() {
  const styles = useStaffEquipmentStyles();
  const { palette } = useTheme();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [manifest, setManifest] = useState<StaffEquipmentManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingManifest, setLoadingManifest] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const scheduledTrips = useMemo(
    () => trips.filter((trip) => trip.status === "SCHEDULED"),
    [trips],
  );

  const equipmentNeeds = useMemo(
    () => buildEquipmentNeeds(manifest?.requests ?? []),
    [manifest],
  );

  const clientRequestGroups = useMemo(
    () => groupRequestsByClient(manifest?.requests ?? []),
    [manifest],
  );

  const loadTrips = useCallback(async () => {
    const response = await apiRequest<{ trips: Trip[] }>(
      `/trips?from=${encodeURIComponent(todayIsoDate())}&status=SCHEDULED`,
    );
    setTrips(response.trips);
    setSelectedTripId((current) =>
      current && response.trips.some((trip) => trip.id === current)
        ? current
        : (response.trips[0]?.id ?? null),
    );
  }, []);

  const loadManifest = useCallback(async (tripId: string) => {
    setLoadingManifest(true);
    try {
      const response = await apiRequest<StaffEquipmentManifest>(
        `/trips/${tripId}/equipment-requests`,
      );
      setManifest(response);
    } finally {
      setLoadingManifest(false);
    }
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      await loadTrips();
    } catch (loadError) {
      setError(
        loadError instanceof ApiError
          ? loadError.message
          : "Could not load the staff equipment manifest.",
      );
    } finally {
      setLoadingTrips(false);
    }
  }, [loadTrips]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedTripId) {
      setManifest(null);
      return;
    }

    setError(null);
    void loadManifest(selectedTripId).catch((loadError) => {
      setManifest(null);
      setError(
        loadError instanceof ApiError
          ? loadError.message
          : "Could not load requests for this trip.",
      );
    });
  }, [loadManifest, selectedTripId]);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      await loadTrips();
      if (selectedTripId) await loadManifest(selectedTripId);
    } catch (refreshError) {
      setError(
        refreshError instanceof ApiError
          ? refreshError.message
          : "Could not refresh the manifest.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={styles.fill}>
      <ScreenHeader
        title="Equipment manifest"
        subtitle="What staff need to prepare for each trip"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.sky400}
          />
        }
      >
        {error ? <ErrorBanner message={error} onRetry={load} /> : null}

        {loadingTrips ? (
          <View style={styles.loadingPanel}>
            <ActivityIndicator size="large" color={colors.sky400} />
          </View>
        ) : scheduledTrips.length === 0 ? (
          <Card>
            <Text style={styles.emptyTitle}>No upcoming trips</Text>
            <Text style={styles.emptyBody}>
              Equipment requests will appear after staff schedules a trip and
              clients book.
            </Text>
          </Card>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Choose trip</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tripPicker}
            >
              {scheduledTrips.map((trip) => {
                const active = trip.id === selectedTripId;
                return (
                  <Pressable
                    key={trip.id}
                    onPress={() => setSelectedTripId(trip.id)}
                    style={[styles.tripChip, active && styles.tripChipActive]}
                  >
                    <Text
                      style={[
                        styles.tripChipDate,
                        active && styles.tripChipTextActive,
                      ]}
                    >
                      {formatTripDate(trip.date)}
                    </Text>
                    <Text
                      style={[
                        styles.tripChipSite,
                        active && styles.tripChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {trip.site?.name ?? "Destination TBD"}
                    </Text>
                    <Text
                      style={[
                        styles.tripChipBoat,
                        active && styles.tripChipTextActive,
                      ]}
                    >
                      {trip.boat.name} · {trip.launchTime}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {loadingManifest ? (
              <View style={styles.loadingPanel}>
                <ActivityIndicator size="large" color={colors.sky400} />
              </View>
            ) : manifest ? (
              <>
                <Card>
                  <Text style={styles.cardEyebrow}>TRIP EQUIPMENT</Text>
                  <Text style={styles.cardTitle}>
                    {manifest.trip.site?.name ?? "Destination TBD"}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {formatTripDate(manifest.trip.date)} ·{" "}
                    {manifest.trip.boat.name} · {manifest.trip.launchTime}
                  </Text>
                  {manifest.trip.launchSite ? (
                    <Text style={styles.cardMeta}>
                      Launch: {manifest.trip.launchSite.name}
                    </Text>
                  ) : null}
                  <Text style={styles.clientCount}>
                    {clientRequestGroups.length} client
                    {clientRequestGroups.length === 1 ? "" : "s"} requested
                    equipment
                  </Text>

                  <View style={styles.summaryGroup}>
                    <Text style={styles.summaryGroupTitle}>
                      Equipment needed
                    </Text>
                    {equipmentNeeds.length === 0 ? (
                      <Text style={styles.emptyBody}>
                        No equipment has been requested.
                      </Text>
                    ) : (
                      equipmentNeeds.map((need, index) => (
                        <View
                          key={need.key}
                          style={[
                            styles.needRow,
                            index > 0 && styles.needRowBorder,
                          ]}
                        >
                          <View style={styles.needIcon}>
                            <Ionicons
                              name={EQUIPMENT_ICONS[need.category]}
                              size={18}
                              color={colors.ocean600}
                            />
                          </View>
                          <View style={styles.needText}>
                            <Text style={styles.needName}>{need.name}</Text>
                            {need.detail ? (
                              <Text style={styles.needDetail}>
                                {need.detail}
                              </Text>
                            ) : null}
                          </View>
                          <Text style={styles.needQuantity}>
                            {need.quantityLabel}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </Card>

                <Text style={styles.sectionLabel}>
                  Client requests · {clientRequestGroups.length}
                </Text>
                {clientRequestGroups.length === 0 ? (
                  <Card>
                    <Text style={styles.emptyBody}>
                      No equipment requests for this trip.
                    </Text>
                  </Card>
                ) : (
                  clientRequestGroups.map((group) => {
                    const contact = [group.client.phone, group.client.email]
                      .filter(Boolean)
                      .join(" · ");
                    const totalItemCount =
                      group.selfRequests.length +
                      group.guestGroups.reduce(
                        (sum, guestGroup) => sum + guestGroup.requests.length,
                        0,
                      );

                    return (
                      <Card key={group.bookingId}>
                        <View style={styles.requestHeader}>
                          <View style={styles.requestIcon}>
                            <Ionicons
                              name="person-outline"
                              size={19}
                              color={colors.ocean600}
                            />
                          </View>
                          <View style={styles.requestClient}>
                            <Text style={styles.requestName}>
                              {group.client.name}
                            </Text>
                            <Text style={styles.requestContact}>{contact}</Text>
                          </View>
                          <View style={styles.itemCountBadge}>
                            <Text style={styles.itemCountText}>
                              {totalItemCount} item
                              {totalItemCount === 1 ? "" : "s"}
                            </Text>
                          </View>
                        </View>

                        {group.selfRequests.length > 0 ? (
                          <View style={styles.clientEquipmentList}>
                            {group.selfRequests.map((request, index) => (
                              <RequestRow
                                key={request.id}
                                request={request}
                                showTopBorder={index > 0}
                              />
                            ))}
                          </View>
                        ) : null}

                        {group.guestGroups.map((guestGroup) => (
                          <View
                            key={guestGroup.bookingGuestId}
                            style={styles.guestSubGroup}
                          >
                            <View style={styles.guestSubHeader}>
                              <Ionicons
                                name="people-outline"
                                size={15}
                                color={palette.textSecondary}
                              />
                              <Text style={styles.guestSubLabel}>
                                {guestGroup.label}
                              </Text>
                            </View>
                            <View style={styles.clientEquipmentList}>
                              {guestGroup.requests.map((request, index) => (
                                <RequestRow
                                  key={request.id}
                                  request={request}
                                  showTopBorder={index > 0}
                                />
                              ))}
                            </View>
                          </View>
                        ))}
                      </Card>
                    );
                  })
                )}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
