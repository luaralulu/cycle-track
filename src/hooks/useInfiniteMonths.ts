import { useState, useEffect, useCallback, useRef } from "react";
import {
  addMonths,
  subMonths,
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addDays,
  parseISO,
} from "date-fns";
import {
  getCycleDataForMonth as fetchCycleDataForMonth,
  getLast12CycleStarts,
  calculateAverageCycleLength,
} from "../lib/supabase";
import type { CycleData } from "../lib/supabase";

/**
 * Custom hook for managing multi-month calendar navigation
 * Handles loading months dynamically via button clicks
 */
export function useMultiMonthNavigation(userId?: string | null) {
  const [months, setMonths] = useState<Date[]>([]);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [canLoadMorePrevious, setCanLoadMorePrevious] = useState(true);
  const [canLoadMoreNext, setCanLoadMoreNext] = useState(true);
  const [monthlyData, setMonthlyData] = useState<Map<string, CycleData[]>>(
    new Map()
  );
  const [averageCycleLength, setAverageCycleLength] = useState<number | null>(
    null
  );
  const [lastCycleStart, setLastCycleStart] = useState<Date | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize with current month + next month and fetch prediction data
  useEffect(() => {
    const currentDate = new Date();
    setMonths([currentDate, addMonths(currentDate, 1)]);

    // Fetch prediction parameters
    if (userId) {
      const fetchPredictionData = async () => {
        try {
          const cycleStarts = await getLast12CycleStarts(userId);
          const avg = calculateAverageCycleLength(cycleStarts);
          setAverageCycleLength(avg);

          if (cycleStarts.length > 0) {
            setLastCycleStart(new Date(cycleStarts[0].date));
          }
        } catch (error) {
          console.error("Error fetching prediction data:", error);
        }
      };
      fetchPredictionData();
    }
  }, [userId]);

  /**
   * Generate a key for storing monthly data
   */
  const getMonthKey = (date: Date): string => {
    return `${date.getFullYear()}-${date.getMonth()}`;
  };

  /**
   * Calculate multiple future cycle predictions
   * @param startDate - Starting date for predictions
   * @param cyclesCount - Number of cycles to predict
   * @returns Array of cycle predictions with period and PMS dates
   */
  const calculateMultipleFutureCycles = useCallback(
    (
      startDate: Date,
      cyclesCount: number
    ): Array<{
      cycleStart: Date;
      periodDates: Date[];
      pmsDates: Date[];
    }> => {
      if (!averageCycleLength || !lastCycleStart) return [];

      const cycles = [];
      let currentCycleStart = new Date(lastCycleStart);

      // Find the next cycle start after the given start date
      while (currentCycleStart < startDate) {
        currentCycleStart = addDays(currentCycleStart, averageCycleLength);
      }

      for (let i = 0; i < cyclesCount; i++) {
        // Period dates: 5 days starting from cycle start
        const periodDates = [];
        for (let j = 0; j < 5; j++) {
          periodDates.push(addDays(currentCycleStart, j));
        }

        // PMS dates: 6-8 days before cycle start (3 days)
        const pmsDates = [];
        for (let j = 8; j >= 6; j--) {
          pmsDates.push(addDays(currentCycleStart, -j));
        }

        cycles.push({
          cycleStart: new Date(currentCycleStart),
          periodDates,
          pmsDates,
        });

        // Move to next cycle
        currentCycleStart = addDays(currentCycleStart, averageCycleLength);
      }

      return cycles;
    },
    [averageCycleLength, lastCycleStart]
  );

  /**
   * Generate predicted cycle data for a future month using real prediction engine
   */
  const generatePredictedCycleData = useCallback(
    (monthDate: Date, userId: string): CycleData[] => {
      if (!averageCycleLength || !lastCycleStart) {
        console.log("No prediction data available for", monthDate);
        return [];
      }

      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const daysInMonth = eachDayOfInterval({
        start: monthStart,
        end: monthEnd,
      });

      // Calculate enough cycles to cover this month (up to 2 cycles should be enough)
      const futureCycles = calculateMultipleFutureCycles(monthStart, 2);

      // Create sets for easy lookup
      const periodDatesSet = new Set();
      const pmsDatesSet = new Set();

      futureCycles.forEach((cycle) => {
        cycle.periodDates.forEach((date) => {
          periodDatesSet.add(format(date, "yyyy-MM-dd"));
        });
        cycle.pmsDates.forEach((date) => {
          pmsDatesSet.add(format(date, "yyyy-MM-dd"));
        });
      });

      const predictedData: CycleData[] = [];

      daysInMonth.forEach((day, index) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const isPeriod = periodDatesSet.has(dateStr);
        const isPMS = pmsDatesSet.has(dateStr);

        // Calculate cycle day based on user's actual cycle length and last known start
        let cycleDay = 1;
        let tempDate = new Date(lastCycleStart);
        let currentCycleDay = 1;

        while (tempDate < day) {
          tempDate = addDays(tempDate, 1);
          currentCycleDay++;
          if (currentCycleDay > averageCycleLength) {
            currentCycleDay = 1;
          }
        }
        cycleDay = currentCycleDay;

        predictedData.push({
          id: -(index + 1), // Negative ID to indicate predicted data
          user_id: userId,
          date: dateStr,
          cycle_day: cycleDay,
          period: isPeriod,
        });
      });

      console.log(
        `Generated ${
          predictedData.length
        } predicted entries for ${monthDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })} with ${predictedData.filter((d) => d.period).length} period days`
      );

      return predictedData;
    },
    [averageCycleLength, lastCycleStart, calculateMultipleFutureCycles]
  );

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
   * Load next month and append to the list
   * Limited to 3 months ahead total
   */
  const loadNextMonth = useCallback(async () => {
    if (!canLoadMoreNext || isLoadingNext || !userId) return;

    console.log("Loading next month...");
    setIsLoadingNext(true);

    try {
      const currentLastMonth = months[months.length - 1];
      if (!currentLastMonth) return;

      const newMonth = addMonths(currentLastMonth, 1);
      const monthKey = getMonthKey(newMonth);

      // Generate predicted data for the new month using real prediction engine
      const predictedData = generatePredictedCycleData(newMonth, userId);

      console.log(
        `Generated ${
          predictedData.length
        } predicted entries for ${newMonth.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })} with ${predictedData.filter((d) => d.period).length} period days`
      );

      // Update months list
      setMonths((prevMonths) => {
        const updatedMonths = [...prevMonths, newMonth];

        // Count how many months are after the initial "next month"
        // Start counting from index 2 (current=0, initial next=1, additional future months start from 2)
        const futureMonthsCount = updatedMonths.length - 2;
        if (futureMonthsCount >= 3) {
          setCanLoadMoreNext(false);
          console.log("Reached maximum future months limit (3 months ahead)");
        }

        console.log(
          `Loaded predicted month: ${newMonth.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}`
        );

        return updatedMonths;
      });

      // Store the predicted cycle data for this month
      setMonthlyData((prevData) => {
        const newData = new Map(prevData);
        newData.set(monthKey, predictedData);
        return newData;
      });
    } catch (error) {
      console.error("Error loading next month:", error);
    } finally {
      setIsLoadingNext(false);
    }
  }, [
    canLoadMoreNext,
    isLoadingNext,
    userId,
    months,
    generatePredictedCycleData,
  ]);

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

  /**
   * Get future predictions for a specific month
   * Returns predictions that can be used by Calendar component
   */
  const getFuturePredictionsForMonth = useCallback(
    (date: Date) => {
      if (!averageCycleLength || !lastCycleStart) {
        return {
          predictedPMS: new Set<string>(),
          predictedPeriod: new Set<string>(),
          getPredictedCycleDay: () => null,
        };
      }

      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      // Calculate future cycles for this month
      const futureCycles = calculateMultipleFutureCycles(monthStart, 3);

      // Build prediction sets
      const predictedPMS = new Set<string>();
      const predictedPeriod = new Set<string>();

      futureCycles.forEach((cycle) => {
        cycle.periodDates.forEach((date) => {
          if (date >= monthStart && date <= monthEnd) {
            predictedPeriod.add(format(date, "yyyy-MM-dd"));
          }
        });
        cycle.pmsDates.forEach((date) => {
          if (date >= monthStart && date <= monthEnd) {
            predictedPMS.add(format(date, "yyyy-MM-dd"));
          }
        });
      });

      // Function to predict cycle day for any date
      const getPredictedCycleDay = (targetDate: Date) => {
        let cycleDay = 1;
        let tempDate = new Date(lastCycleStart);
        let currentCycleDay = 1;

        while (tempDate < targetDate) {
          tempDate = addDays(tempDate, 1);
          currentCycleDay++;
          if (currentCycleDay > averageCycleLength) {
            currentCycleDay = 1;
          }
        }
        return currentCycleDay;
      };

      return {
        predictedPMS,
        predictedPeriod,
        getPredictedCycleDay,
      };
    },
    [averageCycleLength, lastCycleStart, calculateMultipleFutureCycles]
  );

  return {
    months,
    isLoadingPrevious,
    isLoadingNext,
    canLoadMorePrevious,
    canLoadMoreNext,
    scrollContainerRef,
    loadPreviousMonth,
    loadNextMonth,
    getCycleDataForMonth,
    getFuturePredictionsForMonth,
  };
}
