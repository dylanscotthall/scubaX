import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRoute } from "@react-navigation/native";

import { ApiError, apiRequest } from "../api/client";
import { Course } from "../api/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ErrorBanner } from "../components/ErrorBanner";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors, spacing } from "../theme";

const LOCATION_LABEL: Record<string, string> = {
  pool: "Pool",
  classroom: "Classroom",
  open_water: "Open water",
};

export function CourseDetailScreen() {
  const route = useRoute<any>();
  const { courseId } = route.params as { courseId: string };

  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

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

  async function handleEnroll() {
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

  return (
    <View style={styles.fill}>
      <ScreenHeader title={course.name} subtitle={course.agency ?? undefined} />
      <ScrollView contentContainerStyle={styles.content}>
        {error && <ErrorBanner message={error} onRetry={load} />}

        <Card>
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

        <View style={styles.actionRow}>
          <Button
            label="Enroll in this course"
            onPress={handleEnroll}
            loading={enrolling}
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
  description: {
    fontSize: 14,
    color: colors.navy900,
    lineHeight: 20,
  },
  instructor: {
    fontSize: 13,
    color: colors.slate600,
    marginTop: spacing.md,
  },
  price: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ocean600,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
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
    fontWeight: "700",
    color: colors.navy900,
  },
  sessionMeta: {
    fontSize: 13,
    color: colors.slate600,
    marginTop: 2,
  },
  sessionNotes: {
    fontSize: 13,
    color: colors.navy900,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  actionRow: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
});
