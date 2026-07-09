import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Settings, Users, Activity, Radio, Lock, BookOpen, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  communityId: string;
  communityName: string;
}

export function CircleRootAdmin({ communityId, communityName }: Props) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [semanticMatching, setSemanticMatching] = useState(true);
  const [persistentOrbit, setPersistentOrbit] = useState(true);
  
  const contentTypes = ['Posts', 'Questions', 'Polls', 'Quizzes', 'Quiz Answers', 'Assignments', 'Articles', 'Tutorials', 'Files', 'Images', 'Videos', 'Audio', 'Voice Notes', 'Events', 'Announcements', 'Challenges', 'Projects', 'Live Sessions', 'Job Posts', 'Marketplace', 'Resource Links', 'Wikis', 'AI Generated Notes'];
  const [contentToggles, setContentToggles] = useState<Record<string, boolean>>(
    contentTypes.reduce((acc, type) => ({ ...acc, [type]: true }), {})
  );

  const [reviewPeriod, setReviewPeriod] = useState('Trusted Members Skip Review');
  const [customRules, setCustomRules] = useState(`1. No spam\n2. Respect members\n3. Academic references required\n4. No duplicate questions`);

  const recTypes = ['Suggested Quizzes', 'Related Topics', 'Similar Discussions', 'Popular Posts', 'Trending Files', 'Related Resources', 'Recommended Members', 'Suggested Study Groups', 'Suggested Accountability Circles', 'Recent Activity'];
  const [recToggles, setRecToggles] = useState<Record<string, boolean>>(
    recTypes.reduce((acc, type) => ({ ...acc, [type]: true }), {})
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="w-full mt-4 flex items-center gap-2 border-primary/20 hover:bg-primary/5 text-primary">
          <Shield className="w-4 h-4" />
          /root Administration
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] sm:h-[85vh] p-0 flex flex-col rounded-t-xl">
        <div className="p-6 border-b flex items-center justify-between bg-muted/30">
          <div>
            <SheetTitle className="text-2xl font-mono flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              /root Workspace
            </SheetTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Advanced circle configuration for: <span className="font-semibold text-foreground">{communityName}</span>
            </p>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary uppercase tracking-widest text-xs font-mono">
            Owner Access
          </Badge>
        </div>

        <Tabs defaultValue="active-relay" className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <TabsList className="h-auto md:w-64 flex flex-row md:flex-col justify-start items-stretch bg-muted/10 border-r rounded-none p-4 gap-2 overflow-x-auto md:overflow-y-auto">
            <TabsTrigger value="active-relay" className="justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Radio className="w-4 h-4" /> Active Relay Engine
            </TabsTrigger>
            <TabsTrigger value="content" className="justify-start gap-2">
              <BookOpen className="w-4 h-4" /> Content Configuration
            </TabsTrigger>
            <TabsTrigger value="moderation" className="justify-start gap-2">
              <AlertTriangle className="w-4 h-4" /> Moderation & Rules
            </TabsTrigger>
            <TabsTrigger value="roles" className="justify-start gap-2">
              <Users className="w-4 h-4" /> Member Roles
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="justify-start gap-2">
              <Activity className="w-4 h-4" /> Recommendation Engine
            </TabsTrigger>
            <TabsTrigger value="settings" className="justify-start gap-2">
              <Settings className="w-4 h-4" /> General Settings
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6 bg-background">
            <TabsContent value="active-relay" className="m-0 space-y-6">
              <div>
                <h3 className="text-lg font-bold">Active Relay Engine</h3>
                <p className="text-sm text-muted-foreground">Configure the intelligent routing layer for this circle.</p>
              </div>
              
              <div className="grid gap-6">
                <div className="p-4 border rounded-xl space-y-4">
                  <h4 className="font-semibold text-primary">Routing Algorithm</h4>
                  <div className="flex items-center justify-between">
                    <Label>Enable Semantic Matching</Label>
                    <Switch checked={semanticMatching} onCheckedChange={(v) => { setSemanticMatching(v); toast({title: "Settings Updated", description: "Semantic Matching updated."}); }} />
                  </div>
                  <p className="text-xs text-muted-foreground">Uses embeddings for intent detection rather than exact keyword match.</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Label>Maximum Hop Limit</Label>
                    <Input type="number" defaultValue={50} className="w-24" />
                  </div>
                </div>

                <div className="p-4 border rounded-xl space-y-4">
                  <h4 className="font-semibold text-primary">Persistent Orbit</h4>
                  <div className="flex items-center justify-between">
                    <Label>Allow Pending Orbit State</Label>
                    <Switch checked={persistentOrbit} onCheckedChange={(v) => { setPersistentOrbit(v); toast({title: "Settings Updated", description: "Persistent Orbit updated."}); }} />
                  </div>
                  <p className="text-xs text-muted-foreground">Keep unanswered requests circulating through the linked member structure.</p>
                </div>
                
                <div className="p-4 border rounded-xl bg-muted/20">
                  <h4 className="font-semibold mb-4 text-primary">Relay Analytics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Orbit Success Rate</p>
                      <p className="text-2xl font-bold">87%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Avg Hop Count</p>
                      <p className="text-2xl font-bold">4.2</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Avg Response Time</p>
                      <p className="text-2xl font-bold">12m</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Knowledge Coverage</p>
                      <p className="text-2xl font-bold">92%</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-background rounded-lg border">
                      <span className="font-semibold block mb-2">Top Contributors</span>
                      <ul className="text-muted-foreground space-y-1">
                        <li>1. Sarah J. (142 orbits resolved)</li>
                        <li>2. Marcus T. (98 orbits resolved)</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-background rounded-lg border">
                      <span className="font-semibold block mb-2">Most Requested Topics</span>
                      <ul className="text-muted-foreground space-y-1">
                        <li>1. React Hooks</li>
                        <li>2. System Design</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="content" className="m-0 space-y-6">
              <div>
                <h3 className="text-lg font-bold">Content Configuration</h3>
                <p className="text-sm text-muted-foreground">Choose what types of content members can publish.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {contentTypes.map(type => (
                  <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                    <Label>{type}</Label>
                    <Switch checked={contentToggles[type]} onCheckedChange={(v) => setContentToggles({ ...contentToggles, [type]: v })} />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="moderation" className="m-0 space-y-6">
              <div>
                <h3 className="text-lg font-bold">Moderation & Custom Rules</h3>
                <p className="text-sm text-muted-foreground">Set rules and review periods for new content.</p>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Review Period</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {['Immediate Publish', 'Review First', 'Trusted Members Skip Review', 'AI Assisted Review', 'Manual Approval', 'Scheduled Publishing'].map(opt => (
                    <div key={opt} className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => setReviewPeriod(opt)}>
                      <input type="radio" name="review_period" className="w-4 h-4" checked={opt === reviewPeriod} onChange={() => setReviewPeriod(opt)} />
                      <Label className="cursor-pointer">{opt}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t">
                <h4 className="font-semibold">Custom Rules</h4>
                <Textarea 
                  value={customRules}
                  onChange={(e) => setCustomRules(e.target.value)}
                  className="min-h-[150px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">Markdown supported. New members must accept these before joining.</p>
                <Button onClick={() => toast({ title: "Rules Saved", description: "Moderation rules updated successfully." })}>Save Rules</Button>
              </div>
            </TabsContent>
            
            <TabsContent value="recommendations" className="m-0 space-y-6">
              <div>
                <h3 className="text-lg font-bold">Recommendation Engine</h3>
                <p className="text-sm text-muted-foreground">Configure what recommendations appear in the circle.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recTypes.map(type => (
                  <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                    <Label>{type}</Label>
                    <Switch checked={recToggles[type]} onCheckedChange={(v) => setRecToggles({ ...recToggles, [type]: v })} />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="roles" className="m-0 space-y-6">
               <div>
                <h3 className="text-lg font-bold">Member Roles</h3>
                <p className="text-sm text-muted-foreground">Manage permissions across hierarchy levels.</p>
              </div>
              <div className="space-y-2">
                {['Owner', 'Co-owner', 'Administrator', 'Moderator', 'Trusted Member', 'Contributor', 'Member', 'Visitor'].map(role => (
                   <div key={role} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                     <span className="font-medium">{role}</span>
                     <Button variant="ghost" size="sm" onClick={() => toast({title: "Edit Permissions", description: `Editing permissions for ${role}`})}>Edit Permissions</Button>
                   </div>
                ))}
              </div>
            </TabsContent>

          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Badge({ children, variant, className }: any) {
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${className}`}>{children}</span>;
}
