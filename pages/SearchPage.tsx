import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { Search as SearchIcon, Clock, X, Hash, BrainCircuit, MessageSquare, User } from "lucide-react"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trackEvent } from "@/lib/analytics";
import { useSocial } from "@/hooks/use-social";
import { useTopics } from "@/hooks/use-topics";
import { useDatabase } from "@/hooks/use-database";

const RECENT_SEARCHES_KEY = "brain-builder-recent-searches";

/** Storage helpers that tolerate blocked/corrupt site data. */
function readRecentSearches(): string[] | null {
  try {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    // A corrupt value used to be trusted and then crashed on .filter().
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : null;
  } catch {
    return null;
  }
}

function writeRecentSearches(values: string[]) {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(values));
  } catch {
    // Recent searches are a convenience; ignore storage failures.
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore.
  }
}

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const { posts } = useSocial();
  const { topics } = useTopics();
  const { brains } = useDatabase();
  
  useEffect(() => {
    const queryFromUrl = new URLSearchParams(window.location.search).get("q");
    if (queryFromUrl) {
      setQuery(queryFromUrl);
    }

    const saved = readRecentSearches();
    if (saved) {
      setRecentSearches(saved);
    } else {
      // Mock data for initial empty state
      setRecentSearches(["Artificial Intelligence", "Logic Models", "@johndoe", "React Patterns"]);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    
    const updated = [trimmedQuery, ...recentSearches.filter(s => s !== trimmedQuery)].slice(0, 10);
    setRecentSearches(updated);
    writeRecentSearches(updated);
    void trackEvent("search_submitted", {
      query: trimmedQuery,
      queryLength: trimmedQuery.length,
    });
  };

  const removeRecent = (search: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== search);
    setRecentSearches(updated);
    writeRecentSearches(updated);
  };

  const handleRecentClick = (search: string) => {
    setQuery(search);
    // Move to top and persist
    const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 10);
    setRecentSearches(updated);
    writeRecentSearches(updated);
    void trackEvent("search_recent_selected", {
      query: search,
      queryLength: search.length,
    });
    inputRef.current?.focus();
  };

  const normalizedQuery = query.trim().toLowerCase();

  // Real, local-first search across everything the app already stores.
  const results = useMemo(() => {
    if (!normalizedQuery) {
      return { posts: [], topics: [], brains: [], people: [] as { id: string; name: string; postCount: number }[] };
    }

    const matchedTopics = topics.filter(
      (topic) =>
        topic.name.toLowerCase().includes(normalizedQuery) ||
        (topic.description || "").toLowerCase().includes(normalizedQuery),
    );

    const matchedBrains = brains.filter(
      (brain) =>
        brain.title.toLowerCase().includes(normalizedQuery) ||
        (brain.description || "").toLowerCase().includes(normalizedQuery) ||
        (brain.category || "").toLowerCase().includes(normalizedQuery),
    );

    const matchedPosts = posts.filter((post) =>
      post.content.toLowerCase().includes(normalizedQuery),
    );

    const peopleMap = new Map<string, { id: string; name: string; postCount: number }>();
    for (const post of posts) {
      const name = post.userId === "me" ? "Me" : `User ${post.userId.substring(0, 4)}`;
      const isMatch =
        post.userId.toLowerCase().includes(normalizedQuery) ||
        name.toLowerCase().includes(normalizedQuery);
      if (!isMatch) continue;
      const existing = peopleMap.get(post.userId);
      peopleMap.set(post.userId, {
        id: post.userId,
        name,
        postCount: (existing?.postCount || 0) + 1,
      });
    }

    return {
      posts: matchedPosts,
      topics: matchedTopics,
      brains: matchedBrains,
      people: Array.from(peopleMap.values()),
    };
  }, [normalizedQuery, posts, topics, brains]);

  const totalResults =
    results.posts.length + results.topics.length + results.brains.length + results.people.length;

  const EmptyResults = ({ label }: { label: string }) => (
    <div className="py-12 text-center">
      <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
      <h3 className="text-lg font-medium mb-2">No {label} for "{query}"</h3>
      <p className="text-muted-foreground">Try a different search term.</p>
    </div>
  );

  const TopicResults = () => (
    <div className="space-y-2">
      {results.topics.map((topic) => (
        <button
          key={topic.id}
          onClick={() => setLocation(`/topics/${topic.id}`)}
          className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-card/40 hover:bg-muted/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Hash className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">#{topic.name}</div>
            <div className="text-sm text-muted-foreground truncate">{topic.description}</div>
          </div>
        </button>
      ))}
    </div>
  );

  const BrainResults = () => (
    <div className="space-y-2">
      {results.brains.map((brain) => (
        <button
          key={brain.id}
          onClick={() => setLocation("/library")}
          className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-card/40 hover:bg-muted/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{brain.title}</div>
            <div className="text-sm text-muted-foreground truncate">{brain.description}</div>
          </div>
        </button>
      ))}
    </div>
  );

  const PostResults = () => (
    <div className="space-y-2">
      {results.posts.map((post) => (
        <button
          key={post.id}
          onClick={() => setLocation(`/?postId=${encodeURIComponent(post.id)}`)}
          className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-card/40 hover:bg-muted/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">
              {post.userId === "me" ? "Me" : `User ${post.userId.substring(0, 4)}`}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
          </div>
        </button>
      ))}
    </div>
  );

  const PeopleResults = () => (
    <div className="space-y-2">
      {results.people.map((person) => (
        <button
          key={person.id}
          onClick={() => setLocation(`/profile?userId=${encodeURIComponent(person.id)}`)}
          className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/40 hover:bg-muted/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{person.name}</div>
            <div className="text-sm text-muted-foreground truncate">
              {person.postCount} post{person.postCount === 1 ? "" : "s"}
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-6 min-h-screen">
      <div className="sticky top-0 z-10 pt-4 pb-6 bg-background">
        <form onSubmit={handleSearch} className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for brains, topics, users, or posts..." 
            className="w-full pl-12 pr-12 py-6 text-base rounded-full bg-muted/40 border border-transparent focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary focus-visible:bg-background transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </form>
      </div>

      {!query ? (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Searches</h2>
            {recentSearches.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => {
                setRecentSearches([]);
                clearRecentSearches();
              }}>
                Clear all
              </Button>
            )}
          </div>
          
          <ScrollArea className="h-[calc(100vh-200px)]">
            {recentSearches.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recent searches</p>
            ) : (
              <ul className="space-y-1">
                {recentSearches.map(search => (
                  <li key={search} className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      className="flex-1 justify-start h-14 px-4 text-base font-normal group"
                      onClick={() => handleRecentClick(search)}
                      aria-label={`Search again for ${search}`}
                    >
                      <Clock className="w-5 h-5 mr-4 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden />
                      <span className="flex-1 text-left truncate">{search}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={(e) => removeRecent(search, e)}
                      aria-label={`Remove ${search} from recent searches`}
                    >
                      <X className="w-4 h-4 text-muted-foreground" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
      ) : (
        <Tabs defaultValue="all" className="mt-4">
          <TabsList aria-label="Search result type" className="w-full justify-start border-b border-border/40 rounded-none bg-transparent h-12 p-0 overflow-x-auto flex-nowrap">
            <TabsTrigger value="all" className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-primary h-full px-6 text-[15px] text-muted-foreground hover:bg-muted/20 transition-all cursor-pointer">Top</TabsTrigger>
            <TabsTrigger value="topics" className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-primary h-full px-6 text-[15px] text-muted-foreground hover:bg-muted/20 transition-all cursor-pointer">Topics</TabsTrigger>
            <TabsTrigger value="brains" className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-primary h-full px-6 text-[15px] text-muted-foreground hover:bg-muted/20 transition-all cursor-pointer">Brains</TabsTrigger>
            <TabsTrigger value="users" className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-primary h-full px-6 text-[15px] text-muted-foreground hover:bg-muted/20 transition-all cursor-pointer">People</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4 space-y-6">
            {totalResults === 0 ? (
              <EmptyResults label="results" />
            ) : (
              <>
                {results.topics.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Topics</h3>
                    <TopicResults />
                  </section>
                )}
                {results.brains.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Brains</h3>
                    <BrainResults />
                  </section>
                )}
                {results.posts.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Posts</h3>
                    <PostResults />
                  </section>
                )}
                {results.people.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">People</h3>
                    <PeopleResults />
                  </section>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="topics" className="mt-4">
            {results.topics.length === 0 ? <EmptyResults label="topics" /> : <TopicResults />}
          </TabsContent>

          <TabsContent value="brains" className="mt-4">
            {results.brains.length === 0 ? <EmptyResults label="brains" /> : <BrainResults />}
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            {results.people.length === 0 ? <EmptyResults label="people" /> : <PeopleResults />}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
