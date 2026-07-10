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
}

export async function getAnalyticsEvents() {
  return idb.getAll<AnalyticsEvent>(STORE);
}
