import { Brain, BrainVersion, Branch, Node, PullRequest } from "./types";
import { idb } from "./db";

export const BRANCH_STORE = "brain_branches";
export const VERSION_STORE = "brain_versions";
export const PR_STORE = "brain_prs";
export const MAIN_BRANCH = "main";

/** Nodes the brain is currently working with (what the editor/runtime see). */
export async function loadWorkingNodes(brainId: string): Promise<Node[]> {
  return idb.getAllByIndex<Node>("nodes", "brain_id", brainId);
}

/** Replaces the working node set of a brain in one pass. */
export async function writeWorkingNodes(brainId: string, nodes: Node[]): Promise<void> {
  const current = await loadWorkingNodes(brainId);
  await idb.deleteAll("nodes", current.map((node) => node.id));
  await idb.putAll(
    "nodes",
    nodes.map((node) => ({ ...node, brain_id: brainId })),
  );
}

export async function listBranches(brainId: string): Promise<Branch[]> {
  return idb.getAllByIndex<Branch>(BRANCH_STORE, "brain_id", brainId);
}

export async function listVersions(brainId: string): Promise<BrainVersion[]> {
  return idb.getAllByIndex<BrainVersion>(VERSION_STORE, "brain_id", brainId);
}

export async function listPullRequests(brainId: string): Promise<PullRequest[]> {
  return idb.getAllByIndex<PullRequest>(PR_STORE, "brain_id", brainId);
}

/** Newest version recorded on a branch. */
export function headVersion(versions: BrainVersion[], branchName: string): BrainVersion | null {
  return (
    versions
      .filter((version) => version.branch === branchName)
      .sort((a, b) => b.created_at - a.created_at)[0] || null
  );
}

/** Appends a version (a snapshot of the logic) to a branch. */
export async function recordVersion(
  brainId: string,
  branch: string,
  message: string,
  nodes: Node[],
  author = "me",
): Promise<BrainVersion> {
  const version: BrainVersion = {
    id: crypto.randomUUID(),
    brain_id: brainId,
    branch,
    message,
    nodes: nodes.map((node) => ({ ...node })),
    created_at: Date.now(),
    author,
  };
  await idb.put(VERSION_STORE, version);
  return version;
}

/**
 * Makes sure a brain has its `main` line and an initial snapshot. Called both
 * by the repository hook and after an edit, so history is never missing.
 */
export async function ensureMainBranch(brainId: string): Promise<Branch> {
  const branches = await listBranches(brainId);
  const existing = branches.find((branch) => branch.isMain) || branches[0];
  if (existing) return existing;

  const brain = await idb.get<Brain>("brains", brainId);
  const mainBranch: Branch = {
    id: crypto.randomUUID(),
    brain_id: brainId,
    name: MAIN_BRANCH,
    isMain: true,
    created_at: brain?.created_at || Date.now(),
    author: "me",
    isProtected: true,
  };
  await idb.put(BRANCH_STORE, mainBranch);
  await recordVersion(brainId, MAIN_BRANCH, "Initial brain state", await loadWorkingNodes(brainId));
  return mainBranch;
}

/**
 * Records an edit as a new version on whichever branch the brain is on.
 * Used after the creator saves changes from the editor.
 */
export async function commitBrainEdit(
  brainId: string,
  nodes: Node[],
  message = "Updated brain logic",
): Promise<void> {
  await ensureMainBranch(brainId);
  const brain = await idb.get<Brain>("brains", brainId);
  const branches = await listBranches(brainId);
  const branchName =
    brain?.active_branch && branches.some((b) => b.name === brain.active_branch)
      ? brain.active_branch
      : MAIN_BRANCH;
  await recordVersion(brainId, branchName, message, nodes);
}
