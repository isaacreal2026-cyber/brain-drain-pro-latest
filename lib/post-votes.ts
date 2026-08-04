import { getPostDownvoteCount, getPostUpvoteCount, Post } from "./types";

const unique = (values: string[]) => Array.from(new Set(values));

export interface PostReactionResult {
  post: Post;
  active: boolean;
}

/**
 * Applies the local Quora-style vote rules without coupling them to IndexedDB.
 * Upvotes and downvotes are mutually exclusive for a user; clicking the active
 * vote again removes it. Legacy love/like data is folded into upvotes once a
 * post is interacted with.
 */
export function togglePostReaction(
  post: Post,
  reactionType: string,
  currentUserId = "me",
): PostReactionResult {
  const existingUserReactions = post.userReactions || {};
  const upvoteUsers = unique([
    ...(existingUserReactions.upvote || []),
    ...(existingUserReactions.like || []),
    ...(existingUserReactions.love || []),
  ]);
  const downvoteUsers = unique(existingUserReactions.downvote || []);
  const reactions = { ...post.reactions };

  // Convert old reaction keys when a post is touched so future writes use the
  // explicit vote model without changing the displayed count for old posts.
  reactions.upvote = getPostUpvoteCount(post);
  reactions.downvote = getPostDownvoteCount(post);
  delete reactions.love;
  delete reactions.like;

  let active = false;
  const userReactions = { ...existingUserReactions };

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

    delete userReactions.like;
    delete userReactions.love;
    userReactions.upvote = upvoteUsers;
    userReactions.downvote = downvoteUsers;
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

    userReactions[reactionType] = reactionUsers;
  }

  return {
    post: {
      ...post,
      reactions,
      userReactions,
      ...(reactionType === "repost" ? { repostCount: reactions.repost || 0 } : {}),
    },
    active,
  };
}
