import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useTopics } from "@/hooks/use-topics";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Hash, GripVertical, Users, Star, ArrowRight, BookOpen } from "lucide-react";
import { Reorder, motion } from "framer-motion";
import { Topic } from "@/lib/types";

export function SavedTopicsTab() {
  const { topics, isLoading, reorderTopics, addTopic } = useTopics();
  const { toast } = useToast();
  
  // Local state to manage dragging synchronously with framer-motion
  const [savedTopics, setSavedTopics] = useState<Topic[]>([]);

  // Filter followed topics whenever the main topics list changes
  useEffect(() => {
    const followed = topics.filter(t => t.isFollowed);
    setSavedTopics(followed);
  }, [topics]);

  const handleReorder = async (newOrder: Topic[]) => {
    // Update local state immediately for snappy UI
    setSavedTopics(newOrder);
    
    try {
      // Persist the new sequence in the database
      await reorderTopics(newOrder);
      toast({
        title: "Order Updated",
        description: "Your saved topics order has been saved successfully.",
      });
    } catch (error) {
      console.error("Failed to persist order", error);
      toast({
        title: "Error",
        description: "Failed to save the new topics order.",
        variant: "destructive",
      });
    }
  };

  const handleUnfollow = async (topic: Topic) => {
    try {
      const updatedTopic = {
        ...topic,
        isFollowed: false,
        followerCount: Math.max(0, topic.followerCount - 1),
      };
      await addTopic(updatedTopic);
      toast({
        title: "Unfollowed Topic",
        description: `You are no longer following ${topic.name}`,
      });
    } catch (error) {
      console.error("Failed to unfollow topic", error);
      toast({
        title: "Error",
        description: "Failed to update follow status.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" /> Saved Topics
          </h2>
          <p className="text-sm text-muted-foreground">
            Drag and drop to rearrange your priority discussion boards.
          </p>
        </div>
        <Link href="/topics">
          <Button variant="outline" size="sm" className="gap-2">
            Explore All Topics <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {savedTopics.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
          <Hash className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium">No saved topics</h3>
          <p className="text-muted-foreground mb-6">
            Follow some topics from the main explorer to keep them handy here.
          </p>
          <Link href="/topics">
            <Button className="gap-2">
              <BookOpen className="w-4 h-4" /> Discover Topics
            </Button>
          </Link>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={savedTopics}
          onReorder={handleReorder}
          className="space-y-3"
        >
          {savedTopics.map((topic) => (
            <Reorder.Item
              key={topic.id}
              value={topic}
              className="touch-none" // prevent scrolling issues on mobile during drag
              whileDrag={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
            >
              <Card className="flex items-center p-4 bg-card border-border/50 hover:border-primary/20 transition-colors cursor-default select-none">
                {/* Drag Handle */}
                <div className="mr-3 text-muted-foreground/50 cursor-grab active:cursor-grabbing p-1 hover:text-foreground hover:bg-muted rounded transition-colors">
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Main Info */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary shrink-0" />
                    <Link href={`/topics/${topic.id}`} className="hover:text-primary transition-colors">
                      <h4 className="font-semibold text-base truncate">{topic.name}</h4>
                    </Link>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                    {topic.description}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 font-medium">
                    <Users className="w-3.5 h-3.5" />
                    <span>{topic.followerCount.toLocaleString()} followers</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link href={`/topics/${topic.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnfollow(topic)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Unfollow
                  </Button>
                </div>
              </Card>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}
