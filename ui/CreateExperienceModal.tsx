import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Search, Pin, Layout, Lightbulb, TrendingUp, Sparkles, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";

interface CreateExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePost: () => void;
}

export function CreateExperienceModal({ isOpen, onClose, onCreatePost }: CreateExperienceModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const trendingIdeas = [
    { title: "Neuroscience Hacks", icon: Sparkles },
    { title: "UI Inspiration", icon: Layout },
    { title: "Workout Plans", icon: TrendingUp },
    { title: "Saved Ideas", icon: Bookmark },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-card">
        <DialogHeader className="sr-only">
          <DialogTitle>Create Experience</DialogTitle>
          <DialogDescription>Create a new pin or board.</DialogDescription>
        </DialogHeader>
        
        <div className="p-6 pb-8 bg-gradient-to-br from-card to-accent/20">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Start Creating</h2>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <button 
              onClick={() => {
                onClose();
                onCreatePost();
              }}
              className="flex flex-col items-center justify-center p-6 bg-background rounded-2xl border shadow-sm hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Pin className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
              </div>
              <span className="font-semibold">Create Pin</span>
              <span className="text-xs text-muted-foreground mt-1">Share an idea</span>
            </button>

            <button 
              onClick={() => {
                // Future board creation
                onClose();
              }}
              className="flex flex-col items-center justify-center p-6 bg-background rounded-2xl border shadow-sm hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3 group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                <Layout className="w-6 h-6 text-foreground group-hover:text-secondary-foreground" />
              </div>
              <span className="font-semibold">Create Board</span>
              <span className="text-xs text-muted-foreground mt-1">Organize ideas</span>
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Inspiration Search
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search ideas, topics, inspiration..." 
                className="pl-10 rounded-xl bg-background border-muted-foreground/20"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    onClose();
                    setLocation(`/search?q=${encodeURIComponent(searchQuery)}`);
                  }
                }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              {trendingIdeas.map((idea, i) => (
                <button 
                  key={i} 
                  className="flex items-center gap-2 p-3 rounded-xl hover:bg-background/80 transition-colors text-sm font-medium text-left"
                  onClick={() => {
                    onClose();
                    setLocation(`/search?q=${encodeURIComponent(idea.title)}`);
                  }}
                >
                  <div className="p-2 rounded-lg bg-background shadow-sm border border-border/50">
                    <idea.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  {idea.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FloatingCreateButton({ onCreatePost }: { onCreatePost: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-50">
        <Button 
          size="icon" 
          className="w-14 h-14 rounded-full shadow-xl shadow-primary/30 bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-transform"
          onClick={() => setIsOpen(true)}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <CreateExperienceModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onCreatePost={onCreatePost}
      />
    </>
  );
}
