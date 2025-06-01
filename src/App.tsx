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

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Always call the hook to follow the Rules of Hooks
  const userId = session?.user?.id ?? null;
  const cycleDataState = useCycleData(userId);

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

  const handleLogout = async () => {
    await signOut();
    setSession(null);
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }
  if (!session) {
    return (
      <Login onLogin={handleLogin} loading={authLoading} error={authError} />
    );
  }

  // Only use cycleDataState when logged in
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="app">
      <AppHeader onLogout={handleLogout} />
      {shouldShowLogButton && (
        <button onClick={() => setShowConfirmModal(true)} disabled={isLoading}>
          Log Period
        </button>
      )}

      <Predictions
        averageCycleLength={averageCycleLength}
        nextPeriodStart={nextPeriodStart}
        pmsWindow={pmsWindow}
      />

      <Calendar
        monthDate={new Date()}
        cycleData={[]}
        periodDates={periodDates}
        cycleDayMap={cycleDayMap}
        predictedPMS={predictedPMS}
        predictedPeriod={predictedPeriod}
        getPredictedCycleDay={getPredictedCycleDay}
      />
      <Calendar
        monthDate={addMonths(new Date(), 1)}
        cycleData={[]}
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
