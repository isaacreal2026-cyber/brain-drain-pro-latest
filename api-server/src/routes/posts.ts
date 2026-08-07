import { Router, type IRouter } from "express";
import { z } from "zod";
import { supabase, SupabaseError } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

const CreatePostSchema = z.object({
  id: z.string().min(1).max(120),
  topicId: z.string().min(1).max(80),
  content: z.string().min(1).max(10_000),
  postType: z.enum(["post", "question", "answer"]).default("post"),
  event: z
    .object({
      title: z.string().max(200),
      startsAt: z.number().int().positive(),
      endsAt: z.number().int().positive().optional(),
      location: z.string().max(200).optional(),
      communityId: z.string().max(80).optional(),
      communityName: z.string().max(200).optional(),
    })
    .optional(),
  mediaUrls: z.array(z.string().url().max(2000)).max(10).optional(),
  brainId: z.string().max(120).optional(),
  createdAt: z.number().int().positive().optional(),
});

const ReactSchema = z.object({
  reactionType: z.enum(["upvote", "downvote", "repost"]),
});

/**
 * Create a post. Authenticated users only. Posts are written to Supabase and
 * also reflected back to the client for optimistic IndexedDB caching.
 */
router.post("/posts", requireAuth, async (req, res) => {
  const parsed = CreatePostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid post", details: parsed.error.flatten() });
    return;
  }

  if (!supabase.isConfigured()) {
    res.status(503).json({ error: "Post storage is not configured" });
    return;
  }

  const { auth } = req;
  const input = parsed.data;

  const row = {
    id: input.id,
    user_id: auth!.uid,
    topic_id: input.topicId,
    content: input.content,
    post_type: input.postType,
    event: input.event ?? null,
    media_urls: input.mediaUrls ?? [],
    brain_id: input.brainId ?? null,
    created_at: new Date(input.createdAt ?? Date.now()).toISOString(),
  };

  try {
    await supabase.insert("posts", row);
    res.status(201).json({
      post: {
        id: row.id,
        userId: row.user_id,
        topicId: row.topic_id,
        content: row.content,
        postType: row.post_type,
        event: row.event,
        mediaUrls: row.media_urls,
        brainId: row.brain_id,
        reactions: { upvote: 0, downvote: 0, repost: 0 },
        commentCount: 0,
        repostCount: 0,
        createdAt: new Date(row.created_at).getTime(),
      },
    });
  } catch (error) {
    if (error instanceof SupabaseError) {
      // Unique violation (duplicate id) → idempotent success.
      if (error.status === 409) {
        res.status(200).json({ id: row.id, deduped: true });
        return;
      }
      res.status(502).json({ error: "Could not create post" });
      return;
    }
    throw error;
  }
});

/**
 * Toggle a reaction on a post. Upvotes/downvotes are mutually exclusive;
 * clicking the same reaction removes it. Mirrors the local togglePostReaction
 * rules so client and server stay consistent.
 */
router.post("/posts/:id/react", requireAuth, async (req, res) => {
  const parsed = ReactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid reaction" });
    return;
  }
  if (!supabase.isConfigured()) {
    res.status(503).json({ error: "Reaction storage is not configured" });
    return;
  }

  const postId = req.params.id;
  const userId = req.auth!.uid;
  const { reactionType } = parsed.data;

  try {
    // Fetch the post to ensure it exists.
    const post = await supabase.getOne<{ id: string }>("posts", {
      filters: { id: `eq.${postId}` },
    });
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    // Fetch this user's current votes on the post.
    const existing = await supabase.get<{ id: string; reaction_type: string }>(
      "reactions",
      {
        filters: {
          target_type: "eq.post",
          target_id: `eq.${postId}`,
          user_id: `eq.${userId}`,
        },
      },
    );

    const currentVote = existing.find(
      (r) => r.reaction_type === "upvote" || r.reaction_type === "downvote",
    );
    const currentRepost = existing.find((r) => r.reaction_type === "repost");

    if (reactionType === "repost") {
      if (currentRepost) {
        await supabase.delete("reactions", { id: currentRepost.id });
      } else {
        await supabase.insert("reactions", {
          target_type: "post",
          target_id: postId,
          user_id: userId,
          reaction_type: "repost",
        });
      }
    } else {
      // Voting: remove opposite vote if present.
      const opposite = reactionType === "upvote" ? "downvote" : "upvote";
      const oppositeRow = existing.find((r) => r.reaction_type === opposite);
      if (oppositeRow) {
        await supabase.delete("reactions", { id: oppositeRow.id });
      }

      if (currentVote?.reaction_type === reactionType) {
        // Toggle off.
        await supabase.delete("reactions", { id: currentVote.id });
      } else {
        if (currentVote) {
          await supabase.delete("reactions", { id: currentVote.id });
        }
        await supabase.insert("reactions", {
          target_type: "post",
          target_id: postId,
          user_id: userId,
          reaction_type: reactionType,
        });
      }
    }

    // Return fresh counts.
    const all = await supabase.get<{ reaction_type: string }>("reactions", {
      filters: { target_type: "eq.post", target_id: `eq.${postId}` },
    });
    const counts = {
      upvote: all.filter((r) => r.reaction_type === "upvote").length,
      downvote: all.filter((r) => r.reaction_type === "downvote").length,
      repost: all.filter((r) => r.reaction_type === "repost").length,
    };

    res.json({ postId, reactions: counts });
  } catch (error) {
    if (error instanceof SupabaseError) {
      res.status(502).json({ error: "Could not record reaction" });
      return;
    }
    throw error;
  }
});

export default router;
