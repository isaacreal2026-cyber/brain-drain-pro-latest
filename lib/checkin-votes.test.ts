import { describe, expect, it } from "vitest";
import type { CircleCheckIn } from "./types";
import { toggleCheckinVote } from "./checkin-votes";

const createCheckin = (overrides: Partial<CircleCheckIn> = {}): CircleCheckIn => ({
  id: "checkin-1",
  circleId: "global",
  userId: "someone",
  message: "Shipped the first brain today",
  moodScore: 4,
  createdAt: Date.now(),
  ...overrides,
});

describe("toggleCheckinVote", () => {
  it("registers an upvote once", () => {
    const voted = toggleCheckinVote(createCheckin(), "up");

    expect(voted.upvotes).toBe(1);
    expect(voted.upvotedBy).toEqual(["me"]);
    expect(voted.downvotes).toBe(0);
  });

  it("removes the vote when the same direction is clicked again", () => {
    const voted = toggleCheckinVote(createCheckin(), "up");
    const undone = toggleCheckinVote(voted, "up");

    expect(undone.upvotes).toBe(0);
    expect(undone.upvotedBy).toEqual([]);
  });

  it("cannot count the same user twice on repeated clicks", () => {
    let checkin = createCheckin();
    for (let i = 0; i < 6; i++) {
      checkin = toggleCheckinVote(checkin, "up");
      checkin = toggleCheckinVote(checkin, "up");
    }
    checkin = toggleCheckinVote(checkin, "up");

    expect(checkin.upvotes).toBe(1);
  });

  it("switches sides instead of counting both", () => {
    const up = toggleCheckinVote(createCheckin(), "up");
    const down = toggleCheckinVote(up, "down");

    expect(down.upvotes).toBe(0);
    expect(down.upvotedBy).toEqual([]);
    expect(down.downvotes).toBe(1);
    expect(down.downvotedBy).toEqual(["me"]);
  });

  it("keeps other voters intact", () => {
    const withAda = toggleCheckinVote(createCheckin(), "up", "ada");
    const withMe = toggleCheckinVote(withAda, "up", "me");

    expect(withMe.upvotes).toBe(2);
    expect(withMe.upvotedBy).toEqual(["ada", "me"]);

    const meRemoved = toggleCheckinVote(withMe, "up", "me");
    expect(meRemoved.upvotes).toBe(1);
    expect(meRemoved.upvotedBy).toEqual(["ada"]);
  });

  it("derives counters from the voter lists, healing stale numbers", () => {
    const stale = createCheckin({ upvotes: 999, downvotes: 42 });
    const voted = toggleCheckinVote(stale, "up");

    expect(voted.upvotes).toBe(1);
    expect(voted.downvotes).toBe(0);
  });
});
