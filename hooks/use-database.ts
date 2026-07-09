import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { idb } from "@/lib/db";
import { Brain, Node, BrainData } from "@/lib/types";

const generateId = () => crypto.randomUUID();

export function useDatabase() {
  const queryClient = useQueryClient();

  const { data: brains = [], isLoading } = useQuery({
    queryKey: ["brains"],
    queryFn: async () => {
      const allBrains = await idb.getAll<Brain>("brains");
      if (allBrains.length === 0) {
        await seedDatabase();
        return await idb.getAll<Brain>("brains");
      }
      return allBrains;
    }
  });

  const getBrainData = async (brainId: string): Promise<BrainData | null> => {
    // We fetch on demand here, no caching needed for this one as it's a specific detail query usually
    // Or we could use queryClient.fetchQuery, but keeping it simple
    const brain = await idb.get<Brain>("brains", brainId);
    if (!brain) return null;
    const nodes = await idb.getAllByIndex<Node>("nodes", "brain_id", brainId);
    return { brain, nodes };
  };

  const saveBrainDataMutation = useMutation({
    mutationFn: async (data: BrainData) => {
      await idb.put("brains", data.brain);
      for (const node of data.nodes) {
        await idb.put("nodes", node);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brains"] });
    }
  });

  const deleteBrainMutation = useMutation({
    mutationFn: async (brainId: string) => {
      await idb.delete("brains", brainId);
      const nodes = await idb.getAllByIndex<Node>("nodes", "brain_id", brainId);
      for (const node of nodes) {
        await idb.delete("nodes", node.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brains"] });
    }
  });

  const exportData = async () => {
    const allBrains = await idb.getAll<Brain>("brains");
    const allNodes = await idb.getAll<Node>("nodes");
    const exportObj = { brains: allBrains, nodes: allNodes };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brain-builder-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    brains,
    isLoading,
    getBrainData,
    saveBrainData: saveBrainDataMutation.mutateAsync,
    deleteBrain: deleteBrainMutation.mutateAsync,
    exportData,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["brains"] })
  };
}

async function seedDatabase() {
  const b1Id = generateId();
  const b1n1Id = generateId();
  const b1n2Id = generateId();
  const b1n3Id = generateId();
  const b1n4Id = generateId();
  const b1n5Id = generateId();

  const brain1: Brain = {
    id: b1Id,
    title: "Solar Panel Installation Expert",
    category: "Renewable Energy, China Solars, Large Scale",
    description: "Binary diagnostic for mounting, tilt, and wind load decisions for professional installers.",
    created_at: Date.now(),
    root_node_id: b1n1Id
  };

  const brain1Nodes: Node[] = [
    { id: b1n1Id, brain_id: b1Id, node_type: "question", question_text: "Is the roof angle greater than 30 degrees?", if_true_node_id: b1n2Id, if_false_node_id: b1n3Id },
    { id: b1n2Id, brain_id: b1Id, node_type: "outcome", result_text: "Use Fixed Tilt Brackets", next_steps: "Use 15° fixed tilt, check rail span <=1.8m, torque to 12Nm." },
    { id: b1n3Id, brain_id: b1Id, node_type: "question", question_text: "Is design wind load > 120 km/h?", if_true_node_id: b1n4Id, if_false_node_id: b1n5Id },
    { id: b1n4Id, brain_id: b1Id, node_type: "outcome", result_text: "Use Reinforced Racking + Ballast", next_steps: "Add mid-clamps every 400mm, ballast >=80kg/m², verify uplift." },
    { id: b1n5Id, brain_id: b1Id, node_type: "outcome", result_text: "Standard Flush Mount", next_steps: "Portrait layout, 2 rails, L-feet at 1.2m spacing." }
  ];

  const b2Id = generateId();
  const b2n1Id = generateId();
  const b2n2Id = generateId();
  const b2n3Id = generateId();
  const b2n4Id = generateId();
  const b2n5Id = generateId();

  const brain2: Brain = {
    id: b2Id,
    title: "Medical Triage - Fever Pathway",
    category: "Medical, Primary Care",
    description: "Simple yes/no triage for adult fever to guide next steps (educational only).",
    created_at: Date.now() - 100000,
    root_node_id: b2n1Id
  };

  const brain2Nodes: Node[] = [
    { id: b2n1Id, brain_id: b2Id, node_type: "question", question_text: "Is temperature >= 39.5°C or lasting >3 days?", if_true_node_id: b2n2Id, if_false_node_id: b2n3Id },
    { id: b2n2Id, brain_id: b2Id, node_type: "outcome", result_text: "Seek urgent care", next_steps: "Hydrate, avoid NSAIDs if contraindicated, monitor red flags." },
    { id: b2n3Id, brain_id: b2Id, node_type: "question", question_text: "Any difficulty breathing or chest pain?", if_true_node_id: b2n4Id, if_false_node_id: b2n5Id },
    { id: b2n4Id, brain_id: b2Id, node_type: "outcome", result_text: "Call emergency services", next_steps: "" },
    { id: b2n5Id, brain_id: b2Id, node_type: "outcome", result_text: "Home care", next_steps: "Rest, fluids, paracetamol as directed, recheck in 24h." }
  ];

  await idb.put("brains", brain1);
  for (const n of brain1Nodes) await idb.put("nodes", n);

  await idb.put("brains", brain2);
  for (const n of brain2Nodes) await idb.put("nodes", n);
}
