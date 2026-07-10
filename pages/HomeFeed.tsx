import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { useSocial } from "@/hooks/use-social";
import { useTopics } from "@/hooks/use-topics";
import { PostCard } from "@/components/feed/PostCard";
import { PostSkeleton } from "@/components/feed/PostSkeleton";
import { PostCreator } from "@/components/feed/PostCreator";
import { FloatingCreateButton } from "@/components/ui/CreateExperienceModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, PenSquare } from "lucide-react";
import { Post, Topic } from "@/lib/types";
import { MomentumWidget } from "@/components/momentum/MomentumWidget";
import { useLocation } from "wouter";

const NeuralGraph = lazy(() => import("@/components/NeuralGraph").then(m => ({ default: m.NeuralGraph })));

// Helper to seed data if empty
const SEED_TOPICS: Topic[] = [
  { id: "t1", name: "Engineering", description: "Software and Hardware", followerCount: 1200 },
  { id: "t2", name: "Philosophy", description: "Deep thoughts", followerCount: 800 },
  { id: "t3", name: "React", description: "UI Framework", followerCount: 2000 }
];

const SEED_POSTS: Post[] = [
  {
    id: "p1",
    userId: "u1",
    topicId: "t3",
    content: "Just finalized my mental model for React suspense transitions. The key is understanding that the render phase can be interrupted safely. Created a small brain to test your knowledge on it.",
    commentCount: 42,
    reactions: { love: 12, like: 104 },
    createdAt: Date.now() - 3600000,
    brainId: "dummy-brain-1"
  },
  {
    id: "p2",
    userId: "u2",
    topicId: "t1",
    content: "Why do we keep rebuilding the same wheels? A thread on system architecture and standardizing our modules.",
    commentCount: 12,
    reactions: { like: 45 },
    createdAt: Date.now() - 86400000,
  },
  {
    id: "p3",
    userId: "u3",
    topicId: "t2",
    content: "If a machine encodes human knowledge, does it possess a fraction of our consciousness?",
    mediaUrls: ["https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1000&auto=format&fit=crop"],
    commentCount: 89,
    reactions: { love: 200, like: 10 },
    createdAt: Date.now() - 172800000,
  }
];

