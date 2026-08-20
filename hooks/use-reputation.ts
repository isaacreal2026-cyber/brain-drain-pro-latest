import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Reputation, XPEvent } from "../lib/types";
import { idb } from "../lib/db";

const XP_PER_LEVEL = 200;

const DEFAULT_REPUTATION: Reputation = {
  id: "me",
  xp: 0,
  level: 1,
  streak: 0,
  lastActiveDate: "",
  totalMissionsCompleted: 0,
  totalBrainsCreated: 0,
  totalCheckIns: 0,
  badges: [],
};

/**
 * Reads the reputation record straight from IndexedDB (creating it on first
 * use). Mutations must read through this instead of the cached query data so
 * back-to-back XP awards (e.g. a milestone that also completes a mission)
 * accumulate instead of overwriting each other with a stale snapshot.
 */
async function loadReputation(): Promise<Reputation> {
  const stored = await idb.get<Reputation>("reputation", "me");
  if (stored) return stored;
  const fresh: Reputation = { ...DEFAULT_REPUTATION, badges: [] };
  await idb.put("reputation", fresh);
  return fresh;
}

export function useReputation() {
  const queryClient = useQueryClient();

  const { data: { reputation = null, xpEvents = [] } = {}, isLoading } = useQuery({
    queryKey: ["reputationData"],
    queryFn: async () => {
      const rep = await loadReputation();

      const events = await idb.getAll<XPEvent>("xp_events");
      return {
        reputation: rep,
        xpEvents: events.sort((a, b) => b.createdAt - a.createdAt)
      };
    }
  });

  const addXPEventMutation = useMutation({
    mutationFn: async ({ type, xpGained, description }: { type: XPEvent["type"], xpGained: number, description: string }) => {
      // Guard against NaN/Infinity reaching the stored totals: a single bad
      // value would make the XP counter unrecoverable.
      const gained = Number.isFinite(xpGained) ? Math.trunc(xpGained) : 0;
      const event: XPEvent = {
        id: crypto.randomUUID(),
        type,
        xpGained: gained,
        description,
        createdAt: Date.now(),
      };

      await idb.put("xp_events", event);

      {
        const current = await loadReputation();
        const newXp = (Number.isFinite(current.xp) ? current.xp : 0) + gained;
        const newLevel = Math.min(100, Math.floor(newXp / XP_PER_LEVEL) + 1);

        const updatedRep: Reputation = {
          ...current,
          xp: newXp,
          level: newLevel,
        };

        // Update specific counters
        if (type === "mission_completed") updatedRep.totalMissionsCompleted++;
        if (type === "brain_created") updatedRep.totalBrainsCreated++;
        if (type === "check_in") updatedRep.totalCheckIns++;

        // Compute badges
        const newBadges = [...(current.badges || [])];
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
      const current = await loadReputation();

      const today = new Date().toISOString().split("T")[0];
      if (current.lastActiveDate === today) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let newStreak = current.streak;
      if (current.lastActiveDate === yesterdayStr) {
        newStreak += 1;
      } else if (current.lastActiveDate === "") {
        newStreak = 1;
      } else {
        newStreak = 1; // Reset if missed a day
      }

      const updatedRep: Reputation = {
        ...current,
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
    if (reputation && reputation.lastActiveDate !== new Date().toISOString().split("T")[0]) {
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
