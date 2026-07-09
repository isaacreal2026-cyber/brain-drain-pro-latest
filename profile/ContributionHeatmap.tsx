import React, { useMemo } from 'react';
import { format, subDays, startOfWeek, addDays, getMonth, isSameMonth } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DayData {
  level: number;
  date: Date;
  count: number;
  items?: any[];
}

interface ContributionHeatmapProps {
  data: DayData[][]; // Week-based array of days
  onDayClick?: (day: DayData) => void;
  selectedDate?: Date | null;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ContributionHeatmap: React.FC<ContributionHeatmapProps> = ({ data, onDayClick, selectedDate }) => {
  const colorScale = ['bg-muted', 'bg-emerald-200 dark:bg-emerald-900', 'bg-emerald-400 dark:bg-emerald-700', 'bg-emerald-600 dark:bg-emerald-500', 'bg-emerald-800 dark:bg-emerald-400'];

  // Flatten to find month boundaries for the X-axis
  const monthLabels = useMemo(() => {
    const labels: { label: string; colIndex: number }[] = [];
    if (!data || data.length === 0) return labels;

    let currentMonth = -1;
    data.forEach((week, i) => {
      if (week.length > 0) {
        const month = getMonth(week[0].date);
        if (month !== currentMonth) {
          labels.push({ label: MONTH_LABELS[month], colIndex: i });
          currentMonth = month;
        }
      }
    });
    return labels;
  }, [data]);

  if (!data || data.length === 0) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="w-full overflow-x-auto pb-4">
        <div className="min-w-max flex flex-col">
          {/* Months X-axis */}
          <div className="flex ml-8 mb-1 relative h-5">
            {monthLabels.map((m, idx) => (
              <div 
                key={idx} 
                className="absolute text-xs text-muted-foreground"
                style={{ left: `${m.colIndex * 15}px` }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {/* Days Y-axis */}
            <div className="relative w-8 text-[10px] text-muted-foreground mt-0.5">
              <span className="absolute left-0 leading-3" style={{ top: '16px' }}>Mon</span>
              <span className="absolute left-0 leading-3" style={{ top: '48px' }}>Wed</span>
              <span className="absolute left-0 leading-3" style={{ top: '80px' }}>Fri</span>
            </div>

            {/* Grid */}
            <div className="flex gap-1">
              {data.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {week.map((day, dayIdx) => {
                    const isSelected = selectedDate && day.date.toDateString() === selectedDate.toDateString();
                    return (
                      <Tooltip key={dayIdx}>
                        <TooltipTrigger asChild>
                          <div
                            className={`w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 hover:ring-offset-1 ${colorScale[day.level]} ${isSelected ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-background' : ''}`}
                            onClick={() => onDayClick?.(day)}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p><strong>{day.count}</strong> contributions on {day.date.toLocaleDateString()}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
