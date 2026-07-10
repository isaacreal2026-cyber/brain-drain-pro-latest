import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

export interface AnalyticsEvent {
  id: string;
  type: string;
  sessionId: string;
  createdAt: number;
  route: string;
  payload?: Record<string, unknown>;
}

export interface AnalyticsSummary {
  totalEvents: number;
  uniqueSessions: number;
  byType: Record<string, number>;
  topRoutes: Array<{ route: string; count: number }>;
  topPayloadKeys: Array<{ key: string; count: number }>;
  lastEventAt: number | null;
  storageMode: "file" | "memory";
}

const MAX_RECENT_EVENTS = 1_000;
const recentEvents: AnalyticsEvent[] = [];
const sessionIds = new Set<string>();
const byType: Record<string, number> = {};
const byRoute: Record<string, number> = {};
const byPayloadKey: Record<string, number> = {};
let totalEvents = 0;
let lastEventAt: number | null = null;

function getAnalyticsFilePath() {
  const configuredPath = process.env.ANALYTICS_EVENTS_FILE;
  if (configuredPath) return configuredPath;
  return path.resolve(process.cwd(), "data", "analytics-events.jsonl");
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

  if (process.env.ANALYTICS_DISABLE_FILE_STORAGE === "true") {
    return { storageMode: "memory" as const };
  }

  await appendEventsToFile(events);
  return { storageMode: "file" as const };
}

export function getAnalyticsSummary(): AnalyticsSummary {
  return {
    totalEvents,
    uniqueSessions: sessionIds.size,
    byType: { ...byType },
    topRoutes: topEntries(byRoute).map(({ key, count }) => ({ route: key, count })),
    topPayloadKeys: topEntries(byPayloadKey),
    lastEventAt,
    storageMode: process.env.ANALYTICS_DISABLE_FILE_STORAGE === "true" ? "memory" : "file",
  };
}

export function getRecentAnalyticsEvents() {
  return [...recentEvents];
}
