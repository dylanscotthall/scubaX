import { Platform } from "react-native";

export const colors = {
  // Deep ocean / app shell
  deepSea950: "#020B16",
  deepSea900: "#06182A",
  deepSea800: "#082A46",
  deepSea700: "#0B416D",
  deepSeaBorder: "#195C86",

  // Logo-inspired blues
  navy900: "#04142A",
  navy700: "#092E59",

  ocean700: "#00599C",
  ocean600: "#0078C8",
  ocean500: "#0799DF",
  sky400: "#42BDEF",
  sky300: "#72D3F5",

  // Logo red / ScubaX accent
  red700: "#9E1D18",
  red600: "#C92D25",
  red500: "#E54032",
  red400: "#F05B4C",

  // Nautical signal yellow
  yellow600: "#C9AD00",
  yellow500: "#E6D000",
  yellow400: "#F2DF3A",
  yellowBg: "#F6F0B8",

  // Text on dark backgrounds
  mist50: "#F8FCFF",
  mist200: "#D9EDF6",
  mist300: "#AFCEDC",
  mist400: "#789BAA",

  // Light surfaces
  white: "#FFFFFF",
  sand50: "#F3F8FA",
  sand100: "#E3EFF4",

  // Light-theme text
  ink900: "#07131D",
  slate600: "#405765",
  slate400: "#738B97",
  slate200: "#CAD9E0",

  // Status
  success600: "#16855D",
  successBg: "#DDF5E9",

  warning600: "#A87900",
  warningBg: "#FFF1B8",

  danger600: "#D8322A",
  dangerBg: "#FCE2DF",

  neutralBg: "#E7F0F4",
} as const;

export const gradients = {
  // Closely matches the circular blue logo
  oceanHeader: [colors.sky400, colors.ocean600, colors.navy700] as const,

  // Primary buttons / highlighted controls
  ctaGlow: [colors.sky400, colors.ocean600] as const,

  // Dive computer / dashboard surfaces
  divePanel: [colors.deepSea800, colors.deepSea950] as const,

  // Use only for strong ScubaX branding
  scubaXRed: [colors.red400, colors.red600, colors.red700] as const,

  // Warning / nautical accent
  signalYellow: [colors.yellow400, colors.yellow500] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
};

export const typography = {
  display: {
    fontWeight: "800" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },

  body: {
    fontWeight: "400" as const,
  },

  bodyMedium: {
    fontWeight: "600" as const,
  },

  readout: {
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: 0.3,
  },
};

export const readoutFontFamily = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});
