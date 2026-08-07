import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Recharts is heavy (~100kB+ gzipped). Lazy-load it so the Profile page loads
// faster; the timeline chart only appears after the page is interactive.
const ResponsiveContainer = lazy(() =>
  import("recharts").then((m) => ({ default: m.ResponsiveContainer })),
);
const LineChart = lazy(() =>
  import("recharts").then((m) => ({ default: m.LineChart })),
);
const Line = lazy(() => import("recharts").then((m) => ({ default: m.Line })));
const XAxis = lazy(() => import("recharts").then((m) => ({ default: m.XAxis })));
const YAxis = lazy(() => import("recharts").then((m) => ({ default: m.YAxis })));
const CartesianGrid = lazy(() =>
  import("recharts").then((m) => ({ default: m.CartesianGrid })),
);
const Tooltip = lazy(() =>
  import("recharts").then((m) => ({ default: m.Tooltip })),
);
const Legend = lazy(() =>
  import("recharts").then((m) => ({ default: m.Legend })),
);

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
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              borderColor: "hsl(var(--border))",
              borderRadius: "0.5rem",
              color: "hsl(var(--foreground))",
            }}
            itemStyle={{ fontSize: "12px" }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
          <Line type="monotone" dataKey="neuroscience" name="Neuroscience" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="psychology" name="Psychology" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="logic" name="Logic Systems" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="models" name="Computational Models" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </Suspense>
  );
}
