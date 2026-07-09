import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommunities } from "@/hooks/use-communities";
import { useReputation } from "@/hooks/use-reputation";
import { idb } from "@/lib/db";
import { CircleCheckIn } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, Plus, Shield, Stethoscope, Gamepad2, BookOpen, Activity, MessageCircle, Flame, ArrowUp, ArrowDown, MessageSquare, BrainCircuit, Handshake, Network, Crosshair, Zap, Puzzle, Sprout, Target, Heart, Smile, Star, Award } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreateCircleDialog } from "@/components/community/CreateCircleDialog";
import { CircleRootAdmin } from "@/components/community/CircleRootAdmin";

function useCheckins() {
  const queryClient = useQueryClient();
  const { data: checkins = [] } = useQuery({
    queryKey: ["checkins"],
    queryFn: () => idb.getAll<CircleCheckIn>("checkins"),
  });
  
  const { mutateAsync: addCheckin } = useMutation({
    mutationFn: async (checkin: CircleCheckIn) => {
      await idb.put("checkins", checkin);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkins"] });
    }
  });

  const { mutateAsync: updateCheckin } = useMutation({
    mutationFn: async (checkin: CircleCheckIn) => {
      await idb.put("checkins", checkin);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkins"] });
    }
  });

  return { checkins, addCheckin, updateCheckin };
}

