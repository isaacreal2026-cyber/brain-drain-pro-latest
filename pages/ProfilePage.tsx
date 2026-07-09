import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Settings, MessageSquare, Network, Flame, Target, History, Trophy, Award, Activity, Brain, BookOpen, Compass, Star, Smile, BellOff, Calendar, Filter, Search, Grid3x3, LayoutList, AtSign, QrCode, Link as LinkIcon, ExternalLink, UserPlus, Share2 } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { useReputation } from "@/hooks/use-reputation";
import { useMissions } from "@/hooks/use-missions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ContributionHeatmap } from "@/components/profile/ContributionHeatmap";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { idb } from "@/lib/db";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";

function getLevelTitle(level: number) {
  if (level <= 5) return "Initiate";
  if (level <= 15) return "Explorer";
  if (level <= 30) return "Architect";
  if (level <= 50) return "Specialist";
  if (level <= 75) return "Master";
  return "Legend";
}

// Mock contribution data generator
const generateContributionData = () => {
  const weeks = [];
  for (let i = 0; i < 52; i++) {
    const days = [];
    for (let j = 0; j < 7; j++) {
      const level = Math.floor(Math.random() * 5); // 0-4
      days.push({ level, date: new Date(Date.now() - (365 - (i * 7 + j)) * 24 * 60 * 60 * 1000) });
    }
    weeks.push(days);
  }
  return weeks;
};

