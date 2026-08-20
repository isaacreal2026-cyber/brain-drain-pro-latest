import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowUp,
  ArrowUpRight,
  BrainCircuit,
  ChevronRight,
  CircleHelp,
  Hash,
  Clock3,
  Flame,
  Lightbulb,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";
import { useSocial } from "@/hooks/use-social";
import { useTopics } from "@/hooks/use-topics";
import { useCommunities } from "@/hooks/use-communities";
import { useAnalyticsEvents } from "@/hooks/use-recommendations";
import { useToast } from "@/hooks/use-toast";
import { Post, PostType, Topic, getPostUpvoteCount } from "@/lib/types";
import { FeedMode, rankHomeFeedPosts, rankRelatedTopics } from "@/lib/recommendations";
import { trackEvent } from "@/lib/analytics";

const PostCreator = lazy(() =>
  import("@/components/feed/PostCreator").then((module) => ({ default: module.PostCreator })),
);

const SEED_TOPICS: Topic[] = [
  { id: "t1", name: "Engineering", description: "Software and systems", followerCount: 1200 },
  { id: "t2", name: "Philosophy", description: "Deep questions", followerCount: 800 },
  { id: "t3", name: "React", description: "Interfaces and patterns", followerCount: 2000 },
];

const SEED_POSTS: Post[] = [
  {
    id: "p1",
    userId: "u1",
    topicId: "t3",
    content: "Just finalized my mental model for React suspense transitions. The key is understanding that the render phase can be interrupted safely.",
    commentCount: 42,
    reactions: { upvote: 104, downvote: 2 },
    createdAt: Date.now() - 3600000,
    brainId: "dummy-brain-1",
  },
  {
    id: "p2",
    userId: "u2",
    topicId: "t1",
    content: "Why do we keep rebuilding the same wheels? A short thread on system architecture and standardizing our modules.",
    commentCount: 12,
    reactions: { upvote: 45, downvote: 1 },
    createdAt: Date.now() - 86400000,
  },
  {
    id: "p3",
    userId: "u3",
    topicId: "t2",
    content: "If a machine encodes human knowledge, does it possess a fraction of our consciousness?",
    commentCount: 89,
    reactions: { upvote: 200, downvote: 4 },
    createdAt: Date.now() - 172800000,
  },
];

const AUTHOR_NAMES: Record<string, string> = {
  me: "Alex Stone",
  u1: "Mina Park",
  u2: "Rowan Lee",
  u3: "Noor Patel",
};

