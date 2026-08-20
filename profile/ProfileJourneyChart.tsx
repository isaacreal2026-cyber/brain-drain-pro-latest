import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Recharts is heavy (~100kB+ gzipped). The whole chart is lazy-loaded as a
// single module so the Profile page stays fast, while recharts still receives
// its own children directly (it matches them by component type).
const ProfileJourneyChartInner = lazy(() => import("./ProfileJourneyChartInner"));

export interface JourneyPoint {
  name: string;
  neuroscience: number;
  psychology: number;
  logic: number;
  models: number;
}

export function ProfileJourneyChart({ data }: { data: JourneyPoint[] }) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full rounded-lg" />}>
      <ProfileJourneyChartInner data={data} />
    </Suspense>
  );
}
