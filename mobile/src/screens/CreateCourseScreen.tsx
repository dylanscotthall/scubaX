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
import { useNavigation, useRoute } from "@react-navigation/native";
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
  CertAgency,
  CertLevel,
  Course,
  CourseSessionInput,
  CreateCourseInput,
  DiveSite,
  UpdateCourseInput,
} from "../api/types";
import { CURATED_SPECIALTIES } from "../constants/specialties";

const AGENCY_OPTIONS = [
  { label: "PADI", value: "PADI" },
  { label: "SSI", value: "SSI" },
  { label: "NAUI", value: "NAUI" },
  { label: "CMAS", value: "CMAS" },
  { label: "Other", value: "OTHER" },
];

const LEVEL_OPTIONS = [
  { label: "Open Water", value: "OPEN_WATER" },
  { label: "Advanced Open Water", value: "ADVANCED_OPEN_WATER" },
  { label: "Rescue Diver", value: "RESCUE_DIVER" },
  { label: "Divemaster", value: "DIVEMASTER" },
  { label: "Assistant Instructor", value: "ASSISTANT_INSTRUCTOR" },
  { label: "Instructor", value: "INSTRUCTOR" },
  { label: "Instructor Trainer", value: "INSTRUCTOR_TRAINER" },
  { label: "Other", value: "OTHER" },
];

const LOCATION_OPTIONS = [
  { label: "Pool", value: "pool" },
  { label: "Classroom", value: "classroom" },
  { label: "Open water", value: "open_water" },
];

const GRANTS_MODE_OPTIONS = [
  { label: "Nothing specific", value: "none" },
  { label: "A cert level", value: "level" },
  { label: "A specialty", value: "specialty" },
];

function pad(value: number) {
  return String(value).padStart(2, "0");
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

function useCreateCourseStyles() {
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
    multilineInput: { minHeight: 80, textAlignVertical: "top" },
    toggleRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.md },
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
    checkboxChecked: { backgroundColor: p.accentPrimary, borderColor: p.accentPrimary },
    toggleLabel: { flex: 1, fontSize: 13, color: p.textSecondary },
    sectionTitle: {
      fontSize: 16,
      fontFamily: fontFamily.display,
      color: colors.mist50,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    sessionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
      marginTop: spacing.sm,
    },
    pickerValue: { fontSize: 15, fontFamily: fontFamily.readoutBold, color: p.textPrimary },
    timeRow: { flexDirection: "row", gap: spacing.md },
    timeField: { flex: 1 },
    addSessionRow: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
    actionColumn: { marginHorizontal: spacing.lg, marginTop: spacing.sm },
  }));
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  const styles = useCreateCourseStyles();
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

interface SessionRow {
  key: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  locationType: CourseSessionInput["locationType"];
  siteId: string | null;
  notes: string;
}

let sessionKeySequence = 0;
function nextSessionKey() {
  sessionKeySequence += 1;
  return `session-${sessionKeySequence}`;
}

function newSessionRow(): SessionRow {
  return {
    key: nextSessionKey(),
    date: new Date(),
    startTime: createTime(9, 0),
    endTime: createTime(11, 0),
    locationType: "pool",
    siteId: null,
    notes: "",
  };
}

