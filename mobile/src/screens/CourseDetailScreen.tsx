import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { ApiError, apiRequest } from "../api/client";
import { Course, CourseEnrollmentRosterEntry } from "../api/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ErrorBanner } from "../components/ErrorBanner";
import { ScreenHeader } from "../components/ScreenHeader";
import { StatusPill } from "../components/StatusPill";
import { colors, fontFamily, spacing, useThemedStyles } from "../theme";
import { useAuth } from "../context/AuthContext";

const LOCATION_LABEL: Record<string, string> = {
  pool: "Pool",
  classroom: "Classroom",
  open_water: "Open water",
};

const CERT_LEVEL_LABELS: Record<string, string> = {
  OPEN_WATER: "Open Water",
  ADVANCED_OPEN_WATER: "Advanced Open Water",
  RESCUE_DIVER: "Rescue Diver",
  DIVEMASTER: "Divemaster",
  ASSISTANT_INSTRUCTOR: "Assistant Instructor",
  INSTRUCTOR: "Instructor",
  INSTRUCTOR_TRAINER: "Instructor Trainer",
  OTHER: "Other",
};

const CAN_MANAGE_COURSE_ROLES = ["ADMIN", "OWNER"];

function useCourseDetailStyles() {
  return useThemedStyles((p) => ({
    fill: { flex: 1, backgroundColor: colors.deepSea900 },
    content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
    loadingPanel: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    description: {
      fontSize: 14,
      color: p.textPrimary,
      lineHeight: 20,
    },
    instructor: {
      fontSize: 13,
      color: p.textSecondary,
      marginTop: spacing.md,
    },
    price: {
      fontSize: 18,
      fontFamily: fontFamily.readoutBold,
      color: p.accentPrimary,
      marginTop: spacing.md,
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: fontFamily.display,
      color: colors.mist50,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    sessionCard: {
      paddingVertical: spacing.md,
    },
    sessionDate: {
      fontSize: 15,
      fontFamily: fontFamily.readoutBold,
      color: p.textPrimary,
    },
    sessionMeta: {
      fontSize: 13,
      color: p.textSecondary,
      marginTop: 2,
    },
    sessionNotes: {
      fontSize: 13,
      color: p.textPrimary,
      lineHeight: 18,
      marginTop: spacing.sm,
    },
    actionRow: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
    },
    rosterCard: { paddingVertical: spacing.md },
    rosterRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    rosterInfo: { flex: 1 },
    rosterName: { fontSize: 15, fontFamily: fontFamily.display, color: p.textPrimary },
    rosterActionRow: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.borderStrong,
    },
    manageRow: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      gap: spacing.sm,
    },
  }));
}

