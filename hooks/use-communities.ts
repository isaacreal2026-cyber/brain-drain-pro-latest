import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { idb } from "@/lib/db";
import { useEffect } from "react";

export interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  active: boolean;
  icon?: string;
}

const STORE = "communities";

export function useCommunities() {
  const queryClient = useQueryClient();

  const { data: communities = [], isLoading } = useQuery({
    queryKey: [STORE],
    queryFn: () => idb.getAll<Community>(STORE),
  });

  const { mutateAsync: addCommunity } = useMutation({
    mutationFn: async (community: Community) => {
      await idb.put(STORE, community);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORE] });
    },
  });

  useEffect(() => {
    const seed = async () => {
      const existing = await idb.getAll(STORE);
      if (existing.length === 0) {
        const seedData: Community[] = [
          { id: "c1", name: "AI Safety", description: "Discussing the safety and alignment of AGI.", memberCount: 1250, active: true, icon: "shield" },
          { id: "c2", name: "Medical Diagnosis", description: "Using brains for differential diagnosis.", memberCount: 840, active: true, icon: "stethoscope" },
          { id: "c3", name: "Game Dev", description: "Creating game logic with brains.", memberCount: 300, active: false, icon: "gamepad" },
          { id: "c4", name: "Philosophy", description: "Epistemology and ontology.", memberCount: 150, active: true, icon: "book" },
        ];
        for (const c of seedData) await idb.put(STORE, c);
        queryClient.invalidateQueries({ queryKey: [STORE] });
      }
    };
    seed();
  }, [queryClient]);

  return { communities, isLoading, addCommunity };
}
