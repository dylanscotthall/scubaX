import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

import { ApiError, apiRequest } from "../api/client";
import {
  Booking,
  BookingEquipmentInput,
  BookingEquipmentRequest,
  CylinderForm,
  EquipmentCategory,
  EquipmentItem,
  EquipmentSelectionInput,
  FinStyle,
  GasType,
  Trip,
  UserEquipmentProfile,
} from "../api/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ErrorBanner } from "../components/ErrorBanner";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors, radii, spacing } from "../theme";
import { formatTripDateFull } from "../utils/format";

const CATEGORY_ICONS: Record<
  EquipmentCategory,
  keyof typeof Ionicons.glyphMap
> = {
  BCD: "body-outline",
  REGULATOR: "water-outline",
  CYLINDER: "battery-full-outline",
  WEIGHTS: "barbell-outline",
  WETSUIT: "shirt-outline",
  FINS: "footsteps-outline",
  MASK: "glasses-outline",
  DIVE_COMPUTER: "watch-outline",
};

const SIZE_OPTIONS = ["XS", "S", "M", "ML", "L", "XL", "XXL"];
const CYLINDER_VOLUME_OPTIONS = [10, 12, 15];

const EMPTY_PROFILE: UserEquipmentProfile = {
  bcdSize: null,
  wetsuitSize: null,
  preferredGasType: null,
  preferredNitroxPercent: null,
  preferredCylinderVolumeLitres: null,
  preferredCylinderForm: null,
  preferredWeightKg: null,
  shoeSizeUk: null,
  finStyle: null,
};

type SelectedState = Record<string, EquipmentSelectionInput>;

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function defaultOptionsFor(
  category: EquipmentCategory,
  profile: UserEquipmentProfile,
): EquipmentSelectionInput {
  switch (category) {
    case "BCD":
      return { requestedSize: profile.bcdSize ?? "M" };
    case "WETSUIT":
      return { requestedSize: profile.wetsuitSize ?? "M" };
    case "CYLINDER": {
      const gasType = profile.preferredGasType ?? "AIR";
      return {
        gasType,
        ...(gasType === "NITROX"
          ? { nitroxPercent: profile.preferredNitroxPercent ?? 32 }
          : {}),
        cylinderVolumeLitres:
          profile.preferredCylinderVolumeLitres ?? 12,
        cylinderForm: profile.preferredCylinderForm ?? "STANDARD",
      };
    }
    case "WEIGHTS":
      return { requestedWeightKg: profile.preferredWeightKg ?? 8 };
    case "FINS":
      return {
        shoeSizeUk: profile.shoeSizeUk ?? 9,
        finStyle: profile.finStyle ?? "OPEN_HEEL",
      };
    default:
      return {};
  }
}

function selectionsFromProfile(
  items: EquipmentItem[],
  profile: UserEquipmentProfile,
): SelectedState {
  const selected: SelectedState = {};
  const categoriesApplied = new Set<EquipmentCategory>();

  for (const item of items) {
    if (categoriesApplied.has(item.category)) continue;

    let shouldSelect = false;
    switch (item.category) {
      case "BCD":
        shouldSelect = profile.bcdSize != null;
        break;
      case "WETSUIT":
        shouldSelect = profile.wetsuitSize != null;
        break;
      case "CYLINDER":
        shouldSelect =
          profile.preferredGasType != null ||
          profile.preferredCylinderVolumeLitres != null ||
          profile.preferredCylinderForm != null;
        break;
      case "WEIGHTS":
        shouldSelect = profile.preferredWeightKg != null;
        break;
      case "FINS":
        shouldSelect = profile.shoeSizeUk != null || profile.finStyle != null;
        break;
      default:
        shouldSelect = false;
    }

    if (shouldSelect) {
      selected[item.id] = defaultOptionsFor(item.category, profile);
      categoriesApplied.add(item.category);
    }
  }

  return selected;
}

