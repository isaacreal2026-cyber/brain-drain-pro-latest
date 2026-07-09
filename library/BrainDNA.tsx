import { useState } from "react";
import { Brain, BrainDNA as BrainDNAType } from "@/lib/types";
import { useDatabase } from "@/hooks/use-database";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Network, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function BrainDNA() {
  const { brains } = useDatabase();
  // Mock DNA data for now since we don't have a way to populate it yet
  const dnaConnections: BrainDNAType[] = brains.map(b => ({
    id: b.id + "-dna",
    brainId: b.id,
    childBrainIds: [],
    linkedBrainIds: [],
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Network className="w-8 h-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Brain DNA</h2>
          <p className="text-sm text-muted-foreground">Visual relationship graph of your expert systems</p>
        </div>
      </div>

      <div className="relative min-h-[500px] border border-border/50 rounded-xl bg-card/30 p-8 overflow-auto">
        <div className="flex flex-col gap-8 items-center">
          {brains.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              No brains available to map DNA.
            </div>
          ) : (
            brains.map((brain, i) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={brain.id}
                className="relative w-full max-w-md"
              >
                <Card className="bg-card border-primary/20 shadow-lg shadow-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{brain.title}</span>
                      <span className="text-xs font-mono text-muted-foreground">Generation 1</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {brain.description || "No description"}
                    </div>
                  </CardContent>
                </Card>
                
                {i < brains.length - 1 && (
                  <div className="flex justify-center my-2 text-muted-foreground/30">
                    <div className="w-px h-8 bg-border" />
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