export function CourseDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { courseId } = route.params as { courseId: string };
  const styles = useCourseDetailStyles();

  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await apiRequest<{ course: Course }>(
        `/courses/${courseId}`,
      );
      setCourse(response.course);
    } catch (loadError) {
      setError(
        loadError instanceof ApiError
          ? loadError.message
          : "Could not load this course.",
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function doEnroll() {
    if (!course) return;
    setEnrolling(true);
    try {
      await apiRequest(`/courses/${course.id}/enroll`, { method: "POST" });
      Alert.alert(
        "Enrolled",
        "Your enrollment has been recorded. Staff can now follow up with the next steps.",
      );
      await load();
    } catch (requestError) {
      Alert.alert(
        "Enrollment failed",
        requestError instanceof ApiError
          ? requestError.message
          : "Could not enroll right now.",
      );
    } finally {
      setEnrolling(false);
    }
  }

  function handleEnroll() {
    if (course && !course.meetsPrerequisite && course.prerequisiteCertLevel) {
      const label =
        CERT_LEVEL_LABELS[course.prerequisiteCertLevel] ??
        course.prerequisiteCertLevel;
      Alert.alert(
        "Prerequisite not on file",
        `This course usually requires ${label}, and we don't have that on file for you. You can still enroll — staff will follow up.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Enroll anyway", onPress: () => void doEnroll() },
        ],
      );
      return;
    }
    void doEnroll();
  }

  function handleMarkComplete(entry: CourseEnrollmentRosterEntry) {
    if (!course) return;
    const grantsSomething = course.grantsCertLevel || course.grantsSpecialty;
    const grantLabel = course.grantsCertLevel
      ? (CERT_LEVEL_LABELS[course.grantsCertLevel] ?? course.grantsCertLevel)
      : course.grantsSpecialty;

    const complete = (applyCertUpdate: boolean) => {
      setCompletingId(entry.id);
      apiRequest(`/courses/${course.id}/enrollments/${entry.id}/complete`, {
        method: "POST",
        body: { applyCertUpdate },
      })
        .then(() => load())
        .catch((requestError) => {
          Alert.alert(
            "Could not mark complete",
            requestError instanceof ApiError
              ? requestError.message
              : "Something went wrong.",
          );
        })
        .finally(() => setCompletingId(null));
    };

    if (!grantsSomething) {
      Alert.alert(
        "Mark complete?",
        `Mark ${entry.client.name} as having completed this course.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Mark complete", onPress: () => complete(false) },
        ],
      );
      return;
    }

    Alert.alert(
      "Mark complete?",
      `Mark ${entry.client.name} as having completed this course, and update their certification with ${grantLabel}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete only",
          onPress: () => complete(false),
        },
        {
          text: "Complete & update cert",
          onPress: () => complete(true),
        },
      ],
    );
  }

  function handleRemoveCourse() {
    if (!course) return;
    Alert.alert(
      "Remove this course?",
      "If nobody has ever enrolled it will be deleted outright; otherwise it will be deactivated and hidden from clients, keeping enrollment history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setRemoving(true);
            apiRequest(`/courses/${course.id}`, { method: "DELETE" })
              .then(() => navigation.goBack())
              .catch((requestError) => {
                Alert.alert(
                  "Could not remove course",
                  requestError instanceof ApiError
                    ? requestError.message
                    : "Something went wrong.",
                );
              })
              .finally(() => setRemoving(false));
          },
        },
      ],
    );
  }

  if (loading && !course) {
    return (
      <View style={styles.fill}>
        <ScreenHeader title="Course" />
        <View style={styles.loadingPanel}>
          <ActivityIndicator size="large" color={colors.sky400} />
        </View>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.fill}>
        <ScreenHeader title="Course" />
        {error && <ErrorBanner message={error} onRetry={load} />}
      </View>
    );
  }

  const isAdmin =
    user?.roles.some((role) => CAN_MANAGE_COURSE_ROLES.includes(role)) ??
    false;
  const isInstructorOfRecord = course.instructor?.id === user?.id;
  const canManage = isAdmin || isInstructorOfRecord;

  return (
    <View style={styles.fill}>
      <ScreenHeader title={course.name} subtitle={course.agency ?? undefined} />
      <ScrollView contentContainerStyle={styles.content}>
        {error && <ErrorBanner message={error} onRetry={load} />}

        <Card>
          <View style={styles.badgeRow}>
            {!course.active ? (
              <StatusPill label="Inactive" tone="neutral" />
            ) : null}
            {course.prerequisiteCertLevel ? (
              <StatusPill
                label={`Requires ${
                  CERT_LEVEL_LABELS[course.prerequisiteCertLevel] ??
                  course.prerequisiteCertLevel
                }`}
                tone={course.meetsPrerequisite ? "neutral" : "warning"}
              />
            ) : null}
            {course.alreadyQualified ? (
              <StatusPill label="You already have this" tone="success" />
            ) : null}
          </View>

          {course.description ? (
            <Text style={styles.description}>{course.description}</Text>
          ) : null}

          {course.instructor ? (
            <Text style={styles.instructor}>
              Instructor: {course.instructor.name}
            </Text>
          ) : null}

          {course.price != null ? (
            <Text style={styles.price}>R{course.price.toLocaleString()}</Text>
          ) : null}
        </Card>

        <Text style={styles.sectionTitle}>Sessions</Text>
        {course.sessions.length === 0 ? (
          <Card>
            <Text style={styles.sessionMeta}>No sessions are published yet.</Text>
          </Card>
        ) : (
          course.sessions.map((session) => (
            <Card key={session.id} style={styles.sessionCard}>
              <Text style={styles.sessionDate}>
                {new Date(session.sessionDate).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
              <Text style={styles.sessionMeta}>
                {LOCATION_LABEL[session.locationType] ?? session.locationType} ·{" "}
                {session.startTime}–{session.endTime}
              </Text>
              {session.notes ? (
                <Text style={styles.sessionNotes}>{session.notes}</Text>
              ) : null}
            </Card>
          ))
        )}

        {!canManage ? (
          <View style={styles.actionRow}>
            <Button
              label="Enroll in this course"
              onPress={handleEnroll}
              loading={enrolling}
            />
          </View>
        ) : null}

        {canManage ? (
          <>
            <Text style={styles.sectionTitle}>
              Enrollments · {course.enrollments?.length ?? 0}
            </Text>
            {!course.enrollments || course.enrollments.length === 0 ? (
              <Card>
                <Text style={styles.sessionMeta}>No one has enrolled yet.</Text>
              </Card>
            ) : (
              course.enrollments.map((entry) => (
                <Card key={entry.id} style={styles.rosterCard}>
                  <View style={styles.rosterRow}>
                    <View style={styles.rosterInfo}>
                      <Text style={styles.rosterName}>{entry.client.name}</Text>
                      <Text style={styles.sessionMeta}>{entry.client.email}</Text>
                    </View>
                    <StatusPill
                      label={entry.status}
                      tone={
                        entry.status === "COMPLETED"
                          ? "success"
                          : entry.status === "CANCELLED"
                            ? "danger"
                            : "info"
                      }
                    />
                  </View>
                  {entry.status === "ENROLLED" ? (
                    <View style={styles.rosterActionRow}>
                      <Button
                        label="Mark complete"
                        variant="secondary"
                        onPress={() => handleMarkComplete(entry)}
                        loading={completingId === entry.id}
                      />
                    </View>
                  ) : null}
                </Card>
              ))
            )}

            <View style={styles.manageRow}>
              <Button
                label="Edit course"
                variant="secondary"
                onPress={() =>
                  navigation.navigate("CreateCourse", { courseId: course.id })
                }
              />
              <Button
                label="Remove course"
                variant="danger"
                onPress={handleRemoveCourse}
                loading={removing}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
