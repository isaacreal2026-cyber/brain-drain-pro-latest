import { useState } from "react";
import { Brain } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share, Copy, Link as LinkIcon, Network } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  brain: Brain | null;
}

export function ShareModal({ isOpen, onClose, brain }: ShareModalProps) {
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  if (!brain) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://brainbuilder.app/shared/${brain.id}`);
    setIsCopied(true);
    toast({ title: "Link Copied", description: "Sharing link copied to clipboard." });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShareModule = () => {
    toast({ title: "Module Shared", description: "Brain shared as an independent module." });
    onClose();
  };

  const handleShareClone = () => {
    toast({ title: "Brain Cloned", description: "Full brain cloned with DNA linkage." });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share className="w-5 h-5 text-primary" />
            Advanced Sharing
          </DialogTitle>
          <DialogDescription>
            Share "{brain.title}" with the network.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-3">
            <div className="p-4 border border-border/50 rounded-lg bg-background/50 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-secondary" /> Option 1: Share Module
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Share a read-only instance. Updates you make will propagate to users.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleShareModule}>Select</Button>
              </div>
            </div>

            <div className="p-4 border border-primary/30 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <Network className="w-4 h-4 text-primary" /> Option 2: Full DNA Clone
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Allow users to fork and modify. Maintains a DNA link to your original.
                  </p>
                </div>
                <Button size="sm" onClick={handleShareClone}>Select</Button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <div className="flex-1 truncate bg-muted p-2 rounded-md text-sm font-mono text-muted-foreground">
                https://brainbuilder.app/shared/{brain.id}
              </div>
              <Button variant="outline" size="icon" onClick={handleCopyLink}>
                <Copy className={`w-4 h-4 ${isCopied ? "text-primary" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
