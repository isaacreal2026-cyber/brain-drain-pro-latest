import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { idb } from "@/lib/db";
import { getAnalyticsEvents, trackEvent } from "@/lib/analytics";
import { rankMissionReminders } from "@/lib/recommendations";
import { Mission } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function useMissionReminders() {
  const { toast } = useToast();

  const { data: missions = [] } = useQuery({
    queryKey: ["missions"],
    queryFn: async () => {
      const allMissions = await idb.getAll<Mission>("missions");
      return allMissions;
    }
  });

  useEffect(() => {
    if (!missions.length) return;

    const checkReminders = async () => {
      const rankedActiveMissions = rankMissionReminders(missions, await getAnalyticsEvents());
      const now = Date.now();
      const REVIEW_INTERVAL = 4 * 60 * 60 * 1000;

      for (const mission of rankedActiveMissions.slice(0, 2)) {
        let lastNotified: string | null = null;
        try {
          lastNotified = localStorage.getItem(`mission_notified_${mission.id}`);
        } catch {
          // Storage blocked — treat the mission as never reminded.
        }
        const lastNotifiedAt = lastNotified ? Number(lastNotified) : NaN;
        // A corrupt timestamp used to silence the reminder forever.
        if (!Number.isFinite(lastNotifiedAt) || now - lastNotifiedAt > REVIEW_INTERVAL) {
          toast({
            title: `Review Period: ${mission.title}`,
            description: "Consistent progress builds pathways. Time for your review!",
            duration: 8000,
          });
          try {
            localStorage.setItem(`mission_notified_${mission.id}`, now.toString());
          } catch {
            // Ignore storage failures; the reminder simply repeats later.
          }
          void trackEvent("mission_reminder", {
            missionId: mission.id,
            category: mission.category,
            progress: mission.progress,
            hasTargetDate: Boolean(mission.targetDate),
          });
          break;
        }
      }
    };

    // Check immediately on mount/data load
    void checkReminders();

    // Then check periodically (e.g. every 10 minutes)
    const interval = setInterval(() => void checkReminders(), 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [missions, toast]);
}
