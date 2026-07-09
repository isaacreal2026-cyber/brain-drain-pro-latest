import { useState, useEffect } from "react";
import { Brain, Node } from "@/lib/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { idb } from "@/lib/db";
import { Play, RotateCcw, AlertTriangle, CheckCircle2, ChevronRight, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RuntimeEngineProps {
  brain: Brain | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RuntimeEngine({ brain, isOpen, onClose }: RuntimeEngineProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [path, setPath] = useState<{ node: Node; decision?: boolean }[]>([]);

  useEffect(() => {
    if (brain && isOpen) {
      idb.getAllByIndex<Node>("nodes", "brain_id", brain.id).then(loadedNodes => {
        setNodes(loadedNodes);
        setCurrentNodeId(brain.root_node_id);
        setPath([]);
      });
    }
  }, [brain, isOpen]);

  const currentNode = nodes.find(n => n.id === currentNodeId);

  const handleDecision = (decision: boolean) => {
    if (!currentNode) return;
    
    setPath(prev => [...prev, { node: currentNode, decision }]);
    
    const nextNodeId = decision ? currentNode.if_true_node_id : currentNode.if_false_node_id;
    if (nextNodeId) {
      setCurrentNodeId(nextNodeId);
    } else {
      // Reached an end unexpectedly
      setCurrentNodeId(null);
    }
  };

  const handleRestart = () => {
    setCurrentNodeId(brain?.root_node_id || null);
    setPath([]);
  };

  if (!brain) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] bg-background border-border flex flex-col p-0 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-border/50 flex justify-between items-center bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground leading-none">{brain.title}</h2>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Diagnostic Engine Running</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRestart} className="h-8">
            <RotateCcw className="w-4 h-4 mr-2" /> Restart
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Stage */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto relative">
            <AnimatePresence mode="wait">
              {currentNode ? (
                <motion.div
                  key={currentNode.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-2xl text-center space-y-8"
                >
                  {currentNode.node_type === "question" ? (
                    <>
                      <div className="text-4xl font-semibold text-foreground tracking-tight leading-tight">
                        {currentNode.question_text}
                      </div>
                      <div className="flex justify-center gap-6 pt-8">
                        <Button 
                          onClick={() => handleDecision(true)} 
                          className="h-20 px-12 text-2xl font-bold bg-secondary/10 text-secondary hover:bg-secondary hover:text-secondary-foreground border border-secondary/20 transition-all hover:scale-105"
                        >
                          YES
                        </Button>
                        <Button 
                          onClick={() => handleDecision(false)} 
                          className="h-20 px-12 text-2xl font-bold bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 transition-all hover:scale-105"
                        >
                          NO
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-6">
                        <CheckCircle2 className="w-12 h-12 text-primary" />
                      </div>
                      <h3 className="text-3xl font-bold text-primary mb-4">{currentNode.result_text}</h3>
                      <div className="bg-card border border-border/50 p-6 rounded-xl text-left shadow-lg">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Next Steps</h4>
                        <p className="text-lg text-foreground/90 leading-relaxed whitespace-pre-wrap">{currentNode.next_steps}</p>
                      </div>
                      <div className="pt-8">
                        <Button onClick={handleRestart} variant="outline" className="h-12 px-8 text-base">
                          <RotateCcw className="w-5 h-5 mr-2" /> Run New Diagnostic
                        </Button>
                      </div>
                    </>
                  )}
                </motion.div>
              ) : (
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">Engine Halted. Incomplete logic path.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Panel: Path history */}
          <div className="w-64 border-l border-border/50 bg-card/30 flex flex-col">
            <div className="p-3 border-b border-border/50">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Traversal History</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {path.map((step, idx) => (
                <div key={idx} className="relative">
                  <div className="text-xs font-medium text-foreground/80 mb-1">{step.node.question_text}</div>
                  <div className={`text-[10px] font-mono uppercase tracking-wider inline-flex px-1.5 py-0.5 rounded ${step.decision ? "bg-secondary/20 text-secondary" : "bg-destructive/20 text-destructive"}`}>
                    Selected: {step.decision ? "YES" : "NO"}
                  </div>
                  {idx < path.length - 1 && (
                    <div className="absolute -bottom-4 left-4 h-3 w-px bg-border/50" />
                  )}
                </div>
              ))}
              {path.length === 0 && (
                <div className="text-xs text-muted-foreground italic">Awaiting first decision...</div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
