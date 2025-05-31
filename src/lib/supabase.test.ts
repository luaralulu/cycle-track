// @ts-ignore
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  supabase,
  calculateAverageCycleLength,
  getCycleData,
  getLast12CycleStarts,
  logPeriod,
  signIn,
} from "./supabase";
import type { CycleData } from "./supabase";

describe("Supabase Functions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("calculateAverageCycleLength", () => {
    it("should return null if less than 2 cycle starts are provided", () => {
      const cycleStarts = [{ date: "2023-01-01" }];
      expect(calculateAverageCycleLength(cycleStarts)).toBeNull();
    });

    it("should calculate the weighted average cycle length correctly", () => {
      const cycleStarts = [
        { date: "2023-01-01" },
        { date: "2023-01-28" },
        { date: "2023-02-25" },
      ];
      // Expected cycle lengths: 27, 28
      // Weighted average: (27 * 1 + 28 * 2) / (1 + 2) = 27.67, rounded to 28
      expect(calculateAverageCycleLength(cycleStarts)).toBe(28);
    });

    it("should filter out extreme cycle lengths (e.g., > 40 days)", () => {
      const cycleStarts = [
        { date: "2023-01-01" },
        { date: "2023-02-01" }, // 31 days
        { date: "2023-04-01" }, // 59 days (extreme)
      ];
      // Only 31 days is considered, so result is 31
      expect(calculateAverageCycleLength(cycleStarts)).toBe(31);
    });
  });

  describe("Async Functions", () => {
    it("should call signIn with correct parameters", async () => {
      const email = "test@example.com";
      const password = "password123";
      // @ts-expect-error: test mock return type
      const mockData = { user: { id: "123" }, session: null };
      const mockSignIn = vi
        .spyOn(supabase.auth, "signInWithPassword")
        .mockResolvedValue({ data: mockData, error: null });
      const result = await signIn(email, password);
      expect(mockSignIn).toHaveBeenCalledWith({ email, password });
      expect(result).toEqual(mockData);
    });

    it("should call getCycleData with correct parameters", async () => {
      const userId = "123";
      const mockData = [
        {
          id: 1,
          user_id: userId,
          date: "2023-01-01",
          cycle_day: 1,
          period: true,
        },
      ];
      const mockOrder = vi
        .fn()
        .mockResolvedValue({ data: mockData, error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      // @ts-expect-error: test mock return type
      const mockFrom = vi
        .spyOn(supabase, "from")
        .mockReturnValue({ select: mockSelect } as unknown as {
          select: typeof mockSelect;
        });
      const result = await getCycleData(userId);
      expect(mockFrom).toHaveBeenCalledWith("cycle_data");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("user_id", userId);
      expect(mockOrder).toHaveBeenCalledWith("date", { ascending: false });
      expect(result).toEqual(mockData);
    });

    it("should call logPeriod with correct parameters", async () => {
      const userId = "123";
      const today = new Date().toISOString().split("T")[0];
      const mockData = [
        { id: 1, user_id: userId, date: today, cycle_day: 1, period: true },
      ];
      const mockSelect = vi
        .fn()
        .mockResolvedValue({ data: mockData, error: null });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      // @ts-expect-error: test mock return type
      const mockFrom = vi
        .spyOn(supabase, "from")
        .mockReturnValue({ insert: mockInsert } as unknown as {
          insert: typeof mockInsert;
        });
      const result = await logPeriod(userId);
      expect(mockFrom).toHaveBeenCalledWith("cycle_data");
      expect(mockInsert).toHaveBeenCalledWith([
        { user_id: userId, date: today, cycle_day: 1, period: true },
      ]);
      expect(mockSelect).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });

    it("should call getLast12CycleStarts with correct parameters", async () => {
      const userId = "123";
      const mockData = [{ date: "2023-01-01" }, { date: "2023-02-01" }];
      const mockLimit = vi
        .fn()
        .mockResolvedValue({ data: mockData, error: null });
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      // @ts-expect-error: test mock return type
      const mockFrom = vi
        .spyOn(supabase, "from")
        .mockReturnValue({ select: mockSelect } as unknown as {
          select: typeof mockSelect;
        });
      const result = await getLast12CycleStarts(userId);
      expect(mockFrom).toHaveBeenCalledWith("cycle_data");
      expect(mockSelect).toHaveBeenCalledWith("date");
      expect(mockEq1).toHaveBeenCalledWith("user_id", userId);
      expect(mockEq2).toHaveBeenCalledWith("cycle_day", 1);
      expect(mockOrder).toHaveBeenCalledWith("date", { ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(12);
      expect(result).toEqual(mockData);
    });
  });
});
