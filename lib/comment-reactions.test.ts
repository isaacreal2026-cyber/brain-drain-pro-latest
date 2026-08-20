import { describe, expect, it } from "vitest";
import type { Comment } from "./types";
import { toggleCommentReaction } from "./comment-reactions";

const createComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: "comment-1",
  postId: "post-1",
  parentId: null,
  authorName: "Me",
  content: "Useful reply",
  reactions: {},
  createdAt: Date.now(),
  ...overrides,
});

describe("toggleCommentReaction", () => {
  it("adds a reaction for a user that has not reacted", () => {
    const result = toggleCommentReaction(createComment(), "love");

    expect(result.active).toBe(true);
    expect(result.comment.reactions.love).toBe(1);
    expect(result.comment.userReactions?.love).toEqual(["me"]);
  });

  it("removes the reaction when the same user reacts again", () => {
    const first = toggleCommentReaction(createComment(), "love");
    const second = toggleCommentReaction(first.comment, "love");

    expect(second.active).toBe(false);
    expect(second.comment.reactions.love).toBe(0);
    expect(second.comment.userReactions?.love).toEqual([]);
  });

  it("counts each user only once no matter how many clicks", () => {
    let comment = createComment();
    for (let i = 0; i < 5; i++) {
      comment = toggleCommentReaction(comment, "love", "me").comment;
      comment = toggleCommentReaction(comment, "love", "me").comment;
    }
    comment = toggleCommentReaction(comment, "love", "me").comment;

    expect(comment.reactions.love).toBe(1);
    expect(comment.userReactions?.love).toEqual(["me"]);
  });

  it("tracks different users independently", () => {
    const first = toggleCommentReaction(createComment(), "love", "me");
    const second = toggleCommentReaction(first.comment, "love", "ada");

    expect(second.comment.reactions.love).toBe(2);
    expect(second.comment.userReactions?.love).toEqual(["me", "ada"]);

    const third = toggleCommentReaction(second.comment, "love", "me");
    expect(third.comment.reactions.love).toBe(1);
    expect(third.comment.userReactions?.love).toEqual(["ada"]);
  });

  it("never lets a legacy count drop below zero", () => {
    const legacy = createComment({ reactions: { love: 0 } });
    const result = toggleCommentReaction(
      { ...legacy, userReactions: { love: ["me"] } },
      "love",
    );

    expect(result.comment.reactions.love).toBe(0);
  });

  it("does not touch other reaction types", () => {
    const comment = createComment({ reactions: { love: 2, insight: 3 } });
    const result = toggleCommentReaction(comment, "love", "ada");

    expect(result.comment.reactions.insight).toBe(3);
  });
});
