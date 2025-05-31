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

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Always call the hook to follow the Rules of Hooks
  const cycleDataState = useCycleData();

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
      <div className="app-header">
        <h1>Cycle Tracker</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
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
