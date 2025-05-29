import { useState, useEffect } from "react";
import { signIn, getCycleData, logPeriod } from "./lib/supabase";
import "./App.css";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [cycleData, setCycleData] = useState<any[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
