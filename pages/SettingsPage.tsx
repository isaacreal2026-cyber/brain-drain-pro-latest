import { useState, useEffect } from "react";
import { useTheme } from "@/lib/theme";
import { User, Bell, Shield, Paintbrush, Database, Accessibility, Check, Lock, ChevronRight, Monitor, Moon, Sun, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { idb } from "@/lib/db";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { user, logOut } = useAuth();

  const [savedSettings, setSavedSettings] = useState({
    displayName: "Isaac Real",
    bio: "AI logic creator & cognitive architect.",
    notifications: true,
    privateProfile: false,
    dataCollection: true,
  });

  const [displayName, setDisplayName] = useState(savedSettings.displayName);
  const [bio, setBio] = useState(savedSettings.bio);
  const [notifications, setNotifications] = useState(savedSettings.notifications);
  const [privateProfile, setPrivateProfile] = useState(savedSettings.privateProfile);
  const [dataCollection, setDataCollection] = useState(savedSettings.dataCollection);
  const [activeSection, setActiveSection] = useState("appearance");

  const isDirty = 
    displayName !== savedSettings.displayName ||
    bio !== savedSettings.bio ||
    notifications !== savedSettings.notifications ||
    privateProfile !== savedSettings.privateProfile ||
    dataCollection !== savedSettings.dataCollection;

  useEffect(() => {
    (window as any).__isAppDirty = isDirty;
    return () => {
      (window as any).__isAppDirty = false;
    };
  }, [isDirty]);

  const handleDiscard = () => {
    setDisplayName(savedSettings.displayName);
    setBio(savedSettings.bio);
    setNotifications(savedSettings.notifications);
    setPrivateProfile(savedSettings.privateProfile);
    setDataCollection(savedSettings.dataCollection);
    toast({
      title: "Changes Discarded",
      description: "Settings reverted to their previously saved state.",
    });
  };

  const handleSave = () => {
    setSavedSettings({
      displayName,
      bio,
      notifications,
      privateProfile,
      dataCollection,
    });
    toast({
      title: "Settings Saved",
      description: "Your configurations have been successfully updated.",
    });
  };

  const sections = [
    {
      id: "account",
      title: "Account",
      icon: User,
      description: "Manage your profile, email, and password."
    },
    {
      id: "privacy",
      title: "Privacy & Notifications",
      icon: Shield,
      description: "Control who can see your activity and interact with you."
    },
    {
      id: "appearance",
      title: "Appearance",
      icon: Paintbrush,
      description: "Customize the look and feel of Brain Builder."
    },
    {
      id: "advanced",
      title: "Advanced",
      icon: Database,
      description: "Configure how your brains process and store logic."
    }
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleToggle = (name: string, value: boolean, setter: (val: boolean) => void) => {
    setter(value);
    toast({
      title: "Settings Updated",
      description: `${name} has been turned ${value ? 'on' : 'off'}.`,
    });
  };

  const handleExportAccountData = async () => {
    const stores = ["profile", "settings", "posts", "topics", "brains", "nodes", "missions", "milestones", "comments", "conversations", "messages", "notifications", "communities", "checkins", "pathways", "books"];
    const data: Record<string, unknown> = {};

    for (const store of stores) {
      try {
        data[store] = await idb.getAll(store);
      } catch {
        data[store] = [];
      }
    }

    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `brain-builder-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast({ title: "Export ready", description: "Your local account data export has been downloaded." });
  };

  const handleAction = (action: string) => {
    toast({
      title: action,
      description: `The ${action.toLowerCase()} action needs backend support before it is wired deeper.`,
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24 md:pb-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and app settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Settings Navigation (Desktop) */}
        <aside className="hidden md:block md:col-span-4 lg:col-span-3">
          <nav className="flex flex-col space-y-1 sticky top-6">
            {sections.map((section) => (
              <Button 
                key={section.id} 
                variant={activeSection === section.id ? "secondary" : "ghost"} 
                className="justify-start gap-3 h-12"
                onClick={() => scrollToSection(section.id)}
              >
                <section.icon className="w-5 h-5 text-muted-foreground" />
                {section.title}
              </Button>
            ))}
          </nav>
        </aside>

        {/* Settings Content */}
        <div className="col-span-1 md:col-span-8 lg:col-span-9 space-y-8">
          
          {/* Account Section Placeholder */}
          <section id="account">
             <div className="mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Account
              </h2>
            </div>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="display-name" className="text-sm font-medium">Display Name</Label>
                      <Input
                        id="display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g., Isaac Real"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-sm font-medium">Bio / Motto</Label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Write a short summary about yourself"
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Email Address</h3>
                      <p className="text-sm text-muted-foreground">{user?.email || "No email linked"}</p>
                    </div>
                    <Button variant="outline" onClick={() => handleAction("Change Email")}>Change</Button>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Sign Out</h3>
                      <p className="text-sm text-muted-foreground">Log out of your account on this device</p>
                    </div>
                    <Button variant="destructive" onClick={logOut}><LogOut className="w-4 h-4 mr-2" /> Sign Out</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Appearance Section */}
          <section id="appearance">
            <div className="mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Paintbrush className="w-5 h-5 text-primary" /> Appearance
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Customize how Brain Builder looks on your device.</p>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-4">Theme</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <Button 
                        variant="outline" 
                        className={`h-24 flex flex-col gap-2 relative ${theme === 'light' ? 'border-primary bg-primary/5' : ''}`}
                        onClick={() => setTheme("light")}
                      >
                        {theme === 'light' && <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                        <Sun className="w-6 h-6" />
                        <span>Light</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className={`h-24 flex flex-col gap-2 relative ${theme === 'dark' ? 'border-primary bg-primary/5' : ''}`}
                        onClick={() => setTheme("dark")}
                      >
                        {theme === 'dark' && <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                        <Moon className="w-6 h-6" />
                        <span>Dark</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className={`h-24 flex flex-col gap-2 relative ${theme === 'system' ? 'border-primary bg-primary/5' : ''}`}
                        onClick={() => setTheme("system")}
                      >
                        {theme === 'system' && <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                        <Monitor className="w-6 h-6" />
                        <span>System</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

           {/* Privacy & Notifications Section */}
          <section id="privacy">
            <div className="mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Privacy & Notifications
              </h2>
            </div>
            
            <Card>
              <CardContent className="p-0 divide-y">
                <div className="p-6 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="font-medium">Push Notifications</h3>
                    <p className="text-sm text-muted-foreground">Receive alerts for mentions and new followers.</p>
                  </div>
                  <Switch checked={notifications} onCheckedChange={setNotifications} />
                </div>
                
                <div className="p-6 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="font-medium">Private Profile</h3>
                    <p className="text-sm text-muted-foreground">Only approved followers can see your posts and brains.</p>
                  </div>
                  <Switch checked={privateProfile} onCheckedChange={setPrivateProfile} />
                </div>

                <div className="p-6 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="font-medium">Analytics & Telemetry</h3>
                    <p className="text-sm text-muted-foreground">Help us improve by sending anonymous usage data.</p>
                  </div>
                  <Switch checked={dataCollection} onCheckedChange={setDataCollection} />
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Advanced Section */}
          <section id="advanced">
            <div className="mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" /> Advanced
              </h2>
            </div>
            
            <div className="space-y-2">
              <Button onClick={() => void handleExportAccountData()} variant="outline" className="w-full justify-between h-14 px-6 font-normal">
                <span>Export Account Data</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
              <Button onClick={() => handleAction("Delete Account")} variant="outline" className="w-full justify-between h-14 px-6 font-normal text-destructive hover:text-destructive hover:bg-destructive/10">
                <span>Delete Account</span>
                <ChevronRight className="w-5 h-5 text-destructive/50" />
              </Button>
            </div>
          </section>

        </div>
      </div>

      {/* Floating Save/Discard Banner */}
      {isDirty && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border/50 rounded-2xl shadow-2xl flex items-center justify-between px-6 py-4 gap-4 w-[calc(100%-2rem)] max-w-lg animate-in fade-in slide-in-from-bottom-5">
          <div className="flex flex-col text-left">
            <span className="text-sm font-semibold">Unsaved settings</span>
            <span className="text-xs text-muted-foreground">You have modified your preferences.</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleDiscard}>
              Discard
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              Save Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