export function HomeFeed() {
  const { posts, isLoading, addPost, reactToPost, refreshPosts } = useSocial();
  const { topics, addTopic, refreshTopics } = useTopics();
  const [, setLocation] = useLocation();
  
  const graphData = useMemo(() => {
    const nodes = topics.map(t => ({ id: t.id, name: t.name }));
    const links: { source: string; target: string }[] = [];
    
    const userTopics: Record<string, Set<string>> = {};
    const validTopicIds = new Set(topics.map(t => t.id));
    posts.forEach(post => {
      if (!userTopics[post.userId]) userTopics[post.userId] = new Set();
      if (validTopicIds.has(post.topicId)) {
        userTopics[post.userId].add(post.topicId);
      }
    });
    
    Object.values(userTopics).forEach(set => {
      const arr = Array.from(set);
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          links.push({ source: arr[i], target: arr[j] });
        }
      }
    });
    
    return { nodes, links };
  }, [posts, topics]);

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    const seedData = async () => {
      if (!isLoading && posts.length === 0 && topics.length === 0 && !isSeeding) {
        setIsSeeding(true);
        for (const t of SEED_TOPICS) await addTopic(t);
        for (const p of SEED_POSTS) await addPost(p);
        await refreshTopics();
        await refreshPosts();
        setIsSeeding(false);
      }
    };
    seedData();
  }, [posts.length, topics.length, isLoading]);

  const [displayLimit, setDisplayLimit] = useState(5);
  const [observerRef, setObserverRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setDisplayLimit((prev) => prev + 5);
      }
    });

    if (observerRef) {
      observer.observe(observerRef);
    }

    return () => {
      if (observerRef) {
        observer.unobserve(observerRef);
      }
    };
  }, [observerRef]);

  const handleCreatePost = async (post: Post) => {
    await addPost(post);
  };

  if (isLoading || isSeeding) {
    return (
      <div className="max-w-2xl mx-auto min-h-screen border-x border-border/50 bg-background/50 p-4 space-y-4">
        {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto min-h-screen border-x border-border/50 bg-background/50">
      <MomentumWidget />
      
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <Tabs defaultValue="foryou" className="w-full">
          <TabsList className="bg-transparent w-full h-13 flex p-0 border-b-0">
            <TabsTrigger value="foryou" className="flex-1 h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-primary rounded-none px-4 pb-0 text-[15px] font-medium text-muted-foreground hover:bg-muted/20 transition-all cursor-pointer">For You</TabsTrigger>
            <TabsTrigger value="following" className="flex-1 h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-primary rounded-none px-4 pb-0 text-[15px] font-medium text-muted-foreground hover:bg-muted/20 transition-all cursor-pointer">Following</TabsTrigger>
            <TabsTrigger value="trending" className="flex-1 h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-primary rounded-none px-4 pb-0 text-[15px] font-medium text-muted-foreground hover:bg-muted/20 transition-all cursor-pointer">Trending</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="sticky top-[52px] z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 py-3 overflow-x-auto flex gap-2 px-4 scrollbar-none">
        <Button 
          variant={selectedTopicId === null ? "default" : "outline"} 
          className="rounded-full shrink-0 px-4 py-1.5 h-8 text-sm font-semibold transition-all duration-200 cursor-pointer"
          onClick={() => setSelectedTopicId(null)}
        >
          All
        </Button>
        {topics.map(topic => (
          <Button 
            key={topic.id} 
            variant={selectedTopicId === topic.id ? "default" : "outline"} 
            className="rounded-full shrink-0 px-4 py-1.5 h-8 text-sm font-semibold transition-all duration-200 cursor-pointer"
            onClick={() => setSelectedTopicId(topic.id)}
          >
            #{topic.name}
          </Button>
        ))}
      </div>

      <div className="p-4 border-b border-border/50">
        <div 
          className="flex items-center gap-4 bg-muted/30 p-3 rounded-2xl cursor-text hover:bg-muted/50 transition-colors border border-border/50"
          onClick={() => setIsCreatorOpen(true)}
        >
          <div className="w-10 h-10 rounded-full bg-primary/20 flex flex-shrink-0 items-center justify-center text-primary font-bold text-sm">
            ME
          </div>
          <div className="flex-1 text-muted-foreground">
            Share your knowledge...
          </div>
          <Button size="sm" className="rounded-full px-4 font-semibold">Post</Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-2 sm:p-4 pb-24">
        {(() => {
          const searchParams = new URLSearchParams(window.location.search);
          const postIdFromUrl = searchParams.get("postId");
          const allDisplayedPosts = postIdFromUrl 
            ? posts.filter(p => p.id === postIdFromUrl) 
            : (selectedTopicId ? posts.filter(p => p.topicId === selectedTopicId) : posts);
            
          const displayedPosts = allDisplayedPosts.slice(0, displayLimit);

          return displayedPosts.length > 0 ? (
            <>
              {displayedPosts.map(post => {
                const topic = topics.find(t => t.id === post.topicId);
                return (
                  <div key={post.id} className="animate-in fade-in duration-700">
                    <PostCard 
                      post={post} 
                      onReact={reactToPost}
                      topicName={topic?.name}
                      authorName={post.userId === "me" ? "Me" : `User ${post.userId.substring(0, 4)}`}
                    />
                  </div>
                );
              })}
              <div ref={setObserverRef} className="h-4" />
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              {postIdFromUrl ? "Post not found." : "No posts yet."}
              {postIdFromUrl && (
                <div className="mt-4">
                  <Button variant="outline" onClick={() => setLocation("/")}>View All Posts</Button>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {posts.length > 0 && (
        <>
          <div className="p-6 border-t border-border/50 bg-muted/20">
            <h3 className="font-semibold text-lg mb-4">Related Topics</h3>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const topicCounts = posts.reduce((acc, post) => {
                  acc[post.topicId] = (acc[post.topicId] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                return Object.entries(topicCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([topicId]) => topics.find(t => t.id === topicId))
                  .filter((t): t is Topic => !!t)
                  .map(topic => (
                    <Button key={topic.id} variant="outline" className="rounded-full">
                      #{topic.name}
                    </Button>
                  ));
              })()}
            </div>
          </div>

          <div className="p-6 border-t border-border/50">
            <h3 className="font-semibold text-lg mb-4">Neural Framework</h3>
            <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-xl" />}>
              <NeuralGraph nodes={graphData.nodes} links={graphData.links} />
            </Suspense>
          </div>
        </>
      )}

      <FloatingCreateButton onCreatePost={() => setIsCreatorOpen(true)} />

      <PostCreator 
        isOpen={isCreatorOpen} 
        onClose={() => setIsCreatorOpen(false)} 
        onPostCreated={handleCreatePost}
        topics={topics}
      />
    </div>
  );
}