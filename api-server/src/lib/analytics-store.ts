import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";

export interface AnalyticsEvent {
  id: string;
  type: string;
  sessionId: string;
  createdAt: number;
  route: string;
  payload?: Record<string, unknown>;
}

export type AnalyticsStorageMode = "supabase" | "file" | "memory";

export interface AnalyticsSummary {
  totalEvents: number;
  uniqueSessions: number;
  byType: Record<string, number>;
  topRoutes: Array<{ route: string; count: number }>;
  topPayloadKeys: Array<{ key: string; count: number }>;
  lastEventAt: number | null;
  storageMode: AnalyticsStorageMode;
}

const MAX_RECENT_EVENTS = 1_000;

const recentEvents: AnalyticsEvent[] = [];
const sessionIds = new Set<string>();
const byType: Record<string, number> = {};
const byRoute: Record<string, number> = {};
const byPayloadKey: Record<string, number> = {};
let totalEvents = 0;
let lastEventAt: number | null = null;

function determineInitialStorageMode(): AnalyticsStorageMode {
  if (config.supabase.isConfigured && !config.analytics.disableSupabase) {
    return "supabase";
  }
  if (config.analytics.disableFileStorage) return "memory";
  return "file";
}

let currentStorageMode: AnalyticsStorageMode = determineInitialStorageMode();

function getAnalyticsFilePath() {
  if (config.analytics.eventsFile) return config.analytics.eventsFile;
  return path.resolve(process.cwd(), "data", "analytics-events.jsonl");
}

function toSupabaseRow(event: AnalyticsEvent) {
  return {
    id: event.id,
    type: event.type,
    session_id: event.sessionId,
    route: event.route,
    payload: event.payload || {},
    client_created_at: new Date(event.createdAt).toISOString(),
  };
}

async function appendEventsToSupabase(events: AnalyticsEvent[]) {
  const supabaseUrl = config.supabase.url.replace(/\/+$/, "");
  const serviceRoleKey = config.supabase.serviceRoleKey;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase analytics storage is not configured.");
  }

  const tableName = encodeURIComponent(config.supabase.analyticsTable);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.supabase.timeoutMs);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(events.map(toSupabaseRow)),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Supabase analytics insert failed with ${response.status}: ${body.slice(0, 200)}`,
      );
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function appendEventsToFile(events: AnalyticsEvent[]) {
  const filePath = getAnalyticsFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  const lines = events.map((event) => JSON.stringify(event)).join("\n") + "\n";
  await appendFile(filePath, lines, "utf8");
}

function rememberInMemory(events: AnalyticsEvent[]) {
  recentEvents.push(...events);
  if (recentEvents.length > MAX_RECENT_EVENTS) {
    recentEvents.splice(0, recentEvents.length - MAX_RECENT_EVENTS);
  }

  for (const event of events) {
    totalEvents += 1;
    sessionIds.add(event.sessionId);
    byType[event.type] = (byType[event.type] || 0) + 1;
    byRoute[event.route] = (byRoute[event.route] || 0) + 1;
    lastEventAt = Math.max(lastEventAt || 0, event.createdAt);

    for (const key of Object.keys(event.payload || {})) {
      byPayloadKey[key] = (byPayloadKey[key] || 0) + 1;
    }
  }
}

function topEntries(source: Record<string, number>, limit = 10) {
  return Object.entries(source)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

export async function storeAnalyticsEvents(events: AnalyticsEvent[]) {
  rememberInMemory(events);

  if (config.supabase.isConfigured && !config.analytics.disableSupabase) {
    try {
      await appendEventsToSupabase(events);
      currentStorageMode = "supabase";
      return { storageMode: currentStorageMode };
    } catch (error) {
      console.warn("Supabase analytics storage failed; falling back", error);
    }
  }

  if (config.analytics.disableFileStorage) {
    currentStorageMode = "memory";
    return { storageMode: currentStorageMode };
  }

  try {
    await appendEventsToFile(events);
    currentStorageMode = "file";
    return { storageMode: currentStorageMode };
  } catch (error) {
    console.warn("File analytics storage failed; using memory only", error);
    currentStorageMode = "memory";
    return { storageMode: currentStorageMode };
  }
}

export function getAnalyticsSummary(): AnalyticsSummary {
  return {
    totalEvents,
    uniqueSessions: sessionIds.size,
    byType: { ...byType },
    topRoutes: topEntries(byRoute).map(({ key, count }) => ({ route: key, count })),
    topPayloadKeys: topEntries(byPayloadKey),
    lastEventAt,
    storageMode: currentStorageMode,
  };
}

export function getRecentAnalyticsEvents() {
  return [...recentEvents];
}
