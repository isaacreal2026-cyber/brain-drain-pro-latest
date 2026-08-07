import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { idb } from "../lib/db";
import { trackEvent } from "../lib/analytics";
import { Post } from "../lib/types";
import { togglePostReaction } from "../lib/post-votes";
import {
  createPost as createPostApi,
  fetchFeed,
  reactToPost as reactToPostApi,
  isApiError,
  type CloudPost,
} from "../lib/api/feed";
import { getAuthToken } from "../lib/auth-token";
import { env } from "../lib/env";

function mergeCloudWithLocal(
  cloudPosts: CloudPost[],
  localPosts: Post[],
): Post[] {
  // Cloud posts are the source of truth. Keep local-only posts (e.g. created
  // offline, or seeded demo posts) so the UI never goes empty.
  const cloudIds = new Set(cloudPosts.map((p) => p.id));
  const localOnly = localPosts.filter((p) => !cloudIds.has(p.id));
  const merged = [...cloudPosts, ...localOnly];
  return merged.sort((a, b) => b.createdAt - a.createdAt);
}

export function useSocial(mode: "foryou" | "following" | "trending" = "foryou", topicId: string | null = null) {
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading, isFetching } = useQuery<Post[]>({
    queryKey: ["posts", mode, topicId],
    staleTime: 30_000,
    queryFn: async () => {
      // Always read the local cache first for an instant render.
      const cached = (await idb.getAll<Post>("posts")).sort(
        (a, b) => b.createdAt - a.createdAt,
      );

      // If no API is configured, stay fully local.
      if (!env.apiBaseUrl) {
        return cached;
      }

      try {
        const response = await fetchFeed({ mode, topic: topicId, limit: 30 });
        // Cache cloud posts locally for offline use.
        if (response.posts.length > 0) {
          await idb.putAll("posts", response.posts);
        }
        return mergeCloudWithLocal(response.posts, cached);
      } catch (error) {
        // On network error, fall back to the local cache rather than failing.
        if (isApiError(error, 401)) {
          // Auth issue — still show local data.
          return cached;
        }
        return cached;
      }
    },
    // Show cached data immediately while refetching in the background.
    placeholderData: (previous) => previous,
  });

  const addPostMutation = useMutation({
    mutationFn: async (post: Post) => {
      // Optimistic local write so the post appears instantly.
      await idb.put("posts", post);
      await trackEvent("post_created", {
        postId: post.id,
        topicId: post.topicId,
        hasBrain: Boolean(post.brainId),
        hasEvent: Boolean(post.event),
        postType: post.postType || "post",
        mediaCount: post.mediaUrls?.length || 0,
        contentLength: post.content.length,
      });

      if (!env.apiBaseUrl) return;

      try {
        const token = await getAuthToken();
        await createPostApi(
          {
            id: post.id,
            topicId: post.topicId,
            content: post.content,
            postType: post.postType,
            event: post.event,
            mediaUrls: post.mediaUrls,
            brainId: post.brainId,
            createdAt: post.createdAt,
          },
          token,
        );
      } catch (error) {
        // Keep the local copy; it will sync on next refresh/seed. We do not
        // delete the optimistic write because the user is offline-first.
        console.warn("Post created locally, cloud sync deferred", error);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const reactToPostMutation = useMutation({
    mutationFn: async ({ postId, reactionType }: { postId: string; reactionType: string }) => {
      const post = await idb.get<Post>("posts", postId);
      if (!post) return;

      // Optimistic local toggle.
      const result = togglePostReaction(post, reactionType);
      await idb.put("posts", result.post);
      await trackEvent("post_reaction", {
        postId,
        reactionType,
        active: result.active,
      });

      if (!env.apiBaseUrl) return;

      try {
        const token = await getAuthToken();
        if (reactionType === "upvote" || reactionType === "downvote" || reactionType === "repost") {
          const server = await reactToPostApi(postId, reactionType, token);
          // Reconcile local counts with server counts.
          const latest = await idb.get<Post>("posts", postId);
          if (latest) {
            await idb.put("posts", {
              ...latest,
              reactions: server.reactions,
              repostCount: server.reactions.repost,
            });
          }
        }
      } catch (error) {
        console.warn("Reaction saved locally, cloud sync deferred", error);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  return {
    posts,
    isLoading,
    isFetching,
    addPost: addPostMutation.mutateAsync,
    reactToPost: (postId: string, reactionType: string) =>
      reactToPostMutation.mutateAsync({ postId, reactionType }),
    refreshPosts: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  };
}