function selectionFromRequest(
  request: BookingEquipmentRequest,
): EquipmentSelectionInput {
  return {
    ...(request.requestedSize == null
      ? {}
      : { requestedSize: request.requestedSize }),
    ...(request.gasType == null ? {} : { gasType: request.gasType }),
    ...(request.nitroxPercent == null
      ? {}
      : { nitroxPercent: request.nitroxPercent }),
    ...(request.cylinderVolumeLitres == null
      ? {}
      : { cylinderVolumeLitres: request.cylinderVolumeLitres }),
    ...(request.cylinderForm == null
      ? {}
      : { cylinderForm: request.cylinderForm }),
    ...(request.requestedWeightKg == null
      ? {}
      : { requestedWeightKg: request.requestedWeightKg }),
    ...(request.shoeSizeUk == null
      ? {}
      : { shoeSizeUk: request.shoeSizeUk }),
    ...(request.finStyle == null ? {} : { finStyle: request.finStyle }),
    ...(request.clientNote == null
      ? {}
      : { clientNote: request.clientNote }),
  };
}

function selectionsFromBooking(booking: Booking): SelectedState {
  return Object.fromEntries(
    booking.equipmentRequests.map((request) => [
      request.equipmentItem.id,
      selectionFromRequest(request),
    ]),
  );
}

function profileFromSelections(
  current: UserEquipmentProfile,
  items: EquipmentItem[],
  selected: SelectedState,
): UserEquipmentProfile {
  const next: UserEquipmentProfile = { ...current };
  const itemById = new Map(items.map((item) => [item.id, item]));

  for (const [itemId, selection] of Object.entries(selected)) {
    const item = itemById.get(itemId);
    if (!item) continue;

    switch (item.category) {
      case "BCD":
        next.bcdSize = selection.requestedSize?.trim().toUpperCase() ?? null;
        break;
      case "WETSUIT":
        next.wetsuitSize =
          selection.requestedSize?.trim().toUpperCase() ?? null;
        break;
      case "CYLINDER":
        next.preferredGasType = selection.gasType ?? null;
        next.preferredNitroxPercent =
          selection.gasType === "NITROX"
            ? (selection.nitroxPercent ?? null)
            : null;
        next.preferredCylinderVolumeLitres =
          selection.cylinderVolumeLitres ?? null;
        next.preferredCylinderForm = selection.cylinderForm ?? null;
        break;
      case "WEIGHTS":
        next.preferredWeightKg = selection.requestedWeightKg ?? null;
        break;
      case "FINS":
        next.shoeSizeUk = selection.shoeSizeUk ?? null;
        next.finStyle = selection.finStyle ?? null;
        break;
      default:
        break;
    }
  }

  return next;
}

function selectionSupportsProfile(
  item: EquipmentItem,
  selection: EquipmentSelectionInput,
): boolean {
  switch (item.category) {
    case "BCD":
    case "WETSUIT":
      return Boolean(selection.requestedSize?.trim());
    case "CYLINDER":
      return Boolean(
        selection.gasType &&
          selection.cylinderVolumeLitres &&
          selection.cylinderForm,
      );
    case "WEIGHTS":
      return selection.requestedWeightKg != null;
    case "FINS":
      return selection.shoeSizeUk != null && selection.finStyle != null;
    default:
      return false;
  }
}

function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value?: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmentRow}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.segmentText,
                active && styles.segmentTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const decrease = () =>
    onChange(roundToStep(Math.max(min, value - step), step));
  const increase = () =>
    onChange(roundToStep(Math.min(max, value + step), step));

  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={decrease}
          disabled={value <= min}
          style={[styles.stepperButton, value <= min && styles.disabledControl]}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Ionicons name="remove" size={20} color={colors.navy900} />
        </Pressable>
        <Text style={styles.stepperValue}>
          {Number.isInteger(value) ? value : value.toFixed(1)}
          {suffix ?? ""}
        </Text>
        <Pressable
          onPress={increase}
          disabled={value >= max}
          style={[styles.stepperButton, value >= max && styles.disabledControl]}
          accessibilityLabel={`Increase ${label}`}
        >
          <Ionicons name="add" size={20} color={colors.navy900} />
        </Pressable>
      </View>
    </View>
  );
}

function SizeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <SegmentedControl
        options={SIZE_OPTIONS.map((size) => ({ label: size, value: size }))}
        value={SIZE_OPTIONS.includes(value.toUpperCase()) ? value.toUpperCase() : undefined}
        onChange={onChange}
      />
      <TextInput
        value={value}
        onChangeText={onChange}
        autoCapitalize="characters"
        maxLength={20}
        placeholder="Type another size, for example MT"
        placeholderTextColor={colors.slate400}
        style={styles.sizeInput}
      />
    </>
  );
}

export function SelectEquipmentScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { tripId, trip: passedTrip } = route.params as {
    tripId: string;
    trip?: Trip;
  };

  const [trip, setTrip] = useState<Trip | null>(passedTrip ?? null);
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [profile, setProfile] =
    useState<UserEquipmentProfile>(EMPTY_PROFILE);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedState>({});
  const [saveAsDefaults, setSaveAsDefaults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [catalogueResponse, profileResponse, tripResponse, bookingResponse] =
        await Promise.all([
          apiRequest<{ equipmentItems: EquipmentItem[] }>("/equipment"),
          apiRequest<{ profile: UserEquipmentProfile }>(
            "/users/me/equipment-profile",
          ),
          apiRequest<{ trip: Trip }>(`/trips/${tripId}`),
          apiRequest<{ booking: Booking | null }>(`/bookings/trip/${tripId}`),
        ]);

      const loadedProfile = profileResponse.profile ?? EMPTY_PROFILE;
      setItems(catalogueResponse.equipmentItems);
      setProfile(loadedProfile);
      setTrip(tripResponse.trip);
      const activeBooking =
        bookingResponse.booking?.status === "CONFIRMED"
          ? bookingResponse.booking
          : null;
      setBookingId(activeBooking?.id ?? null);
      setSelected(
        activeBooking
          ? selectionsFromBooking(activeBooking)
          : selectionsFromProfile(
              catalogueResponse.equipmentItems,
              loadedProfile,
            ),
      );
    } catch (loadError) {
      setError(
        loadError instanceof ApiError
          ? loadError.message
          : "Could not load the equipment request form.",
      );
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleItem(item: EquipmentItem) {
    setSelected((previous) => {
      const next = { ...previous };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = defaultOptionsFor(item.category, profile);
      }
      return next;
    });
  }

  function updateOptions(
    itemId: string,
    patch: Partial<EquipmentSelectionInput>,
  ) {
    setSelected((previous) => ({
      ...previous,
      [itemId]: { ...previous[itemId], ...patch },
    }));
  }

  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  const selectedCount = Object.keys(selected).length;
  const canSaveProfile = Object.entries(selected).some(
    ([itemId, selection]) => {
      const item = itemById.get(itemId);
      return item ? selectionSupportsProfile(item, selection) : false;
    },
  );

  useEffect(() => {
    if (!canSaveProfile) setSaveAsDefaults(false);
  }, [canSaveProfile]);

  async function confirmBooking() {
    if (!trip) return;

    const equipment: BookingEquipmentInput[] = Object.entries(selected).map(
      ([equipmentItemId, selection]) => ({
        equipmentItemId,
        quantity: 1,
        selection,
      }),
    );

    setSubmitting(true);
    try {
      if (bookingId) {
        await apiRequest(`/bookings/${bookingId}/equipment`, {
          method: "PUT",
          body: { equipment },
        });
      } else {
        const response = await apiRequest<{ booking: Booking }>("/bookings", {
          method: "POST",
          body: { tripId: trip.id, equipment },
        });
        setBookingId(response.booking.id);
      }

      let profileWarning = "";
      if (saveAsDefaults && canSaveProfile) {
        try {
          const nextProfile = profileFromSelections(profile, items, selected);
          const response = await apiRequest<{ profile: UserEquipmentProfile }>(
            "/users/me/equipment-profile",
            { method: "PUT", body: nextProfile },
          );
          setProfile(response.profile);
        } catch (profileError) {
          profileWarning =
            " The booking succeeded, but your usual equipment details were not saved.";
        }
      }

      Alert.alert(
        bookingId ? "Equipment request updated" : "Booking confirmed",
        `Your equipment list is a request for staff, not a guaranteed reservation.${profileWarning}`,
        [{ text: "OK", onPress: () => navigation.popToTop() }],
      );
    } catch (requestError) {
      Alert.alert(
        bookingId ? "Update failed" : "Booking failed",
        requestError instanceof ApiError
          ? requestError.message
          : "Could not complete the booking.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !trip) {
    return (
      <View style={styles.fill}>
        <ScreenHeader title="Equipment request" />
        <View style={styles.loadingPanel}>
          <ActivityIndicator size="large" color={colors.sky400} />
        </View>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.fill}>
        <ScreenHeader title="Equipment request" />
        {error && <ErrorBanner message={error} onRetry={load} />}
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <ScreenHeader
        title="Equipment request"
        subtitle={`${trip.site?.name ?? "Your dive"} · ${formatTripDateFull(trip.date)}`}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {error && <ErrorBanner message={error} onRetry={load} />}

        <Text style={styles.intro}>
          Select only the equipment you want staff to prepare. Anything left
          unselected means you plan to bring your own.
        </Text>

        <View style={styles.requestNotice}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={colors.warning600}
          />
          <Text style={styles.requestNoticeText}>
            Equipment selections are requests only. Staff will contact you if
            anything is unavailable.
          </Text>
        </View>

        <Card>
          {items.length === 0 ? (
            <Text style={styles.emptyText}>
              No equipment is currently available to request.
            </Text>
          ) : (
            items.map((item, index) => {
              const selection = selected[item.id];
              const isSelected = selection != null;
              const isLast = index === items.length - 1;

              return (
                <View key={item.id}>
                  <Pressable
                    onPress={() => toggleItem(item)}
                    style={styles.itemRow}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={item.name}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxChecked,
                      ]}
                    >
                      {isSelected ? (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color={colors.white}
                        />
                      ) : null}
                    </View>
                    <Ionicons
                      name={CATEGORY_ICONS[item.category]}
                      size={22}
                      color={
                        isSelected ? colors.ocean600 : colors.slate400
                      }
                      style={styles.itemIcon}
                    />
                    <Text style={styles.itemName}>{item.name}</Text>
                  </Pressable>

                  {isSelected &&
                  (item.category === "BCD" ||
                    item.category === "WETSUIT") ? (
                    <View style={styles.optionsBlock}>
                      <Text style={styles.optionsLabel}>Requested size</Text>
                      <SizeSelector
                        value={selection.requestedSize ?? "M"}
                        onChange={(requestedSize) =>
                          updateOptions(item.id, { requestedSize })
                        }
                      />
                    </View>
                  ) : null}

                  {isSelected && item.category === "CYLINDER" ? (
                    <View style={styles.optionsBlock}>
                      <Text style={styles.optionsLabel}>Gas</Text>
                      <SegmentedControl<GasType>
                        options={[
                          { label: "Air", value: "AIR" },
                          { label: "Nitrox", value: "NITROX" },
                        ]}
                        value={selection.gasType}
                        onChange={(gasType) =>
                          updateOptions(item.id, {
                            gasType,
                            nitroxPercent:
                              gasType === "NITROX"
                                ? (selection.nitroxPercent ?? 32)
                                : undefined,
                          })
                        }
                      />

                      {selection.gasType === "NITROX" ? (
                        <View style={styles.optionSpacing}>
                          <Stepper
                            label="Nitrox percentage"
                            value={selection.nitroxPercent ?? 32}
                            min={22}
                            max={40}
                            suffix="%"
                            onChange={(nitroxPercent) =>
                              updateOptions(item.id, { nitroxPercent })
                            }
                          />
                        </View>
                      ) : null}

                      <Text style={[styles.optionsLabel, styles.optionSpacing]}>
                        Cylinder volume
                      </Text>
                      <SegmentedControl<number>
                        options={CYLINDER_VOLUME_OPTIONS.map((volume) => ({
                          label: `${volume}L`,
                          value: volume,
                        }))}
                        value={selection.cylinderVolumeLitres}
                        onChange={(cylinderVolumeLitres) =>
                          updateOptions(item.id, { cylinderVolumeLitres })
                        }
                      />

                      <Text style={[styles.optionsLabel, styles.optionSpacing]}>
                        Cylinder form
                      </Text>
                      <SegmentedControl<CylinderForm>
                        options={[
                          { label: "Standard", value: "STANDARD" },
                          { label: "Tall", value: "TALL" },
                        ]}
                        value={selection.cylinderForm}
                        onChange={(cylinderForm) =>
                          updateOptions(item.id, { cylinderForm })
                        }
                      />
                    </View>
                  ) : null}

                  {isSelected && item.category === "WEIGHTS" ? (
                    <View style={styles.optionsBlock}>
                      <Stepper
                        label="Total lead"
                        value={selection.requestedWeightKg ?? 8}
                        min={0.5}
                        max={40}
                        step={0.5}
                        suffix=" kg"
                        onChange={(requestedWeightKg) =>
                          updateOptions(item.id, { requestedWeightKg })
                        }
                      />
                      <Text style={styles.optionsNote}>
                        Enter the total kilograms you normally use. Staff can
                        adjust this with you on the day.
                      </Text>
                    </View>
                  ) : null}

                  {isSelected && item.category === "FINS" ? (
                    <View style={styles.optionsBlock}>
                      <Stepper
                        label="UK shoe size"
                        value={selection.shoeSizeUk ?? 9}
                        min={1}
                        max={16}
                        step={0.5}
                        onChange={(shoeSizeUk) =>
                          updateOptions(item.id, { shoeSizeUk })
                        }
                      />

                      <Text style={[styles.optionsLabel, styles.optionSpacing]}>
                        Fin style
                      </Text>
                      <SegmentedControl<FinStyle>
                        options={[
                          { label: "Open heel", value: "OPEN_HEEL" },
                          { label: "Full foot", value: "FULL_FOOT" },
                        ]}
                        value={selection.finStyle}
                        onChange={(finStyle) =>
                          updateOptions(item.id, { finStyle })
                        }
                      />
                    </View>
                  ) : null}

                  {!isLast ? <View style={styles.divider} /> : null}
                </View>
              );
            })
          )}
        </Card>

        <View style={styles.profileRow}>
          <View style={styles.profileTextWrap}>
            <Text style={styles.profileTitle}>
              Save selected details as my usual equipment setup
            </Text>
            <Text style={styles.profileBody}>
              This prefills future bookings. It does not reserve equipment.
            </Text>
          </View>
          <Switch
            value={saveAsDefaults}
            onValueChange={setSaveAsDefaults}
            disabled={!canSaveProfile}
            trackColor={{
              false: colors.slate200,
              true: colors.sky400,
            }}
            thumbColor={saveAsDefaults ? colors.ocean600 : colors.white}
          />
        </View>

        <View style={styles.actionColumn}>
          <Button
            label={
              bookingId
                ? selectedCount > 0
                  ? `Update ${selectedCount} equipment request${
                      selectedCount === 1 ? "" : "s"
                    }`
                  : "Remove all equipment requests"
                : selectedCount > 0
                  ? `Confirm booking · ${selectedCount} request${
                      selectedCount === 1 ? "" : "s"
                    }`
                  : "Confirm booking without rental gear"
            }
            onPress={confirmBooking}
            loading={submitting}
            disabled={loading || trip.status !== "SCHEDULED"}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.deepSea900 },
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  loadingPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  intro: {
    fontSize: 14,
    color: colors.mist200,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  requestNotice: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.warning600,
    backgroundColor: colors.warningBg,
  },
  requestNoticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.navy900,
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate600,
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.slate200,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  checkboxChecked: {
    backgroundColor: colors.ocean600,
    borderColor: colors.ocean600,
  },
  itemIcon: { marginRight: spacing.md },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.navy900,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.sand100,
  },
  optionsBlock: {
    marginLeft: 26 + spacing.md + 22 + spacing.md,
    marginRight: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.sand50,
  },
  optionsLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.slate600,
    marginBottom: spacing.xs,
  },
  optionsNote: {
    fontSize: 12,
    color: colors.slate600,
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  optionSpacing: { marginTop: spacing.md },
  sizeInput: {
    minHeight: 44,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    color: colors.navy900,
    fontSize: 14,
    fontWeight: "600",
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  segment: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    minWidth: 44,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: colors.ocean600,
    borderColor: colors.ocean600,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy900,
  },
  segmentTextActive: { color: colors.white },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  stepperLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.navy900,
    flex: 1,
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledControl: { opacity: 0.4 },
  stepperValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.navy900,
    minWidth: 52,
    textAlign: "center",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sand100,
  },
  profileTextWrap: { flex: 1 },
  profileTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy900,
  },
  profileBody: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.slate600,
    marginTop: 2,
  },
  actionColumn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
});
