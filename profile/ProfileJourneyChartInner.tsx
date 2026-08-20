import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { JourneyPoint } from "./ProfileJourneyChart";

/**
 * The chart itself, with plain (non-lazy) recharts imports.
 *
 * Recharts identifies its children by component type/displayName, so wrapping
 * each primitive (XAxis, Line, …) in React.lazy made them unrecognizable and
 * the chart rendered empty. Lazy-loading happens one level up, around this
 * whole module, which keeps recharts off the critical path just the same.
 */
export default function ProfileJourneyChartInner({ data }: { data: JourneyPoint[] }) {
  return (
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
  );
}
