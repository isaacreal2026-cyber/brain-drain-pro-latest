import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAnalyticsSummary, getRecentAnalyticsEvents } from "../lib/analytics-store";

const RecommendationSchema = z.object({
  brainId: z.string(),
  score: z.number().nonnegative(),
  confidence: z.enum(["low", "medium", "high"]),
  reasons: z.array(z.string()),
  signals: z.object({
    launches: z.number().int().nonnegative(),
    shares: z.number().int().nonnegative(),
    creations: z.number().int().nonnegative(),
    comments: z.number().int().nonnegative(),
  }),
  lastSignalAt: z.number().int().nullable(),
});

const BrainRecommendationsResponseSchema = z.object({
  generatedAt: z.string(),
  source: z.object({
    apiStyle: z.literal("flexible-product-api"),
    primaryBackendTarget: z.literal("supabase-postgres"),
    currentStorage: z.enum(["file", "memory"]),
    currentMode: z.literal("analytics-signal-ranking"),
  }),
  limit: z.number().int().positive(),
  readinessScore: z.number().int().min(0).max(100),
  signalSummary: z.object({
    directBrainSignals: z.number().int().nonnegative(),
    launchSignals: z.number().int().nonnegative(),
    searchSignals: z.number().int().nonnegative(),
    postSignals: z.number().int().nonnegative(),
  }),
  recommendations: z.array(RecommendationSchema),
  fallback: z.object({
    needsSupabaseMetadata: z.boolean(),
    message: z.string(),
  }),
  nextBackendStep: z.string(),
});

type Recommendation = z.infer<typeof RecommendationSchema>;

const DAY_MS = 24 * 60 * 60 * 1_000;

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function ageDecay(createdAt: number) {
  const ageDays = Math.max((Date.now() - createdAt) / DAY_MS, 0);
  return 1 / (1 + ageDays / 21);
}

function confidenceFor(score: number): Recommendation["confidence"] {
  if (score >= 18) return "high";
  if (score >= 8) return "medium";
  return "low";
}

function addReason(reasons: Set<string>, reason: string) {
  if (reasons.size < 5) reasons.add(reason);
}

const router: IRouter = Router();

router.get("/recommendations/brains", (req, res) => {
  const limitResult = z.coerce.number().int().min(1).max(25).safeParse(req.query.limit ?? 10);
  const limit = limitResult.success ? limitResult.data : 10;

  const summary = getAnalyticsSummary();
  const recentEvents = getRecentAnalyticsEvents();
  const scored = new Map<
    string,
    {
      score: number;
      reasons: Set<string>;
      launches: number;
      shares: number;
      creations: number;
      comments: number;
      lastSignalAt: number | null;
    }
  >();

  const ensure = (brainId: string) => {
    const existing = scored.get(brainId);
    if (existing) return existing;
    const next = {
      score: 0,
      reasons: new Set<string>(),
      launches: 0,
      shares: 0,
      creations: 0,
      comments: 0,
      lastSignalAt: null as number | null,
    };
    scored.set(brainId, next);
    return next;
  };

  let directBrainSignals = 0;
  let launchSignals = 0;
  let postSignals = 0;

  for (const event of recentEvents) {
    const payload = event.payload || {};
    const brainId = asString(payload.brainId) || asString(payload.brain_id);
    const decay = ageDecay(event.createdAt);

    if (!brainId) continue;

    directBrainSignals += 1;
    const row = ensure(brainId);
    row.lastSignalAt = Math.max(row.lastSignalAt || 0, event.createdAt);

    switch (event.type) {
      case "brain_launch":
        launchSignals += 1;
        row.launches += 1;
        row.score += 20 * decay;
        addReason(row.reasons, "Recently launched by a user");
        break;
      case "post_created":
        postSignals += 1;
        row.creations += 1;
        row.score += 12 * decay;
        addReason(row.reasons, "Attached to a created post");
        break;
      case "post_share":
        postSignals += 1;
        row.shares += 1;
        row.score += 9 * decay;
        addReason(row.reasons, "Shared from social activity");
        break;
      case "comment_created":
      case "comment_reaction":
        row.comments += 1;
        row.score += 4 * decay;
        addReason(row.reasons, "Discussed in comments");
        break;
      default:
        row.score += 2 * decay;
        addReason(row.reasons, "Related local activity signal");
        break;
    }
  }

  const searchSignals = (summary.byType.search_submitted || 0) + (summary.byType.search_recent_selected || 0);
  const readinessScore = Math.max(
    0,
    Math.min(100, Math.round(directBrainSignals * 18 + launchSignals * 12 + searchSignals * 8 + postSignals * 5)),
  );

  const recommendations = [...scored.entries()]
    .map(([brainId, value]) => ({
      brainId,
      score: Number(value.score.toFixed(2)),
      confidence: confidenceFor(value.score),
      reasons: [...value.reasons],
      signals: {
        launches: value.launches,
        shares: value.shares,
        creations: value.creations,
        comments: value.comments,
      },
      lastSignalAt: value.lastSignalAt,
    }))
    .sort((a, b) => b.score - a.score || (b.lastSignalAt || 0) - (a.lastSignalAt || 0))
    .slice(0, limit);

  const response = BrainRecommendationsResponseSchema.parse({
    generatedAt: new Date().toISOString(),
    source: {
      apiStyle: "flexible-product-api",
      primaryBackendTarget: "supabase-postgres",
      currentStorage: summary.storageMode,
      currentMode: "analytics-signal-ranking",
    },
    limit,
    readinessScore,
    signalSummary: {
      directBrainSignals,
      launchSignals,
      searchSignals,
      postSignals,
    },
    recommendations,
    fallback: {
      needsSupabaseMetadata: true,
      message:
        recommendations.length > 0
          ? "Brain IDs are ranked from analytics signals. Supabase brain metadata can hydrate titles, authors, categories, and access rules later."
          : "No direct Brain IDs are available yet. Continue collecting brain_launch and brain-attached post events, then hydrate recommendations from Supabase metadata.",
    },
    nextBackendStep: "Back this endpoint with Supabase brain_scores and brains metadata while keeping the response contract stable.",
  });

  res.json(response);
});

export default router;
