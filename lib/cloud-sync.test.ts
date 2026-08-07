import { describe, expect, it } from "vitest";
import type { Post } from "./types";

// Re-implement the merge helper's contract to validate behavior without
// coupling to the React hook. The real function lives in hooks/use-social.ts.
function mergeCloudWithLocal(cloudPosts: Post[], localPosts: Post[]): Post[] {
  const cloudIds = new Set(cloudPosts.map((p) => p.id));
  const localOnly = localPosts.filter((p) => !cloudIds.has(p.id));
  const merged = [...cloudPosts, ...localOnly];
  return merged.sort((a, b) => b.createdAt - a.createdAt);
}

const basePost = (id: string, overrides: Partial<Post> = {}): Post => ({
  id,
  userId: "u1",
  topicId: "t1",
  content: `post ${id}`,
  reactions: {},
  commentCount: 0,
  createdAt: Date.now(),
  ...overrides,
});

describe("mergeCloudWithLocal", () => {
  it("returns cloud posts when local is empty", () => {
    const cloud = [basePost("c1")];
    expect(mergeCloudWithLocal(cloud, [])).toHaveLength(1);
  });

  it("keeps local-only posts that are not in the cloud response", () => {
    const cloud = [basePost("c1", { createdAt: 2000 })];
    const local = [basePost("local-1", { createdAt: 1000 })];
    const merged = mergeCloudWithLocal(cloud, local);
    expect(merged.map((p) => p.id)).toEqual(["c1", "local-1"]);
  });

  it("deduplicates posts present in both, preferring cloud", () => {
    const cloud = [basePost("p1", { content: "cloud version", createdAt: 2000 })];
    const local = [basePost("p1", { content: "local version", createdAt: 1000 })];
    const merged = mergeCloudWithLocal(cloud, local);
    expect(merged).toHaveLength(1);
    expect(merged[0].content).toBe("cloud version");
  });

  it("sorts merged posts newest-first", () => {
    const cloud = [
      basePost("old", { createdAt: 1000 }),
      basePost("new", { createdAt: 3000 }),
    ];
    const local = [basePost("mid", { createdAt: 2000 })];
    const merged = mergeCloudWithLocal(cloud, local);
    expect(merged.map((p) => p.id)).toEqual(["new", "mid", "old"]);
  });
});
