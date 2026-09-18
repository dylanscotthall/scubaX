import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";

import { ScreenHeader } from "../components/ScreenHeader";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { ChipPicker } from "../components/ChipPicker";
import { ErrorBanner } from "../components/ErrorBanner";
import { colors, fontFamily, spacing, radii, useTheme, useThemedStyles } from "../theme";
import { ApiError, apiRequest } from "../api/client";
import {
  Boat,
  DiveSite,
  DiveType,
  LaunchSite,
  StaffMember,
  CreateTripInput,
} from "../api/types";

const DIVE_TYPE_OPTIONS = [
  { label: "Snorkel", value: "SNORKEL" },
  { label: "Scuba (max 18m)", value: "SCUBA" },
  { label: "Deep (18-40m)", value: "DEEP" },
  { label: "Baited shark snorkel", value: "BAITED_SHARK_SNORKEL" },
  { label: "Baited shark scuba", value: "BAITED_SHARK_SCUBA" },
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatApiDate(date: Date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");
}

function formatTime(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createTime(hours: number, minutes: number) {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function entityOptions(items: { id: string; name: string }[]) {
  return items.map((item) => ({ label: item.name, value: item.id }));
}

function useCreateLaunchStyles() {
  return useThemedStyles((p) => ({
    screen: { flex: 1, backgroundColor: colors.deepSea900 },
    loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },

    fieldLabel: {
      fontSize: 11,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: p.textSecondary,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    emptyNote: {
      fontSize: 13,
      color: p.textSecondary,
      fontStyle: "italic",
    },
    input: {
      borderWidth: 1,
      borderColor: p.borderStrong,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 15,
      color: p.textPrimary,
      backgroundColor: p.backgroundAlt,
    },
    timeRow: {
      flexDirection: "row",
      gap: spacing.md,
    },
    timeField: {
      flex: 1,
    },

    pickerField: {
      marginTop: spacing.md,
    },
    pickerButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: p.borderStrong,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      backgroundColor: p.backgroundAlt,
    },
    pickerButtonPressed: {
      opacity: 0.7,
    },
    pickerValue: {
      flex: 1,
      fontSize: 15,
      fontFamily: fontFamily.readoutBold,
      color: p.textPrimary,
    },
    iosPickerContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: p.borderStrong,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      backgroundColor: p.backgroundAlt,
    },

    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.md,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: p.borderStrong,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.sm,
    },
    checkboxChecked: {
      backgroundColor: p.accentPrimary,
      borderColor: p.accentPrimary,
    },
    toggleLabel: {
      flex: 1,
      fontSize: 13,
      color: p.textSecondary,
    },

    actionColumn: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
    },
  }));
}

type PickerFieldProps = {
  label: string;
  mode: "date" | "time";
  value: Date;
  onChange: (value: Date) => void;
  minimumDate?: Date;
};

