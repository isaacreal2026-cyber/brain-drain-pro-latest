/**
 * Frontend runtime configuration.
 *
 * Vite only exposes variables prefixed with VITE_ to the client bundle.
 * Everything is read once here and validated so misconfiguration surfaces
 * immediately instead of causing silent failures deep in the UI.
 */

function readString(name: string, fallback = ""): string {
  const value = import.meta.env[name];
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  return fallback;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = import.meta.env[name];
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(raw).toLowerCase());
}

function readNumber(name: string, fallback: number): number {
  const raw = import.meta.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBaseUrl(url: string): string {
  if (!url) return "";
  return url.replace(/\/+$/, "");
}

export const env = {
  /** Public Firebase web config is loaded from firebase-applet-config.json. */
  appName: "Brain Drain",
  apiBaseUrl: normalizeBaseUrl(readString("VITE_API_BASE_URL")),
  apiTimeoutMs: readNumber("VITE_API_TIMEOUT", 15_000),
  features: {
    analytics: readBoolean("VITE_ENABLE_ANALYTICS", true),
    notifications: readBoolean("VITE_ENABLE_NOTIFICATIONS", true),
    social: readBoolean("VITE_ENABLE_SOCIAL_FEATURES", true),
  },
  performance: {
    cacheDurationMs: readNumber("VITE_CACHE_DURATION", 300_000),
    prefetchDelayMs: readNumber("VITE_PREFETCH_DELAY", 1_000),
  },
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

export type AppEnv = typeof env;
