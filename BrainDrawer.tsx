import { useState, useEffect } from "react";
import { Brain, Node, BrainData, BrainVersion, Branch, PullRequest } from "@/lib/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Network, Play, Trash2, Share, Link2, Activity, GitCommit, Target, MessageSquare, GitFork, GitBranch, GitPullRequest, GitMerge, FileArchive, BrainCircuit, Star, ChevronDown, Plus, Eye, Tag as TagIcon, Code, Download, Laptop, MoreHorizontal, Settings } from "lucide-react";
import { idb } from "@/lib/db";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useBrainRepo } from "@/hooks/use-brain-repo";
import { BrainChatRuntime } from "./runtime/BrainChatRuntime";
import { BranchManagerSidebar } from "./BranchManagerSidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface BrainDrawerProps {
  brain: Brain | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (brain: Brain) => void;
  onDelete: (brainId: string) => void;
  onExport: (brain: Brain) => void;
  onFork?: (brain: Brain) => void;
}

export function BrainDrawer({ brain, isOpen, onClose, onLaunch, onDelete, onExport, onFork }: BrainDrawerProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isBranchManagerOpen, setIsBranchManagerOpen] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [newListModalOpen, setNewListModalOpen] = useState(false);
  const { toast } = useToast();
  
  const { branches, versions, pullRequests, activeBranch, createBranch, switchBranch, deleteBranch } = useBrainRepo(brain?.id || "");

  useEffect(() => {
    if (brain && isOpen) {
      idb.getAllByIndex<Node>("nodes", "brain_id", brain.id).then(setNodes);
    }
  }, [brain, isOpen]);

  if (!brain) return null;

  const tags = brain.category.split(",").map(t => t.trim()).filter(Boolean);
  const qNodes = nodes.filter(n => n.node_type === "question").length;
  const oNodes = nodes.filter(n => n.node_type === "outcome").length;

  const handleDeleteConfirm = () => {
    onDelete(brain.id);
    onClose();
    toast({ title: "Brain Deleted", description: "The repository has been permanently deleted." });
  };

  const handleShareLink = async () => {
    const currentNodes = await idb.getAllByIndex<Node>("nodes", "brain_id", brain.id);
    const payload = JSON.stringify({ brain, nodes: currentNodes });
    const encoded = btoa(encodeURIComponent(payload));
    const base = window.location.origin + window.location.pathname;
    const url = `${base}#share=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link Copied!", description: "Share this link — anyone who opens it can import the brain instantly." });
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      toast({ title: "Link Copied!", description: "Share this link — anyone who opens it can import the brain instantly." });
    }
  };

  const toggleStar = () => {
    setIsStarred(!isStarred);
    toast({
      title: !isStarred ? "Starred" : "Unstarred",
      description: !isStarred ? `Added ${brain.title} to your favorites.` : `Removed ${brain.title} from your favorites.`
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl border-l-border bg-card/95 backdrop-blur-xl flex flex-col h-full overflow-hidden p-0">
        <div className="p-6 pb-0 border-b border-border/50 text-left">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-primary" />
              <span className="font-mono text-xs text-primary uppercase tracking-wider">Brain Profile</span>
              {brain.repo_status === "public_repo" && (
                <Badge variant="outline" className="text-[10px] font-mono text-emerald-500 border-emerald-500/20 bg-emerald-500/10">Public Repo</Badge>
              )}
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center border rounded-md overflow-hidden bg-background shadow-sm">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`rounded-none h-8 px-3 gap-1.5 hover:bg-muted ${isStarred ? 'text-yellow-500 hover:text-yellow-600' : ''}`}
                onClick={toggleStar}
              >
                <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">{isStarred ? 'Starred' : 'Star'}</span>
              </Button>
              <div className="w-px h-8 bg-border" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="rounded-none h-8 px-2 hover:bg-muted">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Add to List</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Future Ideas</DropdownMenuItem>
                  <DropdownMenuItem>Favorites</DropdownMenuItem>
                  <DropdownMenuItem>Recent</DropdownMenuItem>
                  <DropdownMenuItem>Custom Lists</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <Dialog open={newListModalOpen} onOpenChange={setNewListModalOpen}>
                    <DialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Plus className="w-4 h-4 mr-2" /> Create New List
                      </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New List</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>List Name</Label>
                          <Input placeholder="e.g. Reading List" />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input placeholder="Optional description..." />
                        </div>
                        <div className="space-y-2">
                          <Label>Visibility</Label>
                          <Select defaultValue="private">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="public">Public</SelectItem>
                              <SelectItem value="private">Private</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter>
                          <Button onClick={() => {
                            setNewListModalOpen(false);
                            toast({ title: "List Created" });
                          }}>Create List</Button>
                        </DialogFooter>
                      </div>
                    </DialogContent>
                  </Dialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <SheetTitle className="text-2xl font-bold tracking-tight mb-3">{brain.title}</SheetTitle>
          
          {/* Brain Statistics */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4 font-medium">
            <div className="flex items-center gap-1.5 hover:text-foreground cursor-pointer transition-colors" onClick={() => toast({ title: "Stars", description: "View stargazers" })}>
              <Star className="w-4 h-4" /> 128
            </div>
            <div className="flex items-center gap-1.5 hover:text-foreground cursor-pointer transition-colors" onClick={() => toast({ title: "Forks", description: "View network graph" })}>
              <GitFork className="w-4 h-4" /> 34
            </div>
            <div className="flex items-center gap-1.5 hover:text-foreground cursor-pointer transition-colors" onClick={() => toast({ title: "Watching", description: "Watchers list" })}>
              <Eye className="w-4 h-4" /> 56
            </div>
            <div className="flex items-center gap-1.5 hover:text-foreground cursor-pointer transition-colors" onClick={() => setIsBranchManagerOpen(true)}>
              <GitBranch className="w-4 h-4" /> {branches.length}
            </div>
            <div className="flex items-center gap-1.5 hover:text-foreground cursor-pointer transition-colors" onClick={() => setIsTagModalOpen(true)}>
              <TagIcon className="w-4 h-4" /> 5
            </div>
            <div className="flex items-center gap-1.5 hover:text-foreground cursor-pointer transition-colors">
              <Activity className="w-4 h-4" /> Updated 2h ago
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full rounded-none justify-start px-2 border-b bg-transparent h-12 overflow-x-auto flex-nowrap hide-scrollbar">
            <TabsTrigger value="overview" className="data-[state=active]:bg-muted/50 data-[state=active]:shadow-none h-9 whitespace-nowrap">Overview</TabsTrigger>
            <TabsTrigger value="vc" className="data-[state=active]:bg-muted/50 data-[state=active]:shadow-none h-9 gap-2 whitespace-nowrap">
              <GitBranch className="w-4 h-4" /> Agentic VC
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-muted/50 data-[state=active]:shadow-none h-9 gap-2 whitespace-nowrap">
              <Settings className="w-4 h-4" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 overflow-y-auto m-0 p-6 space-y-6">
            
            {/* Overview Controls Row */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={activeBranch} onValueChange={switchBranch}>
                  <SelectTrigger className="w-[180px] h-9 bg-muted/30 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-3.5 h-3.5" />
                      <SelectValue placeholder="Branch" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <DropdownMenuLabel className="text-xs font-semibold px-2 py-1.5 text-muted-foreground uppercase">Branches</DropdownMenuLabel>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.name} className="font-mono text-xs">{b.name}</SelectItem>
                    ))}
                    <DropdownMenuSeparator />
                    <Button variant="ghost" className="w-full justify-start h-8 px-2 text-xs" onClick={(e) => { e.preventDefault(); setIsBranchManagerOpen(true); }}>
                      View all branches
                    </Button>
                  </SelectContent>
                </Select>
                
                <Dialog open={isTagModalOpen} onOpenChange={setIsTagModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                      <TagIcon className="w-3.5 h-3.5" /> Tags
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Switch Branches / Tags</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <Input placeholder="Search branches or tags..." autoFocus />
                      <div className="space-y-2">
                        <Label>Create New Tag</Label>
                        <div className="flex gap-2">
                          <Input placeholder="Tag Name (e.g. v1.0)" />
                          <Button>Create Tag</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Tag Target</Label>
                        <Select defaultValue="recent">
                          <SelectTrigger><SelectValue placeholder="Select target..." /></SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <DropdownMenuLabel>Recent Activities</DropdownMenuLabel>
                              <SelectItem value="recent">Latest Commit (a1b2c3d)</SelectItem>
                              <SelectItem value="prev">Previous Commit (f4e5d6c)</SelectItem>
                            </SelectGroup>
                            <SelectGroup>
                              <DropdownMenuLabel>Brain Branches</DropdownMenuLabel>
                              {branches.map(b => <SelectItem key={`branch-${b.id}`} value={`branch-${b.id}`}>{b.name}</SelectItem>)}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Code Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="h-9 gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm w-full sm:w-auto">
                    <Code className="w-4 h-4" /> Code <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <Tabs defaultValue="local" className="w-full">
                    <TabsList className="w-full grid grid-cols-2 p-1">
                      <TabsTrigger value="local" className="text-xs h-7">Local</TabsTrigger>
                      <TabsTrigger value="codespaces" className="text-xs h-7">Codespaces</TabsTrigger>
                    </TabsList>
                    <TabsContent value="local" className="p-2 space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Clone using URL</Label>
                        <div className="flex gap-1">
                          <Input value={`https://brain-builder.com/repo/${brain.id}.git`} readOnly className="h-8 text-xs font-mono" />
                          <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => toast({ title: "Copied clone URL" })}>Copy</Button>
                        </div>
                        <div className="flex gap-2 text-[10px] text-muted-foreground font-medium">
                          <span className="hover:text-foreground cursor-pointer underline">HTTPS</span>
                          <span className="hover:text-foreground cursor-pointer">SSH</span>
                          <span className="hover:text-foreground cursor-pointer">CLI</span>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs gap-2" onClick={() => onExport(brain)}>
                        <Download className="w-3.5 h-3.5" /> Export JSON
                      </Button>
                    </TabsContent>
                    <TabsContent value="codespaces" className="p-2 space-y-2">
                      <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-2 justify-start">
                        <Laptop className="w-3.5 h-3.5" /> Open Codespace
                      </Button>
                      <Button size="sm" className="w-full h-8 text-xs gap-2 justify-start">
                        <Plus className="w-3.5 h-3.5" /> Create Codespace
                      </Button>
                    </TabsContent>
                  </Tabs>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 px-2 hidden sm:flex">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsBranchManagerOpen(true)}>Branches</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsTagModalOpen(true)}>Tags</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-3 mt-4">
              <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Parameters</h4>
              <p className="text-sm text-foreground/90 leading-relaxed bg-muted/30 p-4 rounded-md border border-border/50">
                {brain.description || "No description provided."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 font-mono text-[10px] uppercase">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Topology Stats</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-background border border-border/50 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                  <Activity className="w-5 h-5 text-muted-foreground mb-2" />
                  <span className="text-xl font-bold text-foreground">{nodes.length}</span>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1">Total Nodes</span>
                </div>
                <div className="bg-background border border-border/50 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                  <GitCommit className="w-5 h-5 text-primary mb-2" />
                  <span className="text-xl font-bold text-foreground">{qNodes}</span>
                  <span className="text-[10px] font-mono text-primary uppercase tracking-wider mt-1">Decisions</span>
                </div>
                <div className="bg-background border border-border/50 p-4 rounded-lg flex flex-col items-center justify-center text-center col-span-2 sm:col-span-1">
                  <Target className="w-5 h-5 text-secondary mb-2" />
                  <span className="text-xl font-bold text-foreground">{oNodes}</span>
                  <span className="text-[10px] font-mono text-secondary uppercase tracking-wider mt-1">Outcomes</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 py-4 sm:justify-start">
              <Button onClick={() => onLaunch(brain)} className="w-full h-12 text-base font-semibold shadow-primary/20 shadow-lg">
                <Play className="w-5 h-5 mr-2 fill-current" /> Launch Diagnostic Engine
              </Button>
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button onClick={() => setIsChatOpen(true)} className="w-full h-10 text-sm font-semibold border-primary/50 text-primary hover:bg-primary/10" variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" /> Chat Mode
                </Button>
                <Button variant="outline" onClick={handleShareLink} className="w-full h-10 text-sm border-primary/30 text-primary hover:bg-primary/10">
                  <Link2 className="w-4 h-4 mr-2" /> Share Link
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="vc" className="flex-1 overflow-y-auto m-0 p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/50">
               <div>
                 <h3 className="font-semibold text-lg flex items-center gap-2"><FileArchive className="w-5 h-5 text-primary" /> Active Branch</h3>
                 <span className="text-sm text-muted-foreground font-mono flex items-center gap-2 mt-1">
                   <GitBranch className="w-3 h-3" /> {activeBranch}
                 </span>
               </div>
               <Button variant="outline" size="sm" onClick={() => setIsBranchManagerOpen(true)}>
                 <GitBranch className="w-4 h-4 mr-2" /> Manage Branches
               </Button>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                <BrainCircuit className="w-4 h-4" /> Agentic AI Tracker Live
              </h4>
              <div className="text-xs font-mono text-muted-foreground space-y-1 h-20 overflow-y-auto bg-black/40 p-2 rounded-md border border-primary/10">
                <div className="text-emerald-400">&gt; Brain state initialized. Monitoring node topology...</div>
                <div className="text-blue-400">&gt; Analyzing logic couplet diffs...</div>
                <div className="text-muted-foreground">&gt; No uncommitted changes detected. System optimal.</div>
                <div className="animate-pulse">&gt; Ready for next command_</div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2"><GitCommit className="w-4 h-4 text-emerald-500" /> Version History</h4>
              <div className="space-y-3 relative border-l-2 border-border/50 ml-2 pl-4">
                {versions.map(v => (
                  <div key={v.id} className="relative group">
                    <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-background border-2 border-primary group-hover:scale-125 transition-transform" />
                    <div className="bg-card border p-3 rounded-md shadow-sm opacity-90 hover:opacity-100 transition-opacity">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm text-foreground">{v.message}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(v.created_at), "MMM d, HH:mm")}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono h-5 bg-secondary/10 text-secondary border-secondary/20 uppercase">{v.branch}</Badge>
                          <span className="text-[10px] font-mono text-muted-foreground">ID: {v.id}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] font-mono hover:text-primary" onClick={() => toast({ title: "Rollback", description: `Reverting state to ${v.id}...` })}>
                          Recover State
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <h4 className="text-sm font-semibold flex items-center gap-2"><GitPullRequest className="w-4 h-4 text-primary" /> Pull Requests</h4>
              <div className="space-y-2">
                {pullRequests.map(pr => (
                  <div key={pr.id} className="p-3 border rounded-md bg-muted/20 hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => toast({ title: "View PR", description: pr.title })}>
                    <div className="flex justify-between items-start mb-1">
                       <span className="font-medium text-sm text-foreground flex items-center gap-1.5 border-b border-transparent hover:border-foreground w-max transition-all"><GitMerge className="w-4 h-4" /> {pr.title}</span>
                       <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] uppercase">Open</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground font-mono">
                      <div className="flex items-center gap-2">
                        <span>{pr.source_branch}</span>
                        <span>→</span>
                        <span>{pr.target_branch}</span>
                      </div>
                      <span className="text-primary hover:underline" onClick={(e) => { e.stopPropagation(); toast({ title: "Code Review", description: "Collab session opened." }) }}>Review Diffs</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full text-primary" variant="secondary" onClick={() => toast({ title: "Pull Request", description: "Propose your changes to the main code." })}>
                 <GitPullRequest className="w-4 h-4 mr-2" /> Propose Changes
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="flex-1 overflow-y-auto m-0 p-6 space-y-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">General</h3>
                <div className="space-y-2">
                  <Label>Repository Name</Label>
                  <Input defaultValue={brain.title} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input defaultValue={brain.description} />
                </div>
                <div className="space-y-2">
                  <Label>Default Branch</Label>
                  <Select defaultValue={activeBranch}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {branches.map(b => <SelectItem key={`setting-${b.id}`} value={b.name}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">All merges and commits target this branch by default.</p>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label>Template Brain</Label>
                    <p className="text-xs text-muted-foreground">Allows users to generate new Brains using the same directory structure, files, prompts and configuration.</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label>Release Immutability</Label>
                    <p className="text-xs text-muted-foreground">Prevent releases, assets and tags from being modified after publishing.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Features</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Wikis</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="pl-4 border-l-2 space-y-2">
                    <Label className="text-sm font-normal flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" /> Restrict editing to collaborators only
                    </Label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Issues</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="pl-4 border-l-2 space-y-2 text-sm text-muted-foreground">
                    <p>Includes issue permissions, templates, milestones, and labels.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Discussions</Label>
                    <Switch />
                  </div>
                  <Button variant="outline" size="sm">Setup Discussions</Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Pull Requests</h3>
                <div className="space-y-3">
                  <Label className="flex items-start gap-2 font-normal">
                    <input type="checkbox" defaultChecked className="mt-1" />
                    <div>
                      <div className="font-medium">Allow merge commits</div>
                      <div className="text-xs text-muted-foreground">Add all commits from the head branch to the base branch with a merge commit.</div>
                    </div>
                  </Label>
                  <Label className="flex items-start gap-2 font-normal">
                    <input type="checkbox" defaultChecked className="mt-1" />
                    <div>
                      <div className="font-medium">Allow squash merging</div>
                      <div className="text-xs text-muted-foreground">Combine all commits from the head branch into a single commit in the base branch.</div>
                    </div>
                  </Label>
                  <Label className="flex items-start gap-2 font-normal">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <div className="font-medium">Allow rebase merging</div>
                      <div className="text-xs text-muted-foreground">Add all commits from the head branch onto the base branch individually.</div>
                    </div>
                  </Label>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="font-semibold text-lg border-b border-destructive/20 pb-2 text-destructive">Danger Zone</h3>
                <div className="border border-destructive/20 rounded-lg p-4 space-y-4 bg-destructive/5">
                  <div className="flex justify-between items-center pb-4 border-b border-destructive/10">
                    <div>
                      <div className="font-semibold">Change Visibility</div>
                      <div className="text-xs text-muted-foreground">Currently {brain.repo_status === 'public_repo' ? 'Public' : 'Private'}</div>
                    </div>
                    <Button variant="outline" size="sm" className="border-destructive/30 hover:bg-destructive/10">Change</Button>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-destructive/10">
                    <div>
                      <div className="font-semibold">Disable Branch Protection</div>
                      <div className="text-xs text-muted-foreground">Allows force pushing to default branch</div>
                    </div>
                    <Button variant="outline" size="sm" className="border-destructive/30 hover:bg-destructive/10">Disable</Button>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-destructive/10">
                    <div>
                      <div className="font-semibold">Transfer Ownership</div>
                      <div className="text-xs text-muted-foreground">Transfer this brain to another user or organization</div>
                    </div>
                    <Button variant="outline" size="sm" className="border-destructive/30 hover:bg-destructive/10">Transfer</Button>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-destructive/10">
                    <div>
                      <div className="font-semibold">Archive Brain</div>
                      <div className="text-xs text-muted-foreground">Mark repository as read-only</div>
                    </div>
                    <Button variant="outline" size="sm" className="border-destructive/30 hover:bg-destructive/10">Archive</Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-destructive">Delete this Brain</div>
                      <div className="text-xs text-muted-foreground">Once you delete a repository, there is no going back.</div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">Delete Brain</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete {brain.title} and remove it from your device.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>

            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
      <BrainChatRuntime brain={brain} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <BranchManagerSidebar 
        isOpen={isBranchManagerOpen} 
        onClose={() => setIsBranchManagerOpen(false)}
        brainId={brain.id}
        branches={branches}
        activeBranch={activeBranch}
        onSwitchBranch={switchBranch}
        onCreateBranch={createBranch}
        onDeleteBranch={deleteBranch}
      />
    </Sheet>
  );
}

