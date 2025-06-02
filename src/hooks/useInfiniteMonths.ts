import { useState, useEffect, useCallback, useRef } from "react";
import { addMonths, subMonths } from "date-fns";
import { getCycleDataForMonth as fetchCycleDataForMonth } from "../lib/supabase";
import type { CycleData } from "../lib/supabase";

/**
 * Custom hook for managing multi-month calendar navigation
 * Handles loading months dynamically via button clicks
 */
export function useMultiMonthNavigation(userId?: string | null) {
  const [months, setMonths] = useState<Date[]>([]);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [canLoadMorePrevious, setCanLoadMorePrevious] = useState(true);
  const [monthlyData, setMonthlyData] = useState<Map<string, CycleData[]>>(
    new Map()
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize with current month + next month
  useEffect(() => {
    const currentDate = new Date();
    setMonths([currentDate, addMonths(currentDate, 1)]);
  }, []);

  /**
   * Generate a key for storing monthly data
   */
  const getMonthKey = (date: Date): string => {
    return `${date.getFullYear()}-${date.getMonth()}`;
  };

  /**
   * Load previous month and prepend to the list
   * Limited to 6 months back total
   */
  const loadPreviousMonth = useCallback(async () => {
    if (!canLoadMorePrevious || isLoadingPrevious || !userId) return;

    console.log("Loading previous month...");
    setIsLoadingPrevious(true);

    try {
      const currentFirstMonth = months[0];
      if (!currentFirstMonth) return;

      const newMonth = subMonths(currentFirstMonth, 1);
      const monthKey = getMonthKey(newMonth);

      // Fetch data for the new month from Supabase
      const cycleData = await fetchCycleDataForMonth(
        userId,
        newMonth.getFullYear(),
        newMonth.getMonth()
      );

      console.log(
        `Fetched ${
          cycleData.length
        } cycle entries for ${newMonth.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}`
      );

      // Update months list
      setMonths((prevMonths) => {
        const updatedMonths = [newMonth, ...prevMonths];

        // Limit to 6 months back (current + next + 6 previous = 8 total)
        const maxMonths = 8;
        if (updatedMonths.length >= maxMonths) {
          setCanLoadMorePrevious(false);
          console.log("Reached maximum months limit (6 months back)");
        }

        console.log(
          `Loaded month: ${newMonth.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}`
        );

        return updatedMonths;
      });

      // Store the cycle data for this month
      setMonthlyData((prevData) => {
        const newData = new Map(prevData);
        newData.set(monthKey, cycleData);
        return newData;
      });
    } catch (error) {
      console.error("Error loading previous month:", error);
    } finally {
      setIsLoadingPrevious(false);
    }
  }, [canLoadMorePrevious, isLoadingPrevious, userId, months]);

  /**
   * Get cycle data for a specific month
   */
  const getCycleDataForMonth = useCallback(
    (date: Date): CycleData[] => {
      const monthKey = getMonthKey(date);
      return monthlyData.get(monthKey) || [];
    },
    [monthlyData]
  );

  return {
    months,
    isLoadingPrevious,
    canLoadMorePrevious,
    scrollContainerRef,
    loadPreviousMonth,
    getCycleDataForMonth,
  };
}
