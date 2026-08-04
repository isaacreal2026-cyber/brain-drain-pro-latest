import { describe, expect, it } from "vitest";
import { Post } from "./types";
import { togglePostReaction } from "./post-votes";

const createPost = (overrides: Partial<Post> = {}): Post => ({
  id: "post-1",
  userId: "user-1",
  topicId: "topic-1",
  content: "A useful post",
  reactions: { upvote: 0, downvote: 0 },
  commentCount: 0,
  createdAt: Date.now(),
  ...overrides,
});

describe("togglePostReaction", () => {
  it("adds and removes an upvote for the current user", () => {
    const first = togglePostReaction(createPost(), "upvote");

    expect(first.active).toBe(true);
    expect(first.post.reactions).toMatchObject({ upvote: 1, downvote: 0 });
    expect(first.post.userReactions?.upvote).toEqual(["me"]);

    const second = togglePostReaction(first.post, "upvote");

    expect(second.active).toBe(false);
    expect(second.post.reactions).toMatchObject({ upvote: 0, downvote: 0 });
    expect(second.post.userReactions?.upvote).toEqual([]);
  });

  it("switches a user's upvote to a downvote", () => {
    const upvoted = togglePostReaction(createPost(), "upvote").post;
    const downvoted = togglePostReaction(upvoted, "downvote");

    expect(downvoted.active).toBe(true);
    expect(downvoted.post.reactions).toMatchObject({ upvote: 0, downvote: 1 });
    expect(downvoted.post.userReactions?.upvote).toEqual([]);
    expect(downvoted.post.userReactions?.downvote).toEqual(["me"]);
  });

  it("maps legacy love and like counts into the vote model", () => {
    const legacyPost = createPost({
      reactions: { love: 4, like: 6 },
      userReactions: { like: ["me"] },
    });
    const result = togglePostReaction(legacyPost, "downvote");

    expect(result.post.reactions).toMatchObject({ upvote: 9, downvote: 1 });
    expect(result.post.reactions.love).toBeUndefined();
    expect(result.post.reactions.like).toBeUndefined();
    expect(result.post.userReactions?.like).toBeUndefined();
    expect(result.post.userReactions?.upvote).toEqual([]);
    expect(result.post.userReactions?.downvote).toEqual(["me"]);
  });

  it("keeps repost behavior independent from voting", () => {
    const result = togglePostReaction(
      createPost({ reactions: { upvote: 3, downvote: 1, repost: 0 } }),
      "repost",
    );

    expect(result.active).toBe(true);
    expect(result.post.reactions).toMatchObject({ upvote: 3, downvote: 1, repost: 1 });
    expect(result.post.repostCount).toBe(1);
  });
});
