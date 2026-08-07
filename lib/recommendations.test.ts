import { describe, expect, it } from "vitest";
import type { Brain, Notification, Post, Topic } from "./types";
import {
  rankBrainsByLocalSignals,
  rankHomeFeedPosts,
  rankMissionReminders,
  rankNotificationsByRelevance,
} from "./recommendations";
import type { AnalyticsEvent } from "./analytics";

const HOUR = 60 * 60 * 1000;

function event(overrides: Partial<AnalyticsEvent>): AnalyticsEvent {
  return {
    id: "e",
    type: "page_view",
    sessionId: "s",
    createdAt: Date.now(),
    route: "/",
    ...overrides,
  };
}

function topic(overrides: Partial<Topic>): Topic {
  return {
    id: "t1",
    name: "React",
    description: "",
    followerCount: 0,
    ...overrides,
  };
}

function post(overrides: Partial<Post>): Post {
  return {
    id: "p1",
    userId: "u1",
    topicId: "t1",
    content: "hello",
    reactions: {},
    commentCount: 0,
    createdAt: Date.now() - HOUR,
    ...overrides,
  };
}

describe("rankHomeFeedPosts", () => {
  it("falls back to newest-first in trending mode", () => {
    const older = post({ id: "older", createdAt: Date.now() - 2 * HOUR });
    const newer = post({ id: "newer", createdAt: Date.now() });
    const ranked = rankHomeFeedPosts({
      posts: [older, newer],
      topics: [],
      events: [],
      mode: "trending",
      selectedTopicId: null,
    });
    expect(ranked[0].id).toBe("newer");
  });

  it("filters by selected topic", () => {
    const a = post({ id: "a", topicId: "t1" });
    const b = post({ id: "b", topicId: "t2" });
    const ranked = rankHomeFeedPosts({
      posts: [a, b],
      topics: [topic({ id: "t1" }), topic({ id: "t2" })],
      events: [],
      mode: "trending",
      selectedTopicId: "t2",
    });
    expect(ranked).toHaveLength(1);
    expect(ranked[0].id).toBe("b");
  });
});

describe("rankBrainsByLocalSignals", () => {
  it("prioritizes a brain that was recently launched", () => {
    const brains: Brain[] = [
      {
        id: "b1",
        title: "Solar",
        category: "Energy",
        description: "",
        created_at: Date.now() - 10 * HOUR,
        root_node_id: null,
      },
      {
        id: "b2",
        title: "Medical",
        category: "Health",
        description: "",
        created_at: Date.now() - 5 * HOUR,
        root_node_id: null,
      },
    ];
    const events: AnalyticsEvent[] = [
      event({ type: "brain_launch", payload: { brainId: "b1" } }),
    ];
    const ranked = rankBrainsByLocalSignals(brains, events);
    expect(ranked[0].id).toBe("b1");
  });

  it("boosts brains matching search terms", () => {
    const brains: Brain[] = [
      { id: "b1", title: "Cooking Tips", category: "Food", description: "", created_at: Date.now(), root_node_id: null },
      { id: "b2", title: "React Patterns", category: "Code", description: "", created_at: Date.now(), root_node_id: null },
    ];
    const events: AnalyticsEvent[] = [
      event({ type: "search_submitted", payload: { query: "React" } }),
    ];
    const ranked = rankBrainsByLocalSignals(brains, events);
    expect(ranked[0].id).toBe("b2");
  });
});

describe("rankNotificationsByRelevance", () => {
  it("ranks unread mentions above read reactions", () => {
    const reactions: Notification = {
      id: "n1",
      type: "reaction",
      actorName: "A",
      content: "liked your post",
      read: true,
      createdAt: Date.now(),
    };
    const mention: Notification = {
      id: "n2",
      type: "mention",
      actorName: "B",
      content: "mentioned you",
      read: false,
      createdAt: Date.now() - HOUR,
    };
    const ranked = rankNotificationsByRelevance([reactions, mention], []);
    expect(ranked[0].id).toBe("n2");
  });
});

describe("rankMissionReminders", () => {
  it("only returns active missions", () => {
    const missions = [
      { id: "m1", title: "A", description: "", category: "Learning" as const, status: "active" as const, progress: 10, xpReward: 100, createdAt: 0, targetDate: Date.now() + HOUR },
      { id: "m2", title: "B", description: "", category: "Learning" as const, status: "completed" as const, progress: 100, xpReward: 100, createdAt: 0 },
    ];
    const ranked = rankMissionReminders(missions, []);
    expect(ranked.every((m) => m.status === "active")).toBe(true);
    expect(ranked.some((m) => m.id === "m2")).toBe(false);
  });
});
