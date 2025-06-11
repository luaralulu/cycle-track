import { useState, useEffect, useMemo } from "react";
import {
  getCycleData,
  logPeriod,
  getLast12CycleStarts,
  calculateAverageCycleLength,
} from "../lib/supabase";
import { createCycleEvents, getGoogleAuthTokens } from "../lib/googleCalendar";
import { addDays, format, parseISO } from "date-fns";
import type { CycleData } from "../lib/supabase";

/**
 * Custom hook for managing menstrual cycle data
 * Handles data fetching, period logging, and cycle predictions
 * @param userId - The current user's ID
 */
export function useCycleData(userId?: string | null) {
  // State management for cycle data and UI
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cycleData, setCycleData] = useState<CycleData[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Calendar integration status
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
  const [calendarMessageType, setCalendarMessageType] = useState<
    "success" | "error" | null
  >(null);

  // Prediction-related state
  const [averageCycleLength, setAverageCycleLength] = useState<number | null>(
    null
  );
  const [nextPeriodStart, setNextPeriodStart] = useState<Date | null>(null);
  const [nextOvulationDate, setNextOvulationDate] = useState<Date | null>(null);
  const [pmsWindow, setPmsWindow] = useState<{ start: Date; end: Date } | null>(
    null
  );

  /**
   * Initialize cycle data and calculate predictions
   * Runs when userId changes
   */
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      setCycleData([]);
      return;
    }
    const initialize = async () => {
      try {
        // Fetch user's cycle data
        const data = await getCycleData(userId);
        setCycleData(data);

        // Check Google Calendar connection status
        try {
          const tokens = await getGoogleAuthTokens(userId);
          if (tokens) {
            console.log(
              "✅ Google Calendar connected - calendar events will be created when logging periods"
            );
          } else {
            console.log(
              "⚠️ Google Calendar not connected - periods will be logged without calendar events"
            );
          }
        } catch (error) {
          console.error(
            "❌ Failed to check Google Calendar connection:",
            error
          );
        }

        // Calculate predictions based on historical data
        const cycleStarts = await getLast12CycleStarts(userId);
        const avg = calculateAverageCycleLength(cycleStarts);
        setAverageCycleLength(avg);

        if (cycleStarts.length > 0 && avg) {
          // Calculate next period start date
          const lastStart = new Date(cycleStarts[0].date);
          const nextStart = new Date(lastStart);
          nextStart.setDate(lastStart.getDate() + avg);
          setNextPeriodStart(nextStart);

          // Calculate next ovulation date (14 days before next period)
          const nextOvulation = new Date(nextStart);
          nextOvulation.setDate(nextStart.getDate() - 14);
          setNextOvulationDate(nextOvulation);

          // Calculate PMS window (6-8 days before next period)
          setPmsWindow({
            start: new Date(nextStart.getTime() - 8 * 24 * 60 * 60 * 1000),
            end: new Date(nextStart.getTime() - 6 * 24 * 60 * 60 * 1000),
          });
        } else {
          setNextPeriodStart(null);
          setNextOvulationDate(null);
          setPmsWindow(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, [userId]);

  /**
   * Handles logging a new period entry
   * Updates local state and triggers recalculation of predictions
   * Creates Google Calendar events for next predicted PMS and period
   */
  const handleLogPeriod = async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      setCalendarMessage(null);
      setCalendarMessageType(null);

      const newEntry = await logPeriod(userId);
      setCycleData((prev) => [newEntry[0], ...prev]);
      setShowConfirmModal(false);

      // Recalculate predictions after logging new period
      const cycleStarts = await getLast12CycleStarts(userId);
      const avg = calculateAverageCycleLength(cycleStarts);

      if (cycleStarts.length > 0 && avg) {
        // Calculate next period start date (prediction for calendar events)
        const lastStart = new Date(cycleStarts[0].date);
        const nextStart = new Date(lastStart);
        nextStart.setDate(lastStart.getDate() + avg);

        // Create Google Calendar events for predicted cycle
        try {
          await createCycleEvents(userId, nextStart);
          console.log(
            "✅ Successfully created Google Calendar events for next cycle"
          );
          setCalendarMessage("Calendar events created successfully!");
          setCalendarMessageType("success");

          // Clear message after 5 seconds
          setTimeout(() => {
            setCalendarMessage(null);
            setCalendarMessageType(null);
          }, 5000);
        } catch (calendarError) {
          console.error(
            "❌ Failed to create Google Calendar events:",
            calendarError
          );
          const errorMessage =
            calendarError instanceof Error
              ? calendarError.message
              : "Unknown calendar error";
          setCalendarMessage(`Calendar sync failed: ${errorMessage}`);
          setCalendarMessageType("error");

          // Clear message after 8 seconds (longer for errors)
          setTimeout(() => {
            setCalendarMessage(null);
            setCalendarMessageType(null);
          }, 8000);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log period");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Memoized set of dates when user had their period
   * Used for calendar display
   */
  const periodDates = useMemo(
    () =>
      new Set(
        cycleData
          .filter((e) => e.period)
          .map((e) => format(parseISO(e.date), "yyyy-MM-dd"))
      ),
    [cycleData]
  );

  /**
   * Memoized map of cycle days for each date
   * Used for tracking cycle progress
   */
  const cycleDayMap = useMemo(
    () =>
      Object.fromEntries(
        cycleData.map((e) => [
          format(parseISO(e.date), "yyyy-MM-dd"),
          e.cycle_day,
        ])
      ),
    [cycleData]
  );

  /**
   * Memoized set of predicted PMS dates
   * Calculated based on next period prediction
   */
  const predictedPMS = useMemo(() => {
    const pms = new Set<string>();
    if (pmsWindow && nextPeriodStart) {
      let d = pmsWindow.start;
      while (d <= pmsWindow.end) {
        pms.add(format(d, "yyyy-MM-dd"));
        d = addDays(d, 1);
      }
    }
    return pms;
  }, [pmsWindow, nextPeriodStart]);

  /**
   * Memoized set of predicted period dates
   * Assumes 5-day period duration
   */
  const predictedPeriod = useMemo(() => {
    const period = new Set<string>();
    if (nextPeriodStart) {
      for (let i = 0; i < 5; i++) {
        const d = addDays(nextPeriodStart, i);
        period.add(format(d, "yyyy-MM-dd"));
      }
    }
    return period;
  }, [nextPeriodStart]);

  /**
   * Memoized set of predicted ovulation dates
   * Based on calculated next ovulation date
   */
  const predictedOvulation = useMemo(() => {
    const ovulation = new Set<string>();
    if (nextOvulationDate) {
      ovulation.add(format(nextOvulationDate, "yyyy-MM-dd"));
    }
    return ovulation;
  }, [nextOvulationDate]);

  // Get the 5 most recent entries for quick reference
  const recentEntries = useMemo(() => cycleData.slice(0, 5), [cycleData]);

  /**
   * Determines if the Log Period button should be shown
   * Only shown when user is in the latter part of their cycle
   */
  const lastEntry = cycleData[0]; // Most recent entry
  const shouldShowLogButton =
    lastEntry && !lastEntry.period && lastEntry.cycle_day >= 20;

  /**
   * Predicts cycle day for a given date
   * Uses average cycle length and last known cycle start
   * @param date - The date to predict cycle day for
   * @returns Predicted cycle day or null if prediction not possible
   */
  const getPredictedCycleDay = (date: Date) => {
    if (!nextPeriodStart || !averageCycleLength) return null;
    // Find the last logged cycle start
    const lastCycleStart = cycleData.find((e) => e.cycle_day === 1);
    if (!lastCycleStart) return null;
    const lastStartDate = parseISO(lastCycleStart.date);
    let cycleDay = 1;
    let d = new Date(lastStartDate);
    while (d < date) {
      cycleDay++;
      if (cycleDay > averageCycleLength) cycleDay = 1;
      d = addDays(d, 1);
    }
    return cycleDay;
  };

  return {
    isLoading,
    error,
    showConfirmModal,
    setShowConfirmModal,
    handleLogPeriod,
    averageCycleLength,
    nextPeriodStart,
    nextOvulationDate,
    pmsWindow,
    periodDates,
    cycleDayMap,
    predictedPMS,
    predictedPeriod,
    predictedOvulation,
    getPredictedCycleDay,
    shouldShowLogButton,
    recentEntries,
    calendarMessage,
    calendarMessageType,
  };
}
