const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!configuredApiUrl) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is missing. Run ./scripts/setup-local.sh or create mobile/.env before starting Expo.",
  );
}

if (!/^https?:\/\//i.test(configuredApiUrl)) {
  throw new Error("EXPO_PUBLIC_API_URL must begin with http:// or https://");
}

export const API_BASE_URL = configuredApiUrl.replace(/\/+$/, "");
