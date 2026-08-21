import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, BrainVersion, Branch, Node, PullRequest } from "@/lib/types";
import { idb } from "@/lib/db";
import { diffNodes, mergeNodeSets, summarizeDiff, type NodeDiff } from "@/lib/branch-merge";
import {
  BRANCH_STORE,
  MAIN_BRANCH as MAIN,
  PR_STORE,
  VERSION_STORE,
  ensureMainBranch,
  headVersion,
  listBranches,
  listPullRequests,
  listVersions,
  loadWorkingNodes,
  recordVersion,
  writeWorkingNodes,
} from "@/lib/brain-repo";

export interface BrainRepoState {
  branches: Branch[];
  versions: BrainVersion[];
  pullRequests: PullRequest[];
  activeBranch: string;
}

const byNewest = <T extends { created_at: number }>(items: T[]) =>
  [...items].sort((a, b) => b.created_at - a.created_at);

/**
 * Collaborative repository for one brain.
 *
 * `main` is the owner's line. A peer can branch off it, change their own copy
 * of the logic (their ingredients, their fix), and propose it back; the owner
 * compares and adopts what they want with a merge. Everything is stored
 * locally in IndexedDB, exactly like the brains themselves.
 */
export function useBrainRepo(brainId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["brain-repo", brainId];

  const { data, isLoading } = useQuery<BrainRepoState>({
    queryKey,
    enabled: Boolean(brainId),
    queryFn: async () => {
      const [allBranches, allVersions, allPrs, brain] = await Promise.all([
        listBranches(brainId),
        listVersions(brainId),
        listPullRequests(brainId),
        idb.get<Brain>("brains", brainId),
      ]);

      let branches = allBranches;
      let versions = allVersions;

      // First open: create `main` from whatever the brain currently holds.
      if (branches.length === 0) {
        await ensureMainBranch(brainId);
        branches = await listBranches(brainId);
        versions = await listVersions(brainId);
      }

      const activeBranch =
        brain?.active_branch && branches.some((b) => b.name === brain.active_branch)
          ? brain.active_branch
          : MAIN;

      return {
        branches: [...branches].sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.created_at - b.created_at),
        versions: byNewest(versions),
        pullRequests: byNewest(allPrs),
        activeBranch,
      };
    },
  });

  const branches = data?.branches ?? [];
  const versions = data?.versions ?? [];
  const pullRequests = data?.pullRequests ?? [];
  const activeBranch = data?.activeBranch ?? MAIN;

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
    void queryClient.invalidateQueries({ queryKey: ["brains"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, brainId]);

  /** Snapshot of the nodes a branch currently points at. */
  const branchNodes = useCallback(
    async (branchName: string): Promise<Node[]> => {
      const stored = await listVersions(brainId);
      const head = headVersion(stored, branchName);
      if (head) return head.nodes;
      return branchName === activeBranch ? loadWorkingNodes(brainId) : [];
    },
    [brainId, activeBranch],
  );

  const createBranchMutation = useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Branch name cannot be empty.");
      const existing = await listBranches(brainId);
      if (existing.some((b) => b.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error(`A branch called "${trimmed}" already exists.`);
      }

      const storedVersions = await listVersions(brainId);
      const parent = headVersion(storedVersions, activeBranch);
      const startingNodes = parent ? parent.nodes : await loadWorkingNodes(brainId);

      const branch: Branch = {
        id: crypto.randomUUID(),
        brain_id: brainId,
        name: trimmed,
        isMain: false,
        parent_version_id: parent?.id,
        created_at: Date.now(),
        author: "me",
      };
      await idb.put(BRANCH_STORE, branch);
      await recordVersion(brainId, trimmed, `Branched from ${activeBranch}`, startingNodes);
      return branch;
    },
    onSuccess: invalidate,
  });

  const switchBranchMutation = useMutation({
    mutationFn: async (branchId: string) => {
      const branch = await idb.get<Branch>(BRANCH_STORE, branchId);
      if (!branch) return;

      // Keep the current branch's work before moving away from it.
      const storedVersions = await listVersions(brainId);
      const currentHead = headVersion(storedVersions, activeBranch);
      const working = await loadWorkingNodes(brainId);
      if (!currentHead || !isUnchanged(currentHead.nodes, working)) {
        await recordVersion(brainId, activeBranch, "Autosaved before switching branch", working);
      }

      const target = headVersion(
        await listVersions(brainId),
        branch.name,
      );
      if (target) await writeWorkingNodes(brainId, target.nodes);

      const brain = await idb.get<Brain>("brains", brainId);
      if (brain) await idb.put("brains", { ...brain, active_branch: branch.name });
      return branch;
    },
    onSuccess: invalidate,
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (branchId: string) => {
      const branch = await idb.get<Branch>(BRANCH_STORE, branchId);
      if (!branch) return;
      if (branch.isMain) throw new Error("The main branch cannot be deleted.");
      if (branch.isProtected) throw new Error("This branch is protected. Remove protection first.");
      if (branch.name === activeBranch) throw new Error("Switch to another branch before deleting this one.");

      const storedVersions = await listVersions(brainId);
      await idb.deleteAll(
        VERSION_STORE,
        storedVersions.filter((v) => v.branch === branch.name).map((v) => v.id),
      );
      const prs = await listPullRequests(brainId);
      await idb.deleteAll(
        PR_STORE,
        prs.filter((pr) => pr.source_branch === branch.name && pr.status === "open").map((pr) => pr.id),
      );
      await idb.delete(BRANCH_STORE, branchId);
    },
    onSuccess: invalidate,
  });

  const renameBranchMutation = useMutation({
    mutationFn: async ({ branchId, name }: { branchId: string; name: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Branch name cannot be empty.");
      const branch = await idb.get<Branch>(BRANCH_STORE, branchId);
      if (!branch) return;
      if (branch.isMain) throw new Error("The main branch cannot be renamed.");
      if (branch.isProtected) throw new Error("This branch is protected. Remove protection first.");

      const existing = await listBranches(brainId);
      if (existing.some((b) => b.id !== branchId && b.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error(`A branch called "${trimmed}" already exists.`);
      }

      await idb.put(BRANCH_STORE, { ...branch, name: trimmed });

      // Versions and pull requests reference branches by name.
      const storedVersions = await listVersions(brainId);
      await idb.putAll(
        VERSION_STORE,
        storedVersions.filter((v) => v.branch === branch.name).map((v) => ({ ...v, branch: trimmed })),
      );
      const prs = await listPullRequests(brainId);
      await idb.putAll(
        PR_STORE,
        prs
          .filter((pr) => pr.source_branch === branch.name || pr.target_branch === branch.name)
          .map((pr) => ({
            ...pr,
            source_branch: pr.source_branch === branch.name ? trimmed : pr.source_branch,
            target_branch: pr.target_branch === branch.name ? trimmed : pr.target_branch,
          })),
      );

      if (branch.name === activeBranch) {
        const brain = await idb.get<Brain>("brains", brainId);
        if (brain) await idb.put("brains", { ...brain, active_branch: trimmed });
      }
    },
    onSuccess: invalidate,
  });

  const toggleProtectionMutation = useMutation({
    mutationFn: async (branchId: string) => {
      const branch = await idb.get<Branch>(BRANCH_STORE, branchId);
      if (!branch) return;
      await idb.put(BRANCH_STORE, { ...branch, isProtected: !branch.isProtected });
    },
    onSuccess: invalidate,
  });

  /** Records the current working nodes as a new version on the active branch. */
  const commitMutation = useMutation({
    mutationFn: async (message: string) => {
      const working = await loadWorkingNodes(brainId);
      return recordVersion(brainId, activeBranch, message || "Updated brain logic", working);
    },
    onSuccess: invalidate,
  });

  const rollbackMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const version = await idb.get<BrainVersion>(VERSION_STORE, versionId);
      if (!version) throw new Error("That version is no longer available.");
      await writeWorkingNodes(brainId, version.nodes);
      await recordVersion(
        brainId,
        activeBranch,
        `Recovered state from ${new Date(version.created_at).toLocaleString()}`,
        version.nodes,
      );
      return version;
    },
    onSuccess: invalidate,
  });

  /** Owner action: fold a peer's branch into a target branch (default `main`). */
  const mergeBranchMutation = useMutation({
    mutationFn: async ({ branchId, target = MAIN }: { branchId: string; target?: string }) => {
      const branch = await idb.get<Branch>(BRANCH_STORE, branchId);
      if (!branch) throw new Error("Branch not found.");
      if (branch.name === target) throw new Error("A branch cannot be merged into itself.");

      const storedVersions = await listVersions(brainId);
      const sourceHead = headVersion(storedVersions, branch.name);
      const targetHead = headVersion(storedVersions, target);
      if (!sourceHead) throw new Error("This branch has nothing to merge yet.");

      const baseVersion = branch.parent_version_id
        ? storedVersions.find((v) => v.id === branch.parent_version_id)
        : undefined;

      const targetNodes = targetHead ? targetHead.nodes : await loadWorkingNodes(brainId);
      const result = mergeNodeSets(targetNodes, sourceHead.nodes, baseVersion?.nodes, brainId);

      if (result.isNoop) {
        return { merged: false, summary: summarizeDiff(result.diff) };
      }

      await recordVersion(
        brainId,
        target,
        `Merged ${branch.name} into ${target} (${summarizeDiff(result.diff)})`,
        result.nodes,
      );

      // If the owner is standing on the target branch, apply it to the brain.
      if (activeBranch === target) {
        await writeWorkingNodes(brainId, result.nodes);
      }

      return { merged: true, summary: summarizeDiff(result.diff) };
    },
    onSuccess: invalidate,
  });

  const createPullRequestMutation = useMutation({
    mutationFn: async ({
      title,
      description = "",
      source,
      target = MAIN,
    }: {
      title: string;
      description?: string;
      source: string;
      target?: string;
    }) => {
      if (source === target) throw new Error("Choose a branch other than the target.");
      const pr: PullRequest = {
        id: crypto.randomUUID(),
        brain_id: brainId,
        title: title.trim() || `Merge ${source} into ${target}`,
        description,
        source_branch: source,
        target_branch: target,
        status: "open",
        created_at: Date.now(),
        author: "me",
      };
      await idb.put(PR_STORE, pr);
      return pr;
    },
    onSuccess: invalidate,
  });

  const resolvePullRequestMutation = useMutation({
    mutationFn: async ({ prId, action }: { prId: string; action: "merge" | "close" }) => {
      const pr = await idb.get<PullRequest>(PR_STORE, prId);
      if (!pr) throw new Error("Pull request not found.");
      if (pr.status !== "open") throw new Error("This pull request is already resolved.");

      if (action === "close") {
        await idb.put(PR_STORE, { ...pr, status: "closed", resolved_at: Date.now() });
        return { merged: false, summary: "" };
      }

      const allBranches = await listBranches(brainId);
      const source = allBranches.find((b) => b.name === pr.source_branch);
      if (!source) throw new Error("The source branch no longer exists.");

      const result = await mergeBranchMutation.mutateAsync({
        branchId: source.id,
        target: pr.target_branch,
      });
      await idb.put(PR_STORE, { ...pr, status: "merged", resolved_at: Date.now() });
      return result;
    },
    onSuccess: invalidate,
  });

  /** Diff a branch against a target without changing anything. */
  const compareBranch = useCallback(
    async (branchName: string, target = MAIN): Promise<NodeDiff> => {
      const storedVersions = await listVersions(brainId);
      const source = headVersion(storedVersions, branchName);
      const targetHead = headVersion(storedVersions, target);
      const branchList = await listBranches(brainId);
      const branch = branchList.find((b) => b.name === branchName);
      const base = branch?.parent_version_id
        ? storedVersions.find((v) => v.id === branch.parent_version_id)
        : undefined;

      return diffNodes(
        targetHead ? targetHead.nodes : [],
        source ? source.nodes : [],
        base?.nodes,
      );
    },
    [brainId],
  );

  return {
    branches,
    versions,
    pullRequests,
    activeBranch,
    isLoading,
    branchNodes,
    compareBranch,
    createBranch: (name: string) => createBranchMutation.mutateAsync(name),
    switchBranch: (branchId: string) => switchBranchMutation.mutateAsync(branchId),
    deleteBranch: (branchId: string) => deleteBranchMutation.mutateAsync(branchId),
    renameBranch: (branchId: string, name: string) => renameBranchMutation.mutateAsync({ branchId, name }),
    toggleProtection: (branchId: string) => toggleProtectionMutation.mutateAsync(branchId),
    commitVersion: (message: string) => commitMutation.mutateAsync(message),
    rollbackToVersion: (versionId: string) => rollbackMutation.mutateAsync(versionId),
    mergeBranch: (branchId: string, target?: string) => mergeBranchMutation.mutateAsync({ branchId, target }),
    createPullRequest: (input: { title: string; description?: string; source: string; target?: string }) =>
      createPullRequestMutation.mutateAsync(input),
    resolvePullRequest: (prId: string, action: "merge" | "close") =>
      resolvePullRequestMutation.mutateAsync({ prId, action }),
    refresh: invalidate,
  };
}

/** True when two node sets are structurally identical. */
function isUnchanged(a: Node[], b: Node[]) {
  if (a.length !== b.length) return false;
  const diff = diffNodes(a, b, a);
  return diff.added.length === 0 && diff.changed.length === 0 && diff.removed.length === 0;
}