function PickerField({
  label,
  mode,
  value,
  onChange,
  minimumDate,
}: PickerFieldProps) {
  const styles = useCreateLaunchStyles();
  const { palette } = useTheme();

  function openAndroidPicker() {
    DateTimePickerAndroid.open({
      value,
      mode,
      minimumDate,
      is24Hour: true,
      design: "material",
      // onValueChange, not onChange — this package deprecated onChange in
      // favour of onValueChange/onDismiss/onNeutralButtonPress. Confirmed
      // against the package's own current docs, not assumed.
      onValueChange: (_event, selectedValue) => {
        if (selectedValue) {
          onChange(selectedValue);
        }
      },
      positiveButton: {
        label: "Done",
        textColor: colors.ocean600,
      },
      negativeButton: {
        label: "Cancel",
        textColor: palette.textSecondary,
      },
    });
  }

  return (
    <View style={styles.pickerField}>
      <FieldLabel>{label}</FieldLabel>

      {Platform.OS === "android" ? (
        <Pressable
          onPress={openAndroidPicker}
          accessibilityRole="button"
          accessibilityLabel={`Select ${label.toLowerCase()}`}
          style={({ pressed }) => [
            styles.pickerButton,
            pressed && styles.pickerButtonPressed,
          ]}
        >
          <Ionicons
            name={mode === "date" ? "calendar-outline" : "time-outline"}
            size={20}
            color={colors.ocean600}
          />
          <Text style={styles.pickerValue}>
            {mode === "date" ? formatDisplayDate(value) : formatTime(value)}
          </Text>
          <Ionicons name="chevron-down" size={18} color={palette.textTertiary} />
        </Pressable>
      ) : (
        <View style={styles.iosPickerContainer}>
          <Ionicons
            name={mode === "date" ? "calendar-outline" : "time-outline"}
            size={20}
            color={colors.ocean600}
          />
          <DateTimePicker
            value={value}
            mode={mode}
            display="compact"
            minimumDate={minimumDate}
            minuteInterval={5}
            accentColor={colors.ocean600}
            themeVariant="light"
            onValueChange={(_event, selectedValue) => {
              if (selectedValue) {
                onChange(selectedValue);
              }
            }}
          />
        </View>
      )}
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  const styles = useCreateLaunchStyles();
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

export function CreateLaunchScreen() {
  const navigation = useNavigation<any>();
  const styles = useCreateLaunchStyles();
  const { palette } = useTheme();

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [launchSites, setLaunchSites] = useState<LaunchSite[]>([]);
  const [diveSites, setDiveSites] = useState<DiveSite[]>([]);
  const [skippers, setSkippers] = useState<StaffMember[]>([]);

  const [boatId, setBoatId] = useState<string | null>(null);
  const [launchSiteId, setLaunchSiteId] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteEstimated, setSiteEstimated] = useState(false);
  const [diveType, setDiveType] = useState<DiveType | null>(null);
  const [skipperId, setSkipperId] = useState<string | null>(null);
  const [tripDate, setTripDate] = useState(() => new Date());
  const [meetTime, setMeetTime] = useState(() => createTime(7, 0));
  const [launchTime, setLaunchTime] = useState(() => createTime(8, 0));
  const [capacityOverride, setCapacityOverride] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    setLoadError(null);
    setLoadingOptions(true);
    try {
      const [boatsRes, launchSitesRes, diveSitesRes, staffRes] =
        await Promise.all([
          apiRequest<{ boats: Boat[] }>("/boats"),
          apiRequest<{ launchSites: LaunchSite[] }>("/launch-sites"),
          apiRequest<{ sites: DiveSite[] }>("/dive-sites"),
          apiRequest<{ staff: StaffMember[] }>("/users/staff?role=SKIPPER"),
        ]);

      const activeBoats = boatsRes.boats.filter((b) => b.active);
      setBoats(activeBoats);
      setLaunchSites(launchSitesRes.launchSites.filter((s) => s.active));
      setDiveSites(diveSitesRes.sites.filter((s) => s.active));
      setSkippers(staffRes.staff);

      if (activeBoats.length === 1) {
        setBoatId(activeBoats[0].id);
      }
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "Couldn't load boats/sites/staff.",
      );
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // Rewritten for Date-based state — no more regex against strings that no
  // longer exist. The native pickers already guarantee a valid Date, so
  // there's nothing to format-validate; this only checks what a picker
  // can't enforce on its own (a boat is picked, capacity override is a
  // sane whole number, and meet time is before launch time).
  function validate(): string | null {
    if (!boatId) return "Pick a boat.";
    if (!diveType) return "Pick a dive type.";
    if (capacityOverride.trim() && !/^\d+$/.test(capacityOverride.trim())) {
      return "Capacity override must be a whole number.";
    }
    const meetMinutes = meetTime.getHours() * 60 + meetTime.getMinutes();
    const launchMinutes = launchTime.getHours() * 60 + launchTime.getMinutes();
    if (launchMinutes <= meetMinutes) {
      return "Launch time must be after meet time.";
    }
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    try {
      const body: CreateTripInput = {
        boatId: boatId!,
        launchSiteId,
        siteId,
        siteEstimated: siteId ? siteEstimated : true,
        diveType,
        tripDate: formatApiDate(tripDate),
        meetTime: formatTime(meetTime),
        launchTime: formatTime(launchTime),
        capacityOverride: capacityOverride.trim()
          ? Number(capacityOverride.trim())
          : null,
        skipperId,
      };

      await apiRequest("/trips", { method: "POST", body });

      Alert.alert("Launch created", "The new trip is on the dive calendar.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Couldn't create the launch.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="New launch"
        subtitle="Add a boat departure to the dive calendar"
      />

      {loadingOptions ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.sky400} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {loadError && (
            <ErrorBanner message={loadError} onRetry={loadOptions} />
          )}
          {submitError && <ErrorBanner message={submitError} />}

          <Card>
            <FieldLabel>Boat</FieldLabel>
            {boats.length === 0 ? (
              <Text style={styles.emptyNote}>
                No active boats — add one first.
              </Text>
            ) : (
              <ChipPicker
                options={entityOptions(boats)}
                value={boatId}
                onChange={setBoatId}
              />
            )}

            <PickerField
              label="Date"
              mode="date"
              value={tripDate}
              onChange={setTripDate}
              minimumDate={new Date()}
            />

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <PickerField
                  label="Meet time"
                  mode="time"
                  value={meetTime}
                  onChange={setMeetTime}
                />
              </View>
              <View style={styles.timeField}>
                <PickerField
                  label="Launch time"
                  mode="time"
                  value={launchTime}
                  onChange={setLaunchTime}
                />
              </View>
            </View>

            <FieldLabel>Capacity override (optional)</FieldLabel>
            <TextInput
              style={styles.input}
              value={capacityOverride}
              onChangeText={setCapacityOverride}
              placeholder="Defaults to the boat's capacity"
              placeholderTextColor={palette.textTertiary}
              keyboardType="number-pad"
            />
          </Card>

          <Card>
            <FieldLabel>Launch site (optional)</FieldLabel>
            {launchSites.length === 0 ? (
              <Text style={styles.emptyNote}>No launch sites set up yet.</Text>
            ) : (
              <ChipPicker
                options={entityOptions(launchSites)}
                value={launchSiteId}
                onChange={setLaunchSiteId}
                allowNone
                noneLabel="Not set"
              />
            )}

            <FieldLabel>Dive site</FieldLabel>
            {diveSites.length === 0 ? (
              <Text style={styles.emptyNote}>No dive sites set up yet.</Text>
            ) : (
              <ChipPicker
                options={entityOptions(diveSites)}
                value={siteId}
                onChange={(id) => {
                  setSiteId(id);
                  if (id) setSiteEstimated(false);
                }}
                allowNone
                noneLabel="Destination TBD"
              />
            )}
            {siteId && (
              <Pressable
                onPress={() => setSiteEstimated((v) => !v)}
                style={styles.toggleRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: siteEstimated }}
              >
                <View
                  style={[
                    styles.checkbox,
                    siteEstimated && styles.checkboxChecked,
                  ]}
                >
                  {siteEstimated && (
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  )}
                </View>
                <Text style={styles.toggleLabel}>
                  Mark as estimated (best guess, not confirmed yet)
                </Text>
              </Pressable>
            )}

            <FieldLabel>Dive type</FieldLabel>
            <ChipPicker
              options={DIVE_TYPE_OPTIONS}
              value={diveType}
              onChange={(id) => setDiveType(id as DiveType | null)}
              allowNone
              noneLabel="Not set"
            />
          </Card>

          <Card>
            <FieldLabel>Skipper (optional)</FieldLabel>
            {skippers.length === 0 ? (
              <Text style={styles.emptyNote}>
                No staff with the Skipper role yet.
              </Text>
            ) : (
              <ChipPicker
                options={entityOptions(skippers)}
                value={skipperId}
                onChange={setSkipperId}
                allowNone
                noneLabel="Unassigned"
              />
            )}
          </Card>

          <View style={styles.actionColumn}>
            <Button
              label="Create launch"
              onPress={handleSubmit}
              loading={submitting}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}
