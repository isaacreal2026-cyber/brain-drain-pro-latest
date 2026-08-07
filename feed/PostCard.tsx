import { lazy, Suspense, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowBigDown, ArrowBigUp, CalendarDays, MapPin, Users, MessageCircle, MoreHorizontal, BrainCircuit, Bookmark, Share, Link as LinkIcon, ExternalLink, Repeat } from "lucide-react";
import { Brain, getPostDownvoteCount, getPostUpvoteCount, Post } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CommentThreadModal } from "./CommentThreadModal";
import { useToast } from "@/hooks/use-toast";
import { idb } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";
import { useLocation } from "wouter";
import { useProfile } from "@/hooks/use-profile";

const BrainChatRuntime = lazy(() =>
  import("@/components/runtime/BrainChatRuntime").then((module) => ({ default: module.BrainChatRuntime })),
);

interface PostCardProps {
  post: Post;
  onReact: (postId: string, type: string) => void;
  topicName?: string;
  authorName?: string;
  authorAvatar?: string;
}

export function PostCard({ post, onReact, topicName, authorName = "Anonymous", authorAvatar }: PostCardProps) {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeBrain, setActiveBrain] = useState<Brain | null>(null);
  const [isBrainOpen, setIsBrainOpen] = useState(false);
  
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { profile, updateProfile } = useProfile();

  const currentUserId = "me";
  const isUpvoted = Boolean(
    post.userReactions?.upvote?.includes(currentUserId) ||
    post.userReactions?.like?.includes(currentUserId) ||
    post.userReactions?.love?.includes(currentUserId),
  );
  const isDownvoted = post.userReactions?.downvote?.includes(currentUserId) || false;

  const isBookmarked = profile?.bookmarkedPostIds?.includes(post.id) || false;

  const totalEngagements = getPostUpvoteCount(post) + getPostDownvoteCount(post) + (post.repostCount || post.reactions?.repost || 0) + post.commentCount;
  const hoursPassed = Math.max((Date.now() - post.createdAt) / (1000 * 60 * 60), 0.1);
  const isTrending = (totalEngagements / hoursPassed) > 2;
  const postShareUrl = `${window.location.origin}/?postId=${encodeURIComponent(post.id)}`;

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(el);
      return copied;
    }
  };

  const handleCopyPostLink = async (description = "Post link copied to clipboard.") => {
    const copied = await copyText(postShareUrl);
    toast({
      title: copied ? "Link copied" : "Copy unavailable",
      description: copied ? description : "Clipboard access was blocked by your browser.",
      variant: copied ? "default" : "destructive",
    });
    if (copied) {
      void trackEvent("post_share", { postId: post.id, method: "copy" });
    }
  };

  const handleSharePost = async () => {
    const shareData = {
      title: `Check out this post from ${authorName}`,
      text: post.content.substring(0, 100),
      url: postShareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        void trackEvent("post_share", { postId: post.id, method: "native" });
      } else {
        await handleCopyPostLink("Sharing is unavailable here, so the post link was copied instead.");
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        await handleCopyPostLink("Sharing was interrupted, so the post link was copied instead.");
      }
    }
  };

  const handleModerationWait = (action: "Report Post" | "Hide Post") => {
    toast({
      title: `${action} needs backend review`,
      description: "This shared-content action is waiting for backend moderation/safety support, so no local-only change was made.",
    });
    void trackEvent("post_moderation_waiting", { postId: post.id, action });
  };

  const handleToggleBookmark = async () => {
    if (!profile) return;
    const newBookmarkedPostIds = isBookmarked
      ? (profile.bookmarkedPostIds || []).filter(id => id !== post.id)
      : [...(profile.bookmarkedPostIds || []), post.id];
      
    await updateProfile({ ...profile, bookmarkedPostIds: newBookmarkedPostIds });
    toast({ title: isBookmarked ? "Post removed from bookmarks" : "Post bookmarked" });
  };

  const handleRunBrain = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.brainId) return;
    try {
      const brain = await idb.get<Brain>("brains", post.brainId);
      if (brain) {
        setActiveBrain(brain);
        setIsBrainOpen(true);
      } else {
        toast({
          title: "Brain Not Found",
          description: "This brain module could not be loaded.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Could not load the brain module.", variant: "destructive" });
    }
  };

  const navigateToProfile = () => {
    setLocation(`/profile?userId=${post.userId}`);
  };

  const handleSaveToCollection = () => {
    if (newCollectionName.trim()) {
      toast({
        title: "Post Saved",
        description: `Saved to new collection: ${newCollectionName}`,
      });
      setIsSaveModalOpen(false);
      setNewCollectionName("");
    }
  };

  return (
    <>
      <Card className="p-4 rounded-xl border border-border/50 bg-card shadow-sm hover-elevate transition-all duration-300 w-full overflow-hidden">
        <div className="flex gap-3 sm:gap-4">
          <div className="flex flex-col items-center">
            <Avatar 
              className="w-10 h-10 ring-2 ring-background cursor-pointer hover:opacity-80 transition-opacity"
              onClick={navigateToProfile}
            >
              <AvatarImage src={authorAvatar} />
              <AvatarFallback className="bg-primary/20 text-primary font-bold">
                {authorName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="w-px h-full bg-border mt-2" />
          </div>
          
          <div className="flex-1 pb-2 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate pr-2">
                <span 
                  className="font-bold hover:underline cursor-pointer truncate"
                  onClick={navigateToProfile}
                >
                  {authorName}
                </span>
                <span className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">
                  {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full shrink-0">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsSaveModalOpen(true)}>
                    <Bookmark className="w-4 h-4 mr-2" /> Save Post
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleModerationWait("Report Post")}>Report</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleModerationWait("Hide Post")}>Hide</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="mt-1 space-y-3">
              <p className="whitespace-pre-wrap text-[15px] leading-[1.45] break-words">{post.content}</p>

              {post.event && (
                <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Event</p>
                      <h3 className="font-semibold text-base break-words">{post.event.title}</h3>
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                      <span>
                        {Number.isNaN(new Date(post.event.startsAt).getTime())
                          ? "Date to be announced"
                          : format(new Date(post.event.startsAt), "EEE, MMM d · p")}
                      </span>
                    </div>
                    {post.event.location && (
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{post.event.location}</span>
                      </div>
                    )}
                  </div>
                  {post.event.communityName && (
                    <Badge variant="secondary" className="w-fit gap-1 bg-primary/10 text-primary hover:bg-primary/15">
                      <Users className="w-3.5 h-3.5" />
                      {post.event.communityName}
                    </Badge>
                  )}
                </div>
              )}

              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {post.mediaUrls.map((url, i) => (
                    <img 
                      key={i} 
                      src={url}
                      alt="Post attachment"
                      loading="lazy"
                      decoding="async"
                      className="rounded-xl object-cover w-full h-48 sm:h-64 border border-border/50 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedImage(url)}
                    />
                  ))}
                </div>
              )}

              {post.brainId && (
                <div className="mt-3 p-3 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-primary/10 cursor-pointer transition-colors" onClick={handleRunBrain}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                      <BrainCircuit className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary">Attached Brain</h4>
                      <p className="text-xs text-muted-foreground">Interactive Knowledge Module</p>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" className="rounded-full w-full sm:w-auto" onClick={handleRunBrain}>Run Brain</Button>
                </div>
              )}

              {(topicName || (post.postType && post.postType !== "post")) && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {topicName && (
                    <Badge variant="secondary" className="bg-secondary/10 text-secondary hover:bg-secondary/20">#{topicName}</Badge>
                  )}
                  {post.postType && post.postType !== "post" && (
                    <Badge variant="outline" className="capitalize">
                      {post.postType}
                    </Badge>
                  )}
                  {isTrending && (
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                      🔥 Trending
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-start sm:gap-4 mt-4 text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Upvote" aria-pressed={isUpvoted}
                className={`gap-1.5 h-8 px-2 sm:px-3 rounded-full transition-all duration-200 cursor-pointer ${isUpvoted ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
                onClick={() => onReact(post.id, "upvote")}
              >
                <ArrowBigUp className={`w-4 h-4 ${isUpvoted ? "fill-current" : ""}`} />
                <span className="sm:hidden text-xs font-semibold">Up</span>
                <span className="hidden sm:inline text-xs font-semibold">Upvote</span>
                <span className="text-xs font-semibold">{getPostUpvoteCount(post)}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                aria-label="Downvote" aria-pressed={isDownvoted}
                className={`gap-1.5 h-8 px-2 sm:px-3 rounded-full transition-all duration-200 cursor-pointer ${isDownvoted ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"}`}
                onClick={() => onReact(post.id, "downvote")}
              >
                <ArrowBigDown className={`w-4 h-4 ${isDownvoted ? "fill-current" : ""}`} />
                <span className="sm:hidden text-xs font-semibold">Down</span>
                <span className="hidden sm:inline text-xs font-semibold">Downvote</span>
                <span className="text-xs font-semibold">{getPostDownvoteCount(post)}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                aria-label={`${post.commentCount || 0} comments`}
                aria-expanded={isCommentsOpen}
                className={`gap-1.5 h-8 px-3 rounded-full transition-all duration-200 cursor-pointer ${isCommentsOpen ? 'text-cyan-500 bg-cyan-500/10' : 'text-muted-foreground hover:text-cyan-500 hover:bg-cyan-500/10'}`}
                onClick={() => setIsCommentsOpen(!isCommentsOpen)}
              >
                <MessageCircle className="w-4 h-4" aria-hidden />
                <span className="text-xs font-semibold">{post.commentCount || 0}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                aria-label={isBookmarked ? "Remove bookmark" : "Save post"}
                aria-pressed={isBookmarked}
                className={`gap-1.5 h-8 px-3 rounded-full transition-all duration-200 cursor-pointer ${isBookmarked ? 'text-yellow-500 bg-yellow-500/10' : 'text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10'}`}
                onClick={handleToggleBookmark}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current text-yellow-500' : ''}`} aria-hidden />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                aria-label={`Repost · ${post.repostCount || post.reactions?.repost || 0}`}
                className="gap-1.5 h-8 px-3 rounded-full transition-all duration-200 cursor-pointer text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
                onClick={() => onReact(post.id, "repost")}
              >
                <Repeat className="w-4 h-4" aria-hidden />
                <span className="text-xs font-semibold">{post.repostCount || post.reactions?.repost || 0}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                aria-label="Share post"
                className="gap-1.5 h-8 px-3 rounded-full transition-all duration-200 cursor-pointer text-muted-foreground hover:text-sky-500 hover:bg-sky-500/10 sm:ml-auto"
                onClick={handleSharePost}
              >
                <Share className="w-4 h-4" aria-hidden />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                aria-label="More sharing options"
                aria-haspopup="menu"
                className="gap-1.5 h-8 px-3 rounded-full transition-all duration-200 cursor-pointer text-muted-foreground hover:text-sky-500 hover:bg-sky-500/10"
                onClick={() => setIsShareModalOpen(true)}
              >
                <MoreHorizontal className="w-4 h-4" aria-hidden />
              </Button>
            </div>
            
      <CommentThreadModal 
        postId={post.id} 
        isOpen={isCommentsOpen} 
        onClose={() => setIsCommentsOpen(false)} 
        postAuthorName={authorName}
      />
          </div>
        </div>
      </Card>

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none flex justify-center items-center">
          {selectedImage && (
            <img src={selectedImage} alt="Full screen preview" className="max-h-[90vh] max-w-full rounded-md object-contain" />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between w-full pr-8">
              <DialogTitle>Share Post</DialogTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={() => void handleSharePost()}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 pt-4">
            <Button variant="outline" className="justify-start gap-3 h-12" onClick={() => { void handleCopyPostLink("Post link copied so you can share it as your own post."); setIsShareModalOpen(false); }}>
              <Share className="w-4 h-4" /> Share as your post
            </Button>
            <Button variant="outline" className="justify-start gap-3 h-12" onClick={() => { void handleCopyPostLink("Post link copied for sharing to circles."); setIsShareModalOpen(false); }}>
              <BrainCircuit className="w-4 h-4" /> Share to circles
            </Button>
            <Button variant="outline" className="justify-start gap-3 h-12" onClick={() => { void handleCopyPostLink("Post link copied for sending to follows."); setIsShareModalOpen(false); }}>
              <MessageCircle className="w-4 h-4" /> Send to follows
            </Button>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or share via</span>
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="icon" className="rounded-full w-12 h-12" onClick={() => void handleCopyPostLink()}>
                <LinkIcon className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save to Collection</DialogTitle>
            <DialogDescription>
              Organize your saved posts into collections.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Create New Collection</p>
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g. React Patterns, Architecture..." 
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                />
                <Button onClick={handleSaveToCollection} disabled={!newCollectionName.trim()}>Save</Button>
              </div>
            </div>
            
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Existing Collections</span>
              </div>
            </div>
            
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
              {['Machine Learning', 'UI Inspiration', 'Read Later'].map((collection) => (
                <Button 
                  key={collection} 
                  variant="outline" 
                  className="w-full justify-between"
                  onClick={() => {
                    toast({ title: "Saved", description: `Added to ${collection}` });
                    setIsSaveModalOpen(false);
                  }}
                >
                  <span className="flex items-center gap-2"><Bookmark className="w-4 h-4" /> {collection}</span>
                  <span className="text-xs text-muted-foreground">Select</span>
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isBrainOpen && (
        <Suspense fallback={null}>
          <BrainChatRuntime
            brain={activeBrain}
            isOpen={isBrainOpen}
            onClose={() => { setIsBrainOpen(false); setActiveBrain(null); }}
          />
        </Suspense>
      )}
    </>
  );
}