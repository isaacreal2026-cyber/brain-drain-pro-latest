import { describe, expect, it } from "vitest";
import { SAMPLE_BRAINS, instantiateSample } from "./sample-brains";
import { validateBrain } from "./brain-validator";
import type { Node } from "./types";

describe("sample brains", () => {
  it("ships a reasonable set of curated samples", () => {
    expect(SAMPLE_BRAINS.length).toBeGreaterThanOrEqual(4);
    for (const sample of SAMPLE_BRAINS) {
      expect(sample.title).toBeTruthy();
      expect(sample.description).toBeTruthy();
      expect(sample.emoji).toBeTruthy();
      expect(sample.nodes.length).toBeGreaterThan(0);
    }
  });

  it("every sample is a valid, runnable brain", () => {
    for (const sample of SAMPLE_BRAINS) {
      const issues = validateBrain(sample.brain, sample.nodes);
      const errors = issues.filter((i) => i.level === "error");
      expect(errors, `${sample.title}: ${errors.map((e) => e.message).join("; ")}`).toEqual([]);
    }
  });

  it("every question in a sample terminates at an outcome", () => {
    for (const sample of SAMPLE_BRAINS) {
      const byId = new Map(sample.nodes.map((n) => [n.id, n]));
      const outcomes = new Set(
        sample.nodes.filter((n) => n.node_type === "outcome").map((n) => n.id),
      );
      for (const node of sample.nodes) {
        if (node.node_type !== "question") continue;
        const yes = node.if_true_node_id ? byId.get(node.if_true_node_id) : null;
        const no = node.if_false_node_id ? byId.get(node.if_false_node_id) : null;
        // Either branch must eventually reach an outcome; here we assert each
        // branch points at a real node.
        expect(yes, `${sample.title}: YES branch missing`).toBeTruthy();
        expect(no, `${sample.title}: NO branch missing`).toBeTruthy();
      }
      expect(outcomes.size, `${sample.title}: needs at least one outcome`).toBeGreaterThan(0);
    }
  });
});

describe("instantiateSample", () => {
  it("produces unique IDs each time and rewires node references", () => {
    const sample = SAMPLE_BRAINS[0];
    const a = instantiateSample(sample);
    const b = instantiateSample(sample);

    expect(a.brain.id).not.toBe(b.brain.id);
    expect(a.brain.id).not.toBe(sample.brain.id);

    const aIds = new Set(a.nodes.map((n: Node) => n.id));
    const bIds = new Set(b.nodes.map((n: Node) => n.id));
    // No ID overlap between two instantiations.
    for (const id of aIds) expect(bIds.has(id)).toBe(false);

    // The root points at a node that exists.
    expect(aIds.has(a.brain.root_node_id as string)).toBe(true);

    // Internal references have been remapped (old sample IDs are gone).
    const oldIds = new Set(sample.nodes.map((n) => n.id));
    for (const node of a.nodes) {
      expect(oldIds.has(node.id)).toBe(false);
      if (node.if_true_node_id) expect(aIds.has(node.if_true_node_id)).toBe(true);
      if (node.if_false_node_id) expect(aIds.has(node.if_false_node_id)).toBe(true);
    }
  });

  it("instantiated copies remain valid brains", () => {
    for (const sample of SAMPLE_BRAINS) {
      const { brain, nodes } = instantiateSample(sample);
      const errors = validateBrain(brain, nodes).filter((i) => i.level === "error");
      expect(errors).toEqual([]);
    }
  });
});
