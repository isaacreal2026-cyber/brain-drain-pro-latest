import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface HealthResponse {
  status: string;
}

/**
 * Periodically pings the API health endpoint. When no API base URL is
 * configured (same-origin static deployment without a backend), we report
 * "unknown" so the UI treats it as optional rather than down.
 */
export function useApiHealth() {
  const enabled = Boolean(api && import.meta.env.VITE_API_BASE_URL);

  const query = useQuery({
    queryKey: ["api-health"],
    queryFn: ({ signal }) =>
      api.get<HealthResponse>("/api/healthz", { signal, timeoutMs: 5_000 }),
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
    staleTime: 15_000,
  });

  if (!enabled) {
    return { status: "unknown" as const, isLoading: false, isError: false };
  }

  return {
    status: query.isError ? ("down" as const) : query.data?.status === "ok" ? ("ok" as const) : ("checking" as const),
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
