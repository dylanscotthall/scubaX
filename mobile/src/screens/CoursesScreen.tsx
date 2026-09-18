import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { ScreenHeader } from "../components/ScreenHeader";
import { StatusPill } from "../components/StatusPill";
import { ErrorBanner } from "../components/ErrorBanner";
import { HeroPanel } from "../components/HeroPanel";
import { EmptyState } from "../components/EmptyState";

import { colors, fontFamily, radii, shadows, spacing, useThemedStyles } from "../theme";

import { ApiError, apiRequest } from "../api/client";
import { Course } from "../api/types";
import { useAuth } from "../context/AuthContext";

// Same roles the backend's POST /courses actually allows (courses.ts's
// courseStaffRoles).
const CAN_CREATE_COURSE_ROLES = ["ADMIN", "OWNER", "INSTRUCTOR"];

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

function useCoursesStyles() {
  return useThemedStyles((p) => ({
    screen: {
      flex: 1,
      backgroundColor: colors.deepSea900,
    },
    content: {
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    heroIcon: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.12)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
    },
    heroText: {
      marginTop: spacing.lg,
    },
    heroEyebrow: {
      fontSize: 9,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 1.8,
      color: colors.highlight500,
    },
    heroTitle: {
      marginTop: 4,
      fontSize: 25,
      fontFamily: fontFamily.display,
      color: colors.white,
    },
    heroBody: {
      marginTop: spacing.sm,
      maxWidth: 320,
      fontSize: 13,
      lineHeight: 19,
      color: colors.sand100,
    },
    heroStats: {
      flexDirection: "row",
      alignItems: "stretch",
      marginTop: spacing.xl,
      paddingTop: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "rgba(255,255,255,0.2)",
    },
    heroStat: {
      flex: 1,
      alignItems: "center",
    },
    heroStatValue: {
      fontFamily: fontFamily.readoutBold,
      fontSize: 21,
      color: colors.white,
    },
    heroStatLabel: {
      marginTop: 4,
      fontSize: 7,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 0.9,
      color: colors.sky400,
    },
    heroStatDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(255,255,255,0.2)",
    },
    sectionHeading: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginHorizontal: spacing.lg,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    sectionEyebrow: {
      fontSize: 8,
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
    catalogueBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      borderRadius: radii.pill,
      backgroundColor: colors.warningBg,
    },
    catalogueBadgeText: {
      fontSize: 8,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 0.8,
      color: colors.warning600,
    },
    courseCard: {
      flexDirection: "row",
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      borderRadius: radii.md,
      overflow: "hidden",
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.border,
      ...shadows.card,
    },
    courseCardPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.99 }],
    },
    courseNumber: {
      width: 48,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.navy900,
    },
    courseNumberText: {
      fontFamily: fontFamily.readoutBold,
      fontSize: 15,
      color: colors.warning600,
      transform: [{ rotate: "-90deg" }],
    },
    courseBody: {
      flex: 1,
      padding: spacing.lg,
    },
    courseTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    courseTitleArea: {
      flex: 1,
    },
    courseEyebrow: {
      fontSize: 8,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 1.2,
      color: p.textTertiary,
    },
    courseName: {
      marginTop: 4,
      fontSize: 18,
      lineHeight: 22,
      fontFamily: fontFamily.display,
      color: p.textPrimary,
    },
    description: {
      marginTop: spacing.sm,
      fontSize: 13,
      lineHeight: 19,
      color: p.textSecondary,
    },
    courseDataStrip: {
      flexDirection: "row",
      alignItems: "stretch",
      marginTop: spacing.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.sm,
      backgroundColor: p.backgroundAlt,
    },
    courseDataItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    courseDataText: {
      flex: 1,
      marginLeft: spacing.xs,
    },
    courseDataLabel: {
      fontSize: 7,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 0.8,
      color: p.textTertiary,
    },
    courseDataValue: {
      marginTop: 2,
      fontFamily: fontFamily.readoutBold,
      fontSize: 11,
      color: p.textPrimary,
    },
    courseDataDivider: {
      width: StyleSheet.hairlineWidth,
      marginHorizontal: spacing.sm,
      backgroundColor: p.borderStrong,
    },
    courseDataPrice: {
      minWidth: 68,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    price: {
      marginTop: 2,
      fontFamily: fontFamily.readoutBold,
      fontSize: 14,
      color: p.accentPrimary,
    },
    courseFooter: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.md,
    },
    courseFooterLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: p.borderStrong,
    },
    openCourse: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: spacing.sm,
    },
    openCourseText: {
      fontSize: 8,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 1,
      color: colors.warning600,
    },
    createCourseButton: {
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
    createCourseButtonPressed: { opacity: 0.8 },
    createCourseIcon: {
      width: 42,
      height: 42,
      borderRadius: radii.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.ocean600,
    },
    createCourseText: { flex: 1, marginLeft: spacing.md },
    createCourseEyebrow: {
      fontSize: 8,
      fontFamily: fontFamily.displayMedium,
      letterSpacing: 1.2,
      color: colors.sky400,
    },
    createCourseTitle: {
      marginTop: 3,
      fontSize: 15,
      fontFamily: fontFamily.display,
      color: colors.white,
    },
    courseCardQualified: { opacity: 0.72 },
    badgeColumn: { alignItems: "flex-end", gap: 4 },
    qualifiedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: spacing.sm,
    },
    qualifiedText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.success600,
    },
    prerequisiteText: {
      fontSize: 12,
      fontWeight: "600",
      color: p.textSecondary,
    },
    prerequisiteTextWarning: { color: colors.warning600 },
  }));
}

