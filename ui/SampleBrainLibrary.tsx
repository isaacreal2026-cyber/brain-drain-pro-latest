import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Plus, Check, Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SAMPLE_BRAINS, instantiateSample, type SampleBrain } from "@/lib/sample-brains";
import type { Brain, Node } from "@/lib/types";

interface SampleBrainLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a sample is added to the library. */
  onSampleAdded: (data: { brain: Brain; nodes: Node[] }) => void | Promise<void>;
  /** If provided, called to immediately run the brain instead of only adding it. */
  onRunBrain?: (brain: Brain) => void;
}

export function SampleBrainLibrary({
  open,
  onOpenChange,
  onSampleAdded,
  onRunBrain,
}: SampleBrainLibraryProps) {
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const filtered = SAMPLE_BRAINS.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  });

  const handleAdd = async (sample: SampleBrain, run = false) => {
    setAddingId(sample.id);
    try {
      const data = instantiateSample(sample);
      await onSampleAdded(data);
      setAddedIds((prev) => new Set(prev).add(sample.id));
      if (run && onRunBrain) {
        onRunBrain(data.brain);
        onOpenChange(false);
      }
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <PlayCircle className="w-5 h-5 text-primary" />
            Try a sample brain
          </DialogTitle>
          <DialogDescription>
            Ready-made decision guides. Tap{" "}
            <span className="font-medium text-foreground">Add</span> to save a copy you can
            edit, or <span className="font-medium text-foreground">Run</span> to try it now.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search samples…"
            className="pl-9"
            aria-label="Search sample brains"
          />
        </div>

        <div className="max-h-[55vh] overflow-y-auto space-y-3 pr-1">
          {filtered.map((sample) => {
            const added = addedIds.has(sample.id);
            const isAdding = addingId === sample.id;
            return (
              <div
                key={sample.id}
                className="flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-card/40 hover:border-primary/40 transition-colors"
              >
                <div className="text-3xl leading-none" aria-hidden>
                  {sample.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{sample.title}</h3>
                    {added && (
                      <Badge variant="secondary" className="gap-1 text-emerald-500">
                        <Check className="w-3 h-3" /> Added
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{sample.description}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">{sample.category}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1"
                    disabled={isAdding}
                    onClick={() => handleAdd(sample, true)}
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    {isAdding ? "…" : "Run"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={isAdding || added}
                    onClick={() => handleAdd(sample, false)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {added ? "Added" : "Add"}
                  </Button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No samples match “{query}”.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