export function ProfilePage() {
  const { profile, isLoading: profileLoading, updateProfile } = useProfile();
  const { reputation, xpEvents, isLoading: repLoading } = useReputation();
  const { missions, isLoading: missionsLoading } = useMissions();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [statusEmoji, setStatusEmoji] = useState("😎");
  const [statusMessage, setStatusMessage] = useState("Building things");
  const [activitySearch, setActivitySearch] = useState("");
  const [contributionData, setContributionData] = useState<any[]>(generateContributionData());
  const [totalContributions, setTotalContributions] = useState(0);
  const [selectedDayData, setSelectedDayData] = useState<any | null>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const targetUserId = searchParams.get("userId");
  const isCurrentUser = !targetUserId || targetUserId === "me" || (profile && targetUserId === profile.id);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const [posts, brains, checkins] = await Promise.all([
          idb.getAll("posts"),
          idb.getAll("brains"),
          idb.getAll("checkins")
        ]);

        const activityMap: Record<string, { count: number, items: any[] }> = {};
        let total = 0;
        const uId = isCurrentUser ? "me" : targetUserId;

        const countItem = (type: string, item: any) => {
          if (item.userId !== uId && uId !== "me") return; 
          const d = new Date(item.createdAt || Date.now());
          const key = d.toISOString().split("T")[0];
          if (!activityMap[key]) {
            activityMap[key] = { count: 0, items: [] };
          }
          activityMap[key].count++;
          activityMap[key].items.push({ type, ...item });
          total++;
        };

        posts.forEach((p: any) => countItem('post', p));
        brains.forEach((b: any) => countItem('brain', b));
        checkins.forEach((c: any) => countItem('checkin', c));

        const weeks = [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const dayOfWeek = now.getDay();
        const endOfWeek = new Date(now.getTime() + (6 - dayOfWeek) * 24 * 60 * 60 * 1000);
        const startDate = new Date(endOfWeek.getTime() - 363 * 24 * 60 * 60 * 1000);
        
        for (let i = 0; i < 52; i++) {
          const days = [];
          for (let j = 0; j < 7; j++) {
            const pastDate = new Date(startDate.getTime() + (i * 7 + j) * 24 * 60 * 60 * 1000);
            const key = pastDate.toISOString().split("T")[0];
            const data = activityMap[key] || { count: 0, items: [] };
            const count = data.count;
            let level = 0;
            if (count >= 4) level = 4;
            else if (count >= 3) level = 3;
            else if (count >= 2) level = 2;
            else if (count >= 1) level = 1;
            
            days.push({ level, date: pastDate, count, items: data.items });
          }
          weeks.push(days);
        }
        setContributionData(weeks);
        setTotalContributions(total);
      } catch (e) {}
    }
    fetchActivity();
  }, [targetUserId, isCurrentUser]);

  if (profileLoading || repLoading || missionsLoading) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Loading profile...</div>;
  }

  const currentProfile = isCurrentUser ? (profile || {
    id: "current-user",
    username: "@brainarchitect",
    displayName: "Brain Builder",
    bio: "Exploring the limits of logic graphs and social knowledge. Building tools for thought.",
    followerCount: 1042,
    followingCount: 350
  }) : {
    id: targetUserId || "other",
    username: `@user_${targetUserId?.substring(0, 5) || "anon"}`,
    displayName: `User ${targetUserId?.substring(0, 5) || "Anon"}`,
    bio: "A fellow knowledge explorer in the network.",
    followerCount: Math.floor(Math.random() * 500) + 10,
    followingCount: Math.floor(Math.random() * 200) + 5
  };

  const handleAction = (actionName: string) => {
    toast({
      title: actionName,
      description: `The ${actionName.toLowerCase()} interface would open here.`,
    })
  };

  const handleShare = () => {
    toast({
      title: "Link Copied!",
      description: "Profile link has been copied to your clipboard.",
    })
  };

  const currentRep = reputation || {
    id: "me",
    xp: 0,
    level: isCurrentUser ? 1 : Math.floor(Math.random() * 20) + 5,
    streak: isCurrentUser ? 0 : Math.floor(Math.random() * 10),
    lastActiveDate: "",
    totalMissionsCompleted: 0,
    totalBrainsCreated: 0,
    totalCheckIns: 0,
    badges: []
  };

  const activeMissions = missions.filter(m => m.status === "active");
  const xpForNextLevel = 200;
  const currentLevelXp = currentRep.xp % xpForNextLevel;
  const progressPercent = (currentLevelXp / xpForNextLevel) * 100;

  const topicProgress = [
    { title: "Neuroscience Basics", progress: 85, color: "bg-blue-500", icon: Activity },
    { title: "Cognitive Psychology", progress: 60, color: "bg-purple-500", icon: BookOpen },
    { title: "Logic Systems", progress: 40, color: "bg-emerald-500", icon: Network },
    { title: "Computational Models", progress: 25, color: "bg-orange-500", icon: Brain },
  ];

  const journeyChartData = [
    { name: 'Jan', neuroscience: 10, psychology: 15, logic: 5, models: 0 },
    { name: 'Feb', neuroscience: 25, psychology: 20, logic: 10, models: 5 },
    { name: 'Mar', neuroscience: 40, psychology: 35, logic: 15, models: 10 },
    { name: 'Apr', neuroscience: 55, psychology: 45, logic: 20, models: 15 },
    { name: 'May', neuroscience: 70, psychology: 50, logic: 30, models: 20 },
    { name: 'Jun', neuroscience: 85, psychology: 60, logic: 40, models: 25 },
  ];

  return (
    <div className="max-w-4xl mx-auto border-x border-border/40 min-h-screen bg-background">
      {/* Sticky Profile Back Navigation */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/40 h-14 px-4 flex items-center gap-6">
        <button 
          onClick={() => window.history.back()}
          className="p-2 rounded-full hover:bg-muted/70 text-foreground transition-all shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-foreground leading-tight truncate">{currentProfile.displayName}</h2>
          <span className="text-xs text-muted-foreground font-medium">Level {currentRep.level} • {currentProfile.followerCount.toLocaleString()} followers</span>
        </div>
      </div>

      {/* Profile Geometric Banner */}
      <div className="h-36 sm:h-48 bg-gradient-to-r from-muted/30 via-accent/30 to-muted/20 relative border-b border-border/40 overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>

      {/* Header Info */}
      <div className="px-4 sm:px-6 relative pb-6">
        {/* Floating Avatar & Button Bar Row */}
        <div className="flex justify-between items-end -mt-10 sm:-mt-14 mb-4 relative z-10">
          <Avatar className="w-20 h-20 sm:w-28 sm:w-28 h-20 sm:h-28 border-4 border-background shadow-xl rounded-full bg-card">
            {currentProfile.avatarUrl ? (
              <AvatarImage src={currentProfile.avatarUrl} alt={currentProfile.displayName} className="object-cover" />
            ) : (
              <AvatarFallback className="text-2xl sm:text-4xl bg-primary/10 text-primary font-extrabold">
                {currentProfile.displayName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>

          <div className="flex gap-2 shrink-0">
            {isCurrentUser ? (
              <Button 
                variant="outline" 
                className="font-bold rounded-full h-9 px-4 text-sm border-border hover:bg-muted/50 cursor-pointer"
                onClick={() => setIsEditModalOpen(true)}
              >
                Edit Profile
              </Button>
            ) : (
              <Button 
                variant="default" 
                className="font-bold rounded-full h-9 px-5 text-sm cursor-pointer"
                onClick={() => handleAction("Follow User")}
              >
                Follow
              </Button>
            )}
          </div>
        </div>

        {/* User Identity Details */}
        <div className="space-y-3.5">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2 text-foreground tracking-tight leading-tight">
              {currentProfile.displayName}
              {statusMessage && (
                <Badge variant="secondary" className="font-semibold text-xs gap-1 py-0.5 px-2 bg-muted/60 text-muted-foreground border-transparent rounded-full">
                  <span>{statusEmoji}</span> {statusMessage}
                </Badge>
              )}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground font-medium">{currentProfile.username}</p>
            {currentProfile.category && (
              <Badge variant="outline" className="mt-1 text-xs px-2.5 py-0.5 rounded-full font-semibold border-primary/20 text-primary bg-primary/5">{currentProfile.category}</Badge>
            )}
          </div>

          <p className="text-sm sm:text-[15px] leading-relaxed text-foreground max-w-xl">{currentProfile.bio}</p>
          
          {currentProfile.pinnedDetails && (
            <div className="p-3.5 bg-primary/5 rounded-[16px] border border-primary/10 text-sm leading-relaxed max-w-xl">
              <span className="font-bold text-primary block mb-0.5 text-xs uppercase tracking-wider">📌 Pinned Notes</span>
              <span className="text-foreground">{currentProfile.pinnedDetails}</span>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
            <span className="flex items-center gap-1 hover:underline cursor-pointer transition-colors" onClick={() => handleAction("Following List")}>
              <span className="font-bold text-foreground">{currentProfile.followingCount.toLocaleString()}</span> <span className="text-muted-foreground font-medium">following</span>
            </span>
            <span className="flex items-center gap-1 hover:underline cursor-pointer transition-colors" onClick={() => handleAction("Followers List")}>
              <span className="font-bold text-foreground">{currentProfile.followerCount.toLocaleString()}</span> <span className="text-muted-foreground font-medium">followers</span>
            </span>
                    <div className="flex flex-wrap gap-2 pt-1 items-center">
            {isCurrentUser ? (
              <>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="font-bold rounded-full gap-2 text-xs h-8 border-border hover:bg-muted/50 cursor-pointer">
                      <Smile className="w-3.5 h-3.5" /> Set Status
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Set Status</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="flex gap-2">
                        <Input 
                          className="w-16 text-center text-xl" 
                          value={statusEmoji}
                          onChange={e => setStatusEmoji(e.target.value)}
                          maxLength={2}
                        />
                        <Input 
                          className="flex-1" 
                          placeholder="What's happening?" 
                          value={statusMessage}
                          onChange={e => setStatusMessage(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expiration</Label>
                        <Select defaultValue="today">
                          <SelectTrigger><SelectValue placeholder="Clear status after..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30m">30 minutes</SelectItem>
                            <SelectItem value="1h">1 hour</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="never">Don't Clear</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Visibility</Label>
                        <Select defaultValue="everyone">
                          <SelectTrigger><SelectValue placeholder="Who can see this?" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="everyone">Everyone</SelectItem>
                            <SelectItem value="experts">Brain Experts</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="space-y-0.5">
                          <Label className="flex items-center gap-2"><BellOff className="w-4 h-4" /> Busy Mode</Label>
                          <p className="text-xs text-muted-foreground">When others mention you or request review, they will be informed of limited availability.</p>
                        </div>
                        <Switch checked={isBusy} onCheckedChange={setIsBusy} />
                      </div>
                      <Button className="w-full" onClick={() => toast({ title: "Status Updated" })}>Save Status</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Link href="/settings">
                  <Button variant="outline" size="icon" className="rounded-full shrink-0 w-8 h-8 cursor-pointer">
                    <Settings className="w-4 h-4" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Button className="font-semibold rounded-full gap-2 text-xs h-8 cursor-pointer" variant="default" onClick={() => setLocation("/messages")}>
                  <MessageSquare className="w-3.5 h-3.5" /> DM
                </Button>
                <Button className="font-semibold rounded-full gap-2 text-xs h-8 cursor-pointer" variant="outline" onClick={() => handleAction("Follow User")}>
                  <UserPlus className="w-3.5 h-3.5" /> Follow
                </Button>
              </>
            )}

            <Button className="font-semibold rounded-full gap-2 text-xs h-8 cursor-pointer" variant="outline" onClick={() => setIsShareModalOpen(true)}>
              <Share2 className="w-3.5 h-3.5" /> Share Profile
            </Button>
            <Button variant="outline" size="icon" className="rounded-full shrink-0 w-8 h-8 cursor-pointer" onClick={() => handleAction("Invite Others")}>
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>
        </div>  </div>

        <EditProfileModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          profile={currentProfile as any}
          onSave={updateProfile}
        />

        <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Share Profile</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center space-y-6 pt-4">
              <div className="bg-white p-4 rounded-xl border-4 border-muted">
                <QrCode className="w-48 h-48 text-black" />
              </div>
              <p className="text-sm text-muted-foreground text-center">Scan QR code to view profile</p>
              
              <div className="w-full relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or share via</span>
                </div>
              </div>

              <div className="flex gap-4 justify-center w-full">
                <Button variant="outline" size="icon" className="rounded-full w-12 h-12" onClick={() => handleAction("Copy Link")}>
                  <LinkIcon className="w-5 h-5" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full w-12 h-12" onClick={() => handleAction("Share to External Apps")}>
                  <ExternalLink className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Contribution Heatmap */}
        <div className="bg-card border rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Evolution Activity</h3>
            <span className="text-sm text-muted-foreground">{totalContributions} actions in the last year</span>
          </div>
          <ContributionHeatmap 
            data={contributionData} 
            selectedDate={selectedDayData?.date}
            onDayClick={(day) => setSelectedDayData(day)} 
          />
          {selectedDayData && (
            <div className="mt-6 pt-6 border-t animate-in fade-in duration-300">
              <h4 className="font-medium flex justify-between items-center mb-4">
                <span>Evolution on {selectedDayData.date.toLocaleDateString()}</span>
                <span className="text-sm text-muted-foreground">{selectedDayData.count} actions</span>
              </h4>
              
              {selectedDayData.items && selectedDayData.items.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {selectedDayData.items.map((item: any, idx: number) => (
                    <div key={idx} className="bg-muted/30 border rounded-lg p-3 text-sm flex gap-3 items-start">
                      <div className="mt-0.5 opacity-70">
                        {item.type === 'post' && <MessageSquare className="w-4 h-4 text-blue-500" />}
                        {item.type === 'brain' && <Brain className="w-4 h-4 text-purple-500" />}
                        {item.type === 'checkin' && <Target className="w-4 h-4 text-emerald-500" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium capitalize mb-0.5">{item.type}</p>
                        <p className="text-muted-foreground line-clamp-2">
                          {item.title || item.content || item.name || "No description"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm bg-muted/20 rounded-lg">
                  No activity recorded on this day.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reputation Panel */}
        <div className="bg-card border rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-4 border-primary flex items-center justify-center bg-primary/10">
                <span className="text-2xl font-bold text-primary">{currentRep.level}</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  Level {currentRep.level} — {getLevelTitle(currentRep.level)}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20">
                    <Flame className="w-3 h-3 mr-1" /> {currentRep.streak} day streak
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">XP Progress</span>
              <span className="font-medium">{currentLevelXp} / {xpForNextLevel} XP</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {currentRep.badges.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">Earned Badges</h4>
              <div className="flex flex-wrap gap-2">
                {currentRep.badges.map(badge => (
                  <Badge key={badge} variant="outline" className="bg-primary/5 border-primary/20">
                    <Award className="w-3 h-3 mr-1 text-primary" /> {badge}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Tabs */}
      <Tabs defaultValue="about" className="w-full">
        <TabsList className="w-full rounded-none border-b border-border/40 bg-background h-14 p-0 overflow-x-auto flex-nowrap scrollbar-none justify-start">
          <TabsTrigger value="about" className="h-full rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-extrabold data-[state=active]:border-b-[3px] data-[state=active]:border-primary px-5 text-[14px] sm:text-[15px] font-semibold text-muted-foreground hover:bg-muted/10 transition-all cursor-pointer">
            About
          </TabsTrigger>
          <TabsTrigger value="journey" className="h-full rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-extrabold data-[state=active]:border-b-[3px] data-[state=active]:border-primary px-5 text-[14px] sm:text-[15px] font-semibold text-muted-foreground hover:bg-muted/10 transition-all cursor-pointer">
            Journey
          </TabsTrigger>
          <TabsTrigger value="missions" className="h-full rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-extrabold data-[state=active]:border-b-[3px] data-[state=active]:border-primary px-5 text-[14px] sm:text-[15px] font-semibold text-muted-foreground hover:bg-muted/10 transition-all cursor-pointer">
            Pathways
          </TabsTrigger>
          <TabsTrigger value="brains" className="h-full rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-extrabold data-[state=active]:border-b-[3px] data-[state=active]:border-primary px-5 text-[14px] sm:text-[15px] font-semibold text-muted-foreground hover:bg-muted/10 transition-all cursor-pointer">
            Brains
          </TabsTrigger>
          <TabsTrigger value="activity" className="h-full rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-extrabold data-[state=active]:border-b-[3px] data-[state=active]:border-primary px-5 text-[14px] sm:text-[15px] font-semibold text-muted-foreground hover:bg-muted/10 transition-all cursor-pointer">
            Activity
          </TabsTrigger>
          <TabsTrigger value="mentions" className="h-full rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-extrabold data-[state=active]:border-b-[3px] data-[state=active]:border-primary px-5 text-[14px] sm:text-[15px] font-semibold text-muted-foreground hover:bg-muted/10 transition-all cursor-pointer">
            Mentions
          </TabsTrigger>
          <TabsTrigger value="favorites" className="h-full rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-extrabold data-[state=active]:border-b-[3px] data-[state=active]:border-primary px-5 text-[14px] sm:text-[15px] font-semibold text-muted-foreground hover:bg-muted/10 transition-all cursor-pointer">
            Favorites
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="about" className="p-6 m-0 space-y-8">
          {/* Personal Details */}
          {(currentProfile.personalDetails?.location || currentProfile.personalDetails?.birthday || currentProfile.personalDetails?.gender || (currentProfile.personalDetails?.languages && currentProfile.personalDetails.languages.length > 0)) && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Personal Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {currentProfile.personalDetails?.location && (
                  <div><span className="text-muted-foreground block text-xs uppercase mb-1">Location</span>{currentProfile.personalDetails.location}</div>
                )}
                {currentProfile.personalDetails?.birthday && (
                  <div><span className="text-muted-foreground block text-xs uppercase mb-1">Birthday</span>{currentProfile.personalDetails.birthday}</div>
                )}
                {currentProfile.personalDetails?.gender && (
                  <div><span className="text-muted-foreground block text-xs uppercase mb-1">Gender</span>{currentProfile.personalDetails.gender}</div>
                )}
                {currentProfile.personalDetails?.languages && currentProfile.personalDetails.languages.length > 0 && (
                  <div><span className="text-muted-foreground block text-xs uppercase mb-1">Languages</span>{currentProfile.personalDetails.languages.join(", ")}</div>
                )}
              </div>
            </div>
          )}

          {/* Links */}
          {((currentProfile.personalDetails?.websiteLinks && currentProfile.personalDetails.websiteLinks.length > 0) || (currentProfile.personalDetails?.socialLinks && currentProfile.personalDetails.socialLinks.length > 0)) && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Links</h3>
              <div className="flex flex-wrap gap-2 text-sm">
                {currentProfile.personalDetails?.websiteLinks?.map((link, i) => (
                  <a key={i} href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{link}</a>
                ))}
              </div>
            </div>
          )}

          {/* Family */}
          {(currentProfile.family?.spouse || (currentProfile.family?.parents && currentProfile.family.parents.length > 0) || (currentProfile.family?.children && currentProfile.family.children.length > 0) || (currentProfile.family?.siblings && currentProfile.family.siblings.length > 0)) && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Family</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {currentProfile.family?.spouse && (
                  <div><span className="text-muted-foreground block text-xs uppercase mb-1">Spouse</span>{currentProfile.family.spouse}</div>
                )}
                {currentProfile.family?.parents && currentProfile.family.parents.length > 0 && (
                  <div><span className="text-muted-foreground block text-xs uppercase mb-1">Parents</span>{currentProfile.family.parents.join(", ")}</div>
                )}
                {currentProfile.family?.children && currentProfile.family.children.length > 0 && (
                  <div><span className="text-muted-foreground block text-xs uppercase mb-1">Children</span>{currentProfile.family.children.join(", ")}</div>
                )}
                {currentProfile.family?.siblings && currentProfile.family.siblings.length > 0 && (
                  <div><span className="text-muted-foreground block text-xs uppercase mb-1">Siblings</span>{currentProfile.family.siblings.join(", ")}</div>
                )}
              </div>
            </div>
          )}

          {/* Tags / Interests */}
          {(currentProfile.tags?.pets || currentProfile.tags?.sports || currentProfile.tags?.movies || currentProfile.tags?.instruments) && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Interests & Tags</h3>
              {currentProfile.tags?.pets && currentProfile.tags.pets.length > 0 && (
                <div className="mb-3">
                  <span className="text-muted-foreground block text-xs uppercase mb-2">Pets</span>
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.tags.pets.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  </div>
                </div>
              )}
              {currentProfile.tags?.sports && currentProfile.tags.sports.length > 0 && (
                <div className="mb-3">
                  <span className="text-muted-foreground block text-xs uppercase mb-2">Sports</span>
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.tags.sports.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  </div>
                </div>
              )}
              {currentProfile.tags?.movies && currentProfile.tags.movies.length > 0 && (
                <div className="mb-3">
                  <span className="text-muted-foreground block text-xs uppercase mb-2">Movies</span>
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.tags.movies.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  </div>
                </div>
              )}
              {currentProfile.tags?.instruments && currentProfile.tags.instruments.length > 0 && (
                <div className="mb-3">
                  <span className="text-muted-foreground block text-xs uppercase mb-2">Musical Instruments</span>
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.tags.instruments.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {(!currentProfile.personalDetails && !currentProfile.family && !currentProfile.tags) && (
            <div className="text-center py-10 text-muted-foreground">
              <p>Nothing here yet. {isCurrentUser && "Edit your profile to add some details about yourself!"}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="journey" className="p-6 m-0 space-y-6">
          <div className="flex justify-between items-center bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div>
              <h3 className="font-semibold text-lg text-primary">Topic Progress</h3>
              <p className="text-sm text-muted-foreground">Visually track your learning journey across various subjects.</p>
            </div>
            <Compass className="w-8 h-8 text-primary/50" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topicProgress.map((topic, i) => (
              <div key={i} className="border bg-card rounded-xl p-5 hover:border-primary/50 transition-colors shadow-sm">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-lg bg-background border shadow-sm`}>
                       <topic.icon className={`w-5 h-5 ${topic.color.replace('bg-', 'text-')}`} />
                     </div>
                     <span className="font-medium text-base">{topic.title}</span>
                   </div>
                   <span className="font-bold text-sm bg-accent px-2 py-1 rounded-md">{topic.progress}%</span>
                </div>
                <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full ${topic.color} rounded-full transition-all duration-1000 ease-in-out`} style={{ width: `${topic.progress}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card border rounded-xl p-6 mt-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-4">Progression Timeline</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={journeyChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="neuroscience" name="Neuroscience" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="psychology" name="Psychology" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="logic" name="Logic Systems" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="models" name="Computational Models" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="missions" className="p-6 m-0 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Active Pathways</h3>
            <Link href="/missions">
              <Button variant="link" className="text-primary p-0">View All</Button>
            </Link>
          </div>
          {activeMissions.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No active pathways.</p>
              <Link href="/missions">
                <Button variant="outline" className="mt-4">Start a Pathway</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeMissions.map(mission => (
                <div key={mission.id} className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{mission.title}</h4>
                      <Badge variant="secondary" className="mt-1">{mission.category}</Badge>
                    </div>
                    <span className="text-sm font-medium">{mission.progress}%</span>
                  </div>
                  <Progress value={mission.progress} className="h-1.5" />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="activity" className="p-0 m-0">
          <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row gap-4 items-center justify-between sticky top-0 z-10 backdrop-blur-md">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search activity..." 
                className="pl-9 w-full bg-background"
                value={activitySearch}
                onChange={e => setActivitySearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <Select defaultValue="all">
                <SelectTrigger className="w-[140px] bg-background">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activity</SelectItem>
                  <SelectItem value="commits">Commits</SelectItem>
                  <SelectItem value="branches">Branches</SelectItem>
                  <SelectItem value="tags">Tags</SelectItem>
                  <SelectItem value="issues">Issues</SelectItem>
                  <SelectItem value="stars">Stars</SelectItem>
                  <SelectItem value="discussions">Discussions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {xpEvents.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground border-b">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No activity yet.</p>
            </div>
          ) : (
            <div className="divide-y">
              {xpEvents.map(event => (
                <div key={event.id} className="p-6 flex items-start gap-4 hover:bg-accent/5 transition-colors cursor-pointer" onClick={() => handleAction("View Activity Details")}>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium">{event.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleDateString()} at {new Date(event.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                  <div className="shrink-0 text-sm font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">
                    +{event.xpGained} XP
                  </div>
                </div>
              ))}
              <div className="p-6 text-center">
                <Button variant="outline" className="rounded-full">Load More Activity</Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="mentions" className="p-0 m-0">
          <div className="p-12 text-center text-muted-foreground border-b">
            <AtSign className="w-12 h-12 mx-auto mb-4 opacity-50 text-primary" />
            <h3 className="text-lg font-medium text-foreground mb-2">Mentions Timeline</h3>
            <p className="mb-4">Posts and comments where {currentProfile.displayName} was mentioned.</p>
            
            <div className="max-w-xl mx-auto mt-8 space-y-4">
              {[1, 2].map((m) => (
                <div key={m} className="border rounded-xl p-4 bg-card text-left flex gap-4 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleAction("View Mention Post")}>
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>U{m}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm"><span className="font-semibold">User {m}</span> mentioned {isCurrentUser ? 'you' : currentProfile.displayName} in a post</p>
                    <p className="text-sm text-muted-foreground mt-1">"Hey <span className="text-primary">@{currentProfile.username.substring(1)}</span> what are your thoughts on cognitive structures?"</p>
                    <p className="text-xs text-muted-foreground mt-2">{m * 2} hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="brains" className="p-0 m-0">
          <div className="p-12 text-center text-muted-foreground border-b">
            <Network className="w-12 h-12 mx-auto mb-4 opacity-50 text-primary" />
            <h3 className="text-lg font-medium text-foreground mb-2">Brain Repository</h3>
            <p className="mb-4">Brains you've created, forked, or contributed to will appear here.</p>
            <Link href="/library">
              <Button variant="outline">Go to Library</Button>
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="favorites" className="p-0 m-0 bg-background/50">
          <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between sticky top-0 z-10 backdrop-blur-md">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Find a favorite..." className="pl-9 w-full bg-background" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">1</span> Favorite
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="border rounded-xl p-5 bg-card hover:border-primary/50 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-start">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg flex items-center gap-2 hover:text-primary cursor-pointer transition-colors">
                    Cognitive Architecture Base
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1 max-w-lg">
                    A foundational logic graph for modeling human cognitive biases and decision trees.
                  </p>
                  <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> 128</span>
                    <span className="flex items-center gap-1"><Network className="w-3 h-3" /> 45 Nodes</span>
                    <span>Updated 2 days ago</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={() => toast({ title: "Removed from favorites" })}>
                  <Star className="w-4 h-4 mr-2 text-yellow-500 fill-yellow-500" /> Unstar
                </Button>
                <Button size="sm">Open Brain</Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}