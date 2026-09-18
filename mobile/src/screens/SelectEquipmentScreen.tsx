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
  BookingGuestInput,
  CylinderForm,
  EquipmentCategory,
  EquipmentItem,
  EquipmentRequestFields,
  EquipmentSelectionInput,
  FinStyle,
  WeightCarryMethod,
  GasType,
  Trip,
  UserEquipmentProfile,
} from "../api/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ErrorBanner } from "../components/ErrorBanner";
import { NoticeBanner } from "../components/NoticeBanner";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors, fontFamily, radii, spacing, useTheme, useThemedStyles } from "../theme";
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
  preferredWeightCarryMethod: null,
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
        cylinderVolumeLitres: profile.preferredCylinderVolumeLitres ?? 12,
        cylinderForm: profile.preferredCylinderForm ?? "STANDARD",
      };
    }
    case "WEIGHTS":
      return {
        requestedWeightKg: profile.preferredWeightKg ?? 8,
        weightCarryMethod: profile.preferredWeightCarryMethod ?? "BELT",
      };
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
        shouldSelect =
          profile.preferredWeightKg != null ||
          profile.preferredWeightCarryMethod != null;
        break;
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
  request: EquipmentRequestFields,
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
    ...(request.weightCarryMethod == null
      ? {}
      : { weightCarryMethod: request.weightCarryMethod }),
    ...(request.shoeSizeUk == null ? {} : { shoeSizeUk: request.shoeSizeUk }),
    ...(request.finStyle == null ? {} : { finStyle: request.finStyle }),
    ...(request.clientNote == null ? {} : { clientNote: request.clientNote }),
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

interface GuestState {
  id: string;
  label: string;
  selected: SelectedState;
}

let guestKeySequence = 0;
function nextGuestKey(): string {
  guestKeySequence += 1;
  return `new-guest-${guestKeySequence}`;
}

function guestsFromBooking(booking: Booking): GuestState[] {
  return booking.guests.map((guest) => ({
    id: guest.id,
    label: guest.label,
    selected: Object.fromEntries(
      guest.equipmentRequests.map((request) => [
        request.equipmentItem.id,
        selectionFromRequest(request),
      ]),
    ),
  }));
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
        next.preferredWeightCarryMethod = selection.weightCarryMethod ?? null;
        break;
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
      return (
        selection.requestedWeightKg != null &&
        selection.weightCarryMethod != null
      );
    case "FINS":
      return selection.shoeSizeUk != null && selection.finStyle != null;
    default:
      return false;
  }
}

function useSelectEquipmentStyles() {
  return useThemedStyles((p) => ({
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
    emptyText: {
      fontSize: 14,
      color: p.textSecondary,
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
      borderColor: p.borderStrong,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
    },
    checkboxChecked: {
      backgroundColor: p.accentPrimary,
      borderColor: p.accentPrimary,
    },
    itemIcon: { marginRight: spacing.md },
    itemName: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: p.textPrimary,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: p.border,
    },
    optionsBlock: {
      marginLeft: 26 + spacing.md + 22 + spacing.md,
      marginRight: spacing.md,
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: radii.sm,
      backgroundColor: p.backgroundAlt,
    },
    optionsLabel: {
      fontSize: 11,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: p.textSecondary,
      marginBottom: spacing.xs,
    },
    optionsNote: {
      fontSize: 12,
      color: p.textSecondary,
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
      borderColor: p.borderStrong,
      backgroundColor: p.surface,
      color: p.textPrimary,
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
      borderColor: p.borderStrong,
      backgroundColor: p.surface,
      minWidth: 44,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentActive: {
      backgroundColor: p.accentPrimary,
      borderColor: p.accentPrimary,
    },
    segmentText: {
      fontSize: 14,
      fontFamily: fontFamily.displayMedium,
      color: p.textPrimary,
    },
    segmentTextActive: { color: p.textOnAccent },
    stepperRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    stepperLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: p.textPrimary,
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
      backgroundColor: p.surface,
      borderWidth: 1.5,
      borderColor: p.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    disabledControl: { opacity: 0.4 },
    stepperValue: {
      fontSize: 16,
      fontFamily: fontFamily.readoutBold,
      color: p.textPrimary,
      minWidth: 52,
      textAlign: "center",
    },
    sectionLabel: {
      fontSize: 15,
      fontFamily: fontFamily.display,
      color: colors.white,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.xs,
    },
    sectionBody: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.mist200,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    guestCard: {
      borderWidth: 1.5,
      borderColor: colors.sky400,
    },
    guestHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    guestLabelInput: {
      flex: 1,
      minHeight: 44,
      paddingHorizontal: spacing.md,
      borderRadius: radii.sm,
      borderWidth: 1.5,
      borderColor: p.borderStrong,
      backgroundColor: p.backgroundAlt,
      color: p.textPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
    guestRemoveButton: {
      padding: spacing.xs,
    },
    addGuestRow: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.lg,
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginHorizontal: spacing.lg,
      padding: spacing.md,
      borderRadius: radii.sm,
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.border,
    },
    profileTextWrap: { flex: 1 },
    profileTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: p.textPrimary,
    },
    profileBody: {
      fontSize: 12,
      lineHeight: 16,
      color: p.textSecondary,
      marginTop: 2,
    },
    actionColumn: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.lg,
    },
  }));
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
  const styles = useSelectEquipmentStyles();
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
              style={[styles.segmentText, active && styles.segmentTextActive]}
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
  const styles = useSelectEquipmentStyles();
  const { palette } = useTheme();
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
          <Ionicons name="remove" size={20} color={palette.textPrimary} />
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
          <Ionicons name="add" size={20} color={palette.textPrimary} />
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
  const styles = useSelectEquipmentStyles();
  const { palette } = useTheme();
  return (
    <>
      <SegmentedControl
        options={SIZE_OPTIONS.map((size) => ({ label: size, value: size }))}
        value={
          SIZE_OPTIONS.includes(value.toUpperCase())
            ? value.toUpperCase()
            : undefined
        }
        onChange={onChange}
      />
      <TextInput
        value={value}
        onChangeText={onChange}
        autoCapitalize="characters"
        maxLength={20}
        placeholder="Type another size, for example MT"
        placeholderTextColor={palette.textTertiary}
        style={styles.sizeInput}
      />
    </>
  );
}

function EquipmentItemList({
  items,
  selected,
  onToggle,
  onUpdateOptions,
}: {
  items: EquipmentItem[];
  selected: SelectedState;
  onToggle: (item: EquipmentItem) => void;
  onUpdateOptions: (
    itemId: string,
    patch: Partial<EquipmentSelectionInput>,
  ) => void;
}) {
  const styles = useSelectEquipmentStyles();
  const { palette } = useTheme();

  if (items.length === 0) {
    return (
      <Text style={styles.emptyText}>
        No equipment is currently available to request.
      </Text>
    );
  }

  return (
    <>
      {items.map((item, index) => {
        const selection = selected[item.id];
        const isSelected = selection != null;
        const isLast = index === items.length - 1;

        return (
          <View key={item.id}>
            <Pressable
              onPress={() => onToggle(item)}
              style={styles.itemRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={item.name}
            >
              <View
                style={[styles.checkbox, isSelected && styles.checkboxChecked]}
              >
                {isSelected ? (
                  <Ionicons name="checkmark" size={16} color={palette.textOnAccent} />
                ) : null}
              </View>
              <Ionicons
                name={CATEGORY_ICONS[item.category]}
                size={22}
                color={isSelected ? colors.ocean600 : palette.textTertiary}
                style={styles.itemIcon}
              />
              <Text style={styles.itemName}>{item.name}</Text>
            </Pressable>

            {isSelected &&
            (item.category === "BCD" || item.category === "WETSUIT") ? (
              <View style={styles.optionsBlock}>
                <Text style={styles.optionsLabel}>Requested size</Text>
                <SizeSelector
                  value={selection.requestedSize ?? "M"}
                  onChange={(requestedSize) =>
                    onUpdateOptions(item.id, { requestedSize })
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
                    onUpdateOptions(item.id, {
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
                        onUpdateOptions(item.id, { nitroxPercent })
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
                    onUpdateOptions(item.id, { cylinderVolumeLitres })
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
                    onUpdateOptions(item.id, { cylinderForm })
                  }
                />
              </View>
            ) : null}

            {isSelected && item.category === "WEIGHTS" ? (
              <View style={styles.optionsBlock}>
                <Text style={styles.optionsLabel}>How will you carry it?</Text>
                <SegmentedControl<WeightCarryMethod>
                  options={[
                    { label: "Weight belt", value: "BELT" },
                    { label: "My own pockets", value: "POCKETS" },
                  ]}
                  value={selection.weightCarryMethod}
                  onChange={(weightCarryMethod) =>
                    onUpdateOptions(item.id, { weightCarryMethod })
                  }
                />

                <View style={styles.optionSpacing}>
                  <Stepper
                    label="Total lead"
                    value={selection.requestedWeightKg ?? 8}
                    min={0.5}
                    max={40}
                    step={0.5}
                    suffix=" kg"
                    onChange={(requestedWeightKg) =>
                      onUpdateOptions(item.id, { requestedWeightKg })
                    }
                  />
                </View>

                <Text style={styles.optionsNote}>
                  {selection.weightCarryMethod === "POCKETS"
                    ? "We'll hand you loose weights to load into your own pockets."
                    : "We'll set you up with a weight belt carrying this much lead."}{" "}
                  Staff can adjust this with you on the day.
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
                    onUpdateOptions(item.id, { shoeSizeUk })
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
                  onChange={(finStyle) => onUpdateOptions(item.id, { finStyle })}
                />
              </View>
            ) : null}

            {!isLast ? <View style={styles.divider} /> : null}
          </View>
        );
      })}
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

  const styles = useSelectEquipmentStyles();
  const { palette } = useTheme();

  const [trip, setTrip] = useState<Trip | null>(passedTrip ?? null);
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [profile, setProfile] = useState<UserEquipmentProfile>(EMPTY_PROFILE);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedState>({});
  const [guests, setGuests] = useState<GuestState[]>([]);
  const [saveAsDefaults, setSaveAsDefaults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [
        catalogueResponse,
        profileResponse,
        tripResponse,
        bookingResponse,
      ] = await Promise.all([
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
      // Guests never seed from the profile or from the booker's own picks —
      // a brand-new booking always starts with zero guests.
      setGuests(activeBooking ? guestsFromBooking(activeBooking) : []);
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

  function addGuest() {
    setGuests((previous) => [
      ...previous,
      { id: nextGuestKey(), label: "", selected: {} },
    ]);
  }

  function removeGuest(guestId: string) {
    setGuests((previous) => previous.filter((guest) => guest.id !== guestId));
  }

  function updateGuestLabel(guestId: string, label: string) {
    setGuests((previous) =>
      previous.map((guest) =>
        guest.id === guestId ? { ...guest, label } : guest,
      ),
    );
  }

  function toggleGuestItem(guestId: string, item: EquipmentItem) {
    setGuests((previous) =>
      previous.map((guest) => {
        if (guest.id !== guestId) return guest;
        const nextSelected = { ...guest.selected };
        if (nextSelected[item.id]) {
          delete nextSelected[item.id];
        } else {
          // Guests have no saved profile to copy from, so "blank" means the
          // same generic fallback constants the booker sees when they have
          // no profile yet — requestDataForItem still requires these fields
          // to be non-null for BCD/CYLINDER/WEIGHTS/FINS categories.
          nextSelected[item.id] = defaultOptionsFor(item.category, EMPTY_PROFILE);
        }
        return { ...guest, selected: nextSelected };
      }),
    );
  }

  function updateGuestOptions(
    guestId: string,
    itemId: string,
    patch: Partial<EquipmentSelectionInput>,
  ) {
    setGuests((previous) =>
      previous.map((guest) =>
        guest.id === guestId
          ? {
              ...guest,
              selected: {
                ...guest.selected,
                [itemId]: { ...guest.selected[itemId], ...patch },
              },
            }
          : guest,
      ),
    );
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

    const guestsPayload: BookingGuestInput[] = guests.map((guest) => ({
      label: guest.label.trim() ? guest.label.trim() : null,
      equipment: Object.entries(guest.selected).map(
        ([equipmentItemId, selection]) => ({
          equipmentItemId,
          quantity: 1,
          selection,
        }),
      ),
    }));

    setSubmitting(true);
    try {
      if (bookingId) {
        await apiRequest(`/bookings/${bookingId}/equipment`, {
          method: "PUT",
          body: { equipment, guests: guestsPayload },
        });
      } else {
        const response = await apiRequest<{ booking: Booking }>("/bookings", {
          method: "POST",
          body: { tripId: trip.id, equipment, guests: guestsPayload },
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

        <NoticeBanner
          icon="information-circle-outline"
          body="Equipment selections are requests only. Staff will contact you if anything is unavailable."
        />

        <Card>
          <EquipmentItemList
            items={items}
            selected={selected}
            onToggle={toggleItem}
            onUpdateOptions={updateOptions}
          />
        </Card>

        <Text style={styles.sectionLabel}>Bringing anyone with you?</Text>
        <Text style={styles.sectionBody}>
          Add each guest travelling with you and pick equipment for them too.
          Guests don't have an app account, so their selections always start
          blank.
        </Text>

        {guests.map((guest, index) => (
          <Card key={guest.id} style={styles.guestCard}>
            <View style={styles.guestHeaderRow}>
              <TextInput
                value={guest.label}
                onChangeText={(label) => updateGuestLabel(guest.id, label)}
                placeholder={`Guest ${index + 1}`}
                placeholderTextColor={palette.textTertiary}
                style={styles.guestLabelInput}
                maxLength={40}
              />
              <Pressable
                onPress={() => removeGuest(guest.id)}
                accessibilityLabel={`Remove ${guest.label || `Guest ${index + 1}`}`}
                style={styles.guestRemoveButton}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={22}
                  color={palette.textTertiary}
                />
              </Pressable>
            </View>
            <EquipmentItemList
              items={items}
              selected={guest.selected}
              onToggle={(item) => toggleGuestItem(guest.id, item)}
              onUpdateOptions={(itemId, patch) =>
                updateGuestOptions(guest.id, itemId, patch)
              }
            />
          </Card>
        ))}

        <View style={styles.addGuestRow}>
          <Button label="Add a guest" variant="secondary" onPress={addGuest} />
        </View>

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
              false: palette.borderStrong,
              true: colors.sky400,
            }}
            thumbColor={saveAsDefaults ? colors.ocean600 : palette.surface}
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
                : guests.length > 0
                  ? `Confirm booking · ${1 + guests.length} people`
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
