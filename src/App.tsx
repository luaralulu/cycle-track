import { useCycleData } from "./hooks/useCycleData";
import Calendar from "./components/Calendar";
import Modal from "./components/Modal";
import Predictions from "./components/Predictions";
import "./App.css";
import { addMonths } from "date-fns";

function App() {
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
  } = useCycleData();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="app">
      <h1>Cycle Tracker</h1>
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
