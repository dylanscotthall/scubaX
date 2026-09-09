// Expo injects EXPO_PUBLIC_* env vars into process.env at build time, but
// without @types/node, bare `process` isn't declared for a plain RN/Expo
// TS project. This is a minimal ambient declaration for just what's used
// (api/types.ts), rather than pulling in the full Node types.
declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    [key: string]: string | undefined;
  };
};
