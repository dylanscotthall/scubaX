import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { StyleSheet, useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  colors,
  darkPalette,
  fontFamily,
  gradients,
  lightPalette,
  radii,
  readoutFontFamily,
  SemanticPalette,
  shadows,
  spacing,
  typography,
} from "./tokens";

export {
  colors,
  gradients,
  spacing,
  radii,
  shadows,
  typography,
  fontFamily,
  readoutFontFamily,
};
export type { SemanticPalette };

type ThemeMode = "light" | "dark";
type ThemePreference = ThemeMode | "system";

const THEME_PREFERENCE_KEY = "scubax_theme_preference";

interface ThemeContextValue {
  mode: ThemeMode;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  palette: SemanticPalette;
  gradients: typeof gradients;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    void (async () => {
      const stored = await SecureStore.getItemAsync(THEME_PREFERENCE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        setPreferenceState(stored);
      }
    })();
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void SecureStore.setItemAsync(THEME_PREFERENCE_KEY, next);
  }, []);

  const mode: ThemeMode =
    preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;
  const palette = mode === "dark" ? darkPalette : lightPalette;

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, preference, setPreference, palette, gradients }),
    [mode, preference, setPreference, palette],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

export function useThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<unknown>>(
  factory: (palette: SemanticPalette, themeGradients: typeof gradients) => T,
): T {
  const { palette, gradients: themeGradients } = useTheme();
  return useMemo(() => StyleSheet.create(factory(palette, themeGradients)), [palette, themeGradients]);
}
