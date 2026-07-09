import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, Clock, X, Hash, User, Network } from "lucide-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const saved = localStorage.getItem("brain-builder-recent-searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        setRecentSearches([]);
      }
    } else {
      // Mock data for initial empty state
      setRecentSearches(["Artificial Intelligence", "Logic Models", "@johndoe", "React Patterns"]);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem("brain-builder-recent-searches", JSON.stringify(updated));
    // In a real app, this would trigger search results fetch
  };

  const removeRecent = (search: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== search);
    setRecentSearches(updated);
    localStorage.setItem("brain-builder-recent-searches", JSON.stringify(updated));
  };

  const handleRecentClick = (search: string) => {
    setQuery(search);
    // Move to top and persist
    const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem("brain-builder-recent-searches", JSON.stringify(updated));
    inputRef.current?.focus();
  };

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
                localStorage.removeItem("brain-builder-recent-searches");
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
                  <li key={search}>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start h-14 px-4 text-base font-normal group"
                      onClick={() => handleRecentClick(search)}
                    >
                      <Clock className="w-5 h-5 mr-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="flex-1 text-left truncate">{search}</span>
                      <div 
                        className="p-2 rounded-full hover:bg-muted/80 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => removeRecent(search, e)}
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
      ) : (
        <Tabs defaultValue="all" className="mt-4">
          <TabsList className="w-full justify-start border-b border-border/40 rounded-none bg-transparent h-12 p-0 overflow-x-auto flex-nowrap">
            <TabsTrigger value="all" className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-primary h-full px-6 text-[15px] text-muted-foreground hover:bg-muted/20 transition-all cursor-pointer">Top</TabsTrigger>
            <TabsTrigger value="topics" className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-primary h-full px-6 text-[15px] text-muted-foreground hover:bg-muted/20 transition-all cursor-pointer">Topics</TabsTrigger>
            <TabsTrigger value="brains" className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-primary h-full px-6 text-[15px] text-muted-foreground hover:bg-muted/20 transition-all cursor-pointer">Brains</TabsTrigger>
            <TabsTrigger value="users" className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-primary h-full px-6 text-[15px] text-muted-foreground hover:bg-muted/20 transition-all cursor-pointer">People</TabsTrigger>
          </TabsList>
          
          <div className="py-12 text-center">
            <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-2">Searching for "{query}"</h3>
            <p className="text-muted-foreground">Results will appear here</p>
            {/* Mock results could go here */}
          </div>
        </Tabs>
      )}
    </div>
  );
}
