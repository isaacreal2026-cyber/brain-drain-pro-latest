import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { idb } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";
import { Post } from "@/lib/types";
import { togglePostReaction } from "@/lib/post-votes";

export function useSocial() {
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const allPosts = await idb.getAll<Post>("posts");
      return allPosts.sort((a, b) => b.createdAt - a.createdAt);
    },
  });

  const addPostMutation = useMutation({
    mutationFn: async (post: Post) => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const reactToPostMutation = useMutation({
    mutationFn: async ({ postId, reactionType }: { postId: string; reactionType: string }) => {
      const post = await idb.get<Post>("posts", postId);
      if (!post) return;

      const result = togglePostReaction(post, reactionType);
      await idb.put("posts", result.post);
      await trackEvent("post_reaction", {
        postId,
        reactionType,
        active: result.active,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  return {
    posts,
    isLoading,
    addPost: addPostMutation.mutateAsync,
    reactToPost: (postId: string, reactionType: string) => reactToPostMutation.mutateAsync({ postId, reactionType }),
    refreshPosts: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  };
}
