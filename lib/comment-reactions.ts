import type { Comment } from "./types";

export interface CommentReactionResult {
  comment: Comment;
  active: boolean;
}

/**
 * Toggles a reaction on a comment for one user.
 *
 * Kept pure (and out of the React hook) so the rule — one reaction per user,
 * clicking again takes it back — is unit-testable. Before this existed the
 * counter simply incremented on every click and could never go down.
 */
export function toggleCommentReaction(
  comment: Comment,
  reactionType: string,
  currentUserId = "me",
): CommentReactionResult {
  const reactions = { ...(comment.reactions || {}) };
  const userReactions = { ...(comment.userReactions || {}) };
  const reactors = [...(userReactions[reactionType] || [])];

  const existingIndex = reactors.indexOf(currentUserId);
  const alreadyReacted = existingIndex >= 0;

  if (alreadyReacted) {
    reactors.splice(existingIndex, 1);
    reactions[reactionType] = Math.max(0, (reactions[reactionType] || 0) - 1);
  } else {
    reactors.push(currentUserId);
    reactions[reactionType] = Math.max(0, reactions[reactionType] || 0) + 1;
  }

  userReactions[reactionType] = reactors;

  return {
    comment: { ...comment, reactions, userReactions },
    active: !alreadyReacted,
  };
}
