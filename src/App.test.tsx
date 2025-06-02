import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";
import * as supabase from "./lib/supabase";
import type { CycleData } from "./lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

// Mock the supabase functions
vi.mock("./lib/supabase", () => ({
  signIn: vi.fn(),
  getCycleData: vi.fn(),
  logPeriod: vi.fn(),
  getLast12CycleStarts: vi.fn(),
  calculateAverageCycleLength: vi.fn(),
}));

describe("App Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    render(<App />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders error state if signIn fails", async () => {
    vi.mocked(supabase.signIn).mockRejectedValue(new Error("Sign in failed"));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Error: Sign in failed")).toBeInTheDocument();
    });
  });

  it("renders cycle data and predictions after successful initialization", async () => {
    const mockUser = { id: "123" } as User;
    const mockCycleData: CycleData[] = [
      { id: 1, user_id: "123", date: "2023-01-01", cycle_day: 1, period: true },
    ];
    const mockCycleStarts = [{ date: "2023-01-01" }, { date: "2023-02-01" }];
    const mockAvgCycleLength = 28;

    vi.mocked(supabase.signIn).mockResolvedValue({
      user: mockUser,
      session: {} as Session,
    });
    vi.mocked(supabase.getCycleData).mockResolvedValue(mockCycleData);
    vi.mocked(supabase.getLast12CycleStarts).mockResolvedValue(mockCycleStarts);
    vi.mocked(supabase.calculateAverageCycleLength).mockReturnValue(
      mockAvgCycleLength
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("My Cycle")).toBeInTheDocument();
      expect(
        screen.getByText("Average Cycle Length: 28 days")
      ).toBeInTheDocument();
    });
  });

  it("logs period when Log Period button is clicked", async () => {
    const mockUser = { id: "123" } as User;
    const mockCycleData: CycleData[] = [
      {
        id: 1,
        user_id: "123",
        date: "2023-01-21",
        cycle_day: 20,
        period: false,
      },
      { id: 2, user_id: "123", date: "2023-01-01", cycle_day: 1, period: true },
    ];
    const mockCycleStarts = [{ date: "2023-01-01" }, { date: "2023-02-01" }];
    const mockAvgCycleLength = 28;
    const mockNewEntry: CycleData[] = [
      { id: 3, user_id: "123", date: "2023-03-01", cycle_day: 1, period: true },
    ];

    vi.mocked(supabase.signIn).mockResolvedValue({
      user: mockUser,
      session: {} as Session,
    });
    vi.mocked(supabase.getCycleData).mockResolvedValue(mockCycleData);
    vi.mocked(supabase.getLast12CycleStarts).mockResolvedValue(mockCycleStarts);
    vi.mocked(supabase.calculateAverageCycleLength).mockReturnValue(
      mockAvgCycleLength
    );
    vi.mocked(supabase.logPeriod).mockResolvedValue(mockNewEntry);

    render(<App />);

    // Use a flexible matcher for the button
    let logPeriodButton;
    try {
      logPeriodButton = await screen.findByText((content) =>
        content.replace(/\s+/g, " ").trim().includes("Log Period")
      );
    } catch (e) {
      // Print the DOM for debugging
      // eslint-disable-next-line no-console
      console.log(screen.debug());
      throw e;
    }
    expect(logPeriodButton).toBeInTheDocument();
    fireEvent.click(logPeriodButton);

    // Wait for the modal to appear
    const confirmButton = await screen.findByText("Yes, log period");
    expect(confirmButton).toBeInTheDocument();
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(supabase.logPeriod).toHaveBeenCalledWith("123");
    });
  });
});
