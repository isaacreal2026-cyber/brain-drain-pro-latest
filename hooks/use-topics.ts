import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { idb } from "@/lib/db";
import { Topic } from "@/lib/types";

export function useTopics() {
  const queryClient = useQueryClient();

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const allTopics = await idb.getAll<Topic>("topics");
      // Sort by order if available, otherwise by id
      return [...allTopics].sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 999999;
        const orderB = b.order !== undefined ? b.order : 999999;
        return orderA - orderB;
      });
    },
  });

  const addTopicMutation = useMutation({
    mutationFn: async (topic: Topic) => {
      await idb.put("topics", topic);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  });

  const reorderTopicsMutation = useMutation({
    mutationFn: async (orderedTopics: Topic[]) => {
      for (let i = 0; i < orderedTopics.length; i++) {
        const topic = orderedTopics[i];
        await idb.put("topics", { ...topic, order: i });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  });

  return {
    topics,
    isLoading,
    addTopic: addTopicMutation.mutateAsync,
    reorderTopics: reorderTopicsMutation.mutateAsync,
    refreshTopics: () => queryClient.invalidateQueries({ queryKey: ["topics"] })
  };
}
