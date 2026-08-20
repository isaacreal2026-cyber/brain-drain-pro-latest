import { useState, useEffect, lazy, Suspense } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
  WifiOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConnectionLoader } from "@/components/ui/connection-loader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOnlineStatus } from "@/hooks/use-online-status";

// The mobile bottom-sheet uses framer-motion; lazy-load it so the ~130kB
// library stays off the critical path for desktop / first paint on 3G.
const MobileNavDrawer = lazy(() =>
  import("@/components/layout/MobileNavDrawer").then((m) => ({ default: m.MobileNavDrawer })),
);
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
  const isOffline = useOnlineStatus() === "offline";

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

  // Primary navigation — ordered by frequency of use so the most common
  // destinations are first (best for scanning, screen-reader order, and
  // thumb reach on mobile).
  const primaryNav = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/search", icon: Search, label: "Search" },
    { href: "/library", icon: Library, label: "Brains" },
    { href: "/missions", icon: Rocket, label: "Pathways" },
  ];

  // Secondary destinations — reachable from the desktop sidebar and the
  // mobile "More" sheet.
  const secondaryNav = [
    { href: "/topics", icon: Hash, label: "Topics" },
    { href: "/community", icon: Users, label: "Community" },
    { href: "/messages", icon: MessageSquare, label: "Messages" },
    { href: "/notifications", icon: Bell, label: "Notifications" },
  ];

  // Account destinations — pinned to the bottom of the desktop sidebar and
  // grouped separately in the mobile "More" sheet for clear separation.
  const accountNav = [
    { href: "/profile", icon: User, label: "Profile" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  // All items, in display order, used to render the desktop sidebar.
  const navItems = [...primaryNav, ...secondaryNav, ...accountNav];

  // Mobile: 4 primary tabs + a "More" sheet containing everything else,
  // grouped by section.
  const bottomNavItems = primaryNav;
  const drawerSections = [
    { label: "Explore", items: secondaryNav },
    { label: "Account", items: accountNav },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground relative overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      {/* Offline Status Notification Banner */}
      {isOffline && (
        <div
          role="status"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-4 py-2.5 bg-destructive border border-destructive/20 text-destructive-foreground rounded-full shadow-lg shadow-destructive/20 text-sm font-semibold tracking-wide animate-in slide-in-from-top fade-in"
        >
          <WifiOff className="w-4 h-4 animate-pulse text-destructive-foreground" />
          <span>Offline — your work is saved on this device</span>
        </div>
      )}

      {/* Emotional Immersion: Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20 dark:opacity-30 mix-blend-screen">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/20 blur-[150px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
      </div>
      
      <div className="flex min-h-screen w-full relative z-10">
        <ConnectionLoader />
      {/* Desktop Sidebar */}
      <TooltipProvider delayDuration={0}>
        <aside
          style={{ width: isSidebarCollapsed ? 80 : 256 }}
          className="hidden md:flex flex-col border-r border-border/50 bg-card sticky top-0 h-screen z-10 shrink-0 transition-[width] duration-200 ease-out"
        >
          <div className="p-4">
            <Link
              href="/"
              onClick={(e) => handleLinkClick("/", e)}
              aria-label="Brain Drain — Home"
              className={cn(
                "flex items-center gap-3 font-extrabold text-2xl tracking-tight cursor-pointer hover:bg-muted/50 p-2.5 rounded-full transition-all duration-200 overflow-hidden",
                isSidebarCollapsed ? "w-12 h-12 justify-center" : "w-full",
              )}
            >
              <BrainCircuit className="w-8 h-8 shrink-0 text-primary" />
              {!isSidebarCollapsed && (
                <span className="truncate whitespace-nowrap bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  Brain Drain
                </span>
              )}
            </Link>
          </div>

          <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-none" aria-label="Primary">
            {[...primaryNav, ...secondaryNav].map((item) => {
              const isActive = location === item.href;
              const linkContent = (
                <Button
                  variant="ghost"
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "w-full transition-all duration-200 rounded-full py-5 text-base font-medium",
                    isSidebarCollapsed ? "justify-center px-0 w-12 h-12 mx-auto" : "justify-start gap-4 px-5",
                    isActive ? "bg-foreground/10 text-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
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

          {/* Account links pinned to the bottom — easy to reach and clearly separated */}
          <nav className="px-3 pb-3 pt-2 space-y-1.5 border-t border-border/40" aria-label="Account">
            {accountNav.map((item) => {
              const isActive = location === item.href;
              const linkContent = (
                <Button
                  variant="ghost"
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "w-full transition-all duration-200 rounded-full py-4 text-sm font-medium",
                    isSidebarCollapsed ? "justify-center px-0 w-12 h-12 mx-auto" : "justify-start gap-4 px-5",
                    isActive ? "bg-foreground/10 text-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  <item.icon className={cn("shrink-0 w-5 h-5", isActive && "stroke-[2.5]")} />
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

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              aria-label={isSidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
              aria-expanded={!isSidebarCollapsed}
              className={cn(
                "mt-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/60",
                isSidebarCollapsed ? "w-12 h-12 mx-auto flex items-center justify-center" : "w-full justify-start gap-4 px-5 py-4",
              )}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
              {!isSidebarCollapsed && <span className="text-sm font-medium">Collapse</span>}
            </Button>
          </nav>
        </aside>
      </TooltipProvider>

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col min-w-0 bg-background overflow-x-hidden outline-none">
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
      <aside aria-label="Discover" className="hidden xl:flex w-80 flex-col border-l border-border/50 bg-background sticky top-0 h-screen z-10 p-5 overflow-y-auto gap-6">
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
                <button key={topic.name} className="w-full text-left flex flex-col cursor-pointer hover:bg-muted/30 focus-visible:bg-muted/30 p-2 -mx-2 rounded-xl transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="text-[11px] text-muted-foreground font-medium">Trending</span>
                  <span className="text-sm font-semibold text-foreground">#{topic.name}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{topic.count} posts</span>
                </button>
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
                <button key={i} className="w-full text-left flex items-center gap-3 cursor-pointer group hover:bg-muted/30 focus-visible:bg-muted/30 p-2 -mx-2 rounded-xl transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-colors", brain.bg, brain.color)}>
                    <BrainCircuit className="w-5 h-5" aria-hidden />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-semibold truncate group-hover:text-primary text-foreground">{brain.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{brain.author}</div>
                  </div>
                </button>
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
                <button key={i} className="w-full text-left flex items-center gap-3 cursor-pointer group hover:bg-muted/30 focus-visible:bg-muted/30 p-2 -mx-2 rounded-xl transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" aria-hidden />
                    </div>
                    <div className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background", user.status === "online" ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-semibold truncate group-hover:text-primary text-foreground">{user.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav — primary destinations within thumb reach.
          Active state uses an indicator bar (not color alone) for low-vision users. */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-lg border-t border-border/50 flex items-stretch justify-around px-2 z-50"
        aria-label="Primary"
      >
        {bottomNavItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleLinkClick(item.href, e)}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className="relative flex-1 flex items-center justify-center"
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full bg-primary"
                />
              )}
              <div
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="w-6 h-6" aria-hidden />
                <span className="text-[11px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          aria-label="Open more navigation options"
          aria-haspopup="menu"
          aria-expanded={isMobileDrawerOpen}
          className="relative flex-1 flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {drawerSections.some((s) => s.items.some((i) => i.href === location)) && (
            <span
              aria-hidden
              className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full bg-primary"
            />
          )}
          <div className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5">
            <MoreHorizontal className="w-6 h-6" aria-hidden />
            <span className="text-[11px] font-medium">More</span>
          </div>
        </button>
      </nav>

      {/* Mobile More drawer (lazy-loaded to keep framer-motion off the critical path) */}
      <Suspense fallback={null}>
        <MobileNavDrawer
          open={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          sections={drawerSections}
          currentPath={location}
          onLinkClick={handleLinkClick}
        />
      </Suspense>

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
