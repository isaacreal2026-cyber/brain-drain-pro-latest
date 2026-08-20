import { Router, type IRouter } from "express";
import { z } from "zod";
import { supabase, SupabaseError } from "../lib/supabase";
import { optionalAuth, requireAuth } from "../middleware/auth";

const router: IRouter = Router();

const NodeSchema = z.object({
  id: z.string().min(1).max(120),
  brain_id: z.string().min(1).max(120),
  node_type: z.enum(["question", "outcome"]),
  question_text: z.string().max(5000).nullable().optional(),
  result_text: z.string().max(5000).nullable().optional(),
  next_steps: z.string().max(10000).nullable().optional(),
  if_true_node_id: z.string().max(120).nullable().optional(),
  if_false_node_id: z.string().max(120).nullable().optional(),
  attachments: z.array(z.unknown()).default([]),
});

const BrainSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  category: z.string().max(200).default(""),
  description: z.string().max(5000).default(""),
  root_node_id: z.string().max(120).nullable().optional(),
  is_public: z.boolean().default(false),
  is_favorite: z.boolean().default(false),
  repo_status: z.enum(["private", "public_repo"]).nullable().optional(),
  active_branch: z.string().max(120).nullable().optional(),
});

// z.coerce.boolean() turns ANY non-empty string into true, so "?mine=false"
// used to be read as true. Parse the flag explicitly instead.
const BooleanFlag = z
  .union([z.boolean(), z.string()])
  .transform((value) =>
    typeof value === "boolean"
      ? value
      : ["1", "true", "yes", "on"].includes(value.trim().toLowerCase()),
  );

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  mine: BooleanFlag.default(false),
});

interface BrainRow {
  id: string;
  author_id: string | null;
  title: string;
  category: string;
  description: string;
  root_node_id: string | null;
  is_public: boolean;
  is_favorite: boolean;
  repo_status: string | null;
  active_branch: string | null;
  created_at: string;
}

interface BrainNodeRow {
  id: string;
  brain_id: string;
  node_type: "question" | "outcome";
  question_text: string | null;
  result_text: string | null;
  next_steps: string | null;
  if_true_node_id: string | null;
  if_false_node_id: string | null;
  attachments: unknown;
}

function toClientBrain(row: BrainRow) {
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    category: row.category,
    description: row.description,
    root_node_id: row.root_node_id,
    repo_status: row.repo_status,
    active_branch: row.active_branch,
    isFavorite: row.is_favorite,
    // The client Brain model uses `created_at` (epoch ms). Sending only
    // `createdAt` left every cloud brain without a creation date, which threw
    // "Invalid time value" when the library tried to format it.
    created_at: new Date(row.created_at).getTime(),
    createdAt: new Date(row.created_at).getTime(),
    isPublic: row.is_public,
  };
}

function toClientNode(row: BrainNodeRow) {
  return {
    id: row.id,
    brain_id: row.brain_id,
    node_type: row.node_type,
    question_text: row.question_text ?? undefined,
    result_text: row.result_text ?? undefined,
    next_steps: row.next_steps ?? undefined,
    if_true_node_id: row.if_true_node_id ?? null,
    if_false_node_id: row.if_false_node_id ?? null,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
  };
}

/** List public brains, or the signed-in user's own brains with ?mine=true. */
router.get("/brains", optionalAuth, async (req, res) => {
  const parsed = ListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  if (!supabase.isConfigured()) {
    res.json({ brains: [], hasMore: false, source: "degraded" });
    return;
  }

  const { limit, offset, mine } = parsed.data;
  const filters: Record<string, string> = {};
  if (mine) {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    filters.author_id = `eq.${req.auth.uid}`;
  } else {
    filters.is_public = "eq.true";
  }

  try {
    const rows = await supabase.get<BrainRow>("brains", {
      filters,
      order: { column: "created_at", ascending: false },
      limit: limit + 1,
      offset,
    });
    res.json({
      brains: rows.slice(0, limit).map(toClientBrain),
      hasMore: rows.length > limit,
      source: "supabase",
    });
  } catch (error) {
    if (error instanceof SupabaseError) {
      res.status(502).json({ error: "Brains unavailable" });
      return;
    }
    throw error;
  }
});

/** Fetch a single brain with all of its nodes. Public brains are readable by
 *  anyone; private brains only by their author. */
