import { lazy, Suspense, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell,
  ChevronRight,
  Hash,
  LayoutDashboard,
  Library,
  Map,
  MessageCircle,
  MoreHorizontal,
  Search,
  Settings,
  Sparkles,
  UserRound,
  Users,
  WifiOff,
} from "lucide-react";
import { ConnectionLoader } from "@/components/ui/connection-loader";
import { useOnlineStatus } from "@/hooks/use-online-status";
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

const MobileNavDrawer = lazy(() =>
  import("@/components/layout/MobileNavDrawer").then((module) => ({ default: module.MobileNavDrawer })),
);

interface AppShellProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
}

const primaryNav: NavItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/library", icon: Library, label: "Library" },
  { href: "/missions", icon: Map, label: "Pathways" },
];

const exploreNav: NavItem[] = [
  { href: "/topics", icon: Hash, label: "Topics" },
  { href: "/community", icon: Users, label: "Community" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
];

const accountNav: NavItem[] = [
  { href: "/profile", icon: UserRound, label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

const mobileNav = [primaryNav[0], primaryNav[2], primaryNav[3], accountNav[0]];

function isActivePath(location: string, href: string) {
  return href === "/" ? location === "/" : location === href || location.startsWith(`${href}/`);
}

function NavLink({ item, location, onNavigate }: { item: NavItem; location: string; onNavigate: (href: string, event: MouseEvent) => void }) {
  const active = isActivePath(location, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={(event) => onNavigate(item.href, event)}
      className="bd-nav-link"
      data-active={active}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={17} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}

export function AppShell({ children }: AppShellProps) {
  const [location, setLocation] = useLocation();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const isOffline = useOnlineStatus() === "offline";

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if ((window as any).__isAppDirty) {
        event.preventDefault();
        event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleLinkClick = (href: string, event: MouseEvent) => {
    if (!(window as any).__isAppDirty) return;

    event.preventDefault();
    setPendingHref(href);
    setIsConfirmOpen(true);
  };

  const handleConfirmNavigation = () => {
    (window as any).__isAppDirty = false;
    setIsConfirmOpen(false);
    if (pendingHref) setLocation(pendingHref);
    setPendingHref(null);
  };

  const currentLabel = [...primaryNav, ...exploreNav, ...accountNav].find((item) =>
    isActivePath(location, item.href),
  )?.label || "Overview";

  const drawerSections = [
    { label: "Explore", items: exploreNav },
    { label: "Account", items: accountNav },
  ];

  return (
    <div className="bd-shell flex min-h-screen overflow-x-hidden">
      <a className="bd-skip-link" href="#main-content">Skip to content</a>

      {isOffline && (
        <div
          className="fixed left-1/2 top-3 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent/35 bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
          role="status"
          aria-live="polite"
        >
          <WifiOff size={14} aria-hidden="true" />
          <span>Offline · changes stay on this device</span>
        </div>
      )}

      <ConnectionLoader />

      <aside className="bd-sidebar hidden min-h-screen shrink-0 flex-col md:flex" aria-label="Workspace navigation">
        <div className="px-4 pb-6 pt-5">
          <Link href="/" className="bd-brand" aria-label="Brain Drain overview">
            <span className="bd-brand-mark" aria-hidden="true">
              <Sparkles size={16} strokeWidth={2.5} />
            </span>
            <span>
              <span className="bd-brand-name block">brain drain</span>
              <span className="bd-brand-subtitle block">knowledge workspace</span>
            </span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3" aria-label="Primary">
          <div className="flex flex-col gap-1.5">
            <p className="bd-nav-label mb-1">Workspace</p>
            {primaryNav.map((item) => (
              <NavLink key={item.href} item={item} location={location} onNavigate={handleLinkClick} />
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="bd-nav-label mb-1">Explore</p>
            {exploreNav.map((item) => (
              <NavLink key={item.href} item={item} location={location} onNavigate={handleLinkClick} />
            ))}
          </div>
        </nav>

        <div className="bd-sidebar-footer mt-5 p-3">
          <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
            <span className="bd-avatar" aria-hidden="true">AS</span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-[13px] font-semibold text-foreground">Alex Stone</strong>
              <span className="block truncate text-[11px] text-muted-foreground">Personal workspace</span>
            </span>
            <Link href="/settings" aria-label="Open settings" className="bd-icon-button h-8 w-8">
              <Settings size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </aside>

      <div className="bd-main flex min-h-screen flex-col">
        <header className="bd-topbar">
          <div className="bd-topbar-inner">
            <div className="flex min-w-0 items-center gap-2">
              <Link href="/" className="bd-brand md:hidden" aria-label="Brain Drain overview">
                <span className="bd-brand-mark" aria-hidden="true">
                  <Sparkles size={15} strokeWidth={2.5} />
                </span>
                <span className="bd-brand-name">brain drain</span>
              </Link>
              <div className="bd-topbar-context hidden md:flex">
                <span>Workspace</span>
                <ChevronRight size={13} aria-hidden="true" />
                <strong>{currentLabel}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="bd-command" type="button" onClick={() => setLocation("/search")} aria-label="Search your workspace">
                <Search size={14} aria-hidden="true" />
                <span>Search your workspace</span>
                <kbd className="bd-keycap">⌘ K</kbd>
              </button>
              <button
                className="bd-icon-button"
                type="button"
                onClick={() => setLocation("/notifications")}
                aria-label="Open notifications"
              >
                <Bell size={17} aria-hidden="true" />
              </button>
              <Link href="/profile" aria-label="Open Alex Stone profile" className="bd-avatar bd-avatar-small">AS</Link>
            </div>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="min-h-0 flex-1 outline-none">
          {children}
        </main>
      </div>

      <nav className="bd-mobile-nav" aria-label="Primary mobile navigation">
        {mobileNav.map((item) => {
          const active = isActivePath(location, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="bd-mobile-nav-link"
              data-active={active}
              onClick={(event) => handleLinkClick(item.href, event)}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={19} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className="bd-mobile-more"
          data-active={drawerSections.some((section) => section.items.some((item) => isActivePath(location, item.href)))}
          onClick={() => setIsMobileDrawerOpen(true)}
          aria-label="Open more navigation"
          aria-expanded={isMobileDrawerOpen}
        >
          <MoreHorizontal size={19} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>

      <Suspense fallback={null}>
        <MobileNavDrawer
          open={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          sections={drawerSections}
          currentPath={location}
          onLinkClick={handleLinkClick}
        />
      </Suspense>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have edits in progress. If you leave this screen, those changes will not be kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmOpen(false)}>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNavigation}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
