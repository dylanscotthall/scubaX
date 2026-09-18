export const colors = {
  // Deep ocean / app shell
  deepSea950: "#020B16",
  deepSea900: "#06182A",
  deepSea800: "#082A46",
  deepSea700: "#0B416D",
  deepSeaBorder: "#195C86",

  // Logo-inspired blues — brand anchor
  navy900: "#04142A",
  navy700: "#092E59",
  ocean700: "#00599C",
  ocean600: "#0078C8",
  ocean500: "#0799DF",
  sky400: "#42BDEF",
  sky300: "#72D3F5",

  // Logo red — rare signature/danger use only, not general UI decoration
  red700: "#9E1D18",
  red600: "#C92D25",
  red500: "#E54032",
  red400: "#F05B4C",

  // Bioluminescent glow — new premium accent, used sparingly
  glow700: "#0E7A67",
  glow600: "#12A98D",
  glow500: "#22CDAE",
  glow400: "#3FE8CB",
  glowSoftLight: "rgba(18,169,141,0.14)",
  glowSoftDark: "rgba(63,232,203,0.2)",

  // Text on dark backgrounds
  mist50: "#F8FCFF",
  mist200: "#D9EDF6",
  mist300: "#AFCEDC",
  mist400: "#789BAA",

  // Light surfaces
  white: "#FFFFFF",
  sand50: "#F3F8FA",
  sand100: "#E3EFF4",
  softWhite: "#FCFEFF",
  iceBlue100: "#E7F1F8",
  iceBlue200: "#D3E6F0",

  // Signature hero highlight — used consistently across every hero panel's
  // eyebrow label, and for Home's primary CTA
  highlight600: "#C9AD00",
  highlight500: "#E6D000",
  highlight400: "#F2DF3A",

  // Light-theme text
  ink900: "#07131D",
  slate600: "#405765",
  slate400: "#738B97",
  slate200: "#CAD9E0",

  // Status — warning is the only remaining "yellow"; there is no decorative yellow token
  success600: "#16855D",
  successBg: "#DDF5E9",
  warning600: "#A87900",
  warningBg: "#FFF1B8",
  danger600: "#D8322A",
  dangerBg: "#FCE2DF",

  neutralBg: "#E7F0F4",
} as const;

export interface SemanticPalette {
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textOnAccent: string;
  accentPrimary: string;
  accentPrimaryPressed: string;
  accentGlow: string;
  accentGlowSoft: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  neutralBg: string;
  overlay: string;
}

// Dive-computer/hero surfaces (ScreenHeader, hero panels, GaugeRing) intentionally
// stay dark in both modes — only screen chrome, cards and body text flip here.
export const lightPalette: SemanticPalette = {
  background: colors.iceBlue100,
  backgroundAlt: colors.iceBlue200,
  surface: colors.softWhite,
  surfaceAlt: colors.iceBlue200,
  surfaceSunken: colors.iceBlue200,
  border: colors.iceBlue200,
  borderStrong: colors.slate200,
  textPrimary: colors.ink900,
  textSecondary: colors.slate600,
  textTertiary: colors.slate400,
  textOnAccent: colors.white,
  accentPrimary: colors.ocean600,
  accentPrimaryPressed: colors.ocean700,
  accentGlow: colors.glow600,
  accentGlowSoft: colors.glowSoftLight,
  success: colors.success600,
  successBg: colors.successBg,
  warning: colors.warning600,
  warningBg: colors.warningBg,
  danger: colors.danger600,
  dangerBg: colors.dangerBg,
  neutralBg: colors.neutralBg,
  overlay: "rgba(4,20,42,0.55)",
};

export const darkPalette: SemanticPalette = {
  background: colors.deepSea950,
  backgroundAlt: colors.deepSea900,
  surface: colors.deepSea800,
  surfaceAlt: colors.deepSea700,
  surfaceSunken: colors.deepSea900,
  border: colors.deepSeaBorder,
  borderStrong: colors.deepSeaBorder,
  textPrimary: colors.mist50,
  textSecondary: colors.mist300,
  textTertiary: colors.mist400,
  textOnAccent: colors.white,
  accentPrimary: colors.sky400,
  accentPrimaryPressed: colors.sky300,
  accentGlow: colors.glow500,
  accentGlowSoft: colors.glowSoftDark,
  success: colors.success600,
  successBg: "rgba(22,133,93,0.22)",
  warning: colors.warning600,
  warningBg: "rgba(168,121,0,0.22)",
  danger: colors.danger600,
  dangerBg: "rgba(216,50,42,0.22)",
  neutralBg: colors.deepSea700,
  overlay: "rgba(2,11,22,0.7)",
};

export const gradients = {
  // Deepened for a moodier hero than the old bright-sky-blue start
  oceanHeader: [colors.ocean500, colors.ocean600, colors.navy900] as const,

  // Primary buttons / highlighted controls
  ctaGlow: [colors.sky400, colors.ocean600] as const,

  // Premium/signature CTA emphasis — use sparingly
  glowEdge: [colors.glow400, colors.ocean600] as const,

  // Dive computer / dashboard surfaces
  divePanel: [colors.deepSea800, colors.deepSea950] as const,

  // Use only for strong ScubaX branding, never as a general UI gradient
  scubaXRed: [colors.red400, colors.red600, colors.red700] as const,
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
  xl: 24,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  hero: {
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  // Reserved for the primary hero CTA and similarly rare premium moments
  glow: {
    shadowColor: colors.glow400,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
} as const;

export const fontFamily = {
  display: "Oswald_700Bold",
  displayMedium: "Oswald_500Medium",
  displayRegular: "Oswald_400Regular",
  readout: "JetBrainsMono_400Regular",
  readoutBold: "JetBrainsMono_700Bold",
};

export const typography = {
  display: {
    fontFamily: fontFamily.display,
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
    fontFamily: fontFamily.readout,
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: 0.3,
  },
};

export const readoutFontFamily = fontFamily.readout;
