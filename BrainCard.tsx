import { Brain } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitFork, Star } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { idb } from "@/lib/db";

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
          
          <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="secondary" 
              size="icon" 
              className={`h-8 w-8 rounded-full shadow-sm bg-background border ${brain.isFavorite ? "text-yellow-500 border-yellow-500/50" : "text-muted-foreground border-border/50 hover:text-yellow-500 hover:border-yellow-500/30"}`}
              onClick={handleToggleFavorite}
              title={brain.isFavorite ? "Unfavorite" : "Favorite"}
            >
              <Star className={`w-4 h-4 ${brain.isFavorite ? "fill-current" : ""}`} />
            </Button>
            {onFork && (
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-8 w-8 rounded-full shadow-sm bg-background border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30"
                onClick={(e) => {
                  e.stopPropagation();
                  onFork(brain);
                }}
                title="Fork Brain"
              >
                <GitFork className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{brain.description}</p>
          <div className="text-[11px] text-muted-foreground/60 font-mono mt-auto flex justify-between">
            <span>INIT: {format(new Date(brain.created_at), "yyyy-MM-dd HH:mm")}</span>
            {brain.repo_status === "public_repo" && <span className="text-emerald-500">PUBLIC</span>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
