import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { idb } from "@/lib/db";
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

    const checkReminders = () => {
      const activeMissions = missions.filter(m => m.status === "active");
      
      activeMissions.forEach(mission => {
        // Simple logic: notify about active missions if they haven't had a review recently.
        // We'll use local storage to track the last review notification time per mission.
        const lastNotified = localStorage.getItem(`mission_notified_${mission.id}`);
        const now = Date.now();
        
        // Notify every 4 hours for demo purposes, or if never notified.
        const REVIEW_INTERVAL = 4 * 60 * 60 * 1000;
        
        if (!lastNotified || (now - parseInt(lastNotified, 10) > REVIEW_INTERVAL)) {
          toast({
            title: `Review Period: ${mission.title}`,
            description: "Consistent progress builds pathways. Time for your review!",
            duration: 8000,
          });
          localStorage.setItem(`mission_notified_${mission.id}`, now.toString());
        }
      });
    };

    // Check immediately on mount/data load
    checkReminders();

    // Then check periodically (e.g. every 10 minutes)
    const interval = setInterval(checkReminders, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [missions, toast]);
}
