import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ApiError, apiRequest } from "../api/client";
import {
  CertAgency,
  CertLevel,
  UpdateCertificationInput,
  UserProfile,
} from "../api/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ChipPicker } from "../components/ChipPicker";
import { ErrorBanner } from "../components/ErrorBanner";
import { ScreenHeader } from "../components/ScreenHeader";
import { CURATED_SPECIALTIES } from "../constants/specialties";
import { colors, fontFamily, radii, spacing, useTheme, useThemedStyles } from "../theme";

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

const APPEARANCE_OPTIONS = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

function useProfileStyles() {
  return useThemedStyles((p) => ({
    fill: { flex: 1, backgroundColor: colors.deepSea900 },
    content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
    loadingPanel: { flex: 1, alignItems: "center", justifyContent: "center" },
    label: {
      fontSize: 11,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: p.textSecondary,
    },
    spacedLabel: { marginTop: spacing.lg },
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
    emptyText: { fontSize: 14, color: p.textSecondary },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      borderRadius: radii.sm,
      borderWidth: 1.5,
      borderColor: p.borderStrong,
      backgroundColor: p.surface,
    },
    chipText: { fontSize: 13, fontFamily: fontFamily.displayMedium, color: p.textPrimary },
    specialtyChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: spacing.md,
      borderRadius: radii.pill,
      backgroundColor: p.backgroundAlt,
      borderWidth: 1,
      borderColor: p.border,
    },
    specialtyChipText: { fontSize: 13, fontFamily: fontFamily.displayMedium, color: p.textPrimary },
    textInput: {
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
    customSpecialtyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    customSpecialtyInput: { flex: 1, marginTop: 0 },
    saveRow: { marginTop: spacing.lg },
  }));
}

