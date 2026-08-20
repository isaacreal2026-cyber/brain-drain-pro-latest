import type { CircleCheckIn } from "./types";

export type CheckinVoteDirection = "up" | "down";

/**
 * Applies an up/down vote to a circle check-in for one user.
 *
 * Same rules as post votes: one vote per user, the two directions are
 * mutually exclusive, and voting the same way again removes the vote. The
 * stored counters are always derived from the voter lists so they cannot
 * drift out of sync.
 */
export function toggleCheckinVote(
  checkin: CircleCheckIn,
  direction: CheckinVoteDirection,
  currentUserId = "me",
): CircleCheckIn {
  const upvotedBy = [...(checkin.upvotedBy || [])];
  const downvotedBy = [...(checkin.downvotedBy || [])];

  const target = direction === "up" ? upvotedBy : downvotedBy;
  const opposite = direction === "up" ? downvotedBy : upvotedBy;

  const existingIndex = target.indexOf(currentUserId);
  if (existingIndex >= 0) {
    target.splice(existingIndex, 1);
  } else {
    target.push(currentUserId);
    const oppositeIndex = opposite.indexOf(currentUserId);
    if (oppositeIndex >= 0) opposite.splice(oppositeIndex, 1);
  }

  return {
    ...checkin,
    upvotedBy,
    downvotedBy,
    upvotes: upvotedBy.length,
    downvotes: downvotedBy.length,
  };
}
