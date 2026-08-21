import type { Node } from "./types";

/**
 * Collaboration model for brains.
 *
 * A brain has a `main` branch owned by whoever holds the brain. A peer working
 * on the same brain creates their own branch — in a "best dish" brain they may
 * add their own ingredients or fix a wrong step. The owner compares that branch
 * with main and decides what to adopt: merging folds the peer's work into main
 * so the brain becomes more complete.
 *
 * Everything in this module is pure so the rules can be unit-tested.
 */

export interface NodeDiff {
  /** Nodes the branch introduced that main does not have. */
  added: Node[];
  /** Nodes main has that the branch deleted (relative to the shared base). */
  removed: Node[];
  /** Nodes present in both but edited on the branch. */
  changed: Array<{ before: Node; after: Node }>;
}

export interface MergeResult {
  nodes: Node[];
  diff: NodeDiff;
  /** True when the merge would not change the target at all. */
  isNoop: boolean;
}

const COMPARED_FIELDS: Array<keyof Node> = [
  "node_type",
  "question_text",
  "result_text",
  "next_steps",
  "if_true_node_id",
  "if_false_node_id",
];

function normalize(value: unknown) {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value.trim() : value;
}

/** Structural equality for the fields a creator can actually edit. */
export function isSameNode(a: Node, b: Node): boolean {
  for (const field of COMPARED_FIELDS) {
    if (normalize(a[field]) !== normalize(b[field])) return false;
  }
  const aAttachments = a.attachments || [];
  const bAttachments = b.attachments || [];
  if (aAttachments.length !== bAttachments.length) return false;
  return aAttachments.every((attachment, index) => {
    const other = bAttachments[index];
    return (
      other &&
      attachment.type === other.type &&
      attachment.name === other.name &&
      attachment.data === other.data
    );
  });
}

/**
 * Compares a branch against a target (usually main).
 *
 * `base` is the snapshot the branch started from. It is what makes a deletion
 * distinguishable from "this node simply never existed on that branch": only
 * nodes that were in the base and are gone from the branch count as removed.
 */
export function diffNodes(targetNodes: Node[], branchNodes: Node[], base?: Node[]): NodeDiff {
  const targetById = new Map(targetNodes.map((node) => [node.id, node]));
  const branchById = new Map(branchNodes.map((node) => [node.id, node]));

  const added: Node[] = [];
  const changed: Array<{ before: Node; after: Node }> = [];

  for (const node of branchNodes) {
    const existing = targetById.get(node.id);
    if (!existing) {
      added.push(node);
    } else if (!isSameNode(existing, node)) {
      changed.push({ before: existing, after: node });
    }
  }

  const removed: Node[] = [];
  if (base) {
    for (const baseNode of base) {
      if (!branchById.has(baseNode.id) && targetById.has(baseNode.id)) {
        removed.push(targetById.get(baseNode.id)!);
      }
    }
  }

  return { added, removed, changed };
}

/**
 * Folds a branch into a target branch.
 *
 * Rules, in the spirit of "the owner adopts the peer's contribution":
 *  - nodes only the branch has are added,
 *  - nodes both have take the branch's version (that is the proposed fix),
 *  - nodes the branch deleted relative to the shared base are dropped,
 *  - nodes only the target has are kept untouched.
 *
 * The target's node ids are preserved, so links from elsewhere keep working,
 * and every returned node is re-pointed at the target brain.
 */
export function mergeNodeSets(
  targetNodes: Node[],
  branchNodes: Node[],
  base?: Node[],
  brainId?: string,
): MergeResult {
  const diff = diffNodes(targetNodes, branchNodes, base);
  const removedIds = new Set(diff.removed.map((node) => node.id));
  const branchById = new Map(branchNodes.map((node) => [node.id, node]));

  const merged: Node[] = [];
  for (const node of targetNodes) {
    if (removedIds.has(node.id)) continue;
    const incoming = branchById.get(node.id);
    merged.push(incoming ? { ...incoming } : { ...node });
  }
  for (const node of diff.added) {
    merged.push({ ...node });
  }

  const withBrainId = brainId
    ? merged.map((node) => ({ ...node, brain_id: brainId }))
    : merged;

  return {
    nodes: withBrainId,
    diff,
    isNoop: diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0,
  };
}

/** Human-readable one-liner used by the merge/compare toasts. */
export function summarizeDiff(diff: NodeDiff): string {
  if (diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0) {
    return "No differences — this branch matches its target.";
  }
  const parts: string[] = [];
  if (diff.added.length) parts.push(`${diff.added.length} added`);
  if (diff.changed.length) parts.push(`${diff.changed.length} edited`);
  if (diff.removed.length) parts.push(`${diff.removed.length} removed`);
  return parts.join(" · ");
}
