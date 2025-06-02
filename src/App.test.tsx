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
  getSession: vi.fn(),
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
  },
  signOut: vi.fn(),
}));

describe("App Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock for getSession to return no session
    vi.mocked(supabase.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    // Also mock the supabase.auth.getSession which is used in the useEffect
    vi.mocked(supabase.supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  it("renders loading state initially", () => {
    render(<App />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders error state if signIn fails", async () => {
    vi.mocked(supabase.signIn).mockRejectedValue(new Error("Sign in failed"));
    render(<App />);

    // Wait for the login form to appear (after loading finishes)
    await waitFor(() => {
      expect(screen.getByText("My Cycle")).toBeInTheDocument();
    });

    // Fill in the form and submit to trigger the error
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /login/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Sign in failed")).toBeInTheDocument();
    });
  });

  it("renders cycle data and predictions after successful initialization", async () => {
    const mockUser = { id: "123" } as User;
    const mockSession = { user: mockUser } as Session;
    const mockCycleData: CycleData[] = [
      { id: 1, user_id: "123", date: "2023-01-01", cycle_day: 1, period: true },
    ];
    const mockCycleStarts = [{ date: "2023-01-01" }, { date: "2023-02-01" }];
    const mockAvgCycleLength = 28;

    // Mock getSession to return a session
    vi.mocked(supabase.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    vi.mocked(supabase.signIn).mockResolvedValue({
      user: mockUser,
      session: mockSession,
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
    const mockSession = { user: mockUser } as Session;
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

    // Mock getSession to return a session
    vi.mocked(supabase.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    vi.mocked(supabase.signIn).mockResolvedValue({
      user: mockUser,
      session: mockSession,
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
