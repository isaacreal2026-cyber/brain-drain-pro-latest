import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { idb } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";
import { getPostDownvoteCount, getPostUpvoteCount, Post } from "@/lib/types";

const unique = (values: string[]) => Array.from(new Set(values));

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
      const currentUserId = "me";

      if (post) {
        const existingUserReactions = post.userReactions || {};
        const legacyUpvoteUsers = [
          ...(existingUserReactions.upvote || []),
          ...(existingUserReactions.like || []),
          ...(existingUserReactions.love || []),
        ];
        const upvoteUsers = unique(legacyUpvoteUsers);
        const downvoteUsers = unique(existingUserReactions.downvote || []);
        const reactions = { ...post.reactions };

        // Old posts used love/like. Convert those counts as they are touched so
        // the vote model stays readable without breaking existing local data.
        reactions.upvote = getPostUpvoteCount(post);
        reactions.downvote = getPostDownvoteCount(post);
        delete reactions.love;
        delete reactions.like;

        let active = false;
        const newUserReactions = { ...existingUserReactions };

        if (reactionType === "upvote" || reactionType === "downvote") {
          const currentUsers = reactionType === "upvote" ? upvoteUsers : downvoteUsers;
          const oppositeType = reactionType === "upvote" ? "downvote" : "upvote";
          const oppositeUsers = reactionType === "upvote" ? downvoteUsers : upvoteUsers;
          const hasReacted = currentUsers.includes(currentUserId);

          if (hasReacted) {
            currentUsers.splice(currentUsers.indexOf(currentUserId), 1);
            reactions[reactionType] = Math.max(0, reactions[reactionType] - 1);
          } else {
            const oppositeIndex = oppositeUsers.indexOf(currentUserId);
            if (oppositeIndex >= 0) {
              oppositeUsers.splice(oppositeIndex, 1);
              reactions[oppositeType] = Math.max(0, reactions[oppositeType] - 1);
            }
            currentUsers.push(currentUserId);
            reactions[reactionType] += 1;
            active = true;
          }

          delete newUserReactions.like;
          delete newUserReactions.love;
          newUserReactions.upvote = upvoteUsers;
          newUserReactions.downvote = downvoteUsers;
        } else {
          const reactionUsers = [...(existingUserReactions[reactionType] || [])];
          const hasReacted = reactionUsers.includes(currentUserId);

          if (hasReacted) {
            reactionUsers.splice(reactionUsers.indexOf(currentUserId), 1);
            reactions[reactionType] = Math.max(0, (reactions[reactionType] || 0) - 1);
          } else {
            reactionUsers.push(currentUserId);
            reactions[reactionType] = (reactions[reactionType] || 0) + 1;
            active = true;
          }

          newUserReactions[reactionType] = reactionUsers;
        }

        const updatedPost: Post = {
          ...post,
          reactions,
          userReactions: newUserReactions,
          ...(reactionType === "repost" ? { repostCount: reactions.repost || 0 } : {}),
        };

        await idb.put("posts", updatedPost);
        await trackEvent("post_reaction", {
          postId,
          reactionType,
          active,
        });
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
    refreshPosts: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  };
}
