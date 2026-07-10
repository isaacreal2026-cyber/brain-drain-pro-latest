import { useQuery } from "@tanstack/react-query";
import { getAnalyticsEvents } from "@/lib/analytics";

export function useAnalyticsEvents() {
  return useQuery({
    queryKey: ["analytics_events"],
    queryFn: getAnalyticsEvents,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}
