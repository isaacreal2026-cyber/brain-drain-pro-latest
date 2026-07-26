import { idb } from "./db";

export type AnalyticsEventType =
  | "session_start"
  | "session_end"
  | "app_visible"
  | "app_hidden"
  | "page_view"
  | "post_created"
  | "post_reaction"
  | "post_share"
  | "post_moderation_waiting"
  | "comment_created"
  | "comment_reaction"
  | "message_sent"
  | "search_submitted"
  | "search_recent_selected"
  | "topic_selected"
  | "feed_mode_selected"
  | "notification_opened"
  | "mission_reminder"
  | "brain_launch";

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  sessionId: string;
  createdAt: number;
  route: string;
  payload?: Record<string, unknown>;
}

const SESSION_KEY = "brain-builder-analytics-session";
const STORE = "analytics_events";
const MAX_BACKEND_BATCH_SIZE = 100;
const BACKEND_FLUSH_DELAY_MS = 1_500;

let backendQueue: AnalyticsEvent[] = [];
let flushTimer: number | null = null;
let isFlushing = false;

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getAnalyticsSessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = createId();
    sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return "session-unavailable";
  }
}

function sanitizePayload(payload?: Record<string, unknown>) {
  if (!payload) return undefined;

  return Object.fromEntries(
    Object.entries(payload)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => {
        if (typeof value === "string") {
          return [key, value.slice(0, 160)];
        }
        return [key, value];
      }),
  );
}

function getEventsEndpoint() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
  return `${apiBaseUrl.replace(/\/$/, "")}/api/events`;
}

function scheduleBackendFlush() {
  if (typeof window === "undefined" || flushTimer) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushAnalyticsEvents();
  }, BACKEND_FLUSH_DELAY_MS);
}

function sanitizePayloadForBackend(payload?: Record<string, unknown>) {
  if (!payload) return undefined;

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "query" && typeof value === "string") {
      sanitized.queryLength = value.length;
      continue;
    }

    // Stricter truncation for 1M user scale efficiency
    if (typeof value === "string") sanitized[key] = value.slice(0, 40);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) sanitized[key] = value;
    else if (Array.isArray(value)) sanitized[key] = value.slice(0, 5);
    else sanitized[key] = "redacted";
  }

  return sanitized;
}

function queueBackendEvent(event: AnalyticsEvent) {
  const backendEvent: AnalyticsEvent = {
    ...event,
    route: typeof window !== "undefined" ? window.location.pathname : event.route.split("?")[0],
    payload: sanitizePayloadForBackend(event.payload),
  };

  backendQueue.push(backendEvent);

  if (backendQueue.length >= MAX_BACKEND_BATCH_SIZE) {
    void flushAnalyticsEvents();
  } else {
    scheduleBackendFlush();
  }
}

export async function flushAnalyticsEvents() {
  if (typeof window === "undefined" || isFlushing || backendQueue.length === 0) return;

  isFlushing = true;
  const batch = backendQueue.splice(0, MAX_BACKEND_BATCH_SIZE);

  try {
    const response = await fetch(getEventsEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch, clientSentAt: Date.now() }),
      keepalive: true,
    });

    // If the backend is absent in a static preview, local IndexedDB remains the source of truth.
    if (!response.ok && response.status !== 404) {
      console.warn("Analytics backend rejected events", response.status);
    }
  } catch {
    // Best-effort only. Never rethrow or block the product experience.
  } finally {
    isFlushing = false;
    if (backendQueue.length > 0) scheduleBackendFlush();
  }
}

export function flushAnalyticsEventsWithBeacon() {
  if (typeof navigator === "undefined" || backendQueue.length === 0 || !navigator.sendBeacon) return false;

  const batch = backendQueue.splice(0, MAX_BACKEND_BATCH_SIZE);
  const body = JSON.stringify({ events: batch, clientSentAt: Date.now() });
  const sent = navigator.sendBeacon(getEventsEndpoint(), new Blob([body], { type: "application/json" }));

  if (!sent) {
    backendQueue = [...batch, ...backendQueue].slice(0, MAX_BACKEND_BATCH_SIZE * 3);
  }

  return sent;
}

export async function trackEvent(type: AnalyticsEventType, payload?: Record<string, unknown>) {
  const event: AnalyticsEvent = {
    id: createId(),
    type,
    sessionId: getAnalyticsSessionId(),
    createdAt: Date.now(),
    route: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "unknown",
    payload: sanitizePayload(payload),
  };

  try {
    await idb.put(STORE, event);
  } catch (error) {
    // Analytics must never break the product experience.
    console.warn("Analytics event was not persisted", error);
  }

  queueBackendEvent(event);
}

export async function getAnalyticsEvents() {
  return idb.getAll<AnalyticsEvent>(STORE);
}
