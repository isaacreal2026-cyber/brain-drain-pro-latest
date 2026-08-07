import type { Brain, Node } from "./types";

export type BrainIssueLevel = "error" | "warning";

export interface BrainIssue {
  level: BrainIssueLevel;
  /** Stable id for the affected node, if any. */
  nodeId?: string;
  code:
    | "no-root"
    | "no-questions"
    | "no-outcomes"
    | "missing-question-text"
    | "missing-result-text"
    | "dead-end"
    | "unreachable"
    | "self-reference"
    | "missing-branch";
  message: string;
}

/**
 * Validates a brain's topology so creators catch problems before publishing:
 * missing root, empty questions/outcomes, unanswered text, dead ends (a
 * question that leads nowhere), unreachable nodes, self-loops, and questions
 * with neither YES nor NO branch.
 *
 * Pure and unit-testable. The UI simply renders the returned issues.
 */
export function validateBrain(brain: Brain, nodes: Node[]): BrainIssue[] {
  const issues: BrainIssue[] = [];
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // No root at all.
  if (!brain.root_node_id || !byId.has(brain.root_node_id)) {
    issues.push({
      level: "error",
      code: "no-root",
      message: "This brain has no starting question. Set one as the root.",
    });
  }

  const questions = nodes.filter((n) => n.node_type === "question");
  const outcomes = nodes.filter((n) => n.node_type === "outcome");

  if (questions.length === 0) {
    issues.push({
      level: "error",
      code: "no-questions",
      message: "Add at least one question so people can make a decision.",
    });
  }
  if (outcomes.length === 0) {
    issues.push({
      level: "error",
      code: "no-outcomes",
      message: "Add at least one outcome (a final recommendation).",
    });
  }

  for (const q of questions) {
    if (!q.question_text || !q.question_text.trim()) {
      issues.push({
        level: "error",
        nodeId: q.id,
        code: "missing-question-text",
        message: "A question is missing its text.",
      });
    }

    const hasYes = q.if_true_node_id && byId.has(q.if_true_node_id);
    const hasNo = q.if_false_node_id && byId.has(q.if_false_node_id);

    if (q.if_true_node_id === q.id || q.if_false_node_id === q.id) {
      issues.push({
        level: "error",
        nodeId: q.id,
        code: "self-reference",
        message: "A question points to itself, which creates an infinite loop.",
      });
    }

    if (!hasYes && !hasNo) {
      issues.push({
        level: "error",
        nodeId: q.id,
        code: "missing-branch",
        message: "This question has neither a YES nor a NO answer linked.",
      });
    } else {
      // A branch that points to a node that doesn't exist (deleted).
      if (q.if_true_node_id && !byId.has(q.if_true_node_id)) {
        issues.push({
          level: "warning",
          nodeId: q.id,
          code: "dead-end",
          message: "The YES answer points to a node that no longer exists.",
        });
      }
      if (q.if_false_node_id && !byId.has(q.if_false_node_id)) {
        issues.push({
          level: "warning",
          nodeId: q.id,
          code: "dead-end",
          message: "The NO answer points to a node that no longer exists.",
        });
      }
    }
  }

  for (const o of outcomes) {
    if (!o.result_text || !o.result_text.trim()) {
      issues.push({
        level: "warning",
        nodeId: o.id,
        code: "missing-result-text",
        message: "An outcome has no result text.",
      });
    }
  }

  // Reachability: walk from the root and flag anything not visited.
  if (brain.root_node_id && byId.has(brain.root_node_id)) {
    const visited = new Set<string>();
    const stack = [brain.root_node_id];
    while (stack.length) {
      const id = stack.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const node = byId.get(id);
      if (!node) continue;
      if (node.node_type === "question") {
        if (node.if_true_node_id && byId.has(node.if_true_node_id)) {
          stack.push(node.if_true_node_id);
        }
        if (node.if_false_node_id && byId.has(node.if_false_node_id)) {
          stack.push(node.if_false_node_id);
        }
      }
    }
    for (const n of nodes) {
      if (!visited.has(n.id)) {
        issues.push({
          level: "warning",
          nodeId: n.id,
          code: "unreachable",
          message:
            n.node_type === "question"
              ? "This question can never be reached from the start."
              : "This outcome can never be reached.",
        });
      }
    }
  }

  return issues;
}

export function summarizeIssues(issues: BrainIssue[]): {
  errors: number;
  warnings: number;
  ready: boolean;
} {
  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.filter((i) => i.level === "warning").length;
  return { errors, warnings, ready: errors === 0 };
}