function SessionEditor({
  session,
  diveSites,
  onChange,
  onRemove,
}: {
  session: SessionRow;
  diveSites: DiveSite[];
  onChange: (patch: Partial<SessionRow>) => void;
  onRemove: () => void;
}) {
  const styles = useCreateCourseStyles();
  const { palette } = useTheme();
  return (
    <Card>
      <View style={styles.sessionHeaderRow}>
        <FieldLabel>Session</FieldLabel>
        <Pressable onPress={onRemove} accessibilityLabel="Remove session">
          <Ionicons name="trash-outline" size={18} color={palette.textTertiary} />
        </Pressable>
      </View>

      {Platform.OS === "android" ? (
        <Pressable
          onPress={() =>
            DateTimePickerAndroid.open({
              value: session.date,
              mode: "date",
              onValueChange: (_e, value) => value && onChange({ date: value }),
            })
          }
          style={styles.pickerButton}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.ocean600} />
          <Text style={styles.pickerValue}>
            {formatDisplayDate(session.date)}
          </Text>
        </Pressable>
      ) : (
        <DateTimePicker
          value={session.date}
          mode="date"
          display="compact"
          onValueChange={(_e, value) => value && onChange({ date: value })}
        />
      )}

      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <FieldLabel>Start</FieldLabel>
          {Platform.OS === "android" ? (
            <Pressable
              onPress={() =>
                DateTimePickerAndroid.open({
                  value: session.startTime,
                  mode: "time",
                  is24Hour: true,
                  onValueChange: (_e, value) =>
                    value && onChange({ startTime: value }),
                })
              }
              style={styles.pickerButton}
            >
              <Text style={styles.pickerValue}>
                {formatTime(session.startTime)}
              </Text>
            </Pressable>
          ) : (
            <DateTimePicker
              value={session.startTime}
              mode="time"
              display="compact"
              minuteInterval={5}
              onValueChange={(_e, value) =>
                value && onChange({ startTime: value })
              }
            />
          )}
        </View>
        <View style={styles.timeField}>
          <FieldLabel>End</FieldLabel>
          {Platform.OS === "android" ? (
            <Pressable
              onPress={() =>
                DateTimePickerAndroid.open({
                  value: session.endTime,
                  mode: "time",
                  is24Hour: true,
                  onValueChange: (_e, value) =>
                    value && onChange({ endTime: value }),
                })
              }
              style={styles.pickerButton}
            >
              <Text style={styles.pickerValue}>
                {formatTime(session.endTime)}
              </Text>
            </Pressable>
          ) : (
            <DateTimePicker
              value={session.endTime}
              mode="time"
              display="compact"
              minuteInterval={5}
              onValueChange={(_e, value) =>
                value && onChange({ endTime: value })
              }
            />
          )}
        </View>
      </View>

      <FieldLabel>Location</FieldLabel>
      <ChipPicker
        options={LOCATION_OPTIONS}
        value={session.locationType}
        onChange={(value) =>
          value && onChange({ locationType: value as CourseSessionInput["locationType"] })
        }
      />

      {session.locationType === "open_water" && diveSites.length > 0 ? (
        <>
          <FieldLabel>Dive site (optional)</FieldLabel>
          <ChipPicker
            options={diveSites.map((site) => ({
              label: site.name,
              value: site.id,
            }))}
            value={session.siteId}
            onChange={(value) => onChange({ siteId: value })}
            allowNone
            noneLabel="Not set"
          />
        </>
      ) : null}

      <FieldLabel>Notes (optional)</FieldLabel>
      <TextInput
        style={styles.input}
        value={session.notes}
        onChangeText={(notes) => onChange({ notes })}
        placeholder="Anything divers should know"
        placeholderTextColor={palette.textTertiary}
      />
    </Card>
  );
}

