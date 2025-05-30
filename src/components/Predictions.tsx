import React from "react";

interface PredictionsProps {
  averageCycleLength: number | null;
  nextPeriodStart: Date | null;
  pmsWindow: { start: Date; end: Date } | null;
}

const Predictions: React.FC<PredictionsProps> = ({
  averageCycleLength,
  nextPeriodStart,
  pmsWindow,
}) => (
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
);

export default Predictions;
