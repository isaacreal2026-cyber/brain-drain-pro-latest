import { Link } from "wouter";
import { useReputation } from "@/hooks/use-reputation";
import { useMissions } from "@/hooks/use-missions";
import { Progress } from "@/components/ui/progress";
import { Flame, Zap, Target, Trophy, ChevronRight } from "lucide-react";

export function MomentumWidget() {
  const { reputation } = useReputation();
  const { missions } = useMissions();

  if (!reputation) return null;

  const activeMissions = missions.filter(m => m.status === "active").length;
  
  if (reputation.xp === 0 && missions.length === 0) {
    return null;
  }

  const xpProgress = reputation.xp % 200;
  const progressPercent = (xpProgress / 200) * 100;

  return (
    <Link href="/missions" className="block border-b border-border/50 bg-card hover:bg-accent/5 transition-colors cursor-pointer group">
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            Your Momentum
          </h3>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors group-hover:translate-x-1" />
        </div>
        
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Flame className="w-5 h-5 text-orange-500 mb-1" />
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{reputation.streak} <span className="text-[10px] font-medium opacity-80">Day</span></span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <Zap className="w-5 h-5 text-yellow-500 mb-1" />
            <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{reputation.xp} <span className="text-[10px] font-medium opacity-80">XP</span></span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Target className="w-5 h-5 text-blue-500 mb-1" />
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{activeMissions} <span className="text-[10px] font-medium opacity-80">Active</span></span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Trophy className="w-5 h-5 text-purple-500 mb-1" />
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">Lvl {reputation.level}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
            <span>Level {reputation.level}</span>
            <span>{xpProgress} / 200 to Level {reputation.level + 1}</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </div>
    </Link>
  );
}
