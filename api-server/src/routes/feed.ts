import { Router, type IRouter } from "express";
import { z } from "zod";
import { supabase, SupabaseError } from "../lib/supabase";
import { optionalAuth } from "../middleware/auth";

const router: IRouter = Router();

const FeedQuerySchema = z.object({
  mode: z.enum(["foryou", "following", "trending"]).default("foryou"),
  topic: z.string().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

interface PostRow {
  id: string;
  user_id: string;
  topic_id: string;
  content: string;
  post_type: string;
  event: unknown;
  media_urls: string[] | null;
  brain_id: string | null;
  repost_count: number;
  created_at: string;
  comment_count: number;
  topic: { name: string } | null;
  author: { display_name: string; avatar_url: string | null } | null;
}

interface ReactionRow {
  target_id: string;
  reaction_type: string;
  user_id: string;
}

router.get("/feed", optionalAuth, async (req, res) => {
  const parsed = FeedQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid feed query" });
    return;
  }
  const { mode, topic, limit, offset } = parsed.data;
  const currentUserId = req.auth?.uid;

  // If Supabase is not configured, the API runs in degraded/local mode.
  if (!supabase.isConfigured()) {
    res.json({ posts: [], hasMore: false, source: "degraded" });
    return;
  }

  try {
    const filters: Record<string, string> = {};
    if (topic) filters.topic_id = `eq.${topic}`;

    // Trending mode is ordered by engagement via the post_scores view when
    // available; foryou/following return newest first and let the client
    // apply local personalization signals.
    const rows = await supabase.get<PostRow>("posts", {
      select: `
        id,user_id,topic_id,content,post_type,event,media_urls,brain_id,
        repost_count,created_at,comment_count,
        topic:topics(name),
        author:profiles(display_name,avatar_url)
      `,
      filters,
      order: { column: "created_at", ascending: false },
      limit: limit + 1,
      offset,
    });

    const page = rows.slice(0, limit);
    const postIds = page.map((r) => r.id);

    let reactionsByPost: Record<string, ReactionRow[]> = {};
    if (postIds.length > 0) {
      const allReactions = await supabase.get<ReactionRow>("reactions", {
        filters: {
          target_type: "eq.post",
          target_id: `in.(${postIds.map((id) => `"${id}"`).join(",")})`,
        },
      });
      reactionsByPost = allReactions.reduce(
        (acc, r) => {
          (acc[r.target_id] ||= []).push(r);
          return acc;
        },
        {} as Record<string, ReactionRow[]>,
      );
    }

    const posts = page.map((row) => {
      const postReactions = reactionsByPost[row.id] || [];
      const upvotes = postReactions.filter((r) => r.reaction_type === "upvote").length;
      const downvotes = postReactions.filter((r) => r.reaction_type === "downvote").length;
      const reposts = postReactions.filter((r) => r.reaction_type === "repost").length;
      const myReaction = currentUserId
        ? postReactions.find((r) => r.user_id === currentUserId)?.reaction_type
        : undefined;

      return {
        id: row.id,
        userId: row.user_id,
        topicId: row.topic_id,
        content: row.content,
        postType: row.post_type,
        event: row.event,
        mediaUrls: row.media_urls || [],
        brainId: row.brain_id,
        repostCount: row.repost_count + reposts,
        createdAt: new Date(row.created_at).getTime(),
        reactions: {
          upvote: upvotes,
          downvote: downvotes,
          repost: row.repost_count + reposts,
        },
        commentCount: row.comment_count || 0,
        userReactions:
          myReaction && currentUserId
            ? { [myReaction]: [currentUserId] }
            : undefined,
        authorName: row.author?.display_name || "Anonymous",
        authorAvatar: row.author?.avatar_url,
        topicName: row.topic?.name,
      };
    });

    res.json({
      posts,
      hasMore: rows.length > limit,
      source: mode,
    });
  } catch (error) {
    if (error instanceof SupabaseError) {
      req.log?.error?.({ err: error, status: error.status }, "Feed query failed");
      res.status(502).json({ error: "Feed data source unavailable" });
      return;
    }
    throw error;
  }
});

export default router;
