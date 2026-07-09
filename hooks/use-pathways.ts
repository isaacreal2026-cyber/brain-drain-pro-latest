import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pathway } from "../lib/types";
import { idb } from "../lib/db";

export function usePathways() {
  const queryClient = useQueryClient();

  const { data: pathways = [], isLoading } = useQuery({
    queryKey: ["pathways"],
    queryFn: async () => {
      return await idb.getAll<Pathway>("pathways");
    }
  });

  const createPathwayMutation = useMutation({
    mutationFn: async (data: Omit<Pathway, "id" | "createdAt" | "forkCount">) => {
      const newPathway: Pathway = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        forkCount: 0,
      };
      await idb.put("pathways", newPathway);
      return newPathway;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pathways"] });
    }
  });

  const forkPathwayMutation = useMutation({
    mutationFn: async ({ id, newTitle, newDesc }: { id: string, newTitle: string, newDesc: string }) => {
      const original = pathways.find(p => p.id === id);
      if (!original) return;

      const forkedPathway: Pathway = {
        ...original,
        id: crypto.randomUUID(),
        title: newTitle,
        description: newDesc,
        forkedFromId: original.id,
        forkCount: 0,
        createdAt: Date.now(),
      };

      const updatedOriginal: Pathway = {
        ...original,
        forkCount: original.forkCount + 1,
      };

      await Promise.all([
        idb.put("pathways", forkedPathway),
        idb.put("pathways", updatedOriginal)
      ]);
      return forkedPathway;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pathways"] });
    }
  });

  return {
    pathways,
    isLoading,
    createPathway: createPathwayMutation.mutateAsync,
    forkPathway: (id: string, newTitle: string, newDesc: string) => forkPathwayMutation.mutateAsync({ id, newTitle, newDesc }),
    refresh: () => queryClient.invalidateQueries({ queryKey: ["pathways"] })
  };
}
