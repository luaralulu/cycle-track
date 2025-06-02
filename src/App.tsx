import { useState, useEffect } from "react";
import { useCycleData } from "./hooks/useCycleData";
import { useMultiMonthNavigation } from "./hooks/useInfiniteMonths";
import Calendar from "./components/Calendar";
import Modal from "./components/Modal";
import Predictions from "./components/Predictions";
import Login from "./components/Login";
import { getSession, signIn, signOut, supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import "./App.css";

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

  // Initialize multi-month navigation
  const {
    months,
    isLoadingPrevious,
    canLoadMorePrevious,
    scrollContainerRef,
    loadPreviousMonth,
    getCycleDataForMonth: getMonthData,
  } = useMultiMonthNavigation(userId);

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

      {/* Container for multiple months */}
      <div
        ref={scrollContainerRef}
        className="calendar-container"
        style={{
          padding: "16px",
        }}
      >
        {/* Load Previous Month Button */}
        {canLoadMorePrevious && (
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <button
              onClick={loadPreviousMonth}
              disabled={isLoadingPrevious}
              style={{
                padding: "8px 16px",
                backgroundColor: isLoadingPrevious ? "#ccc" : "#ff8fa3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isLoadingPrevious ? "not-allowed" : "pointer",
              }}
            >
              {isLoadingPrevious ? "Loading..." : "Load Previous Month"}
            </button>
          </div>
        )}

        {/* Render all months */}
        {months.map((monthDate, index) => (
          <Calendar
            key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
            monthDate={monthDate}
            cycleData={getMonthData(monthDate)}
            periodDates={periodDates}
            cycleDayMap={cycleDayMap}
            predictedPMS={predictedPMS}
            predictedPeriod={predictedPeriod}
            getPredictedCycleDay={getPredictedCycleDay}
          />
        ))}

        {/* Info about maximum history reached */}
        {!canLoadMorePrevious && (
          <div
            style={{
              textAlign: "center",
              padding: "16px",
              color: "#999",
              fontSize: "14px",
            }}
          >
            Reached maximum history (6 months back)
          </div>
        )}
      </div>

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
