import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Search, 
  User, 
  Library, 
  Hash, 
  Settings,
  BrainCircuit,
  MessageSquare,
  Bell,
  Users,
  Rocket,
  ArrowLeft,
  MoreHorizontal,
  X,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  WifiOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ConnectionLoader } from "@/components/ui/connection-loader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [location, setLocation] = useLocation();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((window as any).__isAppDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleLinkClick = (href: string, e: React.MouseEvent) => {
    if ((window as any).__isAppDirty) {
      e.preventDefault();
      setPendingHref(href);
      setIsConfirmOpen(true);
    }
  };

  const handleConfirmNavigation = () => {
    (window as any).__isAppDirty = false;
    setIsConfirmOpen(false);
    if (pendingHref) {
      setLocation(pendingHref);
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/search", icon: Search, label: "Search" },
    { href: "/missions", icon: Rocket, label: "Pathways" },
    { href: "/community", icon: Users, label: "Civilization" },
    { href: "/topics", icon: Hash, label: "Knowledge" },
    { href: "/messages", icon: MessageSquare, label: "Mentor Network" },
    { href: "/notifications", icon: Bell, label: "Notifications" },
    { href: "/library", icon: Library, label: "Legacy" },
    { href: "/profile", icon: User, label: "Evolution" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const bottomNavItems = navItems.slice(0, 4); // shown directly in bottom bar
  const drawerNavItems = navItems.slice(4);     // shown in "More" drawer

  return (
    <div className="flex min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Offline Status Notification Banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-4 left-1/2 z-[100] flex items-center gap-2.5 px-4 py-2.5 bg-destructive border border-destructive/20 text-destructive-foreground rounded-full shadow-lg shadow-destructive/20 text-sm font-semibold tracking-wide"
          >
            <WifiOff className="w-4 h-4 animate-pulse text-destructive-foreground" />
            <span>You are currently offline</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emotional Immersion: Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20 dark:opacity-30 mix-blend-screen">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/20 blur-[150px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
      </div>
      
      <div className="flex min-h-screen w-full relative z-10">
        <ConnectionLoader />
      {/* Desktop Sidebar */}
      <TooltipProvider delayDuration={0}>
        <motion.aside 
          initial={false}
          animate={{ width: isSidebarCollapsed ? 80 : 256 }}
          className="hidden md:flex flex-col border-r border-border/50 bg-card sticky top-0 h-screen z-10 shrink-0"
        >
          <div className="p-4 flex items-center justify-between">
            <Link href="/" onClick={(e) => handleLinkClick("/", e)}>
              <div className={cn("flex items-center gap-3 font-extrabold text-2xl tracking-tight cursor-pointer hover:bg-muted/50 p-2.5 rounded-full transition-all duration-200 overflow-hidden", isSidebarCollapsed ? "w-12 h-12 justify-center" : "w-full")}>
                <BrainCircuit className="w-8 h-8 shrink-0 text-primary" />
                {!isSidebarCollapsed && <span className="truncate whitespace-nowrap bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Evolution</span>}
              </div>
            </Link>
          </div>
          
          <div className="px-4 pb-4 flex justify-end">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
              className="text-muted-foreground hover:text-foreground shrink-0 rounded-full w-9 h-9 hover:bg-muted/60"
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </Button>
          </div>

          <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-none">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const linkContent = (
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full transition-all duration-200 rounded-full py-5 text-base font-medium",
                    isSidebarCollapsed ? "justify-center px-0 w-12 h-12 mx-auto" : "justify-start gap-4 px-5",
                    isActive ? "bg-foreground/10 text-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <item.icon className={cn("shrink-0", isSidebarCollapsed ? "w-6 h-6" : "w-5 h-5", isActive ? "stroke-[2.5]" : "stroke-[2]")} />
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </Button>
              );

              return isSidebarCollapsed ? (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link href={item.href} onClick={(e) => handleLinkClick(item.href, e)} className="block w-full">{linkContent}</Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                <Link key={item.href} href={item.href} onClick={(e) => handleLinkClick(item.href, e)} className="block w-full">{linkContent}</Link>
              );
            })}
          </nav>
        </motion.aside>
      </TooltipProvider>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-x-hidden">
        {/* Easy Back Navigation row (Only shown when deeply nested) */}
        {((location.startsWith("/topics/") && location !== "/topics") || (location.startsWith("/missions/") && location !== "/missions")) && (
          <header className="sticky top-0 z-20 w-full bg-background/80 backdrop-blur-md border-b border-border/40 py-2 px-4 flex items-center h-14">
            <Link 
              href={location.startsWith("/topics/") ? "/topics" : "/missions"} 
              onClick={(e) => handleLinkClick(location.startsWith("/topics/") ? "/topics" : "/missions", e)}
            >
              <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to {location.startsWith("/topics/") ? "Topics" : "Missions"}</span>
              </Button>
            </Link>
          </header>
        )}

        <div className="flex-1 pb-20 md:pb-0 relative">
          <div className="h-full">
            {children}
          </div>
        </div>
      </main>

      {/* Desktop Right Sidebar (Extra features distributed for large screens) */}
      <aside className="hidden xl:flex w-80 flex-col border-l border-border/50 bg-background sticky top-0 h-screen z-10 p-5 overflow-y-auto gap-6">
        <div className="space-y-6">
          <div className="bg-card/40 border border-border/40 p-4 rounded-[20px] space-y-4 hover:border-border/60 transition-colors">
            <h3 className="text-sm font-bold text-foreground tracking-tight">Trending Topics</h3>
            <div className="space-y-3">
              {[
                { name: "MachineLearning", count: "12.5k" },
                { name: "ReactPatterns", count: "8.2k" },
                { name: "SystemDesign", count: "6.1k" },
                { name: "GraphDatabases", count: "4.3k" },
              ].map((topic) => (
                <div key={topic.name} className="flex flex-col cursor-pointer hover:bg-muted/30 p-2 -mx-2 rounded-xl transition-all">
                  <span className="text-[11px] text-muted-foreground font-medium">Trending</span>
                  <span className="text-sm font-semibold text-foreground">#{topic.name}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{topic.count} posts</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card/40 border border-border/40 p-4 rounded-[20px] space-y-4 hover:border-border/60 transition-colors">
            <h3 className="text-sm font-bold text-foreground tracking-tight">Suggested Networks</h3>
            <div className="space-y-3">
              {[
                { title: "Advanced TypeScript", author: "@alice_dev", color: "text-blue-500", bg: "bg-blue-500/10" },
                { title: "Node.js Microservices", author: "@bob_builder", color: "text-emerald-500", bg: "bg-emerald-500/10" },
                { title: "Quantum Computing", author: "@physics_fan", color: "text-purple-500", bg: "bg-purple-500/10" },
              ].map((brain, i) => (
                <div key={i} className="flex items-center gap-3 cursor-pointer group hover:bg-muted/30 p-2 -mx-2 rounded-xl transition-all">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-colors", brain.bg, brain.color)}>
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-semibold truncate group-hover:text-primary text-foreground">{brain.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{brain.author}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-card/40 border border-border/40 p-4 rounded-[20px] space-y-4 hover:border-border/60 transition-colors">
            <h3 className="text-sm font-bold text-foreground tracking-tight">Active Contributors</h3>
            <div className="space-y-3">
              {[
                { name: "Sarah Connor", status: "online", role: "AI Researcher" },
                { name: "John Smith", status: "offline", role: "Frontend Lead" },
                { name: "Emma Watson", status: "online", role: "Data Scientist" },
              ].map((user, i) => (
                <div key={i} className="flex items-center gap-3 cursor-pointer group hover:bg-muted/30 p-2 -mx-2 rounded-xl transition-all">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background", user.status === "online" ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-semibold truncate group-hover:text-primary text-foreground">{user.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/90 backdrop-blur-lg border-t border-border/50 flex items-center justify-around px-2 z-50">
        {bottomNavItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={(e) => handleLinkClick(item.href, e)}>
            <div className={cn(
              "p-2 flex flex-col items-center gap-0.5 rounded-xl transition-all",
              location === item.href ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
            )}>
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </div>
          </Link>
        ))}
        {/* More button */}
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className={cn(
            "p-2 flex flex-col items-center gap-0.5 rounded-xl transition-all",
            drawerNavItems.some(i => i.href === location)
              ? "text-primary scale-110"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MoreHorizontal className="w-6 h-6" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {/* Mobile More drawer */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            <motion.div
              className="md:hidden fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
            />
            <motion.div
              className="md:hidden fixed bottom-0 left-0 right-0 z-[70] bg-card rounded-t-3xl border-t border-border/50 p-6 pb-10"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-6">
                <span className="font-bold text-lg">More</span>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsMobileDrawerOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {drawerNavItems.map((item) => (
                  <Link key={item.href} href={item.href} onClick={(e) => handleLinkClick(item.href, e)}>
                    <div
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer",
                        location === item.href
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                      onClick={() => setIsMobileDrawerOpen(false)}
                    >
                      <item.icon className="w-7 h-7" />
                      <span className="text-xs font-semibold">{item.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Navigation Interruption / Unsaved Edits Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Unsaved Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits. If you navigate away, all your current progress or preferences will be permanently lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmOpen(false)}>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNavigation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