export function CreateCourseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { courseId } = (route.params ?? {}) as { courseId?: string };
  const isEditing = Boolean(courseId);
  const styles = useCreateCourseStyles();
  const { palette } = useTheme();

  const [loading, setLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [diveSites, setDiveSites] = useState<DiveSite[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agency, setAgency] = useState<CertAgency | null>(null);
  const [prerequisiteCertLevel, setPrerequisiteCertLevel] =
    useState<CertLevel | null>(null);
  const [grantsMode, setGrantsMode] = useState<"none" | "level" | "specialty">(
    "none",
  );
  const [grantsCertLevel, setGrantsCertLevel] = useState<CertLevel | null>(
    null,
  );
  const [grantsSpecialty, setGrantsSpecialty] = useState<string | null>(null);
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [price, setPrice] = useState("");
  const [active, setActive] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([newSessionRow()]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadDiveSites = useCallback(async () => {
    try {
      const response = await apiRequest<{ sites: DiveSite[] }>("/dive-sites");
      setDiveSites(response.sites.filter((site) => site.active));
    } catch {
      // Dive sites are an optional refinement on a session; not fatal.
    }
  }, []);

  const loadCourse = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const response = await apiRequest<{ course: Course }>(
        `/courses/${courseId}`,
      );
      const course = response.course;
      setName(course.name);
      setDescription(course.description ?? "");
      setAgency(course.agency ?? null);
      setPrerequisiteCertLevel(course.prerequisiteCertLevel ?? null);
      if (course.grantsCertLevel) {
        setGrantsMode("level");
        setGrantsCertLevel(course.grantsCertLevel);
      } else if (course.grantsSpecialty) {
        setGrantsMode("specialty");
        setGrantsSpecialty(course.grantsSpecialty);
      }
      setPrice(course.price != null ? String(course.price) : "");
      setActive(course.active);
    } catch (error) {
      setLoadError(
        error instanceof ApiError
          ? error.message
          : "Could not load this course.",
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadDiveSites();
    void loadCourse();
  }, [loadDiveSites, loadCourse]);

  function updateSession(key: string, patch: Partial<SessionRow>) {
    setSessions((previous) =>
      previous.map((session) =>
        session.key === key ? { ...session, ...patch } : session,
      ),
    );
  }

  function removeSession(key: string) {
    setSessions((previous) => previous.filter((session) => session.key !== key));
  }

  function validate(): string | null {
    if (!name.trim()) return "Course name is required.";
    if (price.trim() && Number.isNaN(Number(price.trim()))) {
      return "Price must be a number.";
    }
    if (!isEditing && sessions.length === 0) {
      return "Add at least one session.";
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
      if (isEditing) {
        const body: UpdateCourseInput = {
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          agency,
          prerequisiteCertLevel,
          grantsCertLevel: grantsMode === "level" ? grantsCertLevel : null,
          grantsSpecialty: grantsMode === "specialty" ? grantsSpecialty : null,
          price: price.trim() ? Number(price.trim()) : null,
          active,
        };
        await apiRequest(`/courses/${courseId}`, { method: "PATCH", body });
      } else {
        const body: CreateCourseInput = {
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          agency,
          prerequisiteCertLevel,
          grantsCertLevel: grantsMode === "level" ? grantsCertLevel : null,
          grantsSpecialty: grantsMode === "specialty" ? grantsSpecialty : null,
          price: price.trim() ? Number(price.trim()) : null,
          sessions: sessions.map((session) => ({
            sessionDate: new Date(
              session.date.getFullYear(),
              session.date.getMonth(),
              session.date.getDate(),
            ).toISOString(),
            startTime: formatTime(session.startTime),
            endTime: formatTime(session.endTime),
            locationType: session.locationType,
            siteId: session.locationType === "open_water" ? session.siteId : null,
            notes: session.notes.trim() ? session.notes.trim() : null,
          })),
        };
        await apiRequest("/courses", { method: "POST", body });
      }

      Alert.alert(
        isEditing ? "Course updated" : "Course created",
        isEditing
          ? "Your changes were saved."
          : "The new course is now listed for clients.",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : "Could not save the course.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={isEditing ? "Edit course" : "New course"} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.sky400} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={isEditing ? "Edit course" : "New course"}
        subtitle="Publish a training programme for clients"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {loadError && <ErrorBanner message={loadError} onRetry={loadCourse} />}
        {submitError && <ErrorBanner message={submitError} />}

        <Card>
          <FieldLabel>Name</FieldLabel>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Advanced Open Water"
            placeholderTextColor={palette.textTertiary}
          />

          <FieldLabel>Description (optional)</FieldLabel>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="What divers will learn"
            placeholderTextColor={palette.textTertiary}
            multiline
          />

          <FieldLabel>Agency (optional)</FieldLabel>
          <ChipPicker
            options={AGENCY_OPTIONS}
            value={agency}
            onChange={(value) => setAgency(value as CertAgency | null)}
            allowNone
          />

          <FieldLabel>Prerequisite (optional)</FieldLabel>
          <ChipPicker
            options={LEVEL_OPTIONS}
            value={prerequisiteCertLevel}
            onChange={(value) => setPrerequisiteCertLevel(value as CertLevel | null)}
            allowNone
            noneLabel="No prerequisite"
          />

          <FieldLabel>Price (optional)</FieldLabel>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="Rand amount"
            placeholderTextColor={palette.textTertiary}
            keyboardType="decimal-pad"
          />

          {isEditing ? (
            <Pressable
              onPress={() => setActive((current) => !current)}
              style={styles.toggleRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
            >
              <View style={[styles.checkbox, active && styles.checkboxChecked]}>
                {active && (
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                )}
              </View>
              <Text style={styles.toggleLabel}>
                Active (visible to clients)
              </Text>
            </Pressable>
          ) : null}
        </Card>

        <Card>
          <FieldLabel>What this course grants</FieldLabel>
          <ChipPicker
            options={GRANTS_MODE_OPTIONS}
            value={grantsMode}
            onChange={(value) =>
              setGrantsMode((value as typeof grantsMode) ?? "none")
            }
          />

          {grantsMode === "level" ? (
            <>
              <FieldLabel>Cert level granted</FieldLabel>
              <ChipPicker
                options={LEVEL_OPTIONS}
                value={grantsCertLevel}
                onChange={(value) => setGrantsCertLevel(value as CertLevel | null)}
              />
            </>
          ) : null}

          {grantsMode === "specialty" ? (
            <>
              <FieldLabel>Specialty granted</FieldLabel>
              <ChipPicker
                options={CURATED_SPECIALTIES.map((specialty) => ({
                  label: specialty,
                  value: specialty,
                }))}
                value={
                  grantsSpecialty != null &&
                  (CURATED_SPECIALTIES as readonly string[]).includes(
                    grantsSpecialty,
                  )
                    ? grantsSpecialty
                    : null
                }
                onChange={setGrantsSpecialty}
              />
              <TextInput
                style={styles.input}
                value={customSpecialty}
                onChangeText={(value) => {
                  setCustomSpecialty(value);
                  setGrantsSpecialty(value.trim() ? value : null);
                }}
                placeholder="Or type a custom specialty"
                placeholderTextColor={palette.textTertiary}
              />
            </>
          ) : null}
        </Card>

        {!isEditing ? (
          <>
            <Text style={styles.sectionTitle}>Sessions</Text>
            {sessions.map((session) => (
              <SessionEditor
                key={session.key}
                session={session}
                diveSites={diveSites}
                onChange={(patch) => updateSession(session.key, patch)}
                onRemove={() => removeSession(session.key)}
              />
            ))}
            <View style={styles.addSessionRow}>
              <Button
                label="Add another session"
                variant="secondary"
                onPress={() => setSessions((prev) => [...prev, newSessionRow()])}
              />
            </View>
          </>
        ) : null}

        <View style={styles.actionColumn}>
          <Button
            label={isEditing ? "Save changes" : "Create course"}
            onPress={handleSubmit}
            loading={submitting}
          />
        </View>
      </ScrollView>
    </View>
  );
}
