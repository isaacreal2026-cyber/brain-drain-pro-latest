/**
 * Centralized, validated server configuration. Reads environment variables
 * once at startup so misconfiguration fails loudly instead of causing silent
 * runtime bugs.
 */

function readString(name: string, fallback?: string): string {
  const value = process.env[name];
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (fallback !== undefined) return fallback;
  return "";
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid integer for ${name}: ${raw}`);
  }
  return Math.round(parsed);
}

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function readList(name: string, fallback: string[] = []): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const rawPort = process.env.PORT;
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

export const config = {
  port,
  nodeEnv: readString("NODE_ENV", "development"),
  isProduction: readString("NODE_ENV", "development") === "production",
  logLevel: readString("LOG_LEVEL", "info"),
  corsOrigins: readList("CORS_ORIGIN"),
  bodyLimit: readString("BODY_LIMIT", "256kb"),
  rateLimit: {
    windowMs: readInt("RATE_LIMIT_WINDOW_MS", 60_000),
    max: readInt("RATE_LIMIT_MAX", 60),
  },
  supabase: {
    url: readString("SUPABASE_URL"),
    serviceRoleKey: readString("SUPABASE_SERVICE_ROLE_KEY"),
    analyticsTable: readString("SUPABASE_ANALYTICS_TABLE", "analytics_events"),
    timeoutMs: readInt("SUPABASE_REQUEST_TIMEOUT_MS", 2500),
    get isConfigured() {
      return Boolean(this.url && this.serviceRoleKey);
    },
  },
  analytics: {
    disableSupabase: readBoolean("ANALYTICS_DISABLE_SUPABASE", false),
    disableFileStorage: readBoolean("ANALYTICS_DISABLE_FILE_STORAGE", false),
    eventsFile: readString("ANALYTICS_EVENTS_FILE"),
  },
  firebase: {
    projectId: readString("FIREBASE_PROJECT_ID"),
  },
} as const;

export type Config = typeof config;
