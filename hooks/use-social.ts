import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { idb } from "@/lib/db";
import { Post } from "@/lib/types";

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const reactToPostMutation = useMutation({
    mutationFn: async ({ postId, reactionType }: { postId: string; reactionType: string }) => {
      const post = await idb.get<Post>("posts", postId);
      const currentUserId = "me";
      
      if (post) {
        const userReactions = post.userReactions || {};
        const reactionUsers = userReactions[reactionType] || [];
        const hasReacted = reactionUsers.includes(currentUserId);
        const reactions = { ...post.reactions };
        
        let newReactionUsers = [...reactionUsers];
        
        if (hasReacted) {
          // Unlike
          newReactionUsers = newReactionUsers.filter(id => id !== currentUserId);
          reactions[reactionType] = Math.max(0, (reactions[reactionType] || 0) - 1);
        } else {
          // Like
          newReactionUsers.push(currentUserId);
          reactions[reactionType] = (reactions[reactionType] || 0) + 1;
        }
        
        const newUserReactions = { ...userReactions, [reactionType]: newReactionUsers };
        const updatedPost: Post = {
          ...post,
          reactions,
          userReactions: newUserReactions,
          ...(reactionType === "repost" ? { repostCount: reactions.repost || 0 } : {}),
        };
        
        await idb.put("posts", updatedPost);
      }
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
    refreshPosts: () => queryClient.invalidateQueries({ queryKey: ["posts"] })
  };
}