type HomeFilter = "all" | "questions" | "popular";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function timeAgo(timestamp: number) {
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NetworkMap() {
  return (
    <div className="bd-network" aria-hidden="true">
      <div className="bd-network-header">
        <span className="bd-network-label"><i /> Live map</span>
        <strong>5 paths connected</strong>
      </div>
      <span className="bd-network-line one" />
      <span className="bd-network-line two" />
      <span className="bd-network-line three" />
      <span className="bd-network-line four" />
      <span className="bd-network-node center"><BrainCircuit size={21} /></span>
      <span className="bd-network-node top" />
      <span className="bd-network-node right" />
      <span className="bd-network-node bottom" />
      <span className="bd-network-node small" />
    </div>
  );
}

function SignalCard({ post, topicName, onReact }: { post: Post; topicName: string; onReact: (postId: string) => void }) {
  const author = AUTHOR_NAMES[post.userId] || `User ${post.userId.slice(0, 4)}`;
  const upvotes = getPostUpvoteCount(post);

  return (
    <article className="bd-signal">
      <div className="bd-signal-top">
        <span className="bd-avatar" aria-hidden="true">{initials(author)}</span>
        <div className="bd-signal-meta">
          <span className="bd-signal-author">{author}</span>
          <span className="bd-signal-time">{timeAgo(post.createdAt)}</span>
          <span className="bd-signal-topic">#{topicName}</span>
        </div>
        <button className="bd-icon-button h-8 w-8" type="button" aria-label={`More options for ${author}`}>
          <MoreHorizontal size={16} aria-hidden="true" />
        </button>
      </div>
      <p className="bd-signal-content">{post.content}</p>
      <div className="bd-signal-footer">
        <button className="bd-signal-action" type="button" onClick={() => onReact(post.id)} aria-label={`Upvote post by ${author}`}>
          <ArrowUp size={14} aria-hidden="true" />
          <span>{upvotes}</span>
        </button>
        <button className="bd-signal-action" type="button" aria-label={`Open ${post.commentCount} comments`}>
          <MessageCircle size={14} aria-hidden="true" />
          <span>{post.commentCount}</span>
        </button>
        {post.brainId && (
          <span className="bd-chip ml-auto"><BrainCircuit size={12} /> Brain attached</span>
        )}
      </div>
    </article>
  );
}

export function HomeFeed() {
  const { posts, isLoading, addPost, reactToPost, refreshPosts } = useSocial("foryou", null);
  const { topics, addTopic, refreshTopics } = useTopics();
  const { communities } = useCommunities();
  const { data: analyticsEvents = [] } = useAnalyticsEvents();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [activeFilter, setActiveFilter] = useState<HomeFilter>("all");
  const [creatorPostType, setCreatorPostType] = useState<PostType>("post");
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);

  // The starter view has useful content immediately, while the same content is
  // persisted to IndexedDB for the app's offline-first experience.
  const visiblePosts = posts.length > 0 ? posts : SEED_POSTS;
  const visibleTopics = topics.length > 0 ? topics : SEED_TOPICS;

  useEffect(() => {
    const seedData = async () => {
      if (isLoading || isSeeding || (posts.length > 0 && topics.length > 0)) return;

      setIsSeeding(true);
      try {
        if (topics.length === 0) {
          for (const topic of SEED_TOPICS) await addTopic(topic);
        }
        if (posts.length === 0) {
          for (const post of SEED_POSTS) await addPost(post);
        }
        await refreshTopics();
        await refreshPosts();
      } catch (error) {
        console.error("Failed to seed the home feed", error);
        toast({
          title: "Feed setup failed",
          description: "We could not load starter content. Please refresh and try again.",
          variant: "destructive",
        });
      } finally {
        setIsSeeding(false);
      }
    };

    void seedData();
  }, [addPost, addTopic, isLoading, isSeeding, posts.length, refreshPosts, refreshTopics, toast, topics.length]);

  const topicById = useMemo(() => new Map(visibleTopics.map((topic) => [topic.id, topic])), [visibleTopics]);

  const recommendedTopics = useMemo(
    () => rankRelatedTopics(visiblePosts, visibleTopics, analyticsEvents).slice(0, 4),
    [analyticsEvents, visiblePosts, visibleTopics],
  );

  const displayedPosts = useMemo(() => {
    const ranked = rankHomeFeedPosts({
      posts: visiblePosts,
      topics: visibleTopics,
      events: analyticsEvents,
      mode: activeFilter === "popular" ? ("trending" as FeedMode) : ("foryou" as FeedMode),
      selectedTopicId: null,
    });

    return ranked
      .filter((post) => activeFilter !== "questions" || post.postType === "question" || post.content.includes("?"))
      .filter((post) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        const topic = topicById.get(post.topicId);
        return post.content.toLowerCase().includes(query) || topic?.name.toLowerCase().includes(query);
      })
      .slice(0, 4);
  }, [activeFilter, analyticsEvents, searchQuery, topicById, visiblePosts, visibleTopics]);

  const openCreator = (postType: PostType = "post") => {
    setCreatorPostType(postType);
    setIsCreatorOpen(true);
  };

  const handleCreatePost = async (post: Post) => {
    await addPost(post);
    setActiveFilter("all");
  };

  const handleReact = async (postId: string) => {
    await reactToPost(postId, "upvote");
  };

  const handleBuildBrain = () => {
    void trackEvent("brain_launch", { source: "home_hero" });
    setLocation("/library");
  };

  const handleTopicClick = (topicId: string) => {
    void trackEvent("topic_selected", { topicId, source: "home_topics" });
    setLocation(`/topics/${topicId}`);
  };

  return (
    <div className="bd-page">
      <div className="bd-page-heading">
        <div>
          <div className="bd-eyebrow">
            <span className="bd-eyebrow-dot" />
            <span>{isLoading || isSeeding ? "Preparing your space" : "Your workspace"}</span>
            <span className="bd-eyebrow-separator" />
            <span>Updated just now</span>
          </div>
        </div>
        <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#55d6a4]" /> Local sync on
        </span>
      </div>

      <section className="bd-welcome" aria-labelledby="welcome-title">
        <div className="bd-welcome-copy">
          <div className="bd-eyebrow"><Sparkles size={13} /> A clearer way to think</div>
          <h1 id="welcome-title" className="bd-display">Make your next decision <em>obvious.</em></h1>
          <p className="bd-welcome-description">
            Turn scattered ideas into small, useful decision paths you can return to, refine, and share.
          </p>
          <div className="bd-actions">
            <button className="bd-button-primary" type="button" onClick={handleBuildBrain}>
              <Plus size={15} aria-hidden="true" />
              Build a brain
            </button>
            <button className="bd-button-secondary" type="button" onClick={() => openCreator("post")}>
              <PenLine size={15} aria-hidden="true" />
              Share an idea
            </button>
          </div>
        </div>
        <NetworkMap />
      </section>

      <section className="bd-metrics" aria-label="Workspace summary">
        <div className="bd-metric">
          <span className="bd-metric-icon"><BrainCircuit size={16} aria-hidden="true" /></span>
          <span className="bd-metric-copy"><span className="bd-metric-value">12</span><span className="bd-metric-label">Brain maps</span></span>
          <span className="bd-metric-trend">+3</span>
        </div>
        <div className="bd-metric">
          <span className="bd-metric-icon"><Lightbulb size={16} aria-hidden="true" /></span>
          <span className="bd-metric-copy"><span className="bd-metric-value">84</span><span className="bd-metric-label">Ideas captured</span></span>
          <span className="bd-metric-trend">+12%</span>
        </div>
        <div className="bd-metric">
          <span className="bd-metric-icon"><Target size={16} aria-hidden="true" /></span>
          <span className="bd-metric-copy"><span className="bd-metric-value">68%</span><span className="bd-metric-label">Weekly focus</span></span>
          <span className="bd-metric-trend">On track</span>
        </div>
      </section>

      <div className="bd-dashboard-grid">
        <div className="bd-main-stack">
          <div className="bd-section-header">
            <h2>Continue where you left off</h2>
            <button className="bd-section-link" type="button" onClick={() => setLocation("/library")}>
              View library <ArrowUpRight size={14} aria-hidden="true" />
            </button>
          </div>

          <article className="bd-path-card">
            <div className="bd-path-copy">
              <span className="bd-chip"><Clock3 size={12} /> In progress</span>
              <h3 className="bd-path-title">The thoughtful product decision</h3>
              <p className="bd-path-description">A 7-step path for choosing what to build next without losing the plot.</p>
              <div className="bd-progress-row"><span>4 of 7 nodes complete</span><strong>57%</strong></div>
              <div className="bd-progress-track" role="progressbar" aria-valuenow={57} aria-valuemin={0} aria-valuemax={100} aria-label="The thoughtful product decision progress">
                <div className="bd-progress-fill" style={{ width: "57%" }} />
              </div>
            </div>
            <div className="bd-path-preview" aria-hidden="true">
              <span className="bd-preview-connector" />
              <span className="bd-preview-connector two" />
              <span className="bd-preview-orb one" />
              <span className="bd-preview-orb two" />
              <span className="bd-preview-orb three" />
              <span className="bd-preview-core"><BrainCircuit size={20} /></span>
            </div>
          </article>

          <div className="bd-section-header mt-2">
            <div>
              <h2>Recent signals</h2>
              <p className="mt-1 text-xs text-muted-foreground">Ideas worth a second look from your network.</p>
            </div>
            <button className="bd-section-link" type="button" onClick={() => setLocation("/community")}>
              See all <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>

          <div className="bd-filter-row" role="tablist" aria-label="Filter recent signals">
            {([
              ["all", "All signals"],
              ["questions", "Questions"],
              ["popular", "Popular"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                className="bd-filter"
                type="button"
                role="tab"
                aria-selected={activeFilter === value}
                data-active={activeFilter === value}
                onClick={() => setActiveFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="bd-signals">
            {displayedPosts.length > 0 ? displayedPosts.map((post) => (
              <SignalCard
                key={post.id}
                post={post}
                topicName={topicById.get(post.topicId)?.name || "General"}
                onReact={handleReact}
              />
            )) : (
              <div className="bd-empty">
                <CircleHelp className="mx-auto mb-2 text-accent" size={22} aria-hidden="true" />
                <strong>No signals match that search.</strong>
                <span>Try a different word or share the first idea.</span>
              </div>
            )}
          </div>
        </div>

        <aside className="bd-side-stack" aria-label="Workspace insights">
          <section className="bd-side-card bd-streak-card">
            <div className="bd-side-kicker"><Flame className="mr-1 inline-block" size={12} aria-hidden="true" /> Momentum</div>
            <div className="bd-streak-value">06 <span>days</span></div>
            <p className="bd-streak-copy">You are building a useful habit. Keep one small thought moving today.</p>
            <div className="bd-week" aria-label="Six day momentum streak">
              {[
                ["M", true], ["T", true], ["W", true], ["T", true], ["F", true], ["S", true], ["S", false],
              ].map(([day, done], index) => (
                <span className="bd-day" data-done={done} key={`${day}-${index}`}><i />{day}</span>
              ))}
            </div>
          </section>

          <section className="bd-side-card">
            <div className="bd-side-heading">
              <h3>Explore topics</h3>
              <span>{recommendedTopics.length} close to you</span>
            </div>
            <div className="bd-topic-list">
              {recommendedTopics.map((topic) => (
                <button key={topic.id} className="bd-topic-row w-full" type="button" onClick={() => handleTopicClick(topic.id)}>
                  <span className="bd-topic-icon"><Hash size={14} aria-hidden="true" /></span>
                  <span className="bd-topic-copy"><strong>#{topic.name}</strong><span>{topic.followerCount.toLocaleString()} curious people</span></span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              ))}
            </div>
            <button className="bd-section-link mt-3" type="button" onClick={() => setLocation("/topics")}>
              Browse all topics <ArrowUpRight size={13} aria-hidden="true" />
            </button>
          </section>

          <section className="bd-side-card">
            <div className="bd-side-heading">
              <h3>Quick prompt</h3>
              <Lightbulb size={15} className="text-accent" aria-hidden="true" />
            </div>
            <p className="mb-3 text-[13px] leading-[1.5] text-muted-foreground">What would become easier if you wrote down the next three steps?</p>
            <button className="bd-button-secondary w-full" type="button" onClick={() => openCreator("question")}>
              <CircleHelp size={15} aria-hidden="true" />
              Ask the room
            </button>
          </section>
        </aside>
      </div>

      <Suspense fallback={null}>
        {isCreatorOpen && (
          <PostCreator
            isOpen={isCreatorOpen}
            onClose={() => setIsCreatorOpen(false)}
            onPostCreated={handleCreatePost}
            topics={visibleTopics}
            communities={communities}
            postType={creatorPostType}
          />
        )}
      </Suspense>
    </div>
  );
}
