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

const RecommendationReadinessScoresSchema = z.object({
  feed: z.number().int().min(0).max(100),
  brains: z.number().int().min(0).max(100),
  missions: z.number().int().min(0).max(100),
  notifications: z.number().int().min(0).max(100),
});

const IntelligenceSummaryResponseSchema = z.object({
  generatedAt: z.string(),
  architecture: z.object({
    apiStyle: z.literal("flexible-product-api"),
    primaryBackendTarget: z.literal("supabase-postgres"),
    localCache: z.literal("indexeddb"),
    currentServerStorage: z.enum(["supabase", "file", "memory"]),
    optionalFutureServices: z.array(z.enum(["redis-cache", "pgvector", "full-text-search", "queue-worker"])),
  }),
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
  recommendationReadinessScores: RecommendationReadinessScoresSchema,
  recommendedActions: z.array(z.string()),
  health: z.object({
    eventVolume: z.enum(["cold_start", "warming_up", "learning", "active"]),
    lastEventAt: z.number().int().nullable(),
    storageMode: z.enum(["supabase", "file", "memory"]),
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

function readinessScore(...weightedSignals: Array<[value: number, weight: number]>) {
  const score = weightedSignals.reduce((total, [value, weight]) => total + value * weight, 0);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildRecommendedActions(
  signalCounts: {
    search: number;
    topics: number;
    brains: number;
    posts: number;
    comments: number;
    messages: number;
    missions: number;
    notifications: number;
  },
  scores: z.infer<typeof RecommendationReadinessScoresSchema>,
) {
  const actions: string[] = [];

  if (scores.feed >= 60) {
    actions.push("Enable server-side feed aggregate tables: user_topic_affinity and post_scores.");
  } else {
    actions.push("Collect more post, topic, and search signals before moving feed ranking fully server-side.");
  }

  if (scores.brains >= 45) {
    actions.push("Prepare a Supabase brain_scores aggregate for Brain recommendations.");
  }

  if (scores.missions >= 35) {
    actions.push("Prepare a mission_scores aggregate to tune reminder timing and reduce noisy prompts.");
  }

  if (scores.notifications >= 45) {
    actions.push("Prepare notification relevance scoring from opens, replies, mentions, and Brain-run signals.");
  }

  if (signalCounts.messages > 0) {
    actions.push("Keep message analytics metadata-only; do not store message content in recommendation events.");
  }

  actions.push("Keep IndexedDB as a fast local cache while Supabase/Postgres becomes the source of truth behind the API.");
  return actions;
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

  const recommendationReadinessScores = {
    feed: readinessScore([signalCounts.posts, 16], [signalCounts.topics, 12], [signalCounts.search, 10], [activeWindowEvents, 1]),
    brains: readinessScore([signalCounts.brains, 22], [signalCounts.search, 12], [signalCounts.posts, 3]),
    missions: readinessScore([signalCounts.missions, 30], [signalCounts.search, 8], [signalCounts.topics, 6]),
    notifications: readinessScore([signalCounts.notifications, 24], [signalCounts.posts, 6], [signalCounts.comments, 8], [signalCounts.messages, 4]),
  };

  const recommendationReadiness = {
    feed: recommendationReadinessScores.feed >= 40,
    brains: recommendationReadinessScores.brains >= 35,
    missions: recommendationReadinessScores.missions >= 25,
    notifications: recommendationReadinessScores.notifications >= 35,
  };

  const response = IntelligenceSummaryResponseSchema.parse({
    generatedAt: new Date().toISOString(),
    architecture: {
      apiStyle: "flexible-product-api",
      primaryBackendTarget: "supabase-postgres",
      localCache: "indexeddb",
      currentServerStorage: summary.storageMode,
      optionalFutureServices: ["redis-cache", "pgvector", "full-text-search", "queue-worker"],
    },
    totalEvents: summary.totalEvents,
    uniqueSessions: summary.uniqueSessions,
    activeWindowEvents,
    topEventTypes: topEntries(summary.byType),
    topRoutes: summary.topRoutes,
    topPayloadKeys: summary.topPayloadKeys,
    signalCounts,
    recommendationReadiness,
    recommendationReadinessScores,
    recommendedActions: buildRecommendedActions(signalCounts, recommendationReadinessScores),
    health: {
      eventVolume: getEventVolume(summary.totalEvents),
      lastEventAt: summary.lastEventAt,
      storageMode: summary.storageMode,
    },
    nextBackendStep: "Add Supabase-backed aggregates for user_topic_affinity, post_scores, brain_scores, and mission_scores behind this flexible API layer.",
  });

  res.json(response);
});

export default router;
