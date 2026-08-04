import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarPlus, Image as ImageIcon, BrainCircuit, Hash, MapPin, Plus, X } from "lucide-react";
import { WizardModal } from "@/components/WizardModal";
import { BrainData, Post, PostEvent, PostType } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { idb } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

export interface CommunityOption {
  id: string;
  name: string;
}

interface PostCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post: Post) => void;
  topics: { id: string; name: string }[];
  communities?: CommunityOption[];
  postType?: PostType;
}

export function PostCreator({
  isOpen,
  onClose,
  onPostCreated,
  topics,
  communities = [],
  postType: initialPostType = "post",
}: PostCreatorProps) {
  const [step, setStep] = useState(1);
  const [content, setContent] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [postType, setPostType] = useState<PostType>(initialPostType);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [attachedBrainId, setAttachedBrainId] = useState<string | null>(null);

  const [isEventMode, setIsEventMode] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [selectedCommunityId, setSelectedCommunityId] = useState("");

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPostType(initialPostType);
    }
  }, [initialPostType, isOpen]);

  const handleNext = () => setStep((currentStep) => currentStep + 1);
  const handleBack = () => setStep((currentStep) => currentStep - 1);

  const reset = () => {
    setStep(1);
    setContent("");
    setSelectedTopicId("");
    setPostType("post");
    setMediaUrls([]);
    setAttachedBrainId(null);
    setIsEventMode(false);
    setEventTitle("");
    setEventDate("");
    setEventTime("");
    setEventLocation("");
    setSelectedCommunityId("");
  };

  const handleClose = () => {
    setIsWizardOpen(false);
    reset();
    onClose();
  };

  const buildEvent = (): PostEvent | undefined | null => {
    if (!isEventMode) return undefined;

    if (!eventTitle.trim() || !eventDate || !eventTime) {
      toast({
        title: "Complete the event details",
        description: "Add an event title, date, and start time before publishing.",
        variant: "destructive",
      });
      return null;
    }

    const startsAt = new Date(`${eventDate}T${eventTime}`).getTime();
    if (Number.isNaN(startsAt)) {
      toast({
        title: "Invalid event date",
        description: "Choose a valid date and start time for the event.",
        variant: "destructive",
      });
      return null;
    }

    const community = communities.find((item) => item.id === selectedCommunityId);
    return {
      title: eventTitle.trim(),
      startsAt,
      location: eventLocation.trim() || undefined,
      communityId: community?.id,
      communityName: community?.name,
    };
  };

  const buildPost = (brainId?: string, brainFallbackContent?: string): Post | null => {
    const event = buildEvent();
    if (isEventMode && !event) return null;

    const trimmedContent = content.trim();
    const fallbackContent = event
      ? `Join us for ${event.title}.`
      : brainFallbackContent || "";

    if (!trimmedContent && !fallbackContent) {
      toast({ title: "Error", description: "Post content cannot be empty", variant: "destructive" });
      return null;
    }

    return {
      id: crypto.randomUUID(),
      userId: "me", // Assuming standard user ID
      topicId: selectedTopicId || topics[0]?.id || "general",
      content: trimmedContent || fallbackContent,
      postType,
      ...(event ? { event } : {}),
      mediaUrls,
      brainId: brainId || undefined,
      reactions: { upvote: 0, downvote: 0 },
      commentCount: 0,
      createdAt: Date.now(),
    };
  };

  const handlePublish = () => {
    const newPost = buildPost();
    if (!newPost) return;

    onPostCreated(newPost);
    handleClose();
    toast({ title: "Published", description: "Your post is now live." });
  };

  const handleBrainSave = async (data: BrainData) => {
    const newPost = buildPost(data.brain.id, `I just created a new Brain: ${data.brain.title}`);
    if (!newPost) return;

    await idb.put("brains", data.brain);
    for (const node of data.nodes) {
      await idb.put("nodes", node);
    }

    onPostCreated(newPost);
    setIsWizardOpen(false);
    handleClose();
    toast({ title: "Published", description: "Your post with the attached brain is now live." });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    if (mediaUrls.length + files.length > 4) {
      toast({ title: "Limit reached", description: "You can attach up to 4 images max.", variant: "destructive" });
      return;
    }

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} is larger than 5MB.`, variant: "destructive" });
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (loadEvent.target?.result) {
          setMediaUrls((previousUrls) => [...previousUrls, loadEvent.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    event.target.value = "";
  };

  const creatorTitle = postType === "question"
    ? "Ask a Question"
    : postType === "answer"
      ? "Write an Answer"
      : "Create Post";
  const contentPlaceholder = postType === "question"
    ? "What do you want to know?"
    : postType === "answer"
      ? "Share your answer..."
      : isEventMode
        ? "Tell people about this event..."
        : "Share your knowledge...";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border/50 sm:rounded-2xl p-0 overflow-x-hidden">
          <DialogHeader className="p-4 border-b border-border/50">
            <DialogTitle>{isEventMode ? "Create Event Post" : creatorTitle}</DialogTitle>
          </DialogHeader>

          <div className="p-4 flex gap-4 min-h-[300px]">
            <Avatar className="w-10 h-10 ring-2 ring-background hidden sm:block">
              <AvatarFallback className="bg-primary/20 text-primary font-bold">ME</AvatarFallback>
            </Avatar>

            <div className="flex-1 flex flex-col min-w-0">
              {step === 1 && (
                <div className="space-y-4 flex-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Hash className="w-4 h-4" /> Select a Topic
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((topic) => (
                      <Button
                        key={topic.id}
                        variant={selectedTopicId === topic.id ? "default" : "outline"}
                        className="rounded-full h-8"
                        onClick={() => setSelectedTopicId(topic.id)}
                      >
                        {topic.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 flex-1 flex flex-col">
                  <Textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder={contentPlaceholder}
                    className="flex-1 min-h-[150px] resize-none border-none focus-visible:ring-0 text-lg px-0 py-2 bg-transparent shadow-none"
                    autoFocus
                  />

                  {isEventMode && (
                    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
                          <CalendarPlus className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold">Create Event</p>
                          <p className="text-xs text-muted-foreground">Add the details people need to join.</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-auto text-muted-foreground"
                          onClick={() => setIsEventMode(false)}
                        >
                          Remove
                        </Button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="event-title">Event title</Label>
                          <Input
                            id="event-title"
                            value={eventTitle}
                            onChange={(event) => setEventTitle(event.target.value)}
                            placeholder="e.g. React patterns study group"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="event-date">Date</Label>
                          <Input
                            id="event-date"
                            type="date"
                            value={eventDate}
                            onChange={(event) => setEventDate(event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="event-time">Start time</Label>
                          <Input
                            id="event-time"
                            type="time"
                            value={eventTime}
                            onChange={(event) => setEventTime(event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="event-location">Location or meeting link</Label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="event-location"
                              value={eventLocation}
                              onChange={(event) => setEventLocation(event.target.value)}
                              placeholder="Optional"
                              className="pl-9"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Community / Circle</Label>
                          <Select
                            value={selectedCommunityId || "all"}
                            onValueChange={(value) => setSelectedCommunityId(value === "all" ? "" : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a community" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All communities</SelectItem>
                              {communities.map((community) => (
                                <SelectItem key={community.id} value={community.id}>
                                  {community.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {communities.length === 0 && (
                            <p className="text-xs text-muted-foreground">Your circles will appear here when available.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {attachedBrainId && (
                    <div className="p-3 rounded-xl border border-primary/30 bg-primary/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BrainCircuit className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium text-primary">Brain Attached</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setAttachedBrainId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {mediaUrls.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {mediaUrls.map((url, index) => (
                        <div key={index} className="relative group rounded-xl overflow-hidden">
                          <img src={url} alt="Attached" className="w-full h-32 object-cover" />
                          <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setMediaUrls((urls) => urls.filter((_, itemIndex) => itemIndex !== index))}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-muted/20">
                  <div className="text-center p-6 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto text-primary">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <h3 className="font-medium text-lg">Attach Media</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">Upload images to enhance your post (Max 4 images, 5MB each).</p>

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />

                    <Button variant="secondary" className="mt-2" onClick={() => fileInputRef.current?.click()}>
                      Select Files
                    </Button>

                    {mediaUrls.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-4">
                        {mediaUrls.map((url, index) => (
                          <div key={index} className="relative group rounded-md overflow-hidden aspect-square border border-border/50">
                            <img src={url} alt="Attached" className="w-full h-full object-cover" />
                            <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setMediaUrls((urls) => urls.filter((_, itemIndex) => itemIndex !== index))}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button variant="ghost" className="w-full text-muted-foreground mt-4" onClick={handleNext}>Continue</Button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6 flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-primary/5 border-primary/20">
                  <div className="text-center p-6 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto text-primary">
                      <BrainCircuit className="w-6 h-6" />
                    </div>
                    <h3 className="font-medium text-lg text-primary">Activate Drain Brain</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">Encode an interactive knowledge module into this post.</p>
                    <Button className="mt-2" onClick={() => setIsWizardOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Brain
                    </Button>
                    <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleNext}>Skip</Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border/50 flex justify-between sm:justify-between items-center bg-muted/10">
            {step === 2 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={isEventMode ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-full text-primary"
                  onClick={() => setIsEventMode((isOpen) => !isOpen)}
                >
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  {isEventMode ? "Remove Event" : "Create Event"}
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full text-primary" onClick={() => setStep(3)} aria-label="Attach media">
                  <ImageIcon className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full text-primary" onClick={() => setStep(4)} aria-label="Attach a brain">
                  <BrainCircuit className="w-5 h-5" />
                </Button>
              </div>
            )}
            {(step === 1 || step === 3 || step === 4) && <div />}

            <div className="flex gap-2 ml-auto">
              {step > 1 && step < 5 && <Button variant="ghost" onClick={handleBack}>Back</Button>}
              {step === 1 && <Button onClick={handleNext} disabled={!selectedTopicId}>Next</Button>}
              {step === 2 && <Button onClick={handlePublish} className="bg-primary hover:bg-primary/90 rounded-full px-6">Post</Button>}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSave={handleBrainSave}
      />
    </>
  );
}