function CheckInCard({ c, moodEmojis, updateCheckin, toast }: any) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const mood = moodEmojis.find((m: any) => m.score === c.moodScore)?.emoji || "😐";

  const handleReply = () => {
    if (replyText.trim()) {
      const newReplies = [...(c.replies || []), { id: crypto.randomUUID(), userId: "me", content: replyText, createdAt: Date.now() }];
      updateCheckin({ ...c, replies: newReplies });
      setReplyText("");
      setReplyOpen(false);
    }
  };

  const handleLinkBrain = () => {
    toast({title: "Redirecting...", description: "Taking you to the library to choose or create a brain."});
    setTimeout(() => window.location.href = "/library", 1000);
  };

  return (
    <div className="flex gap-3">
      <Avatar className="w-8 h-8">
        <AvatarFallback className="bg-primary/10 text-xs">U</AvatarFallback>
      </Avatar>
      <div className="bg-muted/30 rounded-lg p-3 flex-1 border shadow-sm">
        <div className="flex justify-between items-start mb-1">
          <span className="font-medium text-sm">User</span>
          <span className="text-xs text-muted-foreground">
            {new Date(c.createdAt).toLocaleDateString()}
          </span>
        </div>
        <p className="text-sm flex items-center gap-2">
          <span className="text-lg">{mood}</span>
          {c.message || "Checked in"}
        </p>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 text-muted-foreground flex-wrap">
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={() => updateCheckin({ ...c, upvotes: (c.upvotes || 0) + 1 })}>
            <ArrowUp className="w-3 h-3" /> {c.upvotes || 0}
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={() => updateCheckin({ ...c, downvotes: (c.downvotes || 0) + 1 })}>
            <ArrowDown className="w-3 h-3" /> {c.downvotes || 0}
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={() => setReplyOpen(!replyOpen)}>
            <MessageSquare className="w-3 h-3" /> {c.replies?.length || 0} Replies
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 text-primary hover:text-primary/80" onClick={handleLinkBrain}>
            <BrainCircuit className="w-3 h-3" /> {c.linkedBrainId ? "Linked Brain" : "Link Brain"}
          </Button>
        </div>
        
        {replyOpen && (
          <div className="mt-3 flex gap-2">
            <Input size={1} className="h-8 text-xs" placeholder="Write a reply..." value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleReply()} />
            <Button size="sm" className="h-8 text-xs" onClick={handleReply}>Send</Button>
          </div>
        )}

        {c.replies && c.replies.length > 0 && (
          <div className="mt-3 pl-4 border-l-2 border-border space-y-2">
            {c.replies.map((r: any) => (
              <div key={r.id} className="text-sm bg-background/50 p-2 rounded-md">
                <span className="font-medium mr-2">User</span>
                <span>{r.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommunityPage() {
  const { communities, addCommunity } = useCommunities();
  const { checkins, addCheckin, updateCheckin } = useCheckins();
  const { addXPEvent } = useReputation();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [checkinMessage, setCheckinMessage] = useState("");
  const [moodScore, setMoodScore] = useState<number>(0);

  const [weeklyGoal, setWeeklyGoal] = useState("");

  const filtered = communities.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  const getIcon = (iconName?: string) => {
    switch(iconName) {
      case 'shield': return <Shield className="w-6 h-6" />;
      case 'stethoscope': return <Stethoscope className="w-6 h-6" />;
      case 'gamepad': return <Gamepad2 className="w-6 h-6" />;
      case 'book': return <BookOpen className="w-6 h-6" />;
      default: return <Users className="w-6 h-6" />;
    }
  };

  const handleGlobalCheckIn = async () => {
    if (!moodScore) {
      toast({ title: "Error", description: "Please select a mood", variant: "destructive" });
      return;
    }
    
    await addCheckin({
      id: crypto.randomUUID(),
      circleId: "global",
      userId: "me",
      message: checkinMessage,
      moodScore,
      createdAt: Date.now()
    });
    
    await addXPEvent("check_in", 25, "Daily Momentum Check-In");
    toast({ title: "Checked in!", description: "+25 XP earned for check-in." });
    setCheckinMessage("");
    setMoodScore(0);
  };

  const handleCircleCheckIn = async (circleId: string) => {
    if (!moodScore) {
      toast({ title: "Error", description: "Please select a mood", variant: "destructive" });
      return;
    }
    
    await addCheckin({
      id: crypto.randomUUID(),
      circleId,
      userId: "me",
      message: checkinMessage,
      moodScore,
      createdAt: Date.now()
    });
    
    await addXPEvent("check_in", 25, "Circle Check-In");
    toast({ title: "Checked in to circle!", description: "+25 XP earned." });
    setCheckinMessage("");
    setMoodScore(0);
  };

  const todayStr = new Date().toLocaleDateString();
  const todaysGlobalCheckins = checkins.filter(c => 
    c.circleId === "global" && c.userId === "me" && 
    new Date(c.createdAt).toLocaleDateString() === todayStr
  ).length;

  const activeComm = communities.find(c => c.id === selectedCommunity);
  const commCheckins = checkins
    .filter(c => c.circleId === selectedCommunity)
    .sort((a, b) => {
      const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
      const scoreB = (b.upvotes || 0) - (b.downvotes || 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return b.createdAt - a.createdAt;
    })
    .slice(0, 5);

  const moodEmojis = [
    { score: 1, emoji: "😴" },
    { score: 2, emoji: "😐" },
    { score: 3, emoji: "🙂" },
    { score: 4, emoji: "😊" },
    { score: 5, emoji: "🚀" }
  ];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 md:grid-cols-4 max-w-3xl mx-auto">
          <TabsTrigger value="civilization" className="gap-2"><Users className="w-4 h-4"/> Civilization</TabsTrigger>
          <TabsTrigger value="connections" className="gap-2 hidden md:flex"><Network className="w-4 h-4"/> Purpose-Based</TabsTrigger>
          <TabsTrigger value="connections" className="gap-2 md:hidden"><Network className="w-4 h-4"/> Purpose</TabsTrigger>
          <TabsTrigger value="mentor" className="gap-2"><Handshake className="w-4 h-4"/> Mentor</TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2"><Award className="w-4 h-4"/> Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="civilization" className="space-y-8 mt-0">
          {/* Daily Check-In Section */}
          <Card className="bg-gradient-to-r from-card to-card/50 border-primary/20 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      How's your momentum today?
                    </h2>
                    <p className="text-sm text-muted-foreground">Contribute to the knowledge civilization daily to build your streak.</p>
                  </div>
                  
                  <div className="flex gap-2">
                    {moodEmojis.map(m => (
                      <button
                        key={m.score}
                        onClick={() => setMoodScore(m.score)}
                        className={`text-3xl transition-transform hover:scale-110 p-2 rounded-full ${moodScore === m.score ? 'bg-primary/20 scale-110' : 'grayscale hover:grayscale-0'}`}
                      >
                        {m.emoji}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex gap-3">
                    <Input 
                      placeholder="What are you focusing on today?" 
                      value={checkinMessage}
                      onChange={(e) => setCheckinMessage(e.target.value)}
                      className="max-w-md"
                    />
                    <Button onClick={handleGlobalCheckIn}>Contribute</Button>
                  </div>
                </div>
                
                <div className="bg-background/50 rounded-xl p-4 min-w-[200px] border flex flex-col items-center justify-center text-center">
                  <Flame className="w-8 h-8 text-orange-500 mb-2" />
                  <div className="text-2xl font-bold">{todaysGlobalCheckins > 0 ? "Done!" : "Pending"}</div>
                  <div className="text-sm text-muted-foreground">Today's Contribution</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Civilization Circles</h1>
              <p className="text-muted-foreground mt-1">Join specialized domains, track shared goals, and collaborate.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search civilization..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <CreateCircleDialog />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(community => {
              const count = checkins.filter(c => c.circleId === community.id).length;
              const latest = checkins.filter(c => c.circleId === community.id).sort((a,b) => b.createdAt - a.createdAt)[0];
              
              return (
                <Card 
                  key={community.id} 
                  className="hover:border-primary/50 transition-colors cursor-pointer group flex flex-col h-full"
                  onClick={() => {
                    setSelectedCommunity(community.id);
                    setCheckinMessage("");
                    setMoodScore(0);
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {getIcon(community.icon)}
                      </div>
                      {community.active && (
                        <Badge variant="secondary" className="flex items-center gap-1 bg-green-500/10 text-green-500 hover:bg-green-500/20">
                          <Activity className="w-3 h-3" /> Active
                        </Badge>
                      )}
                    </div>
                    <CardTitle>{community.name}</CardTitle>
                    <CardDescription className="line-clamp-2">{community.description}</CardDescription>
                  </CardHeader>
                  <div className="flex-grow"></div>
                  <CardContent className="pb-4">
                    <div className="flex items-center text-sm text-muted-foreground font-medium">
                      <Users className="w-4 h-4 mr-2" />
                      {community.memberCount.toLocaleString()} minds
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t mt-4 pt-4 border-t-border bg-muted/20 -mx-6 px-6 -mb-4 pb-4">
                      <div className="flex items-center">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        {count} contributions
                      </div>
                      {latest && (
                        <div>
                          Active {new Date(latest.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
              <p>No nodes found matching your search.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="connections" className="mt-0 space-y-6">
          <div className="text-center space-y-4 max-w-2xl mx-auto py-12">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
              <Network className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Purpose-Based Networking</h1>
            <p className="text-muted-foreground text-lg">Connect through shared missions, compatible values, and mutual growth goals instead of vanity metrics.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                    <Crosshair className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-xs">96% Match</Badge>
                </div>
                <CardTitle className="mt-4">Sarah Jenkins</CardTitle>
                <CardDescription>Level 24 • Cognitive Psychology</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3"/> Shared Mission</span>
                    <span className="font-medium text-right ml-2 line-clamp-1">Master Memory Palaces</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Heart className="w-3 h-3"/> Compatible Values</span>
                    <span className="font-medium text-right ml-2 line-clamp-1">Curiosity, Rigor</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Smile className="w-3 h-3"/> Complementary Personality</span>
                    <span className="font-medium text-right ml-2 line-clamp-1">Analytical & Creative</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3"/> Complementary Skill</span>
                    <span className="font-medium text-right ml-2 line-clamp-1">Information Parsing</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button className="flex-1" variant="outline">Invite</Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="flex-1"><MessageSquare className="w-4 h-4 mr-2" /> Message</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Direct Message Sarah Jenkins</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Message</Label>
                          <Textarea 
                            defaultValue="Hi Sarah! I saw we have a 96% match and both share the mission to Master Memory Palaces. Would you be interested in coordinating our efforts?"
                            className="min-h-[120px]"
                          />
                        </div>
                        <Button className="w-full">Send Message</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                    <Puzzle className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-xs">92% Match</Badge>
                </div>
                <CardTitle className="mt-4">David Park</CardTitle>
                <CardDescription>Level 18 • Systems Thinking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3"/> Shared Mission</span>
                    <span className="font-medium text-right ml-2 line-clamp-1">Build Mental Models</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Heart className="w-3 h-3"/> Compatible Values</span>
                    <span className="font-medium text-right ml-2 line-clamp-1">Efficiency, Logic</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Smile className="w-3 h-3"/> Complementary Personality</span>
                    <span className="font-medium text-right ml-2 line-clamp-1">Structured & Visionary</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3"/> Complementary Skill</span>
                    <span className="font-medium text-right ml-2 line-clamp-1">Data Structuring</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button className="flex-1" variant="outline">Invite</Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="flex-1"><MessageSquare className="w-4 h-4 mr-2" /> Message</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Direct Message David Park</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Message</Label>
                          <Textarea 
                            defaultValue="Hi David! I noticed our 92% match. We both have the mission to Build Mental Models and I think my Data Structuring skills could complement your Systems Thinking. Want to connect?"
                            className="min-h-[120px]"
                          />
                        </div>
                        <Button className="w-full">Send Message</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
                    <Sprout className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-xs">88% Match</Badge>
                </div>
                <CardTitle className="mt-4">Elena Rodriguez</CardTitle>
                <CardDescription>Level 31 • Behavioral Science</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3"/> Shared Mission</span>
                    <span className="font-medium text-right ml-2 line-clamp-1">Habit Formation Loop</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Heart className="w-3 h-3"/> Compatible Values</span>
                    <span className="font-medium text-right ml-2 line-clamp-1">Empathy, Consistency</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Smile className="w-3 h-3"/> Complementary Personality</span>
                    <span className="font-medium text-right ml-2 line-clamp-1">Patient & Driven</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3"/> Complementary Skill</span>
                    <span className="font-medium text-right ml-2 line-clamp-1">Trigger Analysis</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button className="flex-1" variant="outline">Invite</Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="flex-1"><MessageSquare className="w-4 h-4 mr-2" /> Message</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Direct Message Elena Rodriguez</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Message</Label>
                          <Textarea 
                            defaultValue="Hi Elena! Given our 88% match and shared mission around the Habit Formation Loop, I'd love to chat. Your Trigger Analysis skills look like exactly what I need right now."
                            className="min-h-[120px]"
                          />
                        </div>
                        <Button className="w-full">Send Message</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mentor" className="mt-0 space-y-6">
          <div className="text-center space-y-4 max-w-2xl mx-auto py-12">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
              <Handshake className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Mentor Network</h1>
            <p className="text-muted-foreground text-lg">Connect with seasoned pathfinders to accelerate your cognitive evolution, or share your wisdom to guide others.</p>
            <div className="pt-6 flex gap-4 justify-center">
              <Button size="lg" className="gap-2"><Users className="w-4 h-4" /> Find a Mentor</Button>
              <Button size="lg" variant="outline" className="gap-2"><BookOpen className="w-4 h-4" /> Offer Guidance</Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <Card className="md:col-span-2 border-primary/20 shadow-md bg-accent/5">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2"><Crosshair className="w-5 h-5 text-purple-500"/> Suggested Mentors (from your active requests)</CardTitle>
                    <CardDescription>Based on your open "Real Human Coordination" requests for mission steps</CardDescription>
                  </div>
                  <Badge className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-none">Live Matching</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: "Dr. Aris Thorne", expertise: "Cognitive Frameworks", level: 45, requestMatch: "Build Mental Models Step 3", matchScore: "99%", endorsements: 124 },
                    { name: "Sarah Jenkins", expertise: "Bias Analysis", level: 24, requestMatch: "Cognitive Bias Review", matchScore: "95%", endorsements: 38 }
                  ].map((mentor, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-background rounded-lg border hover:border-purple-500/30 transition-colors">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-purple-500/10 text-purple-500 font-bold">{mentor.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {mentor.name} <span className="text-muted-foreground text-xs font-normal">Lvl {mentor.level}</span>
                            <Badge variant="secondary" className="text-[10px] px-1 h-4 bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20"><Star className="w-2.5 h-2.5 mr-0.5 fill-yellow-500" />{mentor.endorsements}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mb-1">{mentor.expertise}</div>
                          <div className="text-xs bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full inline-block">Matches: {mentor.requestMatch}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-sm font-bold text-purple-600">{mentor.matchScore}</span>
                        <Button size="sm" variant="outline" className="h-8">Message</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><ArrowUp className="w-5 h-5 text-emerald-500"/> Recommended Guides</CardTitle>
                <CardDescription>Based on your current learning pathways</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "Dr. Alice Vance", expertise: "Neuroplasticity", level: 42, match: "98%" },
                  { name: "Marcus Chen", expertise: "Systems Architecture", level: 38, match: "94%" },
                ].map((mentor, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{mentor.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm">{mentor.name} <span className="text-muted-foreground text-xs font-normal">Lvl {mentor.level}</span></div>
                        <div className="text-xs text-muted-foreground">{mentor.expertise}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">{mentor.match} Match</Badge>
                      <Button size="sm" variant="ghost" className="h-6 text-xs px-2">Connect</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><ArrowDown className="w-5 h-5 text-blue-500"/> Seekers Looking for Guidance</CardTitle>
                <CardDescription>Share your knowledge in these domains</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "Elena R.", seeking: "React Performance", level: 12, match: "88%" },
                  { name: "David K.", seeking: "Data Structures", level: 8, match: "82%" },
                ].map((seeker, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{seeker.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm">{seeker.name} <span className="text-muted-foreground text-xs font-normal">Lvl {seeker.level}</span></div>
                        <div className="text-xs text-muted-foreground">Seeking: {seeker.seeking}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30">{seeker.match} Match</Badge>
                      <Button size="sm" variant="ghost" className="h-6 text-xs px-2">Offer Help</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-0 space-y-6">
          <div className="flex flex-col items-center mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center justify-center gap-3">
              <Award className="w-8 h-8 text-amber-500" />
              Community Leaderboard
            </h2>
            <p className="text-muted-foreground max-w-lg">
              Showcasing our top contributors based on completed 'Real Human Coordination' tasks.
            </p>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            {[
              { rank: 1, name: "Elena R.", level: 42, tasks: 156, points: 14200, role: "Grandmaster" },
              { rank: 2, name: "Marcus T.", level: 38, tasks: 142, points: 12850, role: "Architect" },
              { rank: 3, name: "Sarah J.", level: 35, tasks: 128, points: 11400, role: "Strategist" },
              { rank: 4, name: "David K.", level: 31, tasks: 95, points: 8900, role: "Coordinator" },
              { rank: 5, name: "Aisha M.", level: 28, tasks: 84, points: 7600, role: "Facilitator" },
              { rank: 6, name: "James L.", level: 25, tasks: 72, points: 6100, role: "Builder" },
              { rank: 7, name: "Chloe S.", level: 22, tasks: 65, points: 5400, role: "Builder" },
            ].map((user) => (
              <div 
                key={user.rank} 
                className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.01] ${
                  user.rank === 1 ? 'bg-amber-500/10 border-amber-500/50' :
                  user.rank === 2 ? 'bg-slate-300/10 border-slate-400/50' :
                  user.rank === 3 ? 'bg-orange-700/10 border-orange-700/50' :
                  'bg-card border-border hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-full ${
                    user.rank === 1 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' :
                    user.rank === 2 ? 'bg-slate-300 text-slate-800 shadow-lg shadow-slate-300/30' :
                    user.rank === 3 ? 'bg-orange-700 text-white shadow-lg shadow-orange-700/30' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {user.rank}
                  </div>
                  <Avatar className={user.rank <= 3 ? 'ring-2 ring-primary/20 ring-offset-2 ring-offset-background' : ''}>
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {user.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {user.name}
                      {user.rank === 1 && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                    </div>
                    <div className="text-xs text-muted-foreground">{user.role} • Level {user.level}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">{user.points.toLocaleString()} XP</div>
                  <div className="text-xs text-muted-foreground">{user.tasks} Tasks</div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Community Detail Sidebar */}
      <Sheet open={!!selectedCommunity} onOpenChange={(open) => !open && setSelectedCommunity(null)}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          {activeComm && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-primary/10 text-primary rounded-xl">
                    {getIcon(activeComm.icon)}
                  </div>
                  <div>
                    <SheetTitle className="text-2xl">{activeComm.name}</SheetTitle>
                    <SheetDescription className="flex items-center gap-2 mt-1">
                      <Users className="w-3 h-3" /> {activeComm.memberCount.toLocaleString()} members
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-6">
                <div className="text-sm">
                  {activeComm.description}
                </div>
                
                <CircleRootAdmin communityId={activeComm.id} communityName={activeComm.name} />

                <div className="bg-accent/10 border rounded-lg p-4">
                  <label className="text-sm font-semibold mb-2 block">Active Relay (Ask the Circle)</label>
                  <p className="text-xs text-muted-foreground mb-3">Send a question into orbit. The system will find the best member or resource to help you.</p>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="e.g. Can someone review my React architecture?"
                      className="bg-background"
                      id="relay-input"
                    />
                    <Button onClick={(e) => {
                      const btn = e.currentTarget;
                      const input = document.getElementById('relay-input') as HTMLInputElement;
                      if (!input.value) return;
                      
                      const originalText = btn.innerHTML;
                      btn.innerHTML = '<span class="animate-spin mr-2">⭕</span> Orbiting...';
                      btn.disabled = true;
                      
                      setTimeout(() => {
                        btn.innerHTML = '✔ Resource Found';
                        btn.className = 'bg-green-600 text-white hover:bg-green-700 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 shadow h-9 px-4 py-2';
                        
                        const resultDiv = document.getElementById('relay-result');
                        if (resultDiv) resultDiv.classList.remove('hidden');
                        
                        toast({ title: "Quesoneer Notification Sent!", description: `Tagged related subjects. Post launched.` });
                        
                        setTimeout(() => {
                          btn.innerHTML = originalText;
                          btn.disabled = false;
                          btn.className = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2';
                          input.value = '';
                        }, 5000);
                      }, 2500);
                    }}>
                      Launch
                    </Button>
                  </div>
                  
                  <div id="relay-result" className="hidden mt-4 p-4 border border-green-500/30 bg-green-500/10 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                        ✔ Resource Found
                      </div>
                      <Badge variant="outline" className="text-xs border-green-500/30">Similarity: 94%</Badge>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">From:</span> Sarah J.
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="default" className="text-xs h-7">Open Resource</Button>
                      <Button size="sm" variant="secondary" className="text-xs h-7">View Route (3 hops)</Button>
                      <Button size="sm" variant="outline" className="text-xs h-7">Save</Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2 border-b pb-2">
                    <Activity className="w-4 h-4" /> Check In
                  </h4>
                  
                  <div className="flex justify-center gap-3 mb-4">
                    {moodEmojis.map(m => (
                      <button
                        key={m.score}
                        onClick={() => setMoodScore(m.score)}
                        className={`text-2xl transition-transform hover:scale-110 p-2 rounded-full ${moodScore === m.score ? 'bg-primary/20 scale-110' : 'grayscale hover:grayscale-0'}`}
                      >
                        {m.emoji}
                      </button>
                    ))}
                  </div>
                  <Input 
                    placeholder="Update the circle on your progress..."
                    value={checkinMessage}
                    onChange={e => setCheckinMessage(e.target.value)}
                  />
                  <Button className="w-full" onClick={() => handleCircleCheckIn(activeComm.id)}>
                    Post Check-In
                  </Button>
                </div>

                <div className="space-y-4 mt-8">
                  <h4 className="font-semibold flex items-center gap-2 border-b pb-2">
                    <MessageCircle className="w-4 h-4" /> Recent Activity
                  </h4>
                  
                  {commCheckins.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No check-ins yet. Be the first!</p>
                  ) : (
                    <div className="space-y-4">
                      {commCheckins.map(c => (
                        <CheckInCard key={c.id} c={c} moodEmojis={moodEmojis} updateCheckin={updateCheckin} toast={toast} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
