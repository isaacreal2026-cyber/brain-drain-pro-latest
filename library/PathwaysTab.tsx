import { useState, useEffect } from "react";
import { usePathways } from "@/hooks/use-pathways";
import { useDatabase } from "@/hooks/use-database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { GitFork, Map as MapIcon, Plus, BookOpen } from "lucide-react";
import { Pathway } from "@/lib/types";

export function PathwaysTab() {
  const { pathways, createPathway, forkPathway } = usePathways();
  const { brains } = useDatabase();
  const { toast } = useToast();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isForkOpen, setIsForkOpen] = useState(false);
  const [selectedPathway, setSelectedPathway] = useState<Pathway | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [selectedBrains, setSelectedBrains] = useState<string[]>([]);
  
  const [forkTitle, setForkTitle] = useState("");

  const handleCreate = async () => {
    if (!title) return;
    await createPathway({
      title,
      description,
      category,
      brainIds: selectedBrains,
      authorId: "me"
    });
    toast({ title: "Pathway created", description: "Your new knowledge pathway has been saved." });
    setIsCreateOpen(false);
    resetForm();
  };

  const handleFork = async () => {
    if (!selectedPathway || !forkTitle) return;
    await forkPathway(selectedPathway.id, forkTitle, selectedPathway.description);
    toast({ title: "Pathway forked", description: "You have cloned this pathway to your library." });
    setIsForkOpen(false);
    setForkTitle("");
    setSelectedPathway(null);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setSelectedBrains([]);
  };

  const toggleBrain = (id: string) => {
    setSelectedBrains(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Knowledge Pathways</h2>
          <p className="text-sm text-muted-foreground">Curated sequences of expert brains.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Create Pathway
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Pathway</DialogTitle>
              <DialogDescription>
                Sequence multiple brains into a learning pathway.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Master React Native" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will they learn?" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Programming" />
              </div>
              <div className="space-y-2">
                <Label>Select Brains ({selectedBrains.length} selected)</Label>
                <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-md p-2">
                  {brains.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center p-2">No brains in your library.</p>
                  ) : (
                    brains.map(b => (
                      <div 
                        key={b.id} 
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${selectedBrains.includes(b.id) ? 'bg-primary/10 border-primary/30 border' : 'hover:bg-muted border border-transparent'}`}
                        onClick={() => toggleBrain(b.id)}
                      >
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{b.title}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!title}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {pathways.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
          <MapIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium">No pathways yet</h3>
          <p className="text-muted-foreground mb-4">Create your first pathway to sequence your expert brains.</p>
          <Button variant="outline" onClick={() => setIsCreateOpen(true)}>Create Pathway</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pathways.map(pathway => (
            <Card key={pathway.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {pathway.category}
                  </Badge>
                  {pathway.forkedFromId && (
                    <Badge variant="secondary" className="text-[10px]">
                      <GitFork className="w-3 h-3 mr-1" /> Forked
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg leading-tight">{pathway.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-2">{pathway.description}</p>
                <div className="mt-4 flex gap-4 text-xs text-muted-foreground font-mono">
                  <span>{pathway.brainIds.length} brains</span>
                  <span>{pathway.forkCount} forks</span>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Dialog open={isForkOpen && selectedPathway?.id === pathway.id} onOpenChange={(open) => {
                  if (open) {
                    setSelectedPathway(pathway);
                    setForkTitle(`Fork of ${pathway.title}`);
                    setIsForkOpen(true);
                  } else {
                    setIsForkOpen(false);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <GitFork className="w-4 h-4" /> Fork Pathway
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Fork Pathway</DialogTitle>
                      <DialogDescription>
                        Clone this pathway to make your own modifications.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>New Title</Label>
                        <Input value={forkTitle} onChange={e => setForkTitle(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsForkOpen(false)}>Cancel</Button>
                      <Button onClick={handleFork} disabled={!forkTitle}>Fork</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
