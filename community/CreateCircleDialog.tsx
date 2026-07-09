import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Globe, Lock, ShieldAlert, Image as ImageIcon } from "lucide-react";
import { useCommunities } from "@/hooks/use-communities";
import { useToast } from "@/hooks/use-toast";

export function CreateCircleDialog() {
  const { addCommunity } = useCommunities();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [language, setLanguage] = useState("English");
  const [location, setLocation] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "restricted" | "private">("public");
  const [allowMature, setAllowMature] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    await addCommunity({
      id: crypto.randomUUID(),
      name,
      description,
      memberCount: 1,
      active: true,
      // In a real app we'd save these extended fields to the DB
      // privacy, category, tags, language, location, allowMature
    });
    
    setOpen(false);
    setName("");
    setDescription("");
    toast({ title: "Circle Created", description: "Your Accountability Circle is now live and rooting." });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create Accountability Circle</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Circle Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Daily Hackers" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is the focus of this circle?" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Cover Image & Icon</Label>
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-xl bg-muted border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/80">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="flex-1 h-20 rounded-xl bg-muted border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/80">
                    <span className="text-sm text-muted-foreground">Upload Cover Image</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Technology" />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="coding, accountability" />
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Input value={language} onChange={e => setLanguage(e.target.value)} placeholder="English" />
              </div>
              <div className="space-y-2">
                <Label>Location (optional)</Label>
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Global or City" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Privacy Selection</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card 
                className={`cursor-pointer transition-colors ${privacy === 'public' ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/50'}`}
                onClick={() => setPrivacy('public')}
              >
                <CardHeader className="p-4">
                  <Globe className="w-6 h-6 mb-2 text-blue-500" />
                  <CardTitle className="text-base">Public</CardTitle>
                  <CardDescription className="text-xs">Anyone can discover and join.</CardDescription>
                </CardHeader>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-colors ${privacy === 'restricted' ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/50'}`}
                onClick={() => setPrivacy('restricted')}
              >
                <CardHeader className="p-4">
                  <ShieldAlert className="w-6 h-6 mb-2 text-yellow-500" />
                  <CardTitle className="text-base">Restricted</CardTitle>
                  <CardDescription className="text-xs">Visible publicly. Joining requires approval.</CardDescription>
                </CardHeader>
              </Card>

              <Card 
                className={`cursor-pointer transition-colors ${privacy === 'private' ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/50'}`}
                onClick={() => setPrivacy('private')}
              >
                <CardHeader className="p-4">
                  <Lock className="w-6 h-6 mb-2 text-red-500" />
                  <CardTitle className="text-base">Private</CardTitle>
                  <CardDescription className="text-xs">Only invited members can view. Hidden from search.</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Content Settings</h3>
            <div className="flex items-center justify-between p-4 border rounded-xl bg-card">
              <div className="space-y-0.5">
                <Label className="text-base">Allow Mature Content</Label>
                <p className="text-sm text-muted-foreground">Enables 18+ badge, age verification, and safe search filtering.</p>
              </div>
              <Switch checked={allowMature} onCheckedChange={setAllowMature} />
            </div>
          </div>
          
          <Button className="w-full mt-4" size="lg" onClick={handleCreate} disabled={!name.trim()}>
            Initialize Active Relay & Create Circle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
