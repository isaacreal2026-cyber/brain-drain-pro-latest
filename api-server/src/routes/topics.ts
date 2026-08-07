import { Router, type IRouter } from "express";
import { z } from "zod";
import { supabase, SupabaseError } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

const TopicQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const CreateTopicSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  description: z.string().max(500).default(""),
  category: z.string().max(80).optional(),
});

interface TopicRow {
  id: string;
  name: string;
  description: string;
  category: string | null;
  follower_count: number;
  order: number;
}

/** Public list of topics (used by the feed/topic chips). */
router.get("/topics", async (req, res) => {
  const parsed = TopicQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  if (!supabase.isConfigured()) {
    res.json({ topics: [], source: "degraded" });
    return;
  }
  try {
    const rows = await supabase.get<TopicRow>("topics", {
      order: { column: "order", ascending: true },
      limit: parsed.data.limit,
    });
    res.json({
      topics: rows.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        followerCount: t.follower_count,
        order: t.order,
      })),
      source: "supabase",
    });
  } catch (error) {
    if (error instanceof SupabaseError) {
      res.status(502).json({ error: "Topics unavailable" });
      return;
    }
    throw error;
  }
});

/** Create a topic (authenticated). The API uses the service role so the
 *  insert bypasses RLS, but we require a valid user token first. */
router.post("/topics", requireAuth, async (req, res) => {
  const parsed = CreateTopicSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid topic", details: parsed.error.flatten() });
    return;
  }
  if (!supabase.isConfigured()) {
    res.status(503).json({ error: "Topics not configured" });
    return;
  }
  try {
    const row = {
      id: parsed.data.id,
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category ?? null,
    };
    // On conflict (duplicate id) return the existing row instead of erroring.
    await supabase.insert("topics", row, "resolution=merge-duplicates");
    res.status(201).json({ topic: { ...row, followerCount: 0 } });
  } catch (error) {
    if (error instanceof SupabaseError) {
      res.status(502).json({ error: "Could not create topic" });
      return;
    }
    throw error;
  }
});

const FollowTopicSchema = z.object({
  topicId: z.string().min(1).max(80),
});

/** Follow a topic (authenticated). */
router.post("/topics/follow", requireAuth, async (req, res) => {
  const parsed = FollowTopicSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  if (!supabase.isConfigured()) {
    res.status(503).json({ error: "Topics not configured" });
    return;
  }
  try {
    await supabase.insert(
      "topic_followers",
      { topic_id: parsed.data.topicId, user_id: req.auth!.uid },
      "resolution=merge-duplicates",
    );
    res.status(204).end();
  } catch (error) {
    if (error instanceof SupabaseError) {
      res.status(502).json({ error: "Could not follow topic" });
      return;
    }
    throw error;
  }
});

export default router;
