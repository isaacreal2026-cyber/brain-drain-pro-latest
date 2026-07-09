import { useState, useEffect } from "react";
import { UserProfile } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
}

export function EditProfileModal({ isOpen, onClose, profile, onSave }: EditProfileModalProps) {
  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setEditedProfile(profile);
    }
  }, [isOpen, profile]);

  const handleSave = () => {
    onSave(editedProfile);
    toast({ title: "Profile Updated", description: "Your profile has been saved successfully." });
    onClose();
  };

  const updatePersonalDetail = (key: keyof NonNullable<UserProfile["personalDetails"]>, value: any) => {
    setEditedProfile(prev => ({
      ...prev,
      personalDetails: { ...prev.personalDetails, [key]: value }
    }));
  };

  const updateFamily = (key: keyof NonNullable<UserProfile["family"]>, value: any) => {
    setEditedProfile(prev => ({
      ...prev,
      family: { ...prev.family, [key]: value }
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your public profile details.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b">
            <TabsList className="w-full justify-start overflow-x-auto rounded-none border-b-0 h-auto p-0 bg-transparent">
              <TabsTrigger value="basic" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3">Basic Info</TabsTrigger>
              <TabsTrigger value="personal" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3">Personal Details</TabsTrigger>
              <TabsTrigger value="family" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3">Family & Tags</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <TabsContent value="basic" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input 
                    value={editedProfile.displayName} 
                    onChange={e => setEditedProfile({ ...editedProfile, displayName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Bio</Label>
                    <span className="text-xs text-muted-foreground">
                      {(editedProfile.bio?.length || 0)} / 250
                    </span>
                  </div>
                  <Textarea 
                    value={editedProfile.bio} 
                    onChange={e => {
                      if (e.target.value.length <= 250) {
                        setEditedProfile({ ...editedProfile, bio: e.target.value })
                      }
                    }}
                    className="resize-none"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pinned Details</Label>
                  <Input 
                    placeholder="E.g., Looking for co-founders"
                    value={editedProfile.pinnedDetails || ""} 
                    onChange={e => setEditedProfile({ ...editedProfile, pinnedDetails: e.target.value })}
                  />
                </div>
                
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-semibold">Open to Work</Label>
                      <p className="text-xs text-muted-foreground">Let recruiters and teams know you're looking for opportunities.</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-semibold">Hire Me Button</Label>
                      <p className="text-xs text-muted-foreground">Display a prominent button on your profile for freelance inquiries.</p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label>Category</Label>
                  <Select 
                    value={editedProfile.category || ""} 
                    onValueChange={(v) => setEditedProfile({ ...editedProfile, category: v as UserProfile["category"] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Blogger", "Political Figure", "Creator", "Artist", "Business", "Developer", "Student", "Researcher", "Public Figure", "Personal", "Other"].map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="personal" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input 
                      value={editedProfile.personalDetails?.location || ""} 
                      onChange={e => updatePersonalDetail("location", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select defaultValue="UTC">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PST">Pacific Time (PT)</SelectItem>
                        <SelectItem value="EST">Eastern Time (ET)</SelectItem>
                        <SelectItem value="UTC">Coordinated Universal Time (UTC)</SelectItem>
                        <SelectItem value="GMT">Greenwich Mean Time (GMT)</SelectItem>
                        <SelectItem value="CET">Central European Time (CET)</SelectItem>
                        <SelectItem value="IST">Indian Standard Time (IST)</SelectItem>
                        <SelectItem value="JST">Japan Standard Time (JST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Birthday</Label>
                    <Input 
                      type="date"
                      value={editedProfile.personalDetails?.birthday || ""} 
                      onChange={e => updatePersonalDetail("birthday", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Input 
                      value={editedProfile.personalDetails?.gender || ""} 
                      onChange={e => updatePersonalDetail("gender", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Languages (comma separated)</Label>
                  <Input 
                    value={editedProfile.personalDetails?.languages?.join(", ") || ""} 
                    onChange={e => updatePersonalDetail("languages", e.target.value.split(",").map(s => s.trim()))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website Links (comma separated)</Label>
                  <Input 
                    value={editedProfile.personalDetails?.websiteLinks?.join(", ") || ""} 
                    onChange={e => updatePersonalDetail("websiteLinks", e.target.value.split(",").map(s => s.trim()))}
                  />
                </div>
              </TabsContent>

              <TabsContent value="family" className="mt-0 space-y-4">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Family</h3>
                  <div className="space-y-2">
                    <Label>Spouse</Label>
                    <Input 
                      value={editedProfile.family?.spouse || ""} 
                      onChange={e => updateFamily("spouse", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Parents (comma separated)</Label>
                    <Input 
                      value={editedProfile.family?.parents?.join(", ") || ""} 
                      onChange={e => updateFamily("parents", e.target.value.split(",").map(s => s.trim()))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Children (comma separated)</Label>
                    <Input 
                      value={editedProfile.family?.children?.join(", ") || ""} 
                      onChange={e => updateFamily("children", e.target.value.split(",").map(s => s.trim()))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Siblings (comma separated)</Label>
                    <Input 
                      value={editedProfile.family?.siblings?.join(", ") || ""} 
                      onChange={e => updateFamily("siblings", e.target.value.split(",").map(s => s.trim()))}
                    />
                  </div>
                </div>

                <div className="space-y-4 mt-8">
                  <h3 className="font-semibold text-lg border-b pb-2">Tags / Interests</h3>
                  <div className="space-y-2">
                    <Label>Pets (comma separated)</Label>
                    <Input 
                      placeholder="Dog, Cat, Reptile..."
                      value={editedProfile.tags?.pets?.join(", ") || ""} 
                      onChange={e => setEditedProfile(prev => ({ ...prev, tags: { ...prev.tags, pets: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sports (comma separated)</Label>
                    <Input 
                      placeholder="Running, Hiking, Basketball..."
                      value={editedProfile.tags?.sports?.join(", ") || ""} 
                      onChange={e => setEditedProfile(prev => ({ ...prev, tags: { ...prev.tags, sports: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Movies (comma separated)</Label>
                    <Input 
                      placeholder="Mystery, Horror, Action..."
                      value={editedProfile.tags?.movies?.join(", ") || ""} 
                      onChange={e => setEditedProfile(prev => ({ ...prev, tags: { ...prev.tags, movies: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Musical Instruments (comma separated)</Label>
                    <Input 
                      placeholder="Guitar, Piano, Violin..."
                      value={editedProfile.tags?.instruments?.join(", ") || ""} 
                      onChange={e => setEditedProfile(prev => ({ ...prev, tags: { ...prev.tags, instruments: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } }))}
                    />
                  </div>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