router.get("/brains/:id", optionalAuth, async (req, res) => {
  if (!supabase.isConfigured()) {
    res.status(503).json({ error: "Brains not configured" });
    return;
  }
  try {
    const brain = await supabase.getOne<BrainRow>("brains", {
      filters: { id: `eq.${req.params.id}` },
    });
    if (!brain) {
      res.status(404).json({ error: "Brain not found" });
      return;
    }
    if (!brain.is_public && brain.author_id !== req.auth?.uid) {
      res.status(404).json({ error: "Brain not found" });
      return;
    }

    const nodes = await supabase.get<BrainNodeRow>("brain_nodes", {
      filters: { brain_id: `eq.${brain.id}` },
    });

    res.json({
      brain: toClientBrain(brain),
      nodes: nodes.map(toClientNode),
      source: "supabase",
    });
  } catch (error) {
    if (error instanceof SupabaseError) {
      res.status(502).json({ error: "Brain unavailable" });
      return;
    }
    throw error;
  }
});

const UpsertBrainSchema = z.object({
  brain: BrainSchema,
  nodes: z.array(NodeSchema).max(500),
});

/** Create or update a brain and its nodes in one transaction-like call.
 *  Nodes are replaced wholesale to keep the client/server topology simple. */
router.post("/brains", requireAuth, async (req, res) => {
  const parsed = UpsertBrainSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid brain", details: parsed.error.flatten() });
    return;
  }
  if (!supabase.isConfigured()) {
    res.status(503).json({ error: "Brains not configured" });
    return;
  }

  const { brain: input, nodes } = parsed.data;
  const uid = req.auth!.uid;

  try {
    // Check ownership if the brain already exists.
    const existing = await supabase.getOne<BrainRow>("brains", {
      filters: { id: `eq.${input.id}` },
    });
    if (existing && existing.author_id !== uid) {
      res.status(403).json({ error: "You do not own this brain" });
      return;
    }

    const brainRow = {
      id: input.id,
      author_id: uid,
      title: input.title,
      category: input.category,
      description: input.description,
      root_node_id: input.root_node_id ?? null,
      is_public: input.is_public,
      is_favorite: input.is_favorite,
      repo_status: input.repo_status ?? null,
      active_branch: input.active_branch ?? null,
    };

    await supabase.insert("brains", brainRow, "resolution=merge-duplicates");

    // Replace nodes safely: insert/upsert the new set FIRST, then delete any
    // old nodes that are not part of the new set. This avoids a window where
    // a failed insert would leave the brain with no nodes at all.
    if (nodes.length > 0) {
      await supabase.insert(
        "brain_nodes",
        nodes.map((n) => ({
          id: n.id,
          brain_id: brainRow.id,
          node_type: n.node_type,
          question_text: n.question_text ?? null,
          result_text: n.result_text ?? null,
          next_steps: n.next_steps ?? null,
          if_true_node_id: n.if_true_node_id ?? null,
          if_false_node_id: n.if_false_node_id ?? null,
          attachments: n.attachments ?? [],
        })),
        "resolution=merge-duplicates",
      );
    }

    // Delete stale nodes belonging to this brain that were not in the upsert.
    // PostgREST filters with `not.in.(...)`; an empty new set deletes all.
    const newIds = nodes.map((n) => n.id);
    if (newIds.length > 0) {
      await supabase.deleteNotIn(
        "brain_nodes",
        { brain_id: brainRow.id },
        "id",
        newIds,
      );
    } else {
      await supabase.delete("brain_nodes", { brain_id: brainRow.id });
    }

    res.status(existing ? 200 : 201).json({
      brain: toClientBrain({
        ...brainRow,
        created_at: existing?.created_at ?? new Date().toISOString(),
      } as BrainRow),
      nodeCount: nodes.length,
    });
  } catch (error) {
    if (error instanceof SupabaseError) {
      res.status(502).json({ error: "Could not save brain" });
      return;
    }
    throw error;
  }
});

/** Delete a brain (author only). Cascades to nodes via the schema. */
router.delete("/brains/:id", requireAuth, async (req, res) => {
  if (!supabase.isConfigured()) {
    res.status(503).json({ error: "Brains not configured" });
    return;
  }
  try {
    const existing = await supabase.getOne<BrainRow>("brains", {
      filters: { id: `eq.${req.params.id}` },
    });
    if (!existing) {
      res.status(404).json({ error: "Brain not found" });
      return;
    }
    if (existing.author_id !== req.auth!.uid) {
      res.status(403).json({ error: "You do not own this brain" });
      return;
    }
    await supabase.delete("brains", { id: existing.id });
    res.status(204).end();
  } catch (error) {
    if (error instanceof SupabaseError) {
      res.status(502).json({ error: "Could not delete brain" });
      return;
    }
    throw error;
  }
});

export default router;