export function ProfileScreen() {
  const styles = useProfileStyles();
  const { palette, preference, setPreference } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [certAgency, setCertAgency] = useState<CertAgency | null>(null);
  const [certLevel, setCertLevel] = useState<CertLevel | null>(null);
  const [certNumber, setCertNumber] = useState("");
  const [mostRecentDiveDate, setMostRecentDiveDate] = useState("");
  const [mostRecentDiveLoc, setMostRecentDiveLoc] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [customSpecialty, setCustomSpecialty] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSpecialties, setSavingSpecialties] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await apiRequest<{ user: UserProfile }>("/users/me");
      const user = response.user;
      setProfile(user);
      setCertAgency(user.certAgency ?? null);
      setCertLevel(user.certLevel ?? null);
      setCertNumber(user.certNumber ?? "");
      setMostRecentDiveDate(user.mostRecentDiveDate?.slice(0, 10) ?? "");
      setMostRecentDiveLoc(user.mostRecentDiveLocation ?? "");
      setSpecialties(user.certSpecialties ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof ApiError
          ? loadError.message
          : "Could not load your certification profile.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveCertification(body: UpdateCertificationInput) {
    const response = await apiRequest<{ user: UserProfile }>(
      "/users/me/certification",
      { method: "PATCH", body },
    );
    setProfile(response.user);
    return response.user;
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      await saveCertification({
        certAgency,
        certLevel,
        certNumber: certNumber.trim() ? certNumber.trim() : null,
        mostRecentDiveDate: mostRecentDiveDate.trim()
          ? new Date(`${mostRecentDiveDate.trim()}T00:00:00.000Z`).toISOString()
          : null,
        mostRecentDiveLoc: mostRecentDiveLoc.trim()
          ? mostRecentDiveLoc.trim()
          : null,
      });
      Alert.alert("Saved", "Your certification details were updated.");
    } catch (saveError) {
      Alert.alert(
        "Could not save",
        saveError instanceof ApiError
          ? saveError.message
          : "Something went wrong saving your certification.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function addSpecialty(specialty: string) {
    const trimmed = specialty.trim();
    if (!trimmed) return;
    if (specialties.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }

    const next = [...specialties, trimmed];
    setSavingSpecialties(true);
    try {
      const user = await saveCertification({ certSpecialties: next });
      setSpecialties(user.certSpecialties ?? next);
      setCustomSpecialty("");
    } catch (saveError) {
      Alert.alert(
        "Could not add specialty",
        saveError instanceof ApiError
          ? saveError.message
          : "Something went wrong adding that specialty.",
      );
    } finally {
      setSavingSpecialties(false);
    }
  }

  async function removeSpecialty(specialty: string) {
    const next = specialties.filter((s) => s !== specialty);
    setSavingSpecialties(true);
    try {
      const user = await saveCertification({ certSpecialties: next });
      setSpecialties(user.certSpecialties ?? next);
    } catch (saveError) {
      Alert.alert(
        "Could not remove specialty",
        saveError instanceof ApiError
          ? saveError.message
          : "Something went wrong removing that specialty.",
      );
    } finally {
      setSavingSpecialties(false);
    }
  }

  const availableCuratedSpecialties = CURATED_SPECIALTIES.filter(
    (specialty) =>
      !specialties.some((s) => s.toLowerCase() === specialty.toLowerCase()),
  );

  if (loading && !profile) {
    return (
      <View style={styles.fill}>
        <ScreenHeader title="My certification" />
        <View style={styles.loadingPanel}>
          <ActivityIndicator size="large" color={colors.sky400} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <ScreenHeader
        title="My certification"
        subtitle="What you're qualified to dive, on file with the centre"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {error && <ErrorBanner message={error} onRetry={load} />}

        <Card>
          <Text style={styles.label}>Agency</Text>
          <ChipPicker
            options={AGENCY_OPTIONS}
            value={certAgency}
            onChange={(value) => setCertAgency(value as CertAgency)}
          />

          <Text style={[styles.label, styles.spacedLabel]}>
            Certification level
          </Text>
          <ChipPicker
            options={LEVEL_OPTIONS}
            value={certLevel}
            onChange={(value) => setCertLevel(value as CertLevel)}
          />

          <Text style={[styles.label, styles.spacedLabel]}>
            Certification number
          </Text>
          <TextInput
            value={certNumber}
            onChangeText={setCertNumber}
            placeholder="Optional"
            placeholderTextColor={palette.textTertiary}
            style={styles.textInput}
          />

          <Text style={[styles.label, styles.spacedLabel]}>
            Most recent dive date
          </Text>
          <TextInput
            value={mostRecentDiveDate}
            onChangeText={setMostRecentDiveDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={palette.textTertiary}
            style={styles.textInput}
          />

          <Text style={[styles.label, styles.spacedLabel]}>
            Most recent dive location
          </Text>
          <TextInput
            value={mostRecentDiveLoc}
            onChangeText={setMostRecentDiveLoc}
            placeholder="Optional"
            placeholderTextColor={palette.textTertiary}
            style={styles.textInput}
          />

          <View style={styles.saveRow}>
            <Button
              label="Save certification"
              onPress={handleSaveProfile}
              loading={savingProfile}
            />
          </View>
        </Card>

        <Text style={styles.sectionLabel}>Specialties</Text>
        <Text style={styles.sectionBody}>
          Add any specialty you already hold, even if you earned it before
          using this app.
        </Text>

        <Card>
          {specialties.length === 0 ? (
            <Text style={styles.emptyText}>No specialties added yet.</Text>
          ) : (
            <View style={styles.chipRow}>
              {specialties.map((specialty) => (
                <View key={specialty} style={styles.specialtyChip}>
                  <Text style={styles.specialtyChipText}>{specialty}</Text>
                  <Pressable
                    onPress={() => removeSpecialty(specialty)}
                    disabled={savingSpecialties}
                    accessibilityLabel={`Remove ${specialty}`}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={palette.textTertiary}
                    />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {availableCuratedSpecialties.length > 0 ? (
            <>
              <Text style={[styles.label, styles.spacedLabel]}>
                Add a specialty
              </Text>
              <View style={styles.chipRow}>
                {availableCuratedSpecialties.map((specialty) => (
                  <Pressable
                    key={specialty}
                    onPress={() => addSpecialty(specialty)}
                    disabled={savingSpecialties}
                    style={styles.chip}
                  >
                    <Ionicons name="add" size={14} color={colors.ocean600} />
                    <Text style={styles.chipText}>{specialty}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <Text style={[styles.label, styles.spacedLabel]}>
            Or add a custom specialty
          </Text>
          <View style={styles.customSpecialtyRow}>
            <TextInput
              value={customSpecialty}
              onChangeText={setCustomSpecialty}
              placeholder="e.g. Sidemount"
              placeholderTextColor={palette.textTertiary}
              style={[styles.textInput, styles.customSpecialtyInput]}
              onSubmitEditing={() => addSpecialty(customSpecialty)}
            />
            <Button
              label="Add"
              variant="secondary"
              onPress={() => addSpecialty(customSpecialty)}
              disabled={!customSpecialty.trim() || savingSpecialties}
            />
          </View>
        </Card>

        <Text style={styles.sectionLabel}>Appearance</Text>
        <Text style={styles.sectionBody}>
          Choose how ScubaXcursions looks on this device.
        </Text>

        <Card>
          <ChipPicker
            options={APPEARANCE_OPTIONS}
            value={preference}
            onChange={(value) => setPreference((value as typeof preference) ?? "system")}
          />
        </Card>
      </ScrollView>
    </View>
  );
}
