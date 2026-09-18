import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors, useTheme } from "../theme";
import { useAuth } from "../context/AuthContext";

import { LoginScreen } from "../screens/LoginScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { TripsScreen } from "../screens/TripsScreen";
import { TripDetailScreen } from "../screens/TripDetailScreen";
import { CreateLaunchScreen } from "../screens/CreateLaunchScreen";
import { SelectEquipmentScreen } from "../screens/SelectEquipmentScreen";
import { CoursesScreen } from "../screens/CoursesScreen";
import { CourseDetailScreen } from "../screens/CourseDetailScreen";
import { CreateCourseScreen } from "../screens/CreateCourseScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ConditionsScreen } from "../screens/ConditionsScreen";
import { StaffEquipmentScreen } from "../screens/StaffEquipmentScreen";

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const TripsStack = createNativeStackNavigator();
const CoursesStack = createNativeStackNavigator();

// Each tab gets its own stack so a detail screen (Trip/Course) can be
// pushed on top of that tab without hiding the tab bar or losing the
// other tabs' navigation state.
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="TripDetail" component={TripDetailScreen} />
      <HomeStack.Screen
        name="SelectEquipment"
        component={SelectEquipmentScreen}
      />
      <HomeStack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <HomeStack.Screen name="Profile" component={ProfileScreen} />
    </HomeStack.Navigator>
  );
}

function TripsStackNavigator() {
  return (
    <TripsStack.Navigator screenOptions={{ headerShown: false }}>
      <TripsStack.Screen name="TripsMain" component={TripsScreen} />
      <TripsStack.Screen name="TripDetail" component={TripDetailScreen} />
      <TripsStack.Screen
        name="SelectEquipment"
        component={SelectEquipmentScreen}
      />
      <TripsStack.Screen name="CreateLaunch" component={CreateLaunchScreen} />
    </TripsStack.Navigator>
  );
}

function CoursesStackNavigator() {
  return (
    <CoursesStack.Navigator screenOptions={{ headerShown: false }}>
      <CoursesStack.Screen name="CoursesMain" component={CoursesScreen} />
      <CoursesStack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <CoursesStack.Screen name="CreateCourse" component={CreateCourseScreen} />
    </CoursesStack.Navigator>
  );
}

function MainTabs() {
  const { user } = useAuth();
  // Tab bar stays on the dive-computer dark chrome in both light and dark app mode.
  const { palette } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.accentGlow,
        tabBarInactiveTintColor: colors.mist400,
        tabBarStyle: {
          backgroundColor: colors.deepSea950,
          borderTopColor: colors.deepSeaBorder,
        },
        tabBarIcon: ({ color, size }) => {
          const iconByRoute: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: "home",
            Trips: "calendar",
            Courses: "school",
            Conditions: "water",
            Staff: "clipboard",
          };
          return (
            <Ionicons
              name={iconByRoute[route.name] ?? "ellipse"}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Trips" component={TripsStackNavigator} />
      <Tab.Screen name="Courses" component={CoursesStackNavigator} />
      <Tab.Screen name="Conditions" component={ConditionsScreen} />
      {user?.roles.some((role) =>
        ["DIVEMASTER", "SKIPPER", "INSTRUCTOR", "ADMIN", "OWNER"].includes(
          role,
        ),
      ) ? (
        <Tab.Screen name="Staff" component={StaffEquipmentScreen} />
      ) : null}
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.sky400} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.deepSea900,
  },
});
