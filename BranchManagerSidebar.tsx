import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { GitBranch, GitCommit, Plus, Trash2, Search, MoreHorizontal, Edit2, Shield, GitMerge, GitCompare, User, Clock } from "lucide-react";
import { Branch } from "@/lib/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BranchManagerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  brainId: string;
  branches: Branch[];
  activeBranch: string;
  onSwitchBranch: (branchId: string) => void;
  onCreateBranch: (name: string) => void;
  onDeleteBranch: (branchId: string) => void;
  /** Latest version recorded on each branch, keyed by branch name. */
  branchHeads?: Record<string, { id: string; created_at: number; author?: string }>;
  onRenameBranch?: (branchId: string, name: string) => Promise<void> | void;
  onToggleProtection?: (branchId: string) => Promise<void> | void;
  onMergeBranch?: (branchId: string) => Promise<void> | void;
  onCompareBranch?: (branchName: string) => Promise<void> | void;
}

export function BranchManagerSidebar({
  isOpen,
  onClose,
  branches,
  activeBranch,
  onSwitchBranch,
  onCreateBranch,
  onDeleteBranch,
  branchHeads = {},
  onRenameBranch,
  onToggleProtection,
  onMergeBranch,
  onCompareBranch,
}: BranchManagerSidebarProps) {
  const [newBranchName, setNewBranchName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const { toast } = useToast();

  const startRename = (branch: Branch) => {
    setRenamingId(branch.id);
    setRenameValue(branch.name);
  };

  const commitRename = async (branch: Branch) => {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name || name === branch.name) return;
    await onRenameBranch?.(branch.id, name);
  };

  const handleCreate = () => {
    if (!newBranchName.trim()) {
      toast({ title: "Error", description: "Branch name cannot be empty.", variant: "destructive" });
      return;
    }
    onCreateBranch(newBranchName);
    setNewBranchName("");
    setIsCreating(false);
    toast({ title: "Branch Created", description: `Created new branch: ${newBranchName}` });
  };

  const handleDelete = (branch: Branch) => {
    if (branch.isProtected && !branch.isMain) {
      toast({ title: "Error", description: "This branch is protected. Remove protection first.", variant: "destructive" });
      return;
    }
    if (branch.name === activeBranch) {
      toast({ title: "Error", description: "Cannot delete the active branch.", variant: "destructive" });
      return;
    }
    if (branch.isMain) {
      toast({ title: "Error", description: "Cannot delete the main branch.", variant: "destructive" });
      return;
    }
    onDeleteBranch(branch.id);
    toast({ title: "Branch Deleted", description: `Deleted branch: ${branch.name}` });
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentBranches = [...branches]
    .sort(
      (a, b) =>
        (branchHeads[b.name]?.created_at || b.created_at) -
        (branchHeads[a.name]?.created_at || a.created_at),
    )
    .slice(0, 5);

  const activeBranchRecord = branches.find((b) => b.name === activeBranch) || null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:w-[600px] flex flex-col p-6 pr-8">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" /> Branch Management
          </SheetTitle>
          <SheetDescription>
            Manage independent lines of development. Create, merge, protect, or compare branches.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search branches..." 
                className="pl-8" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={() => setIsCreating(!isCreating)}>
              <Plus className="w-4 h-4 mr-2" /> New Branch
            </Button>
          </div>

          {isCreating && (
            <div className="bg-muted/30 p-4 border rounded-lg space-y-3">
              <Input 
                placeholder="e.g., feature/advanced-logic" 
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setIsCreating(false);
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>Cancel</Button>
                <Button size="sm" onClick={handleCreate}>Create Branch</Button>
              </div>
            </div>
          )}

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 mb-4 h-auto">
              <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary pb-2 px-4 font-semibold">All Branches</TabsTrigger>
              <TabsTrigger value="recent" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary pb-2 px-4 font-semibold">Recent</TabsTrigger>
              <TabsTrigger value="active" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary pb-2 px-4 font-semibold">Active</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-3 mt-0">
              {filteredBranches.map(branch => {
                const isActive = branch.name === activeBranch;
                return (
                  <div 
                    key={branch.id} 
                    className={`flex flex-col p-4 border rounded-lg transition-colors ${
                      isActive ? "bg-primary/5 border-primary/30" : "bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full mt-1 ${isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <GitBranch className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {renamingId === branch.id ? (
                              <Input
                                autoFocus
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={() => void commitRename(branch)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void commitRename(branch);
                                  if (e.key === "Escape") setRenamingId(null);
                                }}
                                className="h-7 w-48 text-sm"
                              />
                            ) : (
                              <span className="font-semibold text-base">{branch.name}</span>
                            )}
                            {branch.isMain && <Badge variant="secondary" className="text-[10px] h-5">Default</Badge>}
                            {isActive && <Badge className="text-[10px] h-5 bg-emerald-500 hover:bg-emerald-600">Active</Badge>}
                            {branch.isProtected && (
                              <Badge variant="outline" className="text-[10px] h-5 gap-1"><Shield className="w-3 h-3 text-muted-foreground" /> Protected</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                            <span className="flex items-center gap-1.5">
                              <GitCommit className="w-3 h-3" />
                              {(branchHeads[branch.name]?.id || branch.id).slice(0, 7)}
                            </span>
                            <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> @{branch.author || "me"}</span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              {new Date(branchHeads[branch.name]?.created_at || branch.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isActive && (
                          <Button variant="secondary" size="sm" onClick={() => {
                            onSwitchBranch(branch.id);
                            toast({ title: "Branch Switched", description: `Now working on: ${branch.name}` });
                          }}>
                            Switch
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem disabled={branch.isMain} onClick={() => startRename(branch)}>
                              <Edit2 className="w-4 h-4 mr-2" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={branch.isMain} onClick={() => void onCompareBranch?.(branch.name)}>
                              <GitCompare className="w-4 h-4 mr-2" /> Compare
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={branch.isMain} onClick={() => void onMergeBranch?.(branch.id)}>
                              <GitMerge className="w-4 h-4 mr-2" /> Merge into Default
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => void onToggleProtection?.(branch.id)}>
                              <Shield className="w-4 h-4 mr-2" /> Toggle Protection
                            </DropdownMenuItem>
                            {!branch.isMain && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleDelete(branch)}>
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete Branch
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredBranches.length === 0 && (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                  No branches found matching your search.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="recent" className="mt-0 space-y-2">
               {recentBranches.length === 0 ? (
                 <div className="text-center p-8 text-muted-foreground text-sm border rounded-lg bg-muted/20">
                   Recently active branches will appear here.
                 </div>
               ) : (
                 recentBranches.map((branch) => (
                   <div key={branch.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                     <div className="flex items-center gap-2 min-w-0">
                       <GitBranch className="w-4 h-4 text-muted-foreground shrink-0" />
                       <span className="font-medium text-sm truncate">{branch.name}</span>
                     </div>
                     <span className="text-xs text-muted-foreground font-mono shrink-0">
                       {new Date(branchHeads[branch.name]?.created_at || branch.created_at).toLocaleString()}
                     </span>
                   </div>
                 ))
               )}
            </TabsContent>
            
            <TabsContent value="active" className="mt-0 space-y-2">
               {activeBranchRecord ? (
                 <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/30">
                   <div className="flex items-center gap-2 min-w-0">
                     <GitBranch className="w-4 h-4 text-primary shrink-0" />
                     <span className="font-medium text-sm truncate">{activeBranchRecord.name}</span>
                     <Badge className="text-[10px] h-5 bg-emerald-500 hover:bg-emerald-600">Active</Badge>
                   </div>
                   <span className="text-xs text-muted-foreground font-mono shrink-0">
                     @{activeBranchRecord.author || "me"}
                   </span>
                 </div>
               ) : (
                 <div className="text-center p-8 text-muted-foreground text-sm border rounded-lg bg-muted/20">
                   Currently active branches across the team will appear here.
                 </div>
               )}
            </TabsContent>
          </Tabs>

        </div>
      </SheetContent>
    </Sheet>
  );
}
