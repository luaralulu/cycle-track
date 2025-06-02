import { useState, useEffect } from "react";
import { useCycleData } from "./hooks/useCycleData";
import Calendar from "./components/Calendar";
import Modal from "./components/Modal";
import Predictions from "./components/Predictions";
import Login from "./components/Login";
import { getSession, signIn, signOut, supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import "./App.css";
import { addMonths } from "date-fns";

/**
 * AppHeader Component
 * Displays the application header with title and logout button
 * @param onLogout - Function to handle user logout
 */
function AppHeader({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="app-header">
      <div className="app-header-title">My Cycle</div>
      <button onClick={onLogout} className="logout-btn" title="Logout">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ff8fa3"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ verticalAlign: "middle" }}
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </header>
  );
}

/**
 * Main App Component
 * Handles authentication, cycle data management, and renders the main UI
 */
function App() {
  // Authentication state
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Get user ID from session and initialize cycle data hook
  const userId = session?.user?.id ?? null;
  const cycleDataState = useCycleData(userId);

  /**
   * Effect to handle authentication state
   * - Checks for existing session on mount
   * - Sets up listener for auth state changes
   */
  useEffect(() => {
    getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setSession(session);
      }
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  /**
   * Handles user login
   * @param email - User's email
   * @param password - User's password
   */
  const handleLogin = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { session } = await signIn(email, password);
      setSession(session);
    } catch (err: any) {
      setAuthError(err.message || "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  /**
   * Handles user logout
   */
  const handleLogout = async () => {
    await signOut();
    setSession(null);
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return <div>Loading...</div>;
  }

  // Show login screen if not authenticated
  if (!session) {
    return (
      <Login onLogin={handleLogin} loading={authLoading} error={authError} />
    );
  }

  // Destructure cycle data state for easier access
  const {
    isLoading,
    error,
    showConfirmModal,
    setShowConfirmModal,
    handleLogPeriod,
    averageCycleLength,
    nextPeriodStart,
    pmsWindow,
    periodDates,
    cycleDayMap,
    predictedPMS,
    predictedPeriod,
    getPredictedCycleDay,
    shouldShowLogButton,
  } = cycleDataState;

  // Show loading state while fetching cycle data
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Show error state if cycle data fetch failed
  if (error) {
    return <div>Error: {error}</div>;
  }

  // Main app UI
  return (
    <div className="app">
      <AppHeader onLogout={handleLogout} />

      {/* Period logging button - only shown when appropriate */}
      {shouldShowLogButton && (
        <button onClick={() => setShowConfirmModal(true)} disabled={isLoading}>
          Log Period
        </button>
      )}

      {/* Display cycle predictions and statistics */}
      <Predictions
        averageCycleLength={averageCycleLength}
        nextPeriodStart={nextPeriodStart}
        pmsWindow={pmsWindow}
      />

      {/* Current month calendar */}
      <Calendar
        monthDate={new Date()}
        cycleData={[]}
        periodDates={periodDates}
        cycleDayMap={cycleDayMap}
        predictedPMS={predictedPMS}
        predictedPeriod={predictedPeriod}
        getPredictedCycleDay={getPredictedCycleDay}
      />

      {/* Next month calendar */}
      <Calendar
        monthDate={addMonths(new Date(), 1)}
        cycleData={[]}
        periodDates={periodDates}
        cycleDayMap={cycleDayMap}
        predictedPMS={predictedPMS}
        predictedPeriod={predictedPeriod}
        getPredictedCycleDay={getPredictedCycleDay}
      />

      {/* Modal for confirming period logging */}
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
