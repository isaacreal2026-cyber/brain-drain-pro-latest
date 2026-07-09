import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Hash, Users, ArrowLeft, MessageSquare, Heart, Share2 } from "lucide-react";
import { useTopics } from "@/hooks/use-topics";
import { useSocial } from "@/hooks/use-social";
import { Topic, Post } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

export function TopicDetailPage({ params }: { params: { id: string } }) {
  const { topics, isLoading: topicsLoading } = useTopics();
  const { posts, isLoading: postsLoading, reactToPost } = useSocial();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [topicPosts, setTopicPosts] = useState<Post[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!topicsLoading) {
      const found = topics.find(t => t.id === params.id);
      setTopic(found || null);
    }
  }, [topics, params.id, topicsLoading]);

  useEffect(() => {
    if (!postsLoading && topic) {
      setTopicPosts(posts.filter(p => p.topicId === topic.id));
    }
  }, [posts, topic, postsLoading]);

  const handleAction = (action: string) => {
    toast({
      title: action,
      description: `The ${action.toLowerCase()} action has been initiated.`,
    });
  };

  const handleToggleFollow = () => {
    if (!topic) return;
    const isNowFollowed = !topic.isFollowed;
    setTopic({ ...topic, isFollowed: isNowFollowed, followerCount: topic.followerCount + (isNowFollowed ? 1 : -1) });
    toast({
      title: isNowFollowed ? "Following Topic" : "Unfollowed Topic",
      description: isNowFollowed ? `You are now following ${topic.name}` : `You are no longer following ${topic.name}`,
    });
  };

  if (topicsLoading || postsLoading) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Loading topic...</div>;
  }

  if (!topic) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold">Topic not found</h2>
        <Link href="/topics">
          <Button variant="link" className="mt-4">Back to Topics</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto border-x min-h-screen bg-card/30">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b p-4 flex items-center gap-4">
        <Link href="/topics">
          <Button variant="outline" size="sm" className="gap-2 rounded-full border-border/60 hover:bg-accent/50 text-muted-foreground hover:text-foreground cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Topics</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-1">
            <Hash className="w-5 h-5 text-primary" />
            {topic.name}
          </h1>
          <p className="text-sm text-muted-foreground">{topicPosts.length} posts</p>
        </div>
      </div>

      {/* Topic Info */}
      <div className="p-6 border-b bg-card">
        <p className="text-lg mb-4">{topic.description}</p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {topic.followerCount} followers</span>
        </div>
        <div className="mt-6 flex gap-2">
          <Button variant={topic.isFollowed ? "secondary" : "default"} className="w-full sm:w-auto px-8" onClick={handleToggleFollow}>
            {topic.isFollowed ? "Following" : "Follow"}
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => handleAction("Start a Discussion")}>Start a Discussion</Button>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="divide-y">
        {topicPosts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No posts in this topic yet.</p>
          </div>
        ) : (
          topicPosts.map(post => (
            <div key={post.id} className="p-6 hover:bg-muted/50 transition-colors">
              <div className="flex gap-4">
                <Avatar className="w-10 h-10 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary">{post.userId.substring(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{post.userId}</span>
                    <span className="text-muted-foreground text-sm">· {new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap mb-4 text-sm sm:text-base leading-relaxed">{post.content}</p>
                  
                  {post.mediaUrls && post.mediaUrls.length > 0 && (
                     <div className="mb-4 rounded-xl overflow-hidden border">
                      <img src={post.mediaUrls[0]} alt="Post media" className="w-full h-auto object-cover max-h-96" />
                    </div>
                  )}
                  
                  {post.brainId && (
                    <div className="mb-4 p-3 rounded-lg border bg-card/50 flex items-center gap-3 cursor-pointer hover:bg-card transition-colors" onClick={() => handleAction("Load Brain")}>
                      <div className="p-2 rounded bg-primary/20 text-primary">
                        <Hash className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Attached Brain</div>
                        <div className="text-xs text-muted-foreground">Click to explore logic</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-6 text-muted-foreground">
                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-2 hover:text-red-500" onClick={() => reactToPost(post.id, "love")}>
                      <Heart className="w-4 h-4" /> 
                      <span className="text-xs">{post.reactions.love || 0}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-2 hover:text-primary" onClick={() => handleAction("Open Discussion")}>
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-xs">{post.commentCount || 0}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-2" onClick={() => handleAction("Share Post")}>
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
