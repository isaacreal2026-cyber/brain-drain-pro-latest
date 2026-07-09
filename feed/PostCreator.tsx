import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, BrainCircuit, Hash, Plus, X } from "lucide-react";
import { WizardModal } from "@/components/WizardModal";
import { BrainData, Post } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { idb } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

interface PostCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post: Post) => void;
  topics: { id: string; name: string }[];
}

export function PostCreator({ isOpen, onClose, onPostCreated, topics }: PostCreatorProps) {
  const [step, setStep] = useState(1);
  const [content, setContent] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [attachedBrainId, setAttachedBrainId] = useState<string | null>(null);
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const reset = () => {
    setStep(1);
    setContent("");
    setSelectedTopicId("");
    setMediaUrls([]);
    setAttachedBrainId(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePublish = () => {
    if (!content.trim()) {
      toast({ title: "Error", description: "Post content cannot be empty", variant: "destructive" });
      return;
    }

    const newPost: Post = {
      id: crypto.randomUUID(),
      userId: "me", // Assuming standard user ID
      topicId: selectedTopicId || topics[0]?.id || "general",
      content,
      mediaUrls,
      brainId: attachedBrainId || undefined,
      reactions: { love: 0, like: 0 },
      commentCount: 0,
      createdAt: Date.now()
    };

    onPostCreated(newPost);
    handleClose();
    toast({ title: "Published", description: "Your post is now live." });
  };

  const handleBrainSave = async (data: BrainData) => {
    // Save to DB
    await idb.put("brains", data.brain);
    for (const node of data.nodes) {
      await idb.put("nodes", node);
    }
    
    // Auto-publish the post with the attached brain
    const postContent = content.trim() ? content : `I just created a new Brain: ${data.brain.title}`;

    const newPost: Post = {
      id: crypto.randomUUID(),
      userId: "me", // Assuming standard user ID
      topicId: selectedTopicId || topics[0]?.id || "general",
      content: postContent,
      mediaUrls,
      brainId: data.brain.id,
      reactions: { love: 0, like: 0 },
      commentCount: 0,
      createdAt: Date.now()
    };

    onPostCreated(newPost);
    setIsWizardOpen(false);
    handleClose();
    toast({ title: "Published", description: "Your post with the attached brain is now live." });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    if (mediaUrls.length + files.length > 4) {
      toast({ title: "Limit reached", description: "You can attach up to 4 images max.", variant: "destructive" });
      return;
    }

    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} is larger than 5MB.`, variant: "destructive" });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setMediaUrls(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    if (e.target) {
      e.target.value = "";
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl bg-card border-border/50 sm:rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-border/50">
            <DialogTitle>Create Post</DialogTitle>
          </DialogHeader>

          <div className="p-4 flex gap-4 min-h-[300px]">
            <Avatar className="w-10 h-10 ring-2 ring-background hidden sm:block">
              <AvatarFallback className="bg-primary/20 text-primary font-bold">ME</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 flex flex-col">
              {step === 1 && (
                <div className="space-y-4 flex-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Hash className="w-4 h-4" /> Select a Topic
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {topics.map(t => (
                      <Button 
                        key={t.id} 
                        variant={selectedTopicId === t.id ? "default" : "outline"}
                        className="rounded-full h-8"
                        onClick={() => setSelectedTopicId(t.id)}
                      >
                        {t.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 flex-1 flex flex-col">
                  <Textarea 
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Share your knowledge..." 
                    className="flex-1 min-h-[150px] resize-none border-none focus-visible:ring-0 text-lg px-0 py-2 bg-transparent shadow-none"
                    autoFocus
                  />
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
                      {mediaUrls.map((url, i) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden">
                          <img src={url} alt="Attached" className="w-full h-32 object-cover" />
                          <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setMediaUrls(urls => urls.filter((_, idx) => idx !== i))}>
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
                        {mediaUrls.map((url, i) => (
                          <div key={i} className="relative group rounded-md overflow-hidden aspect-square border border-border/50">
                            <img src={url} alt="Attached" className="w-full h-full object-cover" />
                            <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setMediaUrls(urls => urls.filter((_, idx) => idx !== i))}>
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
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="rounded-full text-primary" onClick={() => setStep(3)}>
                  <ImageIcon className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full text-primary" onClick={() => setStep(4)}>
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