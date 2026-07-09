import { useState, useRef } from "react";
import { Brain, Node, BrainData } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UploadCloud, FileJson, CheckSquare, Square, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { idb } from "@/lib/db";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: BrainData[]) => Promise<void>;
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [parsedData, setParsedData] = useState<{ brains: Brain[]; nodes: Node[] } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.brains && json.nodes) {
          const eIds = new Set<string>();
          for (const b of json.brains) {
            const existing = await idb.get<Brain>("brains", b.id);
            if (existing) {
              eIds.add(b.id);
            }
          }
          setExistingIds(eIds);
          setParsedData(json);
          // By default, don't check already existing brains
          const toSelect = json.brains.map((b: Brain) => b.id).filter((id: string) => !eIds.has(id));
          setSelectedIds(new Set(toSelect));
        } else {
          toast({ title: "Invalid Format", description: "The file doesn't contain valid Brain Builder data.", variant: "destructive" });
        }
      } catch (err) {
        toast({ title: "Parse Error", description: "Failed to read the JSON file.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  const toggleSelectAll = () => {
    if (!parsedData) return;
    if (selectedIds.size === parsedData.brains.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(parsedData.brains.map(b => b.id)));
    }
  };

  const toggleBrain = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleImport = async () => {
    if (!parsedData || selectedIds.size === 0) return;
    setIsImporting(true);
    
    try {
      const selectedBrains = parsedData.brains.filter(b => selectedIds.has(b.id));
      const brainsToImport: BrainData[] = selectedBrains.map(b => ({
        brain: b,
        nodes: parsedData.nodes.filter(n => n.brain_id === b.id)
      }));
      
      await onImport(brainsToImport);
      toast({ title: "Import Successful", description: `Digested ${brainsToImport.length} brains into the system.` });
      setParsedData(null);
      setSelectedIds(new Set());
      onClose();
    } catch (err) {
      toast({ title: "Import Failed", description: "An error occurred writing to the database.", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setParsedData(null);
        setSelectedIds(new Set());
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-xl bg-card border-border/50 text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-primary" />
            Receive Data Package
          </DialogTitle>
          <DialogDescription>
            Import a serialized JSON export to digest new brains into your local system.
          </DialogDescription>
        </DialogHeader>

        {!parsedData ? (
          <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-lg bg-background/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <FileJson className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Select JSON File</h3>
            <p className="text-sm text-muted-foreground">Click to browse your file system</p>
            <input type="file" accept=".json,application/json" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted/20 rounded-md border border-border/50">
              <span className="text-sm font-mono text-muted-foreground">Found {parsedData.brains.length} brains</span>
              <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="h-8 px-2 font-mono text-xs">
                {selectedIds.size === parsedData.brains.length ? (
                  <><Square className="w-4 h-4 mr-2" /> Deselect All</>
                ) : (
                  <><CheckSquare className="w-4 h-4 mr-2" /> Select All</>
                )}
              </Button>
            </div>
            
            <ScrollArea className="h-64 border border-border/50 rounded-md bg-background/50">
              <div className="p-2 space-y-1">
                {parsedData.brains.map((brain) => {
                  const nodeCount = parsedData.nodes.filter(n => n.brain_id === brain.id).length;
                  const isExisting = existingIds.has(brain.id);
                  return (
                    <div key={brain.id} className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => toggleBrain(brain.id)}>
                      <Checkbox checked={selectedIds.has(brain.id)} onCheckedChange={() => toggleBrain(brain.id)} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground leading-none mb-1">{brain.title}</p>
                          {isExisting && (
                            <span className="flex items-center text-xs text-amber-500 font-medium">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Already in library
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground">{nodeCount} nodes • {brain.category}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setParsedData(null)}>Cancel</Button>
              <Button onClick={handleImport} disabled={selectedIds.size === 0 || isImporting}>
                Digest & Sync to Library
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
