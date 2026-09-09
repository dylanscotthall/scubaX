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
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";

import { ScreenHeader } from "../components/ScreenHeader";
import { StatusPill } from "../components/StatusPill";
import { ErrorBanner } from "../components/ErrorBanner";

import { colors, gradients, radii, readoutFontFamily, spacing } from "../theme";

import { ApiError, apiRequest } from "../api/client";
import { Course } from "../api/types";

function CourseCard({
  course,
  index,
  onPress,
}: {
  course: Course;
  index: number;
  onPress: () => void;
}) {
  const sessionCount = course.sessions.length;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.courseCard,
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

          {course.agency ? (
            <StatusPill label={course.agency} tone="info" />
          ) : null}
        </View>

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

            <LinearGradient
              colors={gradients.oceanHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroPanel}
            >
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
            </LinearGradient>

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
          <View style={styles.emptyPanel}>
            <Ionicons name="book-outline" size={32} color={colors.ocean600} />

            <Text style={styles.emptyTitle}>No courses available</Text>

            <Text style={styles.emptyBody}>
              Training programmes will appear here once published.
            </Text>
          </View>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.deepSea900,
  },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  heroPanel: {
    marginHorizontal: spacing.lg,
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
    fontWeight: "800",
    letterSpacing: 1.8,
    color: colors.sky400,
  },
  heroTitle: {
    marginTop: 4,
    fontSize: 25,
    fontWeight: "800",
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
    fontFamily: readoutFontFamily,
    fontSize: 21,
    fontWeight: "700",
    color: colors.white,
  },
  heroStatLabel: {
    marginTop: 4,
    fontSize: 7,
    fontWeight: "800",
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
    fontWeight: "800",
    letterSpacing: 1.4,
    color: colors.warning600,
  },
  sectionTitle: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: "800",
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
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.warning600,
  },
  courseCard: {
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
    fontFamily: readoutFontFamily,
    fontSize: 15,
    fontWeight: "700",
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
    fontWeight: "800",
    letterSpacing: 1.2,
    color: colors.slate400,
  },
  courseName: {
    marginTop: 4,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
    color: colors.navy900,
  },
  description: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 19,
    color: colors.slate600,
  },
  courseDataStrip: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.sand50,
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
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.slate400,
  },
  courseDataValue: {
    marginTop: 2,
    fontFamily: readoutFontFamily,
    fontSize: 11,
    fontWeight: "700",
    color: colors.navy900,
  },
  courseDataDivider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.sm,
    backgroundColor: colors.slate200,
  },
  courseDataPrice: {
    minWidth: 68,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  price: {
    marginTop: 2,
    fontFamily: readoutFontFamily,
    fontSize: 14,
    fontWeight: "700",
    color: colors.ocean600,
  },
  courseFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
  },
  courseFooterLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.slate200,
  },
  openCourse: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: spacing.sm,
  },
  openCourseText: {
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
