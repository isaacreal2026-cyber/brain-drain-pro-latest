import { useState, useEffect, useRef } from "react";
import { Brain, Node } from "@/lib/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { idb } from "@/lib/db";
import { Bot, User, RotateCcw, AlertTriangle, CheckCircle2, Send, X, Image as ImageIcon, FileCode2, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface BrainChatRuntimeProps {
  brain: Brain | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BrainChatRuntime({ brain, isOpen, onClose }: BrainChatRuntimeProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [path, setPath] = useState<{ node: Node; decision?: boolean }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (brain && isOpen) {
      idb.getAllByIndex<Node>("nodes", "brain_id", brain.id).then(loadedNodes => {
        setNodes(loadedNodes);
        setCurrentNodeId(brain.root_node_id);
        setPath([]);
      });
    }
  }, [brain, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [path, currentNodeId]);

  const currentNode = nodes.find(n => n.id === currentNodeId);

  const handleDecision = (decision: boolean) => {
    if (!currentNode) return;
    
    setPath(prev => [...prev, { node: currentNode, decision }]);
    
    const nextNodeId = decision ? currentNode.if_true_node_id : currentNode.if_false_node_id;
    if (nextNodeId) {
      setCurrentNodeId(nextNodeId);
    } else {
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
      <DialogContent className="max-w-2xl h-[80vh] sm:h-[85vh] bg-background border-border flex flex-col p-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/50 flex flex-col gap-2 bg-card z-10 sticky top-0 backdrop-blur-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Bot size={20} />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-base font-semibold text-foreground leading-none">{brain.title}</h2>
                <span className="text-[11px] font-medium text-primary">Expert Brain Active</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={handleRestart} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {path.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-1 mt-1 scrollbar-hide">
              {path.map((step, idx) => (
                <div key={idx} className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded bg-muted/50 text-foreground border border-border/50">
                  {step.node.question_text?.substring(0, 20)}... <span className={step.decision ? "text-primary" : "text-destructive"}>{step.decision ? "YES" : "NO"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth bg-muted/20">
          <AnimatePresence initial={false}>
            {/* History */}
            {path.map((step, idx) => (
              <div key={idx} className="space-y-6">
                {/* Expert Question Bubble */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 max-w-[85%]"
                >
                  <Avatar className="h-8 w-8 shrink-0 mt-1">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      <Bot size={16} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm text-sm text-foreground flex flex-col gap-2">
                    <div>{step.node.question_text}</div>
                    {step.node.attachments && step.node.attachments.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2">
                        {step.node.attachments.map((att, i) => <AttachmentPreview key={i} attachment={att} />)}
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* User Answer Bubble */}
                {step.decision !== undefined && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex justify-end w-full"
                  >
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-5 py-2.5 shadow-sm text-sm font-medium">
                      {step.decision ? "Yes" : "No"}
                    </div>
                  </motion.div>
                )}
              </div>
            ))}

            {/* Current Node */}
            {currentNode ? (
              <motion.div
                key={currentNode.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 max-w-[85%]"
              >
                <Avatar className="h-8 w-8 shrink-0 mt-1">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    <Bot size={16} />
                  </AvatarFallback>
                </Avatar>
                
                {currentNode.node_type === "question" ? (
                  <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm text-sm text-foreground flex flex-col gap-2">
                    <div>{currentNode.question_text}</div>
                    {currentNode.attachments && currentNode.attachments.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2">
                        {currentNode.attachments.map((att, i) => <AttachmentPreview key={i} attachment={att} />)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-card border border-primary/20 rounded-2xl rounded-tl-sm p-5 shadow-md w-full flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-primary">Diagnostic Complete</span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{currentNode.result_text}</h3>
                    {currentNode.next_steps && (
                      <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground/80 whitespace-pre-wrap border border-border/50">
                        {currentNode.next_steps}
                      </div>
                    )}
                    {currentNode.attachments && currentNode.attachments.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2">
                        {currentNode.attachments.map((att, i) => <AttachmentPreview key={i} attachment={att} />)}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 max-w-[85%]"
              >
                <Avatar className="h-8 w-8 shrink-0 mt-1">
                  <AvatarFallback className="bg-destructive/10 text-destructive text-xs">
                    <AlertTriangle size={16} />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-destructive/5 border border-destructive/20 text-destructive rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm text-sm">
                  Engine Halted. Incomplete logic path.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-card border-t border-border/50 relative z-10">
          {currentNode?.node_type === "question" ? (
            <div className="flex gap-3">
              <Button 
                onClick={() => handleDecision(true)} 
                className="flex-1 h-12 text-base font-semibold shadow-sm transition-transform active:scale-95"
              >
                Yes
              </Button>
              <Button 
                onClick={() => handleDecision(false)} 
                variant="secondary"
                className="flex-1 h-12 text-base font-semibold shadow-sm transition-transform active:scale-95"
              >
                No
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button onClick={handleRestart} variant="outline" className="flex-1 h-12 text-base font-medium">
                <RotateCcw className="w-4 h-4 mr-2" /> Start Over
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AttachmentPreview({ attachment }: { attachment: any }) {
  if (attachment.type === "image") {
    return (
      <div className="border border-border/50 rounded overflow-hidden max-w-sm">
        <img src={attachment.data} alt={attachment.name} className="w-full h-auto object-contain" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 p-2 border border-border/50 rounded bg-muted/20 text-xs">
      {attachment.type === "pdf" ? <FileText className="w-4 h-4 text-primary" /> : <FileCode2 className="w-4 h-4 text-primary" />}
      <span className="truncate font-medium">{attachment.name}</span>
    </div>
  );
}
