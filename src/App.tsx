import { useState, useEffect } from "react";
import {
  signIn,
  getCycleData,
  logPeriod,
  getLast12CycleStarts,
  calculateAverageCycleLength,
} from "./lib/supabase";
import "./App.css";

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
        console.log("Fetched cycle data:", data); // Debug log
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

  return (
    <div className="app">
      <h1>Cycle Tracker</h1>
      {shouldShowLogButton && (
        <button onClick={() => setShowConfirmModal(true)} disabled={isLoading}>
          Log Period
        </button>
      )}

      {/* Phase 3: Prediction Engine UI */}
      <div
        className="prediction-display"
        style={{
          background: "#f0f0f0",
          padding: "10px",
          borderRadius: "5px",
          color: "#333",
        }}
      >
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

      <div className="data-display">
        <h2>Recent Entries</h2>
        <ul>
          {recentEntries.map((entry) => (
            <li key={entry.id}>
              {new Date(entry.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              - Day {entry.cycle_day}
              {entry.period && <span className="period-indicator">🩸</span>}
            </li>
          ))}
        </ul>
      </div>

      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirm Period Log</h3>
            <p>Are you sure you want to log your period for today?</p>
            <div className="modal-buttons">
              <button
                onClick={handleLogPeriod}
                disabled={isLoading}
                className="confirm-button"
              >
                Yes, log period
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
