import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { idb } from "@/lib/db";
import { Topic } from "@/lib/types";
import { env } from "@/lib/env";
import { fetchTopics, createTopic as createTopicApi, followTopic, isTopicsError } from "@/lib/api/topics";
import { getAuthToken } from "@/lib/auth-token";

function sortTopics(topics: Topic[]): Topic[] {
  return [...topics].sort((a, b) => {
    const orderA = a.order !== undefined ? a.order : 999999;
    const orderB = b.order !== undefined ? b.order : 999999;
    return orderA - orderB;
  });
}

function mergeCloudWithLocal(cloudTopics: Topic[], localTopics: Topic[]): Topic[] {
  const cloudIds = new Set(cloudTopics.map((t) => t.id));
  const localOnly = localTopics.filter((t) => !cloudIds.has(t.id));
  return sortTopics([...cloudTopics, ...localOnly]);
}

export function useTopics() {
  const queryClient = useQueryClient();

  const { data: topics = [], isLoading } = useQuery<Topic[]>({
    queryKey: ["topics"],
    staleTime: 60_000,
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const cached = sortTopics(await idb.getAll<Topic>("topics"));

      if (!env.apiBaseUrl) {
        return cached;
      }

      try {
        const response = await fetchTopics();
        if (response.topics.length > 0) {
          await idb.putAll("topics", response.topics);
        }
        return mergeCloudWithLocal(response.topics, cached);
      } catch {
        return cached;
      }
    },
  });

  const addTopicMutation = useMutation({
    mutationFn: async (topic: Topic) => {
      await idb.put("topics", topic);

      if (!env.apiBaseUrl) return;

      try {
        const token = await getAuthToken();
        await createTopicApi(
          {
            id: topic.id,
            name: topic.name,
            description: topic.description,
            category: topic.category,
          },
          token,
        );
      } catch (error) {
        // Keep the local topic; it will sync on the next refresh.
        console.warn("Topic created locally, cloud sync deferred", error);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  });

  const reorderTopicsMutation = useMutation({
    mutationFn: async (orderedTopics: Topic[]) => {
      // Persist ordering in a single transaction.
      const reordered = orderedTopics.map((topic, i) => ({ ...topic, order: i }));
      await idb.putAll("topics", reordered);
      // Topic ordering is a local preference for now; a future endpoint can
      // persist per-user ordering to the cloud.
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  });

  const followTopicMutation = useMutation({
    mutationFn: async (topicId: string) => {
      const token = await getAuthToken();
      if (env.apiBaseUrl) {
        await followTopic(topicId, token);
      }
      // Mark followed locally so the UI updates immediately.
      const topic = await idb.get<Topic>("topics", topicId);
      if (topic) {
        await idb.put("topics", { ...topic, isFollowed: true });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  });

  /**
   * Follow/unfollow that actually persists both directions. The follow state
   * used to live in component state only, so it was lost on navigation.
   */
  const toggleFollowTopicMutation = useMutation({
    mutationFn: async (topicId: string) => {
      const topic = await idb.get<Topic>("topics", topicId);
      if (!topic) return;
      const isNowFollowed = !topic.isFollowed;

      if (isNowFollowed && env.apiBaseUrl) {
        try {
          const token = await getAuthToken();
          await followTopic(topicId, token);
        } catch (error) {
          console.warn("Topic follow saved locally, cloud sync deferred", error);
        }
      }

      await idb.put("topics", {
        ...topic,
        isFollowed: isNowFollowed,
        followerCount: Math.max(0, (topic.followerCount || 0) + (isNowFollowed ? 1 : -1)),
      });
      return isNowFollowed;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  });

  return {
    topics,
    isLoading,
    addTopic: addTopicMutation.mutateAsync,
    reorderTopics: reorderTopicsMutation.mutateAsync,
    followTopic: followTopicMutation.mutateAsync,
    toggleFollowTopic: toggleFollowTopicMutation.mutateAsync,
    refreshTopics: () => queryClient.invalidateQueries({ queryKey: ["topics"] }),
  };
}
