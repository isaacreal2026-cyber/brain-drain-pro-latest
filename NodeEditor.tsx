import { useState } from "react";
import { Node } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GitCommit, Target, ArrowRight, Image as ImageIcon, FileCode2, FileText, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

const NEW_Q = "__new_q__";
const NEW_O = "__new_o__";
const NONE  = "__none__";

interface NodeEditorProps {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  rootNodeId: string | null;
  setRootNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  brainId: string;
}

export function NodeEditor({ nodes, setNodes, rootNodeId, setRootNodeId, brainId }: NodeEditorProps) {
  const { toast } = useToast();
  const [activeNodeId, setActiveNodeId] = useState<string | null>(
    nodes.length > 0 ? nodes[0].id : null
  );

  const activeNode = nodes.find(n => n.id === activeNodeId);

  const makeNewNode = (type: "question" | "outcome"): Node => ({
    id: crypto.randomUUID(),
    brain_id: brainId,
    node_type: type,
    question_text: type === "question" ? "" : undefined,
    if_true_node_id: null,
    if_false_node_id: null,
    result_text: type === "outcome" ? "" : undefined,
    next_steps: type === "outcome" ? "" : undefined,
  });

  const addNode = () => {
    const n = makeNewNode("question");
    setNodes(prev => {
      const updated = [...prev, n];
      if (!rootNodeId) setRootNodeId(n.id);
      return updated;
    });
    setActiveNodeId(n.id);
  };

  const updateNode = (id: string, updates: Partial<Node>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const deleteNode = (id: string) => {
    setNodes(prev => {
      const next = prev.filter(n => n.id !== id).map(n => ({
        ...n,
        if_true_node_id: n.if_true_node_id === id ? null : n.if_true_node_id,
        if_false_node_id: n.if_false_node_id === id ? null : n.if_false_node_id,
      }));
      if (rootNodeId === id) setRootNodeId(next.length > 0 ? next[0].id : null);
      setActiveNodeId(next.length > 0 ? (next.find(n => n.id !== id)?.id ?? null) : null);
      return next;
    });
  };

  /**
   * Handle YES / NO branch changes.
   * Sentinel values: NONE → null, NEW_Q / NEW_O → create & link new node
   */
  const handleBranchChange = (
    prop: "if_true_node_id" | "if_false_node_id",
    val: string
  ) => {
    if (!activeNodeId) return;

    if (val === NONE) {
      updateNode(activeNodeId, { [prop]: null });
      return;
    }

    if (val === NEW_Q || val === NEW_O) {
      const newNode = makeNewNode(val === NEW_Q ? "question" : "outcome");
      setNodes(prev => {
        const updated = prev.map(n =>
          n.id === activeNodeId ? { ...n, [prop]: newNode.id } : n
        );
        return [...updated, newNode];
      });
      setActiveNodeId(newNode.id);
      return;
    }

    updateNode(activeNodeId, { [prop]: val });
  };

  /* Build the option list for a branch dropdown */
  const branchOptions = (excludeId: string) => [
    { value: NONE,  label: "— none —" },
    { value: NEW_Q, label: "+ Link to a New Question" },
    { value: NEW_O, label: "+ Link to a New Outcome" },
    ...nodes
      .filter(n => n.id !== excludeId)
      .map(n => ({
        value: n.id,
        label: `${n.node_type === "question" ? "Q" : "↳"}: ${
          (n.node_type === "question" ? n.question_text : n.result_text) || "Untitled"
        }`.slice(0, 55),
      })),
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "html" | "pdf") => {
    const file = e.target.files?.[0];
    if (!file || !activeNodeId) return;

    if (type === "image" && file.size > 1024 * 1024) return toast({ title: "Validation Error", description: "Image must be < 1MB", variant: "destructive" });
    if (type === "html" && file.size > 100 * 1024) return toast({ title: "Validation Error", description: "HTML must be < 100KB", variant: "destructive" });
    if (type === "pdf" && file.size > 100 * 1024) return toast({ title: "Validation Error", description: "PDF must be < 100KB", variant: "destructive" });

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      const newAtt = { type, name: file.name, data, size: file.size };
      const activeNode = nodes.find(n => n.id === activeNodeId);
      if (activeNode) {
        const updatedAttachments = [...(activeNode.attachments || []), newAtt];
        updateNode(activeNodeId, { attachments: updatedAttachments });
      }
    };
    if (type === "html") reader.readAsText(file);
    else reader.readAsDataURL(file);
    
    // Reset input
    e.target.value = '';
  };

  const removeAttachment = (idx: number) => {
    if (!activeNodeId) return;
    const activeNode = nodes.find(n => n.id === activeNodeId);
    if (activeNode && activeNode.attachments) {
      const updatedAttachments = [...activeNode.attachments];
      updatedAttachments.splice(idx, 1);
      updateNode(activeNodeId, { attachments: updatedAttachments });
    }
  };

  return (
    <div className="flex h-[520px] border border-border/50 rounded-lg overflow-hidden bg-background">

      {/* ── Left: Node List ── */}
      <div className="w-[220px] shrink-0 border-r border-border/50 flex flex-col bg-card/50">
        <div className="p-3 border-b border-border/50 flex justify-between items-center bg-card">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Nodes ({nodes.length})
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={addNode}
            className="h-7 px-2"
            data-testid="button-add-node"
            title="Add Logic Node"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {nodes.map((node, idx) => (
              <button
                key={node.id}
                onClick={() => setActiveNodeId(node.id)}
                data-testid={`node-item-${node.id}`}
                className={`w-full text-left p-2 rounded-md flex items-start gap-2 text-sm transition-colors ${
                  activeNodeId === node.id
                    ? "bg-primary/20 text-primary font-medium"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span className="mt-0.5 shrink-0 font-bold text-xs">
                  {node.node_type === "question" ? "Q" : "↳"}&nbsp;{idx + 1}
                </span>
                <span className="truncate leading-snug">
                  {node.node_type === "question"
                    ? (node.question_text || "Untitled question")
                    : (node.result_text || "Untitled outcome")}
                </span>
                {rootNodeId === node.id && (
                  <span className="ml-auto shrink-0 text-[9px] uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                    Root
                  </span>
                )}
              </button>
            ))}
            {nodes.length === 0 && (
              <p className="text-center p-4 text-xs text-muted-foreground">
                No nodes yet. Click&nbsp;+ to add one.
              </p>
            )}
          </div>
        </ScrollArea>

        <p className="p-2 text-[11px] text-muted-foreground border-t border-border/50 leading-snug">
          Self-referencing binary tree. First node becomes the root.
        </p>
      </div>

      {/* ── Right: Editor ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeNode ? (
          <>
            {/* Header row: node type selector + delete */}
            <div className="p-3 border-b border-border/50 flex justify-between items-center gap-2 bg-card/30 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Node</span>
                <Select
                  value={activeNode.node_type}
                  onValueChange={(val: "question" | "outcome") =>
                    updateNode(activeNode.id, { node_type: val })
                  }
                >
                  <SelectTrigger className="w-[150px] h-8 text-xs font-mono" data-testid="select-node-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="question">question</SelectItem>
                    <SelectItem value="outcome">outcome</SelectItem>
                  </SelectContent>
                </Select>

                {rootNodeId !== activeNode.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRootNodeId(activeNode.id)}
                    className="h-8 text-xs font-mono"
                    data-testid="button-set-root"
                  >
                    Set as Root
                  </Button>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteNode(activeNode.id)}
                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                data-testid="button-delete-node"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-5 space-y-5">

                {/* ── QUESTION node ── */}
                {activeNode.node_type === "question" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        Question Text
                      </Label>
                      <Input
                        value={activeNode.question_text || ""}
                        onChange={e => updateNode(activeNode.id, { question_text: e.target.value })}
                        placeholder="e.g., Is the roof angle greater than 30 degrees?"
                        data-testid="input-question-text"
                      />
                    </div>

                    {/* YES branch */}
                    <BranchCard
                      label="YES →"
                      prop="if_true_node_id"
                      currentValue={activeNode.if_true_node_id ?? NONE}
                      options={branchOptions(activeNode.id)}
                      onChange={val => handleBranchChange("if_true_node_id", val)}
                      onGo={() => activeNode.if_true_node_id && setActiveNodeId(activeNode.if_true_node_id)}
                      canGo={!!activeNode.if_true_node_id}
                      accent="yes"
                    />

                    {/* NO branch */}
                    <BranchCard
                      label="NO →"
                      prop="if_false_node_id"
                      currentValue={activeNode.if_false_node_id ?? NONE}
                      options={branchOptions(activeNode.id)}
                      onChange={val => handleBranchChange("if_false_node_id", val)}
                      onGo={() => activeNode.if_false_node_id && setActiveNodeId(activeNode.if_false_node_id)}
                      canGo={!!activeNode.if_false_node_id}
                      accent="no"
                    />
                  </>
                )}

                {/* ── OUTCOME node ── */}
                {activeNode.node_type === "outcome" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        Result Text
                      </Label>
                      <Input
                        value={activeNode.result_text || ""}
                        onChange={e => updateNode(activeNode.id, { result_text: e.target.value })}
                        placeholder="e.g., Recommendation: Use Fixed Tilt Brackets"
                        data-testid="input-result-text"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        Next Steps
                      </Label>
                      <Textarea
                        value={activeNode.next_steps || ""}
                        onChange={e => updateNode(activeNode.id, { next_steps: e.target.value })}
                        placeholder="Detailed action plan for the user"
                        className="min-h-[160px]"
                        data-testid="textarea-next-steps"
                      />
                    </div>
                  </>
                )}

                {/* ── Attachments ── */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Node Attachments (optional)
                  </Label>
                  <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer">
                      <div className="h-8 border border-border/50 rounded flex items-center justify-center bg-card hover:bg-muted transition-colors text-xs font-medium text-foreground gap-2">
                        <ImageIcon className="w-3 h-3 text-muted-foreground" /> Image
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "image")} />
                    </label>
                    <label className="flex-1 cursor-pointer">
                      <div className="h-8 border border-border/50 rounded flex items-center justify-center bg-card hover:bg-muted transition-colors text-xs font-medium text-foreground gap-2">
                        <FileCode2 className="w-3 h-3 text-muted-foreground" /> HTML
                      </div>
                      <input type="file" accept="text/html,.html" className="hidden" onChange={e => handleFileUpload(e, "html")} />
                    </label>
                    <label className="flex-1 cursor-pointer">
                      <div className="h-8 border border-border/50 rounded flex items-center justify-center bg-card hover:bg-muted transition-colors text-xs font-medium text-foreground gap-2">
                        <FileText className="w-3 h-3 text-muted-foreground" /> PDF
                      </div>
                      <input type="file" accept="application/pdf" className="hidden" onChange={e => handleFileUpload(e, "pdf")} />
                    </label>
                  </div>
                  
                  {activeNode.attachments && activeNode.attachments.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {activeNode.attachments.map((att, idx) => (
                        <div key={idx} className="relative border border-border/50 bg-card rounded p-2 flex items-center gap-2 group">
                          {att.type === "image" && (
                            <div className="w-8 h-8 shrink-0 bg-muted rounded overflow-hidden">
                              <img src={att.data} alt={att.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          {(att.type === "html" || att.type === "pdf") && (
                            <div className="w-8 h-8 shrink-0 bg-muted rounded flex items-center justify-center">
                              {att.type === "html" ? <FileCode2 className="w-4 h-4 text-muted-foreground" /> : <FileText className="w-4 h-4 text-muted-foreground" />}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate" title={att.name}>{att.name}</p>
                            <p className="text-[10px] text-muted-foreground">{(att.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button
                            onClick={() => removeAttachment(idx)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Select a node to edit. First node will become root.
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Branch Card sub-component ── */
interface BranchCardProps {
  label: string;
  prop: string;
  currentValue: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  onGo: () => void;
  canGo: boolean;
  accent: "yes" | "no";
}

function BranchCard({ label, currentValue, options, onChange, onGo, canGo, accent }: BranchCardProps) {
  const accentClass = accent === "yes"
    ? "border-emerald-500/30 bg-emerald-500/5"
    : "border-red-500/30 bg-red-500/5";
  const labelClass = accent === "yes" ? "text-emerald-400" : "text-red-400";
  const pillClass  = accent === "yes"
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    : "bg-red-500/10 text-red-400 border-red-500/30";

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${accentClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${pillClass}`}>
            {accent === "yes" ? "if_true" : "if_false"}
          </span>
          <span className={`text-sm font-bold ${labelClass}`}>{label}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onGo}
          disabled={!canGo}
          className="h-7 px-2 text-xs font-mono"
          data-testid={`button-go-${accent}`}
          title="Jump to linked node"
        >
          Go <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>

      <Select value={currentValue} onValueChange={onChange}>
        <SelectTrigger data-testid={`select-branch-${accent}`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
