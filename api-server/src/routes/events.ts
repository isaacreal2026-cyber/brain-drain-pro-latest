import { Router, type IRouter } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";

const AnalyticsEventType = z.enum([
  "session_start",
  "session_end",
  "app_visible",
  "app_hidden",
  "page_view",
  "post_created",
  "post_reaction",
  "post_share",
  "post_moderation_waiting",
  "comment_created",
  "comment_reaction",
  "message_sent",
  "search_submitted",
  "search_recent_selected",
  "topic_selected",
  "feed_mode_selected",
  "notification_opened",
  "mission_reminder",
  "brain_launch",
]);

const AnalyticsEventSchema = z.object({
  id: z.string().min(1).max(120),
  type: AnalyticsEventType,
  sessionId: z.string().min(1).max(120),
  createdAt: z.number().int().positive(),
  route: z.string().max(300),
  payload: z.record(z.string(), z.unknown()).optional(),
});

const AnalyticsEventsRequestSchema = z.object({
  events: z.array(AnalyticsEventSchema).min(1).max(50),
  clientSentAt: z.number().int().positive().optional(),
});

const AnalyticsEventsResponseSchema = z.object({
  accepted: z.number().int().nonnegative(),
});

type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

const MAX_RECENT_EVENTS = 1_000;
const recentEvents: AnalyticsEvent[] = [];

function sanitizePayload(payload: AnalyticsEvent["payload"]) {
  if (!payload) return undefined;

  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (typeof value === "string") return [key, value.slice(0, 160)];
      if (typeof value === "number" || typeof value === "boolean" || value === null) return [key, value];
      if (Array.isArray(value)) return [key, value.slice(0, 20)];
      return [key, "[redacted]"];
    }),
  );
}

function rememberEvents(events: AnalyticsEvent[]) {
  recentEvents.push(...events);
  if (recentEvents.length > MAX_RECENT_EVENTS) {
    recentEvents.splice(0, recentEvents.length - MAX_RECENT_EVENTS);
  }
}

const router: IRouter = Router();

router.post("/events", (req, res) => {
  const parsed = AnalyticsEventsRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      accepted: 0,
      error: "Invalid analytics event payload",
    });
    return;
  }

  const events = parsed.data.events.map((event) => ({
    ...event,
    payload: sanitizePayload(event.payload),
  }));
  rememberEvents(events);

  const typeCounts = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {});

  logger.info(
    {
      accepted: events.length,
      typeCounts,
      sessionCount: new Set(events.map((event) => event.sessionId)).size,
    },
    "Analytics events accepted",
  );

  const response = AnalyticsEventsResponseSchema.parse({ accepted: events.length });
  res.status(202).json(response);
});

export default router;
