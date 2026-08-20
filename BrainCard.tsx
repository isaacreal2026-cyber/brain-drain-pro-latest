import { Brain } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitFork, Star } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { idb } from "@/lib/db";

/**
 * date-fns throws "Invalid time value" on an undefined/NaN timestamp, which
 * used to take the whole library down for brains that arrived without one.
 */
function formatCreatedAt(value: number | undefined) {
  const date = new Date(value ?? NaN);
  return Number.isNaN(date.getTime()) ? "unknown" : format(date, "yyyy-MM-dd HH:mm");
}

export function BrainCard({ brain, onClick, onFork, onUpdated }: { brain: Brain; onClick: () => void; onFork?: (brain: Brain) => void; onUpdated?: () => void }) {
  const tags = brain.category.split(",").map(t => t.trim()).filter(Boolean);
  const { toast } = useToast();

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedBrain = { ...brain, isFavorite: !brain.isFavorite };
    await idb.put("brains", updatedBrain);
    toast({ 
      title: updatedBrain.isFavorite ? "Brain favorited" : "Brain unfavorited",
      description: updatedBrain.isFavorite ? "Updates will be pushed to your messages." : "Removed from favorites."
    });
    if (onUpdated) onUpdated();
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="h-full"
    >
      <Card 
        className="h-full bg-card hover:border-primary/50 transition-colors border-border shadow-sm flex flex-col cursor-pointer relative group"
        onClick={onClick}
      >
        <CardHeader className="pb-3 flex-none">
          <div className="flex flex-wrap gap-2 mb-3 pr-8">
            {tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 font-mono text-[10px] tracking-wider uppercase">
                {tag}
              </Badge>
            ))}
          </div>
          <CardTitle className="text-xl font-semibold leading-tight text-foreground pr-8">{brain.title}</CardTitle>
          
          <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="icon"
              aria-label={brain.isFavorite ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={brain.isFavorite}
              className={`h-8 w-8 rounded-full shadow-sm bg-background border ${brain.isFavorite ? "text-yellow-500 border-yellow-500/50" : "text-muted-foreground border-border/50 hover:text-yellow-500 hover:border-yellow-500/30"}`}
              onClick={handleToggleFavorite}
            >
              <Star className={`w-4 h-4 ${brain.isFavorite ? "fill-current" : ""}`} aria-hidden />
            </Button>
            {onFork && (
              <Button
                variant="secondary"
                size="icon"
                aria-label={`Fork ${brain.title}`}
                className="h-8 w-8 rounded-full shadow-sm bg-background border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30"
                onClick={(e) => {
                  e.stopPropagation();
                  onFork(brain);
                }}
              >
                <GitFork className="w-4 h-4" aria-hidden />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{brain.description}</p>
          <div className="text-[11px] text-muted-foreground/60 font-mono mt-auto flex justify-between">
            <span>INIT: {formatCreatedAt(brain.created_at)}</span>
            {brain.repo_status === "public_repo" && <span className="text-emerald-500">PUBLIC</span>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
