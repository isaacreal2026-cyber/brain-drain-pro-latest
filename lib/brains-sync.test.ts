import { describe, expect, it } from "vitest";
import type { Brain } from "./types";

// Mirrors the mergeCloudWithLocal contract in hooks/use-database.ts.
function mergeCloudWithLocal(cloudBrains: Brain[], localBrains: Brain[]): Brain[] {
  const cloudIds = new Set(cloudBrains.map((b) => b.id));
  const localOnly = localBrains.filter((b) => !cloudIds.has(b.id));
  return [...cloudBrains, ...localOnly];
}

const brain = (id: string, overrides: Partial<Brain> = {}): Brain => ({
  id,
  title: `Brain ${id}`,
  category: "",
  description: "",
  root_node_id: null,
  created_at: Date.now(),
  ...overrides,
});

describe("mergeCloudWithLocal (brains)", () => {
  it("keeps local-only (seeded/offline) brains alongside cloud brains", () => {
    const cloud = [brain("c1")];
    const local = [brain("seed-1"), brain("seed-2")];
    const merged = mergeCloudWithLocal(cloud, local);
    expect(merged).toHaveLength(3);
    expect(merged.map((b) => b.id)).toEqual(["c1", "seed-1", "seed-2"]);
  });

  it("lets the cloud brain win on ID collisions", () => {
    const cloud = [brain("b1", { title: "Cloud title", category: "cloud" })];
    const local = [brain("b1", { title: "Local title", category: "local" })];
    const merged = mergeCloudWithLocal(cloud, local);
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe("Cloud title");
  });

  it("returns cloud brains when local is empty", () => {
    expect(mergeCloudWithLocal([brain("c1")], [])).toHaveLength(1);
  });

  it("does not duplicate brains present in both", () => {
    const cloud = [brain("b1"), brain("b2")];
    const local = [brain("b1"), brain("b3")];
    const merged = mergeCloudWithLocal(cloud, local);
    const ids = merged.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["b1", "b2", "b3"]);
  });
});
