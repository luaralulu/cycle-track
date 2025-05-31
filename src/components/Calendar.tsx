import React from "react";
import { format, isSameMonth, addDays, parseISO } from "date-fns";
import type { CycleData } from "../lib/supabase";

interface CalendarProps {
  monthDate: Date;
  cycleData: CycleData[];
  periodDates: Set<string>;
  cycleDayMap: Record<string, number>;
  predictedPMS: Set<string>;
  predictedPeriod: Set<string>;
  getPredictedCycleDay: (date: Date) => number | null;
}

const getMonthDays = (monthDate: Date) => {
  const startOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const startOfWeek = (date: Date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  };
  const endOfWeek = (date: Date) => {
    const d = new Date(date);
    d.setDate(d.getDate() + (6 - ((d.getDay() + 6) % 7)));
    return d;
  };
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const weekStart = startOfWeek(monthStart);
  const weekEnd = endOfWeek(monthEnd);
  const days: Date[] = [];
  let day = weekStart;
  while (day <= weekEnd) {
    days.push(new Date(day));
    day = addDays(day, 1);
  }
  return days;
};

const Calendar: React.FC<CalendarProps> = ({
  monthDate,
  periodDates,
  cycleDayMap,
  predictedPMS,
  predictedPeriod,
  getPredictedCycleDay,
}) => {
  const days = getMonthDays(monthDate);
  // Split days into weeks (arrays of 7)
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return (
    <div className="calendar-grid">
      <div className="calendar-header">{format(monthDate, "MMMM yyyy")}</div>
      <div className="calendar-row calendar-weekdays">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((wd) => (
          <div key={wd} className="calendar-cell calendar-weekday">
            {wd}
          </div>
        ))}
      </div>
      {weeks.map((week, wIdx) => (
        <div className="calendar-row calendar-days" key={wIdx}>
          {week.map((date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const isCurrentMonth = isSameMonth(date, monthDate);
            const isPeriod = periodDates.has(dateStr);
            const isPredictedPeriod = predictedPeriod.has(dateStr) && !isPeriod;
            const isPMS = predictedPMS.has(dateStr);
            const cycleDay = cycleDayMap[dateStr] || getPredictedCycleDay(date);
            return (
              <div
                key={dateStr}
                className={`calendar-cell calendar-day${
                  isCurrentMonth
                    ? (isPeriod
                        ? " calendar-period"
                        : isPredictedPeriod
                        ? " calendar-predicted-period"
                        : "") + (isPMS ? " calendar-pms" : "")
                    : " calendar-out"
                }`}
              >
                <div className="calendar-date">{date.getDate()}</div>
                {cycleDay && (
                  <div className="calendar-cycle-day">{cycleDay}</div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Calendar;
