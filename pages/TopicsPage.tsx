import { useState } from "react";
import { Link } from "wouter";
import { Plus, Hash, Users, Star, Filter } from "lucide-react";
import { useTopics } from "@/hooks/use-topics";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const POPULAR_CATEGORIES = ["TensorFlow", "PyTorch", "JAX", "Keras", "Scikit-Learn"];

export function TopicsPage() {
  const { topics, isLoading, addTopic } = useTopics();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // "all", "followed", "unfollowed"
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicDesc, setNewTopicDesc] = useState("");

  const filteredTopics = topics.filter(t => 
    (t.name.toLowerCase().includes(search.toLowerCase()) || 
     t.description.toLowerCase().includes(search.toLowerCase())) &&
    (filter === "all" || (filter === "followed" ? t.isFollowed : !t.isFollowed)) &&
    (selectedCategory === null || t.category === selectedCategory)
  );

  const handleCreateTopic = async () => {
    if (!newTopicName) return;
    const id = "topic-" + Date.now();
    await addTopic({
      id,
      name: newTopicName,
      description: newTopicDesc,
      followerCount: 1,
      isFollowed: true
    });
    setIsDialogOpen(false);
    setNewTopicName("");
    setNewTopicDesc("");
    toast({
      title: "Topic Created",
      description: `Successfully created and followed ${newTopicName}.`,
    });
  };

  const handleToggleFollow = async (topic: any) => {
    const isNowFollowed = !topic.isFollowed;
    await addTopic({
      ...topic,
      isFollowed: isNowFollowed,
      followerCount: topic.followerCount + (isNowFollowed ? 1 : -1)
    });
    toast({
      title: isNowFollowed ? "Following Topic" : "Unfollowed Topic",
      description: isNowFollowed ? `You are now following ${topic.name}` : `You are no longer following ${topic.name}`,
    });
  };

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Loading topics...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Topics</h1>
          <p className="text-muted-foreground">Discover and follow conversations</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 gap-2">
              <Plus className="w-4 h-4" /> Create Topic
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a New Topic</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Topic Name</label>
                <Input 
                  placeholder="e.g. Artificial Intelligence" 
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea 
                  placeholder="What is this topic about?" 
                  value={newTopicDesc}
                  onChange={(e) => setNewTopicDesc(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTopic} disabled={!newTopicName}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge 
          variant={selectedCategory === null ? "default" : "outline"} 
          className="cursor-pointer hover:bg-primary/90" 
          onClick={() => setSelectedCategory(null)}
        >
          All
        </Badge>
        {POPULAR_CATEGORIES.map(cat => (
          <Badge 
            key={cat} 
            variant={selectedCategory === cat ? "default" : "outline"} 
            className="cursor-pointer hover:bg-primary/90" 
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Input 
          placeholder="Search topics..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-grow"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            <SelectItem value="followed">Following</SelectItem>
            <SelectItem value="unfollowed">Explore</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredTopics.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <Hash className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No topics found</h3>
          <p className="text-muted-foreground mb-4">Be the first to create one!</p>
          <Button variant="outline" onClick={() => setIsDialogOpen(true)}>Create Topic</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTopics.map(topic => (
            <Card key={topic.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="flex justify-between items-start">
                  <Link href={`/topics/${topic.id}`} className="hover:text-primary transition-colors flex items-center gap-2">
                    <Hash className="w-5 h-5 text-primary" />
                    {topic.name}
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleToggleFollow(topic)}
                    className={`h-8 w-8 transition-colors ${topic.isFollowed ? 'text-yellow-500 hover:text-yellow-600' : 'text-muted-foreground hover:text-yellow-500'}`}
                  >
                    <Star className={`w-4 h-4 ${topic.isFollowed ? 'fill-yellow-500' : ''}`} />
                  </Button>
                </CardTitle>
                <CardDescription className="line-clamp-2">{topic.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  {topic.followerCount.toLocaleString()} followers
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant={topic.isFollowed ? "secondary" : "default"} 
                  className="w-full"
                  onClick={() => handleToggleFollow(topic)}
                >
                  {topic.isFollowed ? "Following" : "Follow"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
