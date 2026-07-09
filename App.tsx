import { Suspense, lazy, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { AppShell } from "@/components/layout/AppShell";
import { ShareBrainModal } from "@/components/ShareBrainModal";
import { useShortcuts } from "@/hooks/use-shortcuts";
import { useMissionReminders } from "@/hooks/use-mission-reminders";
import { AuthProvider } from "@/components/auth/AuthContext";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { idb } from "@/lib/db";
import { Post, Topic, Mission, Milestone, Brain } from "@/lib/types";

// Eager load critical routes
import { HomeFeed } from "@/pages/HomeFeed";

// Lazy load other pages
const LibraryPage = lazy(() => import("@/pages/LibraryPage").then(module => ({ default: module.LibraryPage })));
const TopicsPage = lazy(() => import("@/pages/TopicsPage").then(module => ({ default: module.TopicsPage })));
const TopicDetailPage = lazy(() => import("@/pages/TopicDetailPage").then(module => ({ default: module.TopicDetailPage })));
const ProfilePage = lazy(() => import("@/pages/ProfilePage").then(module => ({ default: module.ProfilePage })));
const SearchPage = lazy(() => import("@/pages/SearchPage").then(module => ({ default: module.SearchPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then(module => ({ default: module.SettingsPage })));
const MissionsPage = lazy(() => import("@/pages/MissionsPage").then(module => ({ default: module.MissionsPage })));
const PersonalityTestPage = lazy(() => import("@/pages/PersonalityTestPage").then(module => ({ default: module.PersonalityTestPage })));
const MessagesPage = lazy(() => import("@/pages/MessagesPage").then(module => ({ default: module.MessagesPage })));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage").then(module => ({ default: module.NotificationsPage })));
const CommunityPage = lazy(() => import("@/pages/CommunityPage").then(module => ({ default: module.CommunityPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function usePrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch posts
    queryClient.prefetchQuery({
      queryKey: ["posts"],
      queryFn: async () => {
        const allPosts = await idb.getAll<Post>("posts");
        return allPosts.sort((a, b) => b.createdAt - a.createdAt);
      }
    });

    // Prefetch topics
    queryClient.prefetchQuery({
      queryKey: ["topics"],
      queryFn: async () => {
        const allTopics = await idb.getAll<Topic>("topics");
        return [...allTopics].sort((a, b) => {
          const orderA = a.order !== undefined ? a.order : 999999;
          const orderB = b.order !== undefined ? b.order : 999999;
          return orderA - orderB;
        });
      }
    });

    // Prefetch brains
    queryClient.prefetchQuery({
      queryKey: ["brains"],
      queryFn: async () => {
        const allBrains = await idb.getAll<Brain>("brains");
        return allBrains;
      }
    });
  }, [queryClient]);
}

interface ErrorBoundaryProps {
  children: ReactNode;
  toast: (options: { title: string; description: string; variant?: "destructive" | "default" }) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Route Error caught by boundary:", error, errorInfo);
    this.props.toast({
      title: "Route Execution Failure",
      description: error.message || "An unexpected error occurred while loading this page.",
      variant: "destructive",
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <RouteErrorFallback 
          onReset={() => this.setState({ hasError: false, error: null })} 
          error={this.state.error}
        />
      );
    }

    return this.props.children;
  }
}

function RouteErrorFallback({ onReset, error }: { onReset: () => void; error: Error | null }) {
  const [, setLocation] = useLocation();

  const handleRecover = () => {
    onReset();
    setLocation("/");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center bg-background text-foreground">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <AlertTriangle className="h-8 w-8 text-destructive animate-pulse" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-2">Navigation Interrupt</h2>
      <p className="text-muted-foreground mb-4 max-w-md">
        An execution mismatch or network delay disrupted system loading.
      </p>
      {error && (
        <div className="bg-muted border border-border/50 rounded-lg p-3 max-w-lg mb-6 text-xs font-mono text-left overflow-auto max-h-32 w-full text-destructive-foreground dark:text-destructive">
          {error.stack || error.message}
        </div>
      )}
      <Button 
        onClick={handleRecover}
        className="bg-primary text-primary-foreground shadow-primary/20 shadow-lg font-medium"
      >
        Return to Home Feed
      </Button>
    </div>
  );
}

function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  return <ErrorBoundary toast={toast}>{children}</ErrorBoundary>;
}

function Router() {
  useShortcuts();
  usePrefetch();
  useMissionReminders();
  
  return (
    <AppShell>
      <Suspense fallback={<PageLoader />}>
        <RouteErrorBoundary>
          <Switch>
            <Route path="/" component={HomeFeed} />
            <Route path="/search" component={SearchPage} />
            <Route path="/missions" component={MissionsPage} />
            <Route path="/personality-test" component={PersonalityTestPage} />
            <Route path="/community" component={CommunityPage} />
            <Route path="/messages" component={MessagesPage} />
            <Route path="/notifications" component={NotificationsPage} />
            <Route path="/profile" component={ProfilePage} />
            <Route path="/library" component={LibraryPage} />
            <Route path="/topics" component={TopicsPage} />
            <Route path="/topics/:id" component={TopicDetailPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={HomeFeed} />
          </Switch>
        </RouteErrorBoundary>
      </Suspense>
    </AppShell>
  );
}

function App() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const registerSW = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("ServiceWorker registered with scope: ", registration.scope);
          })
          .catch((err) => {
            console.error("ServiceWorker registration failed: ", err);
          });
      };

      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
        return () => window.removeEventListener("load", registerSW);
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="brain-builder-theme">
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <ShareBrainModal />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
