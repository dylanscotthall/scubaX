import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import {
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_700Bold,
} from "@expo-google-fonts/oswald";
import { AuthProvider } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/theme";
import { RootNavigator } from "./src/navigation/RootNavigator";

void SplashScreen.preventAutoHideAsync();

function AppShell() {
  const { mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
