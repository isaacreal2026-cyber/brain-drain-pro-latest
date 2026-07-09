import { useState, useEffect } from "react";
import { BrainVersion, Branch, PullRequest } from "@/lib/types";

// Mock data
const MOCK_BRANCHES: Branch[] = [
  { id: "b1", brain_id: "global", name: "main", isMain: true, created_at: Date.now() - 86400000 },
  { id: "b2", brain_id: "global", name: "feature/advanced-logic", isMain: false, created_at: Date.now() - 3600000 }
];

const MOCK_VERSIONS: BrainVersion[] = [
  { id: "v1", brain_id: "global", branch: "main", message: "Initial brain initialization", nodes: [], created_at: Date.now() - 86400000 },
  { id: "v2", brain_id: "global", branch: "main", message: "Added core decision points", nodes: [], created_at: Date.now() - 43200000 },
  { id: "v3", brain_id: "global", branch: "feature/advanced-logic", message: "Experimental cognitive pathways", nodes: [], created_at: Date.now() - 3600000 }
];

const MOCK_PRS: PullRequest[] = [
  { id: "pr1", brain_id: "global", title: "Merge advanced logic into main", description: "Adds 14 new outcome nodes and complex gating.", source_branch: "feature/advanced-logic", target_branch: "main", status: "open", created_at: Date.now() - 1800000 }
];

export function useBrainRepo(brainId: string) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [versions, setVersions] = useState<BrainVersion[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>("main");

  useEffect(() => {
    // In a real app we'd fetch this from IDB/backend based on brain_id
    // For now, inject mock data
    setBranches(MOCK_BRANCHES);
    setVersions(MOCK_VERSIONS);
    setPullRequests(MOCK_PRS);
  }, [brainId]);

  const createBranch = (name: string) => {
    const newBranch: Branch = {
      id: crypto.randomUUID(),
      brain_id: brainId,
      name,
      isMain: false,
      created_at: Date.now()
    };
    setBranches(prev => [...prev, newBranch]);
  };

  const switchBranch = (id: string) => {
    const branch = branches.find(b => b.id === id);
    if (branch) {
      setActiveBranch(branch.name);
    }
  };

  const deleteBranch = (id: string) => {
    setBranches(prev => prev.filter(b => b.id !== id));
  };

  return { branches, versions, pullRequests, activeBranch, createBranch, switchBranch, deleteBranch };
}
