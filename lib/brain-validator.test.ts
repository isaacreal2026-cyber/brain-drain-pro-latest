import { describe, expect, it } from "vitest";
import type { Brain, Node } from "./types";
import { summarizeIssues, validateBrain } from "./brain-validator";

const brain = (overrides: Partial<Brain> = {}): Brain => ({
  id: "b1",
  title: "Test",
  category: "",
  description: "",
  root_node_id: "q1",
  created_at: Date.now(),
  ...overrides,
});

const question = (id: string, overrides: Partial<Node> = {}): Node => ({
  id,
  brain_id: "b1",
  node_type: "question",
  question_text: `Question ${id}`,
  if_true_node_id: null,
  if_false_node_id: null,
  ...overrides,
});

const outcome = (id: string, overrides: Partial<Node> = {}): Node => ({
  id,
  brain_id: "b1",
  node_type: "outcome",
  result_text: `Outcome ${id}`,
  next_steps: "",
  ...overrides,
});

describe("validateBrain", () => {
  it("accepts a complete, well-formed brain", () => {
    const nodes: Node[] = [
      question("q1", { if_true_node_id: "o1", if_false_node_id: "o2" }),
      outcome("o1"),
      outcome("o2"),
    ];
    const issues = validateBrain(brain(), nodes);
    expect(issues).toHaveLength(0);
  });

  it("flags a missing root", () => {
    const issues = validateBrain(brain({ root_node_id: null }), [outcome("o1")]);
    expect(issues.some((i) => i.code === "no-root")).toBe(true);
  });

  it("flags a brain with no questions or outcomes", () => {
    const issues = validateBrain(brain({ root_node_id: null }), []);
    expect(issues.some((i) => i.code === "no-questions")).toBe(true);
    expect(issues.some((i) => i.code === "no-outcomes")).toBe(true);
  });

  it("flags a question with no branches", () => {
    const nodes: Node[] = [question("q1"), outcome("o1")];
    const issues = validateBrain(brain(), nodes);
    expect(issues.some((i) => i.code === "missing-branch")).toBe(true);
  });

  it("flags a self-referencing question (infinite loop)", () => {
    const nodes: Node[] = [
      question("q1", { if_true_node_id: "q1", if_false_node_id: "o1" }),
      outcome("o1"),
    ];
    const issues = validateBrain(brain(), nodes);
    expect(issues.some((i) => i.code === "self-reference")).toBe(true);
  });

  it("flags a dead-end branch pointing to a missing node", () => {
    const nodes: Node[] = [
      question("q1", { if_true_node_id: "ghost", if_false_node_id: "o1" }),
      outcome("o1"),
    ];
    const issues = validateBrain(brain(), nodes);
    expect(issues.some((i) => i.code === "dead-end")).toBe(true);
  });

  it("flags unreachable nodes", () => {
    const nodes: Node[] = [
      question("q1", { if_true_node_id: "o1", if_false_node_id: "o1" }),
      outcome("o1"),
      question("q2", { if_true_node_id: "o2", if_false_node_id: "o2" }),
      outcome("o2"),
    ];
    const issues = validateBrain(brain(), nodes);
    const unreachable = issues.filter((i) => i.code === "unreachable");
    expect(unreachable.some((i) => i.nodeId === "q2")).toBe(true);
    expect(unreachable.some((i) => i.nodeId === "o2")).toBe(true);
  });

  it("summarizes errors vs warnings and readiness", () => {
    const issues = validateBrain(brain({ root_node_id: null }), [outcome("o1", { result_text: "" })]);
    const summary = summarizeIssues(issues);
    expect(summary.errors).toBeGreaterThan(0);
    expect(summary.ready).toBe(false);
    expect(summary.warnings).toBeGreaterThanOrEqual(0);
  });
});