function CourseCard({
  course,
  index,
  onPress,
}: {
  course: Course;
  index: number;
  onPress: () => void;
}) {
  const styles = useCoursesStyles();
  const sessionCount = course.sessions.length;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.courseCard,
        course.alreadyQualified && styles.courseCardQualified,
        pressed && styles.courseCardPressed,
      ]}
    >
      <View style={styles.courseNumber}>
        <Text style={styles.courseNumberText}>
          {String(index + 1).padStart(2, "0")}
        </Text>
      </View>

      <View style={styles.courseBody}>
        <View style={styles.courseTopRow}>
          <View style={styles.courseTitleArea}>
            <Text style={styles.courseEyebrow}>TRAINING DOSSIER</Text>

            <Text style={styles.courseName}>{course.name}</Text>
          </View>

          <View style={styles.badgeColumn}>
            {course.agency ? (
              <StatusPill label={course.agency} tone="info" />
            ) : null}
            {!course.active ? (
              <StatusPill label="Inactive" tone="neutral" />
            ) : null}
          </View>
        </View>

        {course.alreadyQualified ? (
          <View style={styles.qualifiedRow}>
            <Ionicons
              name="checkmark-circle"
              size={15}
              color={colors.success600}
            />
            <Text style={styles.qualifiedText}>You already have this</Text>
          </View>
        ) : course.prerequisiteCertLevel ? (
          <View style={styles.qualifiedRow}>
            <Ionicons
              name="information-circle-outline"
              size={15}
              color={course.meetsPrerequisite ? colors.slate600 : colors.warning600}
            />
            <Text
              style={[
                styles.prerequisiteText,
                !course.meetsPrerequisite && styles.prerequisiteTextWarning,
              ]}
            >
              Requires{" "}
              {CERT_LEVEL_LABELS[course.prerequisiteCertLevel] ??
                course.prerequisiteCertLevel}
            </Text>
          </View>
        ) : null}

        {course.description ? (
          <Text style={styles.description} numberOfLines={3}>
            {course.description}
          </Text>
        ) : null}

        <View style={styles.courseDataStrip}>
          <View style={styles.courseDataItem}>
            <Ionicons name="layers-outline" size={17} color={colors.ocean600} />

            <View style={styles.courseDataText}>
              <Text style={styles.courseDataLabel}>SESSIONS</Text>

              <Text style={styles.courseDataValue}>{sessionCount}</Text>
            </View>
          </View>

          <View style={styles.courseDataDivider} />

          <View style={styles.courseDataItem}>
            <Ionicons name="water-outline" size={17} color={colors.ocean600} />

            <View style={styles.courseDataText}>
              <Text style={styles.courseDataLabel}>FORMAT</Text>

              <Text
                style={styles.courseDataValue}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Pool + open water
              </Text>
            </View>
          </View>

          <View style={styles.courseDataDivider} />

          <View style={styles.courseDataPrice}>
            <Text style={styles.courseDataLabel}>TUITION</Text>

            <Text style={styles.price}>
              {course.price != null
                ? `R${course.price.toLocaleString()}`
                : "TBC"}
            </Text>
          </View>
        </View>

        <View style={styles.courseFooter}>
          <View style={styles.courseFooterLine} />

          <View style={styles.openCourse}>
            <Text style={styles.openCourseText}>VIEW COURSE</Text>

            <Ionicons
              name="arrow-forward"
              size={14}
              color={colors.warning600}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function CoursesScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const styles = useCoursesStyles();

  const canCreateCourse =
    user?.roles.some((role) => CAN_CREATE_COURSE_ROLES.includes(role)) ??
    false;

  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await apiRequest<{ courses: Course[] }>("/courses");
      setCourses(response.courses);
    } catch (loadError) {
      setError(
        loadError instanceof ApiError
          ? loadError.message
          : "Could not load available courses.",
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

  const totalSessions = courses.reduce(
    (total, course) => total + course.sessions.length,
    0,
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Courses"
        subtitle="Pool, classroom and open-water training"
      />

      <FlatList
        style={styles.screen}
        data={courses}
        keyExtractor={(item) => item.id}
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

            <HeroPanel>
              <View style={styles.heroIcon}>
                <Ionicons
                  name="school-outline"
                  size={29}
                  color={colors.white}
                />
              </View>

              <View style={styles.heroText}>
                <Text style={styles.heroEyebrow}>DIVER DEVELOPMENT</Text>

                <Text style={styles.heroTitle}>Training programmes</Text>

                <Text style={styles.heroBody}>
                  Build practical competence through classroom, pool and
                  open-water sessions.
                </Text>
              </View>

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{courses.length}</Text>

                  <Text style={styles.heroStatLabel}>COURSES</Text>
                </View>

                <View style={styles.heroStatDivider} />

                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{totalSessions}</Text>

                  <Text style={styles.heroStatLabel}>SESSIONS</Text>
                </View>

                <View style={styles.heroStatDivider} />

                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>3</Text>

                  <Text style={styles.heroStatLabel}>ENVIRONMENTS</Text>
                </View>
              </View>
            </HeroPanel>

            {canCreateCourse && (
              <Pressable
                onPress={() => navigation.navigate("CreateCourse")}
                style={({ pressed }) => [
                  styles.createCourseButton,
                  pressed && styles.createCourseButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create a new course"
              >
                <View style={styles.createCourseIcon}>
                  <Ionicons name="add" size={22} color={colors.white} />
                </View>
                <View style={styles.createCourseText}>
                  <Text style={styles.createCourseEyebrow}>
                    STAFF OPERATION
                  </Text>
                  <Text style={styles.createCourseTitle}>
                    Create new course
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.sky400}
                />
              </Pressable>
            )}

            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionEyebrow}>TRAINING CATALOGUE</Text>

                <Text style={styles.sectionTitle}>Available courses</Text>
              </View>

              <View style={styles.catalogueBadge}>
                <Text style={styles.catalogueBadgeText}>
                  CURRENT
                </Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="book-outline"
            title="No courses available"
            body="Training programmes will appear here once published."
          />
        }
        renderItem={({ item, index }) => (
          <CourseCard
            course={item}
            index={index}
            onPress={() =>
              navigation.navigate("CourseDetail", {
                courseId: item.id,
              })
            }
          />
        )}
      />
    </View>
  );
}
