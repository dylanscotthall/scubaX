import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../config";

const TOKEN_KEY = "sx_auth_token";
const REQUEST_TIMEOUT_MS = 15_000;

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  timeoutMs?: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function readableApiError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record.error === "string") return record.error;
  if (record.error && typeof record.error === "object") {
    const flattened = record.error as {
      formErrors?: string[];
      fieldErrors?: Record<string, string[]>;
    };
    const messages = [
      ...(flattened.formErrors ?? []),
      ...Object.values(flattened.fieldErrors ?? {}).flat(),
    ];
    if (messages.length > 0) return messages.join("\n");
  }
  return fallback;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    auth = true,
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = options;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    let payload: unknown = null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      const text = await response.text();
      payload = text || null;
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        readableApiError(payload, `Request failed (${response.status})`),
        payload,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(0, `The request to ${API_BASE_URL} timed out`);
    }
    throw new ApiError(
      0,
      `Cannot reach the backend at ${API_BASE_URL}. Check the API URL, Wi-Fi network and backend process.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}
