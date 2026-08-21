import { describe, expect, it } from "vitest";
import type { Node } from "./types";
import { diffNodes, isSameNode, mergeNodeSets, summarizeDiff } from "./branch-merge";

const q = (id: string, text: string, overrides: Partial<Node> = {}): Node => ({
  id,
  brain_id: "brain-1",
  node_type: "question",
  question_text: text,
  if_true_node_id: null,
  if_false_node_id: null,
  ...overrides,
});

const outcome = (id: string, result: string, overrides: Partial<Node> = {}): Node => ({
  id,
  brain_id: "brain-1",
  node_type: "outcome",
  result_text: result,
  next_steps: "",
  ...overrides,
});

// "Best dish" brain: main knows the basic recipe, a peer branches off and
// contributes their own ingredients.
const mainNodes = [
  q("n1", "Do you have fresh tomatoes?", { if_true_node_id: "n2", if_false_node_id: "n3" }),
  outcome("n2", "Cook the classic sauce"),
  outcome("n3", "Use tinned tomatoes instead"),
];

describe("isSameNode", () => {
  it("ignores whitespace-only differences", () => {
    expect(isSameNode(q("n1", "Ready? "), q("n1", "Ready?"))).toBe(true);
  });

  it("detects an edited answer", () => {
    expect(isSameNode(outcome("n2", "Classic sauce"), outcome("n2", "Spicy sauce"))).toBe(false);
  });

  it("detects a rewired branch", () => {
    expect(
      isSameNode(q("n1", "Ready?", { if_true_node_id: "n2" }), q("n1", "Ready?", { if_true_node_id: "n9" })),
    ).toBe(false);
  });
});

describe("diffNodes", () => {
  it("reports a peer's new ingredient as an addition", () => {
    const peer = [...mainNodes, outcome("n4", "Add chili oil for heat")];
    const diff = diffNodes(mainNodes, peer, mainNodes);

    expect(diff.added.map((n) => n.id)).toEqual(["n4"]);
    expect(diff.changed).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it("reports a corrected step as a change", () => {
    const peer = mainNodes.map((n) => (n.id === "n3" ? outcome("n3", "Use passata, never tinned") : n));
    const diff = diffNodes(mainNodes, peer, mainNodes);

    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0].after.result_text).toBe("Use passata, never tinned");
  });

  it("only counts a deletion when the node existed in the shared base", () => {
    const peer = mainNodes.filter((n) => n.id !== "n3");

    expect(diffNodes(mainNodes, peer, mainNodes).removed.map((n) => n.id)).toEqual(["n3"]);
    // Without a base we cannot tell a deletion from "never had it".
    expect(diffNodes(mainNodes, peer).removed).toHaveLength(0);
  });
});

describe("mergeNodeSets", () => {
  it("adopts the peer's additions while keeping main's own work", () => {
    const peer = [...mainNodes, outcome("n4", "Add chili oil for heat")];
    const result = mergeNodeSets(mainNodes, peer, mainNodes);

    expect(result.nodes.map((n) => n.id).sort()).toEqual(["n1", "n2", "n3", "n4"]);
    expect(result.isNoop).toBe(false);
  });

  it("lets the branch win on a node both sides have", () => {
    const peer = mainNodes.map((n) => (n.id === "n2" ? outcome("n2", "Cook the sauce for 40 minutes") : n));
    const result = mergeNodeSets(mainNodes, peer, mainNodes);

    expect(result.nodes.find((n) => n.id === "n2")?.result_text).toBe("Cook the sauce for 40 minutes");
  });

  it("keeps nodes that only main has", () => {
    const mainWithExtra = [...mainNodes, outcome("n5", "Owner's secret garnish")];
    const peer = [...mainNodes, outcome("n4", "Add chili oil for heat")];
    const result = mergeNodeSets(mainWithExtra, peer, mainNodes);

    expect(result.nodes.map((n) => n.id)).toContain("n5");
    expect(result.nodes.map((n) => n.id)).toContain("n4");
  });

  it("applies a deletion the peer made against the shared base", () => {
    const peer = mainNodes.filter((n) => n.id !== "n3");
    const result = mergeNodeSets(mainNodes, peer, mainNodes);

    expect(result.nodes.map((n) => n.id)).toEqual(["n1", "n2"]);
  });

  it("re-points merged nodes at the target brain", () => {
    const peer = [q("n9", "Do you like garlic?", { brain_id: "peer-copy" })];
    const result = mergeNodeSets(mainNodes, peer, mainNodes, "brain-1");

    expect(result.nodes.every((n) => n.brain_id === "brain-1")).toBe(true);
  });

  it("is a no-op when the branch matches its target", () => {
    const result = mergeNodeSets(mainNodes, [...mainNodes], mainNodes);

    expect(result.isNoop).toBe(true);
    expect(result.nodes).toHaveLength(mainNodes.length);
  });

  it("never mutates the inputs", () => {
    const peer = mainNodes.map((n) => (n.id === "n2" ? outcome("n2", "changed") : n));
    const snapshot = JSON.stringify(mainNodes);
    mergeNodeSets(mainNodes, peer, mainNodes);

    expect(JSON.stringify(mainNodes)).toBe(snapshot);
  });
});

describe("summarizeDiff", () => {
  it("describes an empty diff", () => {
    expect(summarizeDiff({ added: [], removed: [], changed: [] })).toMatch(/no differences/i);
  });

  it("counts each kind of change", () => {
    const summary = summarizeDiff({
      added: [outcome("a", "x")],
      removed: [outcome("b", "y")],
      changed: [{ before: outcome("c", "y"), after: outcome("c", "z") }],
    });

    expect(summary).toBe("1 added · 1 edited · 1 removed");
  });
});
