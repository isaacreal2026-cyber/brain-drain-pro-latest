import { useState, useRef, useEffect } from "react";
import { Brain, Node, BrainData } from "@/lib/types";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NodeEditor } from "./NodeEditor";
import { BrainCircuit, Tags, GitMerge, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BrainData) => Promise<void>;
}

export function WizardModal({ isOpen, onClose, onSave }: WizardModalProps) {
  const [step, setStep] = useState(1);
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [traits, setTraits] = useState<string[]>([]);
  const [traitInput, setTraitInput] = useState("");
  const traitInputRef = useRef<HTMLInputElement>(null);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [rootNodeId, setRootNodeId] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const isDirty = title.trim() !== "" || category.trim() !== "" || description.trim() !== "" || traits.length > 0 || nodes.length > 0;

  useEffect(() => {
    if (isOpen && isDirty) {
      (window as any).__isAppDirty = true;
    } else {
      (window as any).__isAppDirty = false;
    }
    return () => {
      (window as any).__isAppDirty = false;
    };
  }, [isOpen, isDirty]);

  const resetState = () => {
    setStep(1);
    setTitle("");
    setCategory("");
    setDescription("");
    setTraits([]);
    setTraitInput("");
    setNodes([]);
    setRootNodeId(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const attemptClose = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      handleClose();
    }
  };

  const handleNext = () => {
    if (step === 1 && !title.trim()) {
      toast({ title: "Validation Error", description: "System Domain Title is required.", variant: "destructive" });
      return;
    }
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const addTrait = () => {
    const v = traitInput.trim();
    if (!v) return;
    setTraits(prev => [...prev, v]);
    setTraitInput("");
    traitInputRef.current?.focus();
  };

  const removeTrait = (index: number) => {
    setTraits(prev => prev.filter((_, i) => i !== index));
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Validation Error", description: "Brain title is required.", variant: "destructive" });
      setStep(1);
      return;
    }
    if (nodes.length === 0) {
      toast({ title: "Validation Error", description: "Add at least one node.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    
    const brainId = crypto.randomUUID();
    const effectiveRoot = rootNodeId ?? nodes[0].id;
    const finalNodes = nodes.map(n => ({ ...n, brain_id: brainId }));

    const brain: Brain = {
      id: brainId,
      title: title.trim(),
      category,
      description,
      created_at: Date.now(),
      root_node_id: effectiveRoot
    };

    try {
      await onSave({ brain, nodes: finalNodes });
      toast({ title: "Brain Saved", description: "Successfully encoded into system memory." });
      handleClose();
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message || "Could not save to IndexedDB.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const steps = [
    { num: 1, label: "Domain Definition", icon: BrainCircuit },
    { num: 2, label: "Trait Library", icon: Tags },
    { num: 3, label: "Logic Couplet Mapping", icon: GitMerge }
  ];

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && attemptClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-card border-border/50 flex flex-col p-0 overflow-hidden gap-0">

        {/* Step tabs */}
        <div className="flex border-b border-border/50 shrink-0">
          {steps.map(s => {
            const Icon = s.icon;
            const active = step === s.num;
            const past = step > s.num;
            return (
              <button
                key={s.num}
                onClick={() => past && setStep(s.num)}
                className={`flex-1 flex items-center justify-center p-4 gap-2 text-sm font-mono tracking-wide transition-colors
                  ${active
                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                    : past
                      ? "text-foreground cursor-pointer hover:bg-muted/50"
                      : "text-muted-foreground cursor-default"}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">Step {s.num}: {s.label}</span>
                <span className="sm:hidden">{s.num}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Step 1: Domain Definition ── */}
          {step === 1 && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase text-muted-foreground tracking-wider">
                    System Domain Title
                  </Label>
                  <Input
                    data-testid="input-brain-title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g., Solar Panel Installation Expert"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase text-muted-foreground tracking-wider">
                    Categorization Tags (comma separated)
                  </Label>
                  <Input
                    data-testid="input-brain-category"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="Renewable Energy, China Solars, Large Scale"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase text-muted-foreground tracking-wider">
                  System Target Scope & Parameters
                </Label>
                <Textarea
                  data-testid="textarea-brain-description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Short summary of what this brain diagnoses and its constraints."
                  className="min-h-[120px]"
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Trait Library ── */}
          {step === 2 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="space-y-1">
                <Label className="text-xs font-mono uppercase text-muted-foreground tracking-wider">
                  Trait Library — dump all variables before building logic
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Optional. Helps you remember variables while linking questions.
                </p>
              </div>

              {/* Tag chip display */}
              <div className="min-h-[56px] flex flex-wrap gap-2 p-3 bg-muted/20 border border-border/50 rounded-lg">
                {traits.length === 0 && (
                  <span className="text-xs text-muted-foreground italic self-center">
                    No traits added yet — type one below and click Add.
                  </span>
                )}
                {traits.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-primary/10 border border-primary/20 text-primary"
                    data-testid={`tag-trait-${i}`}
                  >
                    {t}
                    <button
                      onClick={() => removeTrait(i)}
                      className="hover:text-destructive transition-colors"
                      aria-label={`Remove trait ${t}`}
                      data-testid={`button-remove-trait-${i}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add trait input row */}
              <div className="flex gap-2">
                <Input
                  ref={traitInputRef}
                  data-testid="input-trait"
                  value={traitInput}
                  onChange={e => setTraitInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTrait(); } }}
                  placeholder="Add trait (e.g., roof_angle, wind_load, symptom_fever)"
                  className="flex-1"
                />
                <Button
                  data-testid="button-add-trait"
                  onClick={addTrait}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Logic Couplet Mapping ── */}
          {step === 3 && (
            <NodeEditor
              nodes={nodes}
              setNodes={setNodes}
              rootNodeId={rootNodeId}
              setRootNodeId={setRootNodeId}
              brainId="temp"
            />
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border/50 flex justify-between sm:justify-between items-center bg-card/50 shrink-0">
          <Button variant="ghost" onClick={attemptClose} className="text-muted-foreground">
            Cancel
          </Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} data-testid="button-wizard-back">
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={handleNext} data-testid="button-wizard-next">
                Next Step
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-primary text-primary-foreground shadow-primary/20 shadow-lg"
                data-testid="button-wizard-save"
              >
                {isSaving ? "⏳ Saving..." : "Digest & Sync Brain to Post"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Close Confirmation Modal */}
    <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard Unsaved Changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved edits in this brain creation wizard. Closing now will permanently discard all your configured traits and logic nodes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowCloseConfirm(false)}>Keep Editing</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            setShowCloseConfirm(false);
            handleClose();
          }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Discard Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
