import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { idb } from "@/lib/db";
import { getAnalyticsEvents } from "@/lib/analytics";
import { rankBrainsByLocalSignals } from "@/lib/recommendations";
import { Brain, Node, BrainData } from "@/lib/types";
import { env } from "@/lib/env";
import { listBrains, saveBrain as saveBrainApi, deleteBrain as deleteBrainApi, isBrainsError } from "@/lib/api/brains";
import { getAuthToken } from "@/lib/auth-token";

const generateId = () => crypto.randomUUID();

export function useDatabase() {
  const queryClient = useQueryClient();

  const { data: brains = [], isLoading } = useQuery<Brain[]>({
    queryKey: ["brains"],
    placeholderData: (previous) => previous,
    staleTime: 60_000,
    queryFn: async () => {
      const cached = await idb.getAll<Brain>("brains");

      // Seed starter content on a fresh device (kept for offline/demo and so
      // the app is never empty even without a backend).
      if (cached.length === 0) {
        await seedDatabase();
      }
      const localBrains = await idb.getAll<Brain>("brains");

      if (!env.apiBaseUrl) {
        const events = await getAnalyticsEvents();
        return rankBrainsByLocalSignals(localBrains, events);
      }

      try {
        // Signed-in users see their own brains; guests see public ones.
        const token = await getAuthToken();
        const response = await listBrains({ mine: Boolean(token), limit: 100 });

        // Cache cloud brains, preserving any local-only (seeded/offline) brains.
        if (response.brains.length > 0) {
          await idb.putAll("brains", response.brains as Brain[]);
        }
        const merged = mergeCloudWithLocal(response.brains as Brain[], localBrains);
        const events = await getAnalyticsEvents();
        return rankBrainsByLocalSignals(merged, events);
      } catch (error) {
        if (isBrainsError(error, 401)) {
          // Token issue — fall back to public + local.
          try {
            const response = await listBrains({ mine: false, limit: 100 });
            if (response.brains.length > 0) {
              await idb.putAll("brains", response.brains as Brain[]);
            }
            const merged = mergeCloudWithLocal(response.brains as Brain[], localBrains);
            const events = await getAnalyticsEvents();
            return rankBrainsByLocalSignals(merged, events);
          } catch {
            // fall through to local
          }
        }
        const events = await getAnalyticsEvents();
        return rankBrainsByLocalSignals(localBrains, events);
      }
    },
  });

  const getBrainData = async (brainId: string): Promise<BrainData | null> => {
    const brain = await idb.get<Brain>("brains", brainId);
    if (!brain) return null;
    const nodes = await idb.getAllByIndex<Node>("nodes", "brain_id", brainId);
    return { brain, nodes };
  };

  const saveBrainDataMutation = useMutation({
    mutationFn: async (data: BrainData) => {
      // Optimistic local write.
      await idb.put("brains", data.brain);
      await idb.putAll("nodes", data.nodes);

      if (!env.apiBaseUrl) return;

      try {
        const token = await getAuthToken();
        // Only sync brains authored by the signed-in user. Guests keep brains local.
        if (token) {
          await saveBrainApi(
            {
              brain: {
                ...data.brain,
                is_public: (data.brain as Brain & { isPublic?: boolean }).isPublic ?? false,
              },
              nodes: data.nodes,
            },
            token,
          );
        }
      } catch (error) {
        console.warn("Brain saved locally, cloud sync deferred", error);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["brains"] });
    },
  });

  const deleteBrainMutation = useMutation({
    mutationFn: async (brainId: string) => {
      await idb.delete("brains", brainId);
      const nodes = await idb.getAllByIndex<Node>("nodes", "brain_id", brainId);
      await idb.deleteAll(
        "nodes",
        nodes.map((n) => n.id),
      );

      if (!env.apiBaseUrl) return;
      try {
        const token = await getAuthToken();
        if (token) await deleteBrainApi(brainId, token);
      } catch (error) {
        console.warn("Brain deleted locally, cloud delete deferred", error);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["brains"] });
    },
  });

  const exportData = async () => {
    const allBrains = await idb.getAll<Brain>("brains");
    const allNodes = await idb.getAll<Node>("nodes");
    const exportObj = { brains: allBrains, nodes: allNodes };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brain-builder-export-${new Date().toISOString().slice(0, 10)}.json`;
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
    refresh: () => queryClient.invalidateQueries({ queryKey: ["brains"] }),
  };
}

function mergeCloudWithLocal(cloudBrains: Brain[], localBrains: Brain[]): Brain[] {
  const cloudIds = new Set(cloudBrains.map((b) => b.id));
  // Keep seeded/local-only brains so the UI is never empty; cloud brains win
  // on ID collisions.
  const localOnly = localBrains.filter((b) => !cloudIds.has(b.id));
  return [...cloudBrains, ...localOnly];
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
    root_node_id: b1n1Id,
  };

  const brain1Nodes: Node[] = [
    { id: b1n1Id, brain_id: b1Id, node_type: "question", question_text: "Is the roof angle greater than 30 degrees?", if_true_node_id: b1n2Id, if_false_node_id: b1n3Id },
    { id: b1n2Id, brain_id: b1Id, node_type: "outcome", result_text: "Use Fixed Tilt Brackets", next_steps: "Use 15° fixed tilt, check rail span <=1.8m, torque to 12Nm." },
    { id: b1n3Id, brain_id: b1Id, node_type: "question", question_text: "Is design wind load > 120 km/h?", if_true_node_id: b1n4Id, if_false_node_id: b1n5Id },
    { id: b1n4Id, brain_id: b1Id, node_type: "outcome", result_text: "Use Reinforced Racking + Ballast", next_steps: "Add mid-clamps every 400mm, ballast >=80kg/m², verify uplift." },
    { id: b1n5Id, brain_id: b1Id, node_type: "outcome", result_text: "Standard Flush Mount", next_steps: "Portrait layout, 2 rails, L-feet at 1.2m spacing." },
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
    root_node_id: b2n1Id,
  };

  const brain2Nodes: Node[] = [
    { id: b2n1Id, brain_id: b2Id, node_type: "question", question_text: "Is temperature >= 39.5°C or lasting >3 days?", if_true_node_id: b2n2Id, if_false_node_id: b2n3Id },
    { id: b2n2Id, brain_id: b2Id, node_type: "outcome", result_text: "Seek urgent care", next_steps: "Hydrate, avoid NSAIDs if contraindicated, monitor red flags." },
    { id: b2n3Id, brain_id: b2Id, node_type: "question", question_text: "Any difficulty breathing or chest pain?", if_true_node_id: b2n4Id, if_false_node_id: b2n5Id },
    { id: b2n4Id, brain_id: b2Id, node_type: "outcome", result_text: "Call emergency services", next_steps: "" },
    { id: b2n5Id, brain_id: b2Id, node_type: "outcome", result_text: "Home care", next_steps: "Rest, fluids, paracetamol as directed, recheck in 24h." },
  ];

  await idb.putAll("brains", [brain1, brain2]);
  await idb.putAll("nodes", [...brain1Nodes, ...brain2Nodes]);
}
