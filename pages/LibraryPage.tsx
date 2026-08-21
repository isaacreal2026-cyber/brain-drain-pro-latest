import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dashboard } from "@/components/Dashboard";
import { BrainCard } from "@/components/BrainCard";
import { BrainDrawer } from "@/components/BrainDrawer";
import { RuntimeEngine } from "@/components/RuntimeEngine";
import { BrainDNA } from "@/components/library/BrainDNA";
import { PathwaysTab } from "@/components/library/PathwaysTab";
import { SavedTopicsTab } from "@/components/library/SavedTopicsTab";
import { ReadTab } from "@/components/library/ReadTab";
import { ShareModal } from "@/components/library/ShareModal";
import { Brain, Node } from "@/lib/types";
import { useDatabase } from "@/hooks/use-database";
import { usePathways } from "@/hooks/use-pathways";
import { idb } from "@/lib/db";
import { Database, Network, Clock, Files, Library, GitBranch, Map as MapIcon, Hash, BookOpen, Share2, Download, Sparkles } from "lucide-react";

export function LibraryPage() {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedBrain, setSelectedBrain] = useState<Brain | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEngineOpen, setIsEngineOpen] = useState(false);
  const { brains, deleteBrain, refresh } = useDatabase();
  const { pathways } = usePathways();

  // Real content for the tabs that used to be permanent placeholders.
  const pathwayBrainIds = useMemo(
    () => new Set(pathways.flatMap((pathway) => pathway.brainIds || [])),
    [pathways],
  );

  const moduleBrains = useMemo(
    () =>
      brains.filter((brain) => {
        const tags = (brain.category || "").toLowerCase();
        return (
          pathwayBrainIds.has(brain.id) ||
          tags.includes("module") ||
          tags.includes("reusable")
        );
      }),
    [brains, pathwayBrainIds],
  );

  const sharedBrains = useMemo(
    () => brains.filter((b) => b.sharedAt).sort((a, b) => (b.sharedAt || 0) - (a.sharedAt || 0)),
    [brains],
  );

  const importedBrains = useMemo(
    () => brains.filter((b) => b.importedAt).sort((a, b) => (b.importedAt || 0) - (a.importedAt || 0)),
    [brains],
  );

  const timeline = useMemo(() => {
    const entries: { id: string; brain: Brain; label: string; at: number; kind: "created" | "imported" | "shared" }[] = [];
    for (const brain of brains) {
      if (brain.created_at) {
        entries.push({ id: `${brain.id}-created`, brain, label: "Created", at: brain.created_at, kind: "created" });
      }
      if (brain.importedAt) {
        entries.push({ id: `${brain.id}-imported`, brain, label: "Imported", at: brain.importedAt, kind: "imported" });
      }
      if (brain.sharedAt) {
        entries.push({ id: `${brain.id}-shared`, brain, label: "Shared", at: brain.sharedAt, kind: "shared" });
      }
    }
    return entries.sort((a, b) => b.at - a.at);
  }, [brains]);

  const openBrain = (brain: Brain) => {
    setSelectedBrain(brain);
    setIsDrawerOpen(true);
  };

  const exportBrain = async (brain: Brain) => {
    const nodes = await idb.getAllByIndex<Node>("nodes", "brain_id", brain.id);
    const blob = new Blob([JSON.stringify({ brains: [brain], nodes }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${brain.title.replace(/\s+/g, "-").toLowerCase()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const BrainGrid = ({ items }: { items: Brain[] }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((brain) => (
        <BrainCard key={brain.id} brain={brain} onClick={() => openBrain(brain)} onUpdated={refresh} />
      ))}
    </div>
  );

  // The Dashboard component already has its own layout, so when rendering it
  // inside the "My Brain" tab, it will take up the full space.

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Brains</h1>
          <p className="text-muted-foreground">Your expert systems, knowledge modules, and decision guides.</p>
        </div>

        <Tabs defaultValue="my-brain" className="w-full flex-1 flex flex-col">
          <TabsList aria-label="Library sections" className="w-full justify-start overflow-x-auto bg-muted/50 p-1 mb-6">
            <TabsTrigger value="my-brain" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Database className="w-4 h-4" /> My Brain
            </TabsTrigger>
            <TabsTrigger value="read" className="flex items-center gap-2 data-[state=active]:bg-background">
              <BookOpen className="w-4 h-4" /> Read
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Library className="w-4 h-4" /> Brain Modules
            </TabsTrigger>
            <TabsTrigger value="topics" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Hash className="w-4 h-4" /> Saved Topics
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Network className="w-4 h-4" /> Shared Brains
            </TabsTrigger>
            <TabsTrigger value="imported" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Files className="w-4 h-4" /> Imported
            </TabsTrigger>
            <TabsTrigger value="dna" className="flex items-center gap-2 data-[state=active]:bg-background">
              <GitBranch className="w-4 h-4" /> Brain DNA
            </TabsTrigger>
            <TabsTrigger value="pathways" className="flex items-center gap-2 data-[state=active]:bg-background">
              <MapIcon className="w-4 h-4" /> Pathways
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Clock className="w-4 h-4" /> Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-brain" className="flex-1 mt-0 border-0 p-0 m-0 outline-none">
            {/* Render the original dashboard directly, it acts as the primary library view */}
            <div className="relative rounded-xl border border-border/50 overflow-hidden h-[80vh] flex flex-col">
              <Dashboard />
            </div>
          </TabsContent>

          <TabsContent value="read" className="flex-1 mt-6">
            <ReadTab />
          </TabsContent>

          <TabsContent value="modules" className="flex-1">
            {moduleBrains.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
                <Library className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium">Brain Modules</h3>
                <p className="text-muted-foreground">Brains tagged as reusable modules will appear here.</p>
              </div>
            ) : (
              <BrainGrid items={moduleBrains} />
            )}
          </TabsContent>

          <TabsContent value="topics" className="flex-1">
            <SavedTopicsTab />
          </TabsContent>

          <TabsContent value="shared" className="flex-1">
            {sharedBrains.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
                <Network className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium">Shared Brains</h3>
                <p className="text-muted-foreground">Expert systems you've shared with the network.</p>
              </div>
            ) : (
              <BrainGrid items={sharedBrains} />
            )}
          </TabsContent>

          <TabsContent value="imported" className="flex-1">
            {importedBrains.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
                <Files className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium">Imported Brains</h3>
                <p className="text-muted-foreground">Brains you've digested from other users.</p>
              </div>
            ) : (
              <BrainGrid items={importedBrains} />
            )}
          </TabsContent>

          <TabsContent value="dna" className="flex-1">
            <BrainDNA />
          </TabsContent>

          <TabsContent value="pathways" className="flex-1">
            <PathwaysTab />
          </TabsContent>

          <TabsContent value="timeline" className="flex-1">
            {timeline.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
                <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium">Activity Timeline</h3>
                <p className="text-muted-foreground">Chronological history of your brain evolution.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50 border border-border/50 rounded-xl overflow-hidden bg-card/30">
                {timeline.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => openBrain(entry.brain)}
                    className="w-full text-left flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      {entry.kind === "created" && <Sparkles className="w-4 h-4" />}
                      {entry.kind === "imported" && <Download className="w-4 h-4" />}
                      {entry.kind === "shared" && <Share2 className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">
                        {entry.label} · {entry.brain.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(entry.at).toLocaleString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ShareModal 
        isOpen={shareModalOpen} 
        onClose={() => setShareModalOpen(false)} 
        brain={selectedBrain} 
      />

      <BrainDrawer
        brain={selectedBrain}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onLaunch={(brain) => { setSelectedBrain(brain); setIsDrawerOpen(false); setIsEngineOpen(true); }}
        onDelete={(brainId) => { void deleteBrain(brainId); setIsDrawerOpen(false); }}
        onExport={(brain) => void exportBrain(brain)}
        onUpdated={refresh}
      />

      <RuntimeEngine
        brain={selectedBrain}
        isOpen={isEngineOpen}
        onClose={() => setIsEngineOpen(false)}
      />
    </div>
  );
}
