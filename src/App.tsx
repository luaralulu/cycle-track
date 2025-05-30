import { useState, useEffect } from "react";
import {
  signIn,
  getCycleData,
  logPeriod,
  getLast12CycleStarts,
  calculateAverageCycleLength,
} from "./lib/supabase";
import Calendar from "./components/Calendar";
import Modal from "./components/Modal";
import "./App.css";
import { addDays, format, parseISO, addMonths, isSameMonth } from "date-fns";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [cycleData, setCycleData] = useState<any[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [averageCycleLength, setAverageCycleLength] = useState<number | null>(
    null
  );
  const [nextPeriodStart, setNextPeriodStart] = useState<Date | null>(null);
  const [pmsWindow, setPmsWindow] = useState<{ start: Date; end: Date } | null>(
    null
  );

  useEffect(() => {
    const initialize = async () => {
      try {
        const email = import.meta.env.VITE_SUPABASE_USER_EMAIL;
        const password = import.meta.env.VITE_SUPABASE_USER_PASSWORD;

        if (!email || !password) {
          throw new Error("Missing user credentials in environment variables");
        }

        const { user } = await signIn(email, password);
        setUserId(user.id);

        const data = await getCycleData(user.id);
        setCycleData(data);

        // Phase 3: Prediction Engine
        const cycleStarts = await getLast12CycleStarts(user.id);
        const avg = calculateAverageCycleLength(cycleStarts);
        setAverageCycleLength(avg);
        if (cycleStarts.length > 0 && avg) {
          const lastStart = new Date(cycleStarts[0].date);
          const nextStart = new Date(lastStart);
          nextStart.setDate(lastStart.getDate() + avg);
          setNextPeriodStart(nextStart);
          // PMS window: 6–8 days before next period
          setPmsWindow({
            start: new Date(nextStart.getTime() - 8 * 24 * 60 * 60 * 1000),
            end: new Date(nextStart.getTime() - 6 * 24 * 60 * 60 * 1000),
          });
        } else {
          setNextPeriodStart(null);
          setPmsWindow(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const handleLogPeriod = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const newEntry = await logPeriod(userId);
      setCycleData((prev) => [newEntry[0], ...prev]);
      setShowConfirmModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log period");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // Get the 5 most recent entries
  const recentEntries = cycleData.slice(0, 5);

  // Check if we should show the Log Period button
  const lastEntry = cycleData[0]; // Most recent entry
  const shouldShowLogButton =
    lastEntry && !lastEntry.period && lastEntry.cycle_day >= 20;

  // Helper: get period and PMS days for the month
  const periodDates = new Set(
    cycleData
      .filter((e) => e.period)
      .map((e) => format(parseISO(e.date), "yyyy-MM-dd"))
  );
  const cycleDayMap = Object.fromEntries(
    cycleData.map((e) => [format(parseISO(e.date), "yyyy-MM-dd"), e.cycle_day])
  );
  // Predicted PMS days
  let predictedPMS = new Set<string>();
  if (pmsWindow && nextPeriodStart) {
    let d = pmsWindow.start;
    while (d <= pmsWindow.end) {
      predictedPMS.add(format(d, "yyyy-MM-dd"));
      d = addDays(d, 1);
    }
  }
  // Predicted period days
  let predictedPeriod = new Set<string>();
  if (nextPeriodStart) {
    for (let i = 0; i < 5; i++) {
      const d = addDays(nextPeriodStart, i);
      predictedPeriod.add(format(d, "yyyy-MM-dd"));
    }
  }

  // Predict cycle days for future dates
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

  return (
    <div className="app">
      <h1>Cycle Tracker</h1>
      {shouldShowLogButton && (
        <button onClick={() => setShowConfirmModal(true)} disabled={isLoading}>
          Log Period
        </button>
      )}

      {/* Phase 3: Prediction Engine UI */}
      <div className="prediction-display">
        <h2>Predictions</h2>
        {averageCycleLength && nextPeriodStart ? (
          <>
            <div>Average Cycle Length: {averageCycleLength} days</div>
            <div>
              Next Predicted Period: 🩸{" "}
              {nextPeriodStart.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </div>
            {pmsWindow && (
              <div>
                PMS Window: 🧘‍♀️{" "}
                {pmsWindow.start.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}{" "}
                -{" "}
                {pmsWindow.end.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </div>
            )}
          </>
        ) : (
          <div>Not enough data to predict next period.</div>
        )}
      </div>

      <Calendar
        monthDate={new Date()}
        cycleData={cycleData}
        periodDates={periodDates}
        cycleDayMap={cycleDayMap}
        predictedPMS={predictedPMS}
        predictedPeriod={predictedPeriod}
        getPredictedCycleDay={getPredictedCycleDay}
      />
      <Calendar
        monthDate={addMonths(new Date(), 1)}
        cycleData={cycleData}
        periodDates={periodDates}
        cycleDayMap={cycleDayMap}
        predictedPMS={predictedPMS}
        predictedPeriod={predictedPeriod}
        getPredictedCycleDay={getPredictedCycleDay}
      />

      <Modal
        isOpen={showConfirmModal}
        onConfirm={handleLogPeriod}
        onCancel={() => setShowConfirmModal(false)}
        isLoading={isLoading}
      />
    </div>
  );
}

export default App;
