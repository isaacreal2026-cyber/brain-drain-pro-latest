import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAnalyticsSummary, getRecentAnalyticsEvents } from "../lib/analytics-store";

const SignalSchema = z.object({
  key: z.string(),
  count: z.number().int().nonnegative(),
});

const RecommendationReadinessSchema = z.object({
  feed: z.boolean(),
  brains: z.boolean(),
  missions: z.boolean(),
  notifications: z.boolean(),
});

const IntelligenceSummaryResponseSchema = z.object({
  generatedAt: z.string(),
  totalEvents: z.number().int().nonnegative(),
  uniqueSessions: z.number().int().nonnegative(),
  activeWindowEvents: z.number().int().nonnegative(),
  topEventTypes: z.array(SignalSchema),
  topRoutes: z.array(z.object({ route: z.string(), count: z.number().int().nonnegative() })),
  topPayloadKeys: z.array(SignalSchema),
  signalCounts: z.object({
    search: z.number().int().nonnegative(),
    topics: z.number().int().nonnegative(),
    brains: z.number().int().nonnegative(),
    posts: z.number().int().nonnegative(),
    comments: z.number().int().nonnegative(),
    messages: z.number().int().nonnegative(),
    missions: z.number().int().nonnegative(),
    notifications: z.number().int().nonnegative(),
  }),
  recommendationReadiness: RecommendationReadinessSchema,
  health: z.object({
    eventVolume: z.enum(["cold_start", "warming_up", "learning", "active"]),
    lastEventAt: z.number().int().nullable(),
    storageMode: z.enum(["file", "memory"]),
  }),
  nextBackendStep: z.string(),
});

function topEntries(source: Record<string, number>, limit = 10) {
  return Object.entries(source)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function getEventVolume(totalEvents: number) {
  if (totalEvents === 0) return "cold_start" as const;
  if (totalEvents < 25) return "warming_up" as const;
  if (totalEvents < 250) return "learning" as const;
  return "active" as const;
}

const router: IRouter = Router();

router.get("/intelligence/summary", (_req, res) => {
  const summary = getAnalyticsSummary();
  const recentEvents = getRecentAnalyticsEvents();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1_000;
  const activeWindowEvents = recentEvents.filter((event) => event.createdAt >= oneDayAgo).length;

  const signalCounts = {
    search: (summary.byType.search_submitted || 0) + (summary.byType.search_recent_selected || 0),
    topics: summary.byType.topic_selected || 0,
    brains: summary.byType.brain_launch || 0,
    posts: (summary.byType.post_created || 0) + (summary.byType.post_reaction || 0) + (summary.byType.post_share || 0),
    comments: (summary.byType.comment_created || 0) + (summary.byType.comment_reaction || 0),
    messages: summary.byType.message_sent || 0,
    missions: summary.byType.mission_reminder || 0,
    notifications: summary.byType.notification_opened || 0,
  };

  const recommendationReadiness = {
    feed: signalCounts.posts + signalCounts.topics + signalCounts.search >= 3,
    brains: signalCounts.brains + signalCounts.search >= 2,
    missions: signalCounts.missions + signalCounts.search >= 1,
    notifications: signalCounts.notifications + signalCounts.posts + signalCounts.comments >= 2,
  };

  const response = IntelligenceSummaryResponseSchema.parse({
    generatedAt: new Date().toISOString(),
    totalEvents: summary.totalEvents,
    uniqueSessions: summary.uniqueSessions,
    activeWindowEvents,
    topEventTypes: topEntries(summary.byType),
    topRoutes: summary.topRoutes,
    topPayloadKeys: summary.topPayloadKeys,
    signalCounts,
    recommendationReadiness,
    health: {
      eventVolume: getEventVolume(summary.totalEvents),
      lastEventAt: summary.lastEventAt,
      storageMode: summary.storageMode,
    },
    nextBackendStep: "Add Supabase-backed aggregates for user_topic_affinity, post_scores, brain_scores, and mission_scores.",
  });

  res.json(response);
});

export default router;
