import type { Brain, Node } from "./types";

/**
 * Curated, fully-runnable sample brains shown on first launch and from the
 * "Try a sample" action. Each sample is a complete decision tree so a new
 * user experiences the core "run a brain" loop in under 10 seconds.
 *
 * IDs are stable so we can de-duplicate when a user adds a sample more than
 * once (each import generates fresh IDs anyway).
 */
export interface SampleBrain {
  id: string;
  title: string;
  category: string;
  description: string;
  emoji: string;
  brain: Brain;
  nodes: Node[];
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function makeSample(
  key: string,
  title: string,
  category: string,
  description: string,
  emoji: string,
  build: (ids: Record<string, string>) => { brain: Omit<Brain, "id" | "created_at">; nodes: Node[] },
): SampleBrain {
  const ids: Record<string, string> = {};
  // Pre-generate stable keys the builder references.
  ["q1", "q2", "q3", "o1", "o2", "o3", "o4"].forEach((k) => (ids[k] = id(key)));
  const { brain, nodes } = build(ids);
  return {
    id: `sample-${key}`,
    title,
    category,
    description,
    emoji,
    brain: { ...brain, id: id(key), created_at: Date.now() } as Brain,
    nodes,
  };
}

export const SAMPLE_BRAINS: SampleBrain[] = [
  makeSample(
    "laptop",
    "Which laptop should I buy?",
    "Shopping, Decisions",
    "A quick guide to choosing between a MacBook, a Windows ultrabook, or a gaming laptop based on budget and needs.",
    "💻",
    (ids) => ({
      brain: {
        title: "Which laptop should I buy?",
        category: "Shopping, Decisions",
        description: "Pick a laptop based on your budget and what you'll use it for.",
        root_node_id: ids.q1,
      },
      nodes: [
        { id: ids.q1, brain_id: "", node_type: "question", question_text: "Is your budget under $800?", if_true_node_id: ids.o1, if_false_node_id: ids.q2 },
        { id: ids.q2, brain_id: "", node_type: "question", question_text: "Do you mainly need it for gaming or heavy creative work?", if_true_node_id: ids.o2, if_false_node_id: ids.q3 },
        { id: ids.q3, brain_id: "", node_type: "question", question_text: "Do you prefer macOS over Windows?", if_true_node_id: ids.o3, if_false_node_id: ids.o4 },
        { id: ids.o1, brain_id: "", node_type: "outcome", result_text: "Get a budget Windows laptop", next_steps: "Look for 16GB RAM and a recent Intel i5/Ryzen 5. A 256GB SSD is the sweet spot under $800." },
        { id: ids.o2, brain_id: "", node_type: "outcome", result_text: "Get a gaming or workstation laptop", next_steps: "Prioritize a dedicated GPU (RTX 4060+), 16GB+ RAM, and good cooling. Weight and battery will be a trade-off." },
        { id: ids.o3, brain_id: "", node_type: "outcome", result_text: "Get a MacBook Air (M3/M4)", next_steps: "Great battery, silent, and light. The base model handles everyday work, coding, and light creative tasks." },
        { id: ids.o4, brain_id: "", node_type: "outcome", result_text: "Get a premium Windows ultrabook", next_steps: "Look at a Dell XPS, Lenovo Yoga, or Surface Laptop — 16GB RAM, 512GB SSD, and a 120Hz screen." },
      ],
    }),
  ),

  makeSample(
    "umbrella",
    "Should I bring an umbrella?",
    "Everyday, Weather",
    "A 30-second check based on the forecast and how long you'll be outside.",
    "☂️",
    (ids) => ({
      brain: {
        title: "Should I bring an umbrella?",
        category: "Everyday, Weather",
        description: "Decide in under 30 seconds.",
        root_node_id: ids.q1,
      },
      nodes: [
        { id: ids.q1, brain_id: "", node_type: "question", question_text: "Is rain in today's forecast?", if_true_node_id: ids.q2, if_false_node_id: ids.o1 },
        { id: ids.q2, brain_id: "", node_type: "question", question_text: "Will you be outside for more than 20 minutes?", if_true_node_id: ids.o2, if_false_node_id: ids.o1 },
        { id: ids.o1, brain_id: "", node_type: "outcome", result_text: "Skip the umbrella", next_steps: "You can leave it at home. Maybe grab a jacket just in case." },
        { id: ids.o2, brain_id: "", node_type: "outcome", result_text: "Bring the umbrella", next_steps: "A compact travel umbrella is enough. Wear shoes you don't mind getting wet." },
      ],
    }),
  ),

  makeSample(
    "wifi",
    "Why is my Wi-Fi slow?",
    "Tech, Troubleshooting",
    "A simple troubleshooting flow for slow or dropping home internet.",
    "📶",
    (ids) => ({
      brain: {
        title: "Why is my Wi-Fi slow?",
        category: "Tech, Troubleshooting",
        description: "Walk through the common causes before calling support.",
        root_node_id: ids.q1,
      },
      nodes: [
        { id: ids.q1, brain_id: "", node_type: "question", question_text: "Does restarting the router fix it?", if_true_node_id: ids.o1, if_false_node_id: ids.q2 },
        { id: ids.q2, brain_id: "", node_type: "question", question_text: "Are you far from the router or behind walls?", if_true_node_id: ids.o2, if_false_node_id: ids.q3 },
        { id: ids.q3, brain_id: "", node_type: "question", question_text: "Do other devices also run slowly?", if_true_node_id: ids.o3, if_false_node_id: ids.o4 },
        { id: ids.o1, brain_id: "", node_type: "outcome", result_text: "It was a temporary glitch", next_steps: "Routers slow down over days of uptime. Restart weekly. If it recurs, check for firmware updates." },
        { id: ids.o2, brain_id: "", node_type: "outcome", result_text: "It's a range/signal issue", next_steps: "Move closer, reduce obstacles, or add a mesh node/extender. 5GHz is faster but shorter range than 2.4GHz." },
        { id: ids.o3, brain_id: "", node_type: "outcome", result_text: "Likely an internet service problem", next_steps: "Run a speed test on ethernet. If it's slow too, contact your ISP or check for an outage." },
        { id: ids.o4, brain_id: "", node_type: "outcome", result_text: "It's your device", next_steps: "Toggle Wi-Fi off/on, forget and rejoin the network, or update your device's network drivers." },
      ],
    }),
  ),

  makeSample(
    "movie",
    "What movie should we watch?",
    "Entertainment",
    "Settle movie night in under a minute by mood and group.",
    "🎬",
    (ids) => ({
      brain: {
        title: "What movie should we watch?",
        category: "Entertainment",
        description: "Pick a movie by mood and who's watching.",
        root_node_id: ids.q1,
      },
      nodes: [
        { id: ids.q1, brain_id: "", node_type: "question", question_text: "Are kids watching too?", if_true_node_id: ids.o1, if_false_node_id: ids.q2 },
        { id: ids.q2, brain_id: "", node_type: "question", question_text: "Do you want something light and fun?", if_true_node_id: ids.o2, if_false_node_id: ids.o3 },
        { id: ids.o1, brain_id: "", node_type: "outcome", result_text: "Pick a family-friendly adventure or animation", next_steps: "Try a Pixar film, a Studio Ghibli classic, or a recent animated comedy everyone can enjoy." },
        { id: ids.o2, brain_id: "", node_type: "outcome", result_text: "Go for a feel-good comedy or rom-com", next_steps: "Something light with a happy ending — great for relaxing after a long day." },
        { id: ids.o3, brain_id: "", node_type: "outcome", result_text: "Try a thriller, sci-fi, or drama", next_steps: "Pick something with a strong plot. Keep a snack handy — you won't want to pause." },
      ],
    }),
  ),

  makeSample(
    "focus",
    "Why can't I focus?",
    "Productivity, Health",
    "A short check-in to find what's derailing your concentration.",
    "🧠",
    (ids) => ({
      brain: {
        title: "Why can't I focus?",
        category: "Productivity, Health",
        description: "Diagnose common focus blockers in a minute.",
        root_node_id: ids.q1,
      },
      nodes: [
        { id: ids.q1, brain_id: "", node_type: "question", question_text: "Did you sleep less than 6 hours last night?", if_true_node_id: ids.o1, if_false_node_id: ids.q2 },
        { id: ids.q2, brain_id: "", node_type: "question", question_text: "Is your phone sending notifications?", if_true_node_id: ids.o2, if_false_node_id: ids.q3 },
        { id: ids.q3, brain_id: "", node_type: "question", question_text: "Are you hungry, thirsty, or due for a break?", if_true_node_id: ids.o3, if_false_node_id: ids.o4 },
        { id: ids.o1, brain_id: "", node_type: "outcome", result_text: "Sleep is the blocker", next_steps: "Keep today light, avoid caffeine after 2pm, and protect tonight's sleep. Even 20 minutes more helps focus tomorrow." },
        { id: ids.o2, brain_id: "", node_type: "outcome", result_text: "Distractions are the blocker", next_steps: "Put your phone in another room, turn on Do Not Disturb, and try 25 minutes of focused work." },
        { id: ids.o3, brain_id: "", node_type: "outcome", result_text: "Your body needs a reset", next_steps: "Drink water, eat something light, and take a 5–10 minute walk before returning to work." },
        { id: ids.o4, brain_id: "", node_type: "outcome", result_text: "The task itself is the issue", next_steps: "Break it into the smallest possible next step. Start with just 5 minutes — often the resistance is to starting, not doing." },
      ],
    }),
  ),
];

/**
 * Converts a sample into a fresh BrainData copy with unique IDs so adding
 * the same sample twice creates two independent brains.
 */
export function instantiateSample(sample: SampleBrain): { brain: Brain; nodes: Node[] } {
  const brainId = crypto.randomUUID();
  const idMap = new Map<string, string>();
  for (const node of sample.nodes) {
    idMap.set(node.id, crypto.randomUUID());
  }

  const nodes: Node[] = sample.nodes.map((node) => ({
    ...node,
    id: idMap.get(node.id)!,
    brain_id: brainId,
    if_true_node_id: node.if_true_node_id ? idMap.get(node.if_true_node_id)! : null,
    if_false_node_id: node.if_false_node_id ? idMap.get(node.if_false_node_id)! : null,
  }));

  const brain: Brain = {
    ...sample.brain,
    id: brainId,
    title: sample.title,
    category: sample.category,
    description: sample.description,
    root_node_id: idMap.get(sample.brain.root_node_id!)!,
    created_at: Date.now(),
  };

  return { brain, nodes };
}
