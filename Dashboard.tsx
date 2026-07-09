import { useState } from "react";
import { Brain } from "@/lib/types";
import { useDatabase } from "@/hooks/use-database";
import { useReputation } from "@/hooks/use-reputation";
import { useToast } from "@/hooks/use-toast";
import { BrainCard } from "./BrainCard";
import { BrainDrawer } from "./BrainDrawer";
import { WizardModal } from "./WizardModal";
import { ImportModal } from "./ImportModal";
import { RuntimeEngine } from "./RuntimeEngine";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Network, Share, Download } from "lucide-react";
import { idb } from "@/lib/db";

export function Dashboard() {
  const { brains, isLoading, saveBrainData, deleteBrain, exportData, getBrainData, refresh } = useDatabase();
  const { addXPEvent } = useReputation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals & Drawers state
  const [selectedBrain, setSelectedBrain] = useState<Brain | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEngineOpen, setIsEngineOpen] = useState(false);
  
  // Forking state
  const [isForkOpen, setIsForkOpen] = useState(false);
  const [brainToFork, setBrainToFork] = useState<Brain | null>(null);
  const [forkTitle, setForkTitle] = useState("");

  const filteredBrains = brains.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCardClick = (brain: Brain) => {
    setSelectedBrain(brain);
    setIsDrawerOpen(true);
  };

  const launchEngine = (brain: Brain) => {
    setSelectedBrain(brain);
    setIsEngineOpen(true);
    setIsDrawerOpen(false); // Close drawer behind it
  };

  const handleImportSave = async (data: any[]) => {
    for (const d of data) {
      await saveBrainData(d);
    }
  };

  const openForkDialog = (brain: Brain) => {
    setBrainToFork(brain);
    setForkTitle(`Fork of ${brain.title}`);
    setIsForkOpen(true);
  };

  const executeFork = async () => {
    if (!brainToFork || !forkTitle) return;
    
    const data = await getBrainData(brainToFork.id);
    if (!data) return;
    const { brain, nodes } = data;
    
    const newBrainId = crypto.randomUUID();
    const newBrain = {
      ...brain,
      id: newBrainId,
      title: forkTitle,
      description: `${brain.description}\n\n[Forked from: ${brain.title}]`,
      created_at: Date.now()
    };

    const idMap = new Map<string, string>();
    for (const n of nodes) {
      idMap.set(n.id, crypto.randomUUID());
    }

    const newNodes = nodes.map(n => ({
      ...n,
      id: idMap.get(n.id)!,
      brain_id: newBrainId,
      if_true_node_id: n.if_true_node_id ? idMap.get(n.if_true_node_id) || n.if_true_node_id : n.if_true_node_id,
      if_false_node_id: n.if_false_node_id ? idMap.get(n.if_false_node_id) || n.if_false_node_id : n.if_false_node_id
    }));

    if (newBrain.root_node_id && idMap.has(newBrain.root_node_id)) {
      newBrain.root_node_id = idMap.get(newBrain.root_node_id)!;
    }

    await saveBrainData({ brain: newBrain, nodes: newNodes });
    await addXPEvent("brain_created", 30, "Forked a brain");
    
    toast({ title: "Brain forked", description: "Brain forked and saved to your library." });
    setIsForkOpen(false);
    setBrainToFork(null);
  };

  return (
    <div className="flex flex-col bg-background h-full w-full">
      <div className="p-4 border-b border-border/50 bg-card/50 flex justify-between items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brains..." 
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={exportData} title="Export">
            <Share className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsImportOpen(true)} title="Import">
            <Download className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => setIsWizardOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Brain
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {filteredBrains.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border/50 rounded-xl bg-card/30">
                <Network className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-1">No brains found</h3>
                <p className="text-muted-foreground">Adjust your search or create a new expert system.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredBrains.map(brain => (
                  <BrainCard 
                    key={brain.id} 
                    brain={brain} 
                    onClick={() => handleCardClick(brain)}
                    onFork={openForkDialog}
                    onUpdated={refresh}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BrainDrawer 
        brain={selectedBrain}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onLaunch={launchEngine}
        onDelete={deleteBrain}
        onFork={(b) => { setIsDrawerOpen(false); openForkDialog(b); }}
        onExport={(b) => {
          // Simple single export
          idb.getAllByIndex("nodes", "brain_id", b.id).then(nodes => {
            const exportObj = { brains: [b], nodes };
            const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${b.title.replace(/\s+/g, '-').toLowerCase()}-export.json`;
            a.click();
            URL.revokeObjectURL(url);
          });
        }}
      />

      <WizardModal 
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSave={saveBrainData}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportSave}
      />

      <RuntimeEngine
        brain={selectedBrain}
        isOpen={isEngineOpen}
        onClose={() => setIsEngineOpen(false)}
      />

      <Dialog open={isForkOpen} onOpenChange={setIsForkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fork Brain</DialogTitle>
            <DialogDescription>
              Create a copy of this brain in your library to modify.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Title</label>
              <Input value={forkTitle} onChange={e => setForkTitle(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsForkOpen(false)}>Cancel</Button>
            <Button onClick={executeFork} disabled={!forkTitle}>Fork Brain</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
