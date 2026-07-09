import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMissions } from "@/hooks/use-missions";
import { useReputation } from "@/hooks/use-reputation";
import { Mission, Milestone, MissionCategory } from "@/lib/types";
import { format } from "date-fns";
import {
  Rocket, Plus, Calendar, Target, CheckCircle2, ChevronRight, X, Edit, Trash, PlusCircle, Check, ArrowLeft, Sparkles, BrainCircuit, MessageSquare, Star, Award, ThumbsUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { idb } from "@/lib/db";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthContext";

const CATEGORY_COLORS: Record<string, string> = {
  Financial: "text-green-500 bg-green-500/10 border-green-500/20",
  Health: "text-red-500 bg-red-500/10 border-red-500/20",
  Learning: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  Business: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  Creativity: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  Discipline: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  Relationships: "text-pink-500 bg-pink-500/10 border-pink-500/20",
  Other: "text-gray-500 bg-gray-500/10 border-gray-500/20",
};

export function MissionsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { missions, milestones, isLoading, createMission, updateMission, completeMission, toggleMilestone, refresh } = useMissions();
  const { reputation } = useReputation();
  const [filter, setFilter] = useState("all");
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [recommendedCategory, setRecommendedCategory] = useState<string | null>(null);
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);
  const [milestoneNotes, setMilestoneNotes] = useState<Record<string, string>>({});
  const [coordinationTagFilter, setCoordinationTagFilter] = useState("All");
  const { toast } = useToast();

  useEffect(() => {
    // Simulate finding a matching request
    const timer = setTimeout(() => {
      toast({
        title: "Match Found!",
        description: "An open request matches your active mission: Build Mental Models.",
        duration: 5000,
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, "personality_tests", user.uid)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.isCompleted && data.answers) {
            let openness = 0;
            let conscientiousness = 0;
            // Simplified calculation based on questions in test
            if (data.answers.q1) openness += data.answers.q1;
            if (data.answers.q6) openness += data.answers.q6;
            if (data.answers.q2) conscientiousness += data.answers.q2;
            if (data.answers.q7) conscientiousness += data.answers.q7;
            
            if (openness > conscientiousness && openness >= 8) {
              setRecommendedCategory("Creativity");
            } else if (conscientiousness >= 8) {
              setRecommendedCategory("Discipline");
            } else {
              setRecommendedCategory("Learning");
            }
          }
        }
      }).catch((e: any) => {
        console.error("Failed to load personality test data", e);
        toast({ title: "Error", description: "Failed to load personality recommendations.", variant: "destructive" });
      });
    }
  }, [user]);

  // New Mission Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MissionCategory>("Learning");
  const [targetDate, setTargetDate] = useState("");
  const [xpReward, setXpReward] = useState("200");
  const [newMilestones, setNewMilestones] = useState<string[]>([""]);

  const filteredMissions = missions.filter(m => {
    if (filter === "active") return m.status === "active";
    if (filter === "completed") return m.status === "completed";
    if (filter === "paused") return m.status === "paused";
    return true;
  });

  const selectedMission = missions.find(m => m.id === selectedMissionId);
  const selectedMilestones = milestones.filter(m => m.missionId === selectedMissionId).sort((a, b) => a.order - b.order);

  const handleCreate = async () => {
    if (!title.trim()) return;
    const validMilestones = newMilestones.filter(m => m.trim() !== "");
    await createMission({
      title,
      description,
      category,
      status: "active",
      targetDate: targetDate ? new Date(targetDate).getTime() : undefined,
      xpReward: parseInt(xpReward, 10),
      milestones: validMilestones
    });
    setIsNewOpen(false);
    setTitle("");
    setDescription("");
    setCategory("Learning");
    setTargetDate("");
    setXpReward("200");
    setNewMilestones([""]);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMissionId) return;
    await idb.delete("missions", selectedMissionId);
    setSelectedMissionId(null);
    refresh();
  };

  const handleEditSave = async () => {
    if (!selectedMissionId || !title.trim()) return;
    await updateMission(selectedMissionId, {
      title,
      description,
      category,
      targetDate: targetDate ? new Date(targetDate).getTime() : undefined,
      xpReward: parseInt(xpReward, 10),
    });
    setIsEditOpen(false);
  };

  const openEdit = () => {
    if (!selectedMission) return;
    setTitle(selectedMission.title);
    setDescription(selectedMission.description);
    setCategory(selectedMission.category);
    setTargetDate(selectedMission.targetDate ? format(selectedMission.targetDate, "yyyy-MM-dd") : "");
    setXpReward(selectedMission.xpReward.toString());
    setIsEditOpen(true);
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center text-muted-foreground">Loading missions...</div>;
  }

  const allMilestonesDone = selectedMilestones.length > 0 && selectedMilestones.every(m => m.completed);

  return (
    <div className="flex flex-col h-full md:h-screen md:overflow-hidden bg-background">
      {/* Top Bar */}
      <header className="flex-none p-4 md:px-8 border-b border-border/50 bg-card flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-xl leading-none tracking-tight">Pathway Infrastructure</h1>
            {reputation && (
              <p className="text-sm text-muted-foreground mt-1">Level {reputation.level} • {reputation.xp} XP</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="hidden sm:flex gap-2" onClick={() => setLocation('/personality-test')}>
            <Rocket className="w-4 h-4 text-primary" />
            <span>Personality Test</span>
          </Button>
          <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Pathway</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Pathway</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="grid gap-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Master React" />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will you accomplish?" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(CATEGORY_COLORS).map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Target Date (Optional)</Label>
                    <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>XP Reward</Label>
                  <Select value={xpReward} onValueChange={setXpReward}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50 XP - Minor</SelectItem>
                      <SelectItem value="100">100 XP - Standard</SelectItem>
                      <SelectItem value="200">200 XP - Major</SelectItem>
                      <SelectItem value="500">500 XP - Epic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Milestones</Label>
                  {newMilestones.map((m, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={m} onChange={e => {
                        const newM = [...newMilestones];
                        newM[i] = e.target.value;
                        setNewMilestones(newM);
                      }} placeholder={`Milestone ${i + 1}`} />
                      <Button variant="ghost" size="icon" onClick={() => setNewMilestones(newMilestones.filter((_, idx) => idx !== i))}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {newMilestones.length < 10 && (
                    <Button variant="outline" size="sm" className="w-full mt-2 gap-2" onClick={() => setNewMilestones([...newMilestones, ""])}>
                      <PlusCircle className="w-4 h-4" /> Add Milestone
                    </Button>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!title.trim()}>Create Mission</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Tabs defaultValue="systems" className="flex flex-col flex-1 min-h-0">
        <div className="border-b border-border/50 bg-card px-4 md:px-8">
          <TabsList className="w-full justify-start h-12 bg-transparent overflow-x-auto flex-nowrap shrink-0">
            <TabsTrigger value="systems" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 whitespace-nowrap">Systems</TabsTrigger>
            <TabsTrigger value="daily" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 whitespace-nowrap">Daily Actions</TabsTrigger>
            <TabsTrigger value="accountability" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 whitespace-nowrap">Accountability</TabsTrigger>
            <TabsTrigger value="coordination" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 whitespace-nowrap">Real Human Coordination</TabsTrigger>
            <TabsTrigger value="progression" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 whitespace-nowrap">Progression</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="systems" className="flex-1 min-h-0 m-0">
          <div className="flex flex-col md:flex-row h-full">
        {/* Left Panel - Mission List */}
        <div className={`md:w-[400px] border-r border-border/50 flex flex-col bg-background/50 ${selectedMissionId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-border/50">
            <Tabs value={filter} onValueChange={setFilter} className="w-full">
              <TabsList className="grid grid-cols-4 w-full h-9">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs">Done</TabsTrigger>
                <TabsTrigger value="paused" className="text-xs">Paused</TabsTrigger>
              </TabsList>
            </Tabs>
            {recommendedCategory && (
              <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary" /> Recommended for you</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Based on your cognitive profile, try <span className="font-semibold text-primary">{recommendedCategory}</span> missions.</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 md:pb-4">
            {filteredMissions.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No missions found.</p>
              </div>
            ) : (
              filteredMissions.map(mission => {
                const isSelected = mission.id === selectedMissionId;
                const mStones = milestones.filter(m => m.missionId === mission.id);
                const colorClass = CATEGORY_COLORS[mission.category] || CATEGORY_COLORS.Other;
                
                return (
                  <Card 
                    key={mission.id}
                    className={`p-4 cursor-pointer transition-all border ${isSelected ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'hover:border-primary/50 hover:bg-accent/5'}`}
                    onClick={() => setSelectedMissionId(mission.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className={`${colorClass} uppercase text-[10px] font-bold tracking-wider`}>
                        {mission.category}
                      </Badge>
                      {mission.status === "completed" && <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30">Completed</Badge>}
                      {mission.status === "paused" && <Badge variant="secondary">Paused</Badge>}
                    </div>
                    <h3 className="font-semibold text-base mb-1 line-clamp-1">{mission.title}</h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span>{mStones.length} milestones</span>
                      <span className="flex items-center gap-1 text-yellow-500 font-medium">
                        +{mission.xpReward} XP
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={mission.progress} className="h-1.5 flex-1" />
                      <span className="text-xs font-medium w-8 text-right">{mission.progress}%</span>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel - Mission Detail */}
        <div className={`flex-1 flex flex-col bg-card/30 ${!selectedMissionId ? 'hidden md:flex' : 'flex'}`}>
          {selectedMission ? (
            <>
              {/* Mission Detail Header with Back Button */}
              <div className="p-4 border-b border-border/50 flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedMissionId(null)}
                  className="gap-2 rounded-full border-border/60 hover:bg-accent/50 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Missions List</span>
                </Button>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider hidden sm:inline">
                    Mission Workspace
                  </span>
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-24 md:pb-10">
                <div className="max-w-2xl mx-auto space-y-8">
                  {/* Header */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`${CATEGORY_COLORS[selectedMission.category] || CATEGORY_COLORS.Other} px-3 py-1 text-xs uppercase font-bold tracking-widest`}>
                        {selectedMission.category}
                      </Badge>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={openEdit}><Edit className="w-4 h-4 text-muted-foreground" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:text-destructive hover:bg-destructive/10"><Trash className="w-4 h-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Mission</AlertDialogTitle>
                              <AlertDialogDescription>Are you sure you want to delete this mission? This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight">{selectedMission.title}</h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">{selectedMission.description}</p>
                    
                    <div className="flex flex-wrap gap-4 pt-2">
                      {selectedMission.targetDate && (
                        <div className="flex items-center gap-2 text-sm bg-accent/50 px-3 py-1.5 rounded-md border border-border/50">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>Target: <span className="font-medium text-foreground">{format(selectedMission.targetDate, "MMM d, yyyy")}</span></span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-3 py-1.5 rounded-md border border-yellow-500/20 font-semibold">
                        <Target className="w-4 h-4" />
                        Reward: {selectedMission.xpReward} XP
                      </div>
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-lg">Milestones</h3>
                      <div className="text-2xl font-black text-primary">{selectedMission.progress}%</div>
                    </div>
                    
                    <div className="space-y-3">
                      {selectedMilestones.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No milestones added.</p>
                      ) : (
                        selectedMilestones.map(ms => (
                          <div key={ms.id} className="flex flex-col gap-2 p-3 rounded-lg border bg-background hover:bg-accent/5 border-border/50 transition-colors">
                            <div className="flex items-start gap-4">
                              <Checkbox 
                                id={ms.id} 
                                checked={ms.completed} 
                                onCheckedChange={() => toggleMilestone(ms.id)} 
                                className="mt-1 w-5 h-5"
                              />
                              <div 
                                className="flex-1 cursor-pointer"
                                onClick={() => setExpandedMilestoneId(expandedMilestoneId === ms.id ? null : ms.id)}
                              >
                                <label 
                                  className={`text-base font-medium cursor-pointer transition-colors ${ms.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                                >
                                  {ms.title}
                                </label>
                                {ms.completed && ms.completedAt && (
                                  <p className="text-xs text-primary/70 mt-1">Completed {format(ms.completedAt, "MMM d")}</p>
                                )}
                              </div>
                            </div>
                            
                            {expandedMilestoneId === ms.id && (
                              <div className="pl-9 pr-2 pb-2 space-y-3 mt-2 animate-in fade-in slide-in-from-top-2">
                                <Textarea 
                                  placeholder="Add notes, reflections, or evidence of completion..." 
                                  className="min-h-[80px] bg-muted/30"
                                  value={milestoneNotes[ms.id] || ""}
                                  onChange={(e) => setMilestoneNotes({...milestoneNotes, [ms.id]: e.target.value})}
                                />
                                <div className="flex flex-wrap gap-2">
                                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><BrainCircuit className="w-3.5 h-3.5" /> Attach Brain</Button>
                                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Attach Post</Button>
                                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><Target className="w-3.5 h-3.5" /> Link Resource</Button>
                                  <div className="flex-1" />
                                  <Button size="sm" className="h-7 text-xs">Save Notes</Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {selectedMission.status !== "completed" && (
                    <div className="flex justify-end pt-4">
                      <Button 
                        size="lg" 
                        onClick={() => completeMission(selectedMission.id)}
                        className={`gap-2 font-bold ${allMilestonesDone ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 animate-pulse' : 'variant-secondary'}`}
                        variant={allMilestonesDone ? "default" : "secondary"}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Complete Mission
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
                <Rocket className="w-10 h-10 opacity-50" />
              </div>
              <h3 className="text-xl font-bold mb-2">Select a Mission</h3>
              <p className="max-w-xs text-center">Choose a mission from the list to view details, track milestones, and earn XP.</p>
            </div>
          )}
        </div>
        </div>
        </TabsContent>

        <TabsContent value="daily" className="flex-1 p-6 overflow-y-auto m-0">
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Daily Actions</h2>
            <Card className="p-6">
              <p className="text-muted-foreground">Log your daily repetitions, habits, and actionable steps towards your pathways.</p>
              {/* Daily actions list placeholder */}
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-4 p-4 border rounded-xl bg-accent/5">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Review Learning Modules</h4>
                    <p className="text-sm text-muted-foreground">15 mins daily review to reinforce connections.</p>
                  </div>
                  <Button variant="outline" className="ml-auto">Complete</Button>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accountability" className="flex-1 p-6 overflow-y-auto m-0">
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Accountability</h2>
            <Card className="p-6">
              <p className="text-muted-foreground">Track your streaks, commitments, and verify your progress with the community.</p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-6 border rounded-xl bg-accent/5 text-center">
                  <h3 className="text-4xl font-bold text-primary mb-2">12</h3>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Day Streak</p>
                </div>
                <div className="p-6 border rounded-xl bg-accent/5 text-center">
                  <h3 className="text-4xl font-bold text-green-500 mb-2">94%</h3>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Completion Rate</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="coordination" className="flex-1 p-6 overflow-y-auto m-0">
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Real Human Coordination</h2>
            <Card className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Open Requests</h3>
                  <p className="text-sm text-muted-foreground">Collaborate on complex pathways with peers, mentors, and the wider civilization.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <Select value={coordinationTagFilter} onValueChange={setCoordinationTagFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Filter by Tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Tags</SelectItem>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button><Plus className="w-4 h-4 mr-2" /> Post Request</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Post an Open Request</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Mission Step / Topic</Label>
                          <Input placeholder="e.g. Build Mental Models Step 3" />
                        </div>
                        <div className="space-y-2">
                          <Label>Request Type</Label>
                          <Select defaultValue="mentor">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mentor">Mentor Needed</SelectItem>
                              <SelectItem value="peer">Peer Review</SelectItem>
                              <SelectItem value="collab">Co-creation</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Tag</Label>
                          <Select defaultValue="beginner">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Details</Label>
                          <Textarea placeholder="Describe what you need help with..." className="min-h-[100px]" />
                        </div>
                        <Button className="w-full">Post Request</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  {
                    id: "req1",
                    name: "You",
                    initials: "You",
                    title: "Stuck on \"Build Mental Models\" Step 3",
                    time: "2 hours ago",
                    type: "Mentor Needed",
                    tag: "Beginner",
                    text: "I'm having trouble understanding how to apply the framework to my daily workflow. Could someone who has completed this step walk me through their approach?",
                    canComplete: true,
                  },
                  {
                    id: "req2",
                    name: "Alice Smith",
                    initials: "AS",
                    title: "Review my \"Cognitive Bias\" analysis",
                    time: "5 hours ago",
                    type: "Peer Review",
                    tag: "Advanced",
                    text: "I've compiled my analysis for the cognitive bias mission but I want to make sure I haven't missed any blind spots. Looking for a fresh pair of eyes!",
                    canComplete: false,
                  },
                  {
                    id: "req3",
                    name: "David Lee",
                    initials: "DL",
                    title: "Need help setting up local environment",
                    time: "1 day ago",
                    type: "Co-creation",
                    tag: "Urgent",
                    text: "I am completely stuck setting up the dev environment for the advanced project. Please help!",
                    canComplete: false,
                  }
                ].filter(r => coordinationTagFilter === "All" || r.tag === coordinationTagFilter).map((req) => (
                  <div key={req.id} className="p-4 border rounded-xl bg-accent/5">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <Avatar>
                          <AvatarFallback>{req.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold">{req.title}</h4>
                          <p className="text-sm text-muted-foreground">Posted by {req.name} • {req.time}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">{req.tag}</Badge>
                        <Badge variant="outline">{req.type}</Badge>
                      </div>
                    </div>
                    <p className="mt-3 text-sm">{req.text}</p>
                    <div className="mt-4 flex gap-2">
                      {req.canComplete ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-600/30 hover:bg-emerald-50"><CheckCircle2 className="w-4 h-4 mr-2"/> Mark Complete & Endorse Mentor</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Complete Coordination & Endorse Mentor</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Who helped you?</Label>
                                <Select defaultValue="aris">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="aris">Dr. Aris Thorne</SelectItem>
                                    <SelectItem value="sarah">Sarah Jenkins</SelectItem>
                                    <SelectItem value="other">Someone else...</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Endorsement Type</Label>
                                <div className="flex gap-2">
                                  <Badge className="cursor-pointer bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Star className="w-3 h-3 mr-1 fill-yellow-500" /> Great Mentor</Badge>
                                  <Badge variant="outline" className="cursor-pointer text-muted-foreground"><ThumbsUp className="w-3 h-3 mr-1" /> Helpful Peer</Badge>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Tags</Label>
                                <div className="flex gap-2 flex-wrap">
                                  <Badge variant="secondary" className="cursor-pointer">Clear Communicator</Badge>
                                  <Badge variant="secondary" className="cursor-pointer">Patient</Badge>
                                  <Badge variant="secondary" className="cursor-pointer">Deep Expertise</Badge>
                                  <Badge variant="outline" className="cursor-pointer border-dashed"><Plus className="w-3 h-3 mr-1" /> Add</Badge>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Feedback (Public)</Label>
                                <Textarea placeholder="Share a few words about how they helped you..." />
                              </div>
                              <Button className="w-full">Submit Endorsement & Close Request</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <Button variant="outline" size="sm"><MessageSquare className="w-4 h-4 mr-2"/> Offer Help</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Recent Endorsements
                </h3>
                <div className="space-y-4">
                  {/* Endorsement 1 */}
                  <div className="p-4 border rounded-xl bg-card">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <Avatar>
                          <AvatarFallback>MK</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold">Helped with "Memory Palaces"</h4>
                          <p className="text-sm text-muted-foreground">Endorsed by Michael K. • 1 day ago</p>
                        </div>
                      </div>
                      <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                        <Star className="w-3 h-3 mr-1 fill-yellow-500" /> Endorsed Mentor
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm italic text-muted-foreground">"Incredible mentor! Broke down the loci method so clearly that I was able to memorize a deck of cards in my first try. Highly recommend collaborating with them!"</p>
                    <div className="mt-3">
                      <Badge variant="secondary" className="text-xs mr-2">Clear Communicator</Badge>
                      <Badge variant="secondary" className="text-xs">Patient</Badge>
                    </div>
                  </div>

                  {/* Endorsement 2 */}
                  <div className="p-4 border rounded-xl bg-card">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <Avatar>
                          <AvatarFallback>RY</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold">Co-created "Systems Thinking" mapping</h4>
                          <p className="text-sm text-muted-foreground">Endorsed by Rachel Y. • 3 days ago</p>
                        </div>
                      </div>
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                        <ThumbsUp className="w-3 h-3 mr-1" /> Great Peer
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm italic text-muted-foreground">"Awesome collaboration. We mapped out the entire feedback loop system in Miro. Super sharp insights."</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="progression" className="flex-1 p-6 overflow-y-auto m-0">
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Progression Tracker</h2>
            <Card className="p-6">
              <p className="text-muted-foreground">View your overall evolution across all active systems and domains.</p>
              <div className="mt-8 space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Cognitive Frameworks</span>
                    <span className="text-muted-foreground">Level 4</span>
                  </div>
                  <Progress value={65} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Emotional Resilience</span>
                    <span className="text-muted-foreground">Level 2</span>
                  </div>
                  <Progress value={30} className="h-3" />
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Mission</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(CATEGORY_COLORS).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Target Date (Optional)</Label>
                <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>XP Reward</Label>
              <Select value={xpReward} onValueChange={setXpReward}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 XP - Minor</SelectItem>
                  <SelectItem value="100">100 XP - Standard</SelectItem>
                  <SelectItem value="200">200 XP - Major</SelectItem>
                  <SelectItem value="500">500 XP - Epic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
