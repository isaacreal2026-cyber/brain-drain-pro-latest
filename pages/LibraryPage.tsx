import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dashboard } from "@/components/Dashboard";
import { BrainDNA } from "@/components/library/BrainDNA";
import { PathwaysTab } from "@/components/library/PathwaysTab";
import { SavedTopicsTab } from "@/components/library/SavedTopicsTab";
import { ReadTab } from "@/components/library/ReadTab";
import { ShareModal } from "@/components/library/ShareModal";
import { Brain } from "@/lib/types";
import { Database, Network, Clock, Files, Library, GitBranch, Map as MapIcon, Hash, BookOpen } from "lucide-react";

export function LibraryPage() {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedBrain, setSelectedBrain] = useState<Brain | null>(null);

  // The Dashboard component already has its own layout, so when rendering it
  // inside the "My Brain" tab, it will take up the full space.

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Legacy</h1>
          <p className="text-muted-foreground">Preserve your expert systems, knowledge modules, and conceptual lineage.</p>
        </div>

        <Tabs defaultValue="my-brain" className="w-full flex-1 flex flex-col">
          <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 p-1 mb-6">
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
            <div className="p-12 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
              <Library className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Brain Modules</h3>
              <p className="text-muted-foreground">Brains tagged as reusable modules will appear here.</p>
            </div>
          </TabsContent>

          <TabsContent value="topics" className="flex-1">
            <SavedTopicsTab />
          </TabsContent>

          <TabsContent value="shared" className="flex-1">
            <div className="p-12 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
              <Network className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Shared Brains</h3>
              <p className="text-muted-foreground">Expert systems you've shared with the network.</p>
            </div>
          </TabsContent>

          <TabsContent value="imported" className="flex-1">
            <div className="p-12 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
              <Files className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Imported Brains</h3>
              <p className="text-muted-foreground">Brains you've digested from other users.</p>
            </div>
          </TabsContent>

          <TabsContent value="dna" className="flex-1">
            <BrainDNA />
          </TabsContent>

          <TabsContent value="pathways" className="flex-1">
            <PathwaysTab />
          </TabsContent>

          <TabsContent value="timeline" className="flex-1">
            <div className="p-12 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
              <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Activity Timeline</h3>
              <p className="text-muted-foreground">Chronological history of your brain evolution.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ShareModal 
        isOpen={shareModalOpen} 
        onClose={() => setShareModalOpen(false)} 
        brain={selectedBrain} 
      />
    </div>
  );
}
