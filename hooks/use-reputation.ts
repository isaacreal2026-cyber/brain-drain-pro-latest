import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Reputation, XPEvent } from "../lib/types";
import { idb } from "../lib/db";

const XP_PER_LEVEL = 200;

export function useReputation() {
  const queryClient = useQueryClient();

  const { data: { reputation = null, xpEvents = [] } = {}, isLoading } = useQuery({
    queryKey: ["reputationData"],
    queryFn: async () => {
      let rep = await idb.get<Reputation>("reputation", "me");
      if (!rep) {
        rep = {
          id: "me",
          xp: 0,
          level: 1,
          streak: 0,
          lastActiveDate: "",
          totalMissionsCompleted: 0,
          totalBrainsCreated: 0,
          totalCheckIns: 0,
          badges: []
        };
        await idb.put("reputation", rep);
      }

      const events = await idb.getAll<XPEvent>("xp_events");
      return {
        reputation: rep,
        xpEvents: events.sort((a, b) => b.createdAt - a.createdAt)
      };
    }
  });

  const addXPEventMutation = useMutation({
    mutationFn: async ({ type, xpGained, description }: { type: XPEvent["type"], xpGained: number, description: string }) => {
      const event: XPEvent = {
        id: crypto.randomUUID(),
        type,
        xpGained,
        description,
        createdAt: Date.now(),
      };

      await idb.put("xp_events", event);

      if (reputation) {
        const newXp = reputation.xp + xpGained;
        const newLevel = Math.min(100, Math.floor(newXp / XP_PER_LEVEL) + 1);
        
        const updatedRep: Reputation = {
          ...reputation,
          xp: newXp,
          level: newLevel,
        };

        // Update specific counters
        if (type === "mission_completed") updatedRep.totalMissionsCompleted++;
        if (type === "brain_created") updatedRep.totalBrainsCreated++;
        if (type === "check_in") updatedRep.totalCheckIns++;

        // Compute badges
        const newBadges = [...reputation.badges];
        if (updatedRep.totalBrainsCreated >= 1 && !newBadges.includes("First Brain")) {
          newBadges.push("First Brain");
        }
        if (updatedRep.streak >= 7 && !newBadges.includes("Streak 7")) {
          newBadges.push("Streak 7");
        }
        if (updatedRep.level >= 10 && !newBadges.includes("Level 10")) {
          newBadges.push("Level 10");
        }
        updatedRep.badges = newBadges;

        await idb.put("reputation", updatedRep);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reputationData"] });
    }
  });

  const updateStreakMutation = useMutation({
    mutationFn: async () => {
      if (!reputation) return;

      const today = new Date().toISOString().split("T")[0];
      if (reputation.lastActiveDate === today) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let newStreak = reputation.streak;
      if (reputation.lastActiveDate === yesterdayStr) {
        newStreak += 1;
      } else if (reputation.lastActiveDate === "") {
        newStreak = 1;
      } else {
        newStreak = 1; // Reset if missed a day
      }

      const updatedRep: Reputation = {
        ...reputation,
        streak: newStreak,
        lastActiveDate: today
      };

      await idb.put("reputation", updatedRep);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reputationData"] });
    }
  });

  const mutateStreak = updateStreakMutation.mutate;

  useEffect(() => {
    if (reputation && !reputation.lastActiveDate.includes(new Date().toISOString().split("T")[0])) {
      mutateStreak();
    }
  }, [reputation?.lastActiveDate, mutateStreak]);

  return {
    reputation,
    xpEvents,
    addXPEvent: (type: XPEvent["type"], xpGained: number, description: string) => addXPEventMutation.mutateAsync({ type, xpGained, description }),
    updateStreak: updateStreakMutation.mutateAsync,
    isLoading
  };
}
