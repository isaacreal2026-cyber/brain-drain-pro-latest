import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Download, X, CheckCircle2 } from "lucide-react";
import { Brain, Node, BrainData } from "@/lib/types";
import { idb } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

interface DecodedShare {
  brain: Brain;
  nodes: Node[];
}

function decodeShareHash(hash: string): DecodedShare | null {
  try {
    if (!hash.startsWith("#share=")) return null;
    const encoded = hash.slice("#share=".length);
    const json = decodeURIComponent(atob(encoded));
    const data = JSON.parse(json) as DecodedShare;
    if (!data.brain?.id || !Array.isArray(data.nodes)) return null;
    return data;
  } catch {
    return null;
  }
}

export function ShareBrainModal() {
  const [decoded, setDecoded] = useState<DecodedShare | null>(null);
  const [imported, setImported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const data = decodeShareHash(window.location.hash);
    if (data) setDecoded(data);
  }, []);

  const handleClose = () => {
    setDecoded(null);
    setImported(false);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  const handleImport = async () => {
    if (!decoded) return;
    const newBrainId = crypto.randomUUID();
    const newBrain: Brain = {
      ...decoded.brain,
      id: newBrainId,
      created_at: Date.now(),
      title: decoded.brain.title.endsWith(" (imported)")
        ? decoded.brain.title
        : decoded.brain.title + " (imported)",
    };
    const newNodes: Node[] = decoded.nodes.map(n => ({
      ...n,
      id: crypto.randomUUID(),
      brain_id: newBrainId,
    }));

    // Remap node references to use new IDs
    const oldToNew = new Map<string, string>();
    decoded.nodes.forEach((oldN, i) => oldToNew.set(oldN.id, newNodes[i].id));
    for (const n of newNodes) {
      if (n.if_true_node_id) n.if_true_node_id = oldToNew.get(n.if_true_node_id) ?? n.if_true_node_id;
      if (n.if_false_node_id) n.if_false_node_id = oldToNew.get(n.if_false_node_id) ?? n.if_false_node_id;
    }

    await idb.put("brains", newBrain);
    for (const node of newNodes) await idb.put("nodes", node);

    setImported(true);
    toast({ title: "Brain Imported!", description: `"${newBrain.title}" has been added to your library.` });
    setTimeout(handleClose, 1800);
  };

  if (!decoded) return null;

  const tags = decoded.brain.category.split(",").map(t => t.trim()).filter(Boolean);
  const qCount = decoded.nodes.filter(n => n.node_type === "question").length;
  const oCount = decoded.nodes.filter(n => n.node_type === "outcome").length;

  return (
    <Dialog open onOpenChange={open => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md bg-card border-border/60 sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <BrainCircuit className="w-5 h-5 text-primary" />
            <span className="text-xs font-mono text-primary uppercase tracking-wider">Shared Brain Received</span>
          </div>
          <DialogTitle className="text-xl font-bold">{decoded.brain.title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed mt-1">
            {decoded.brain.description || "No description provided."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 font-mono text-[10px] uppercase">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-background border border-border/50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold">{decoded.nodes.length}</div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase mt-0.5">Nodes</div>
            </div>
            <div className="bg-background border border-border/50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-primary">{qCount}</div>
              <div className="text-[10px] font-mono text-primary uppercase mt-0.5">Questions</div>
            </div>
            <div className="bg-background border border-border/50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-secondary">{oCount}</div>
              <div className="text-[10px] font-mono text-secondary uppercase mt-0.5">Outcomes</div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleClose} className="gap-2">
            <X className="w-4 h-4" /> Dismiss
          </Button>
          <Button onClick={handleImport} disabled={imported} className="gap-2 flex-1">
            {imported ? (
              <><CheckCircle2 className="w-4 h-4" /> Imported!</>
            ) : (
              <><Download className="w-4 h-4" /> Import to Library</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
