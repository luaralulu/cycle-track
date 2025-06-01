import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface CycleData {
  id: number;
  user_id: string;
  date: string; // ISO date string (yyyy-MM-dd)
  cycle_day: number;
  period: boolean;
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const getCycleData = async (userId: string): Promise<CycleData[]> => {
  const { data, error } = await supabase
    .from("cycle_data")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) throw error;
  return data as CycleData[];
};

export const logPeriod = async (userId: string): Promise<CycleData[]> => {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("cycle_data")
    .insert([
      {
        user_id: userId,
        date: today,
        cycle_day: 1,
        period: true,
      },
    ])
    .select();

  if (error) throw error;
  return data as CycleData[];
};

export const getLast12CycleStarts = async (
  userId: string
): Promise<{ date: string }[]> => {
  const { data, error } = await supabase
    .from("cycle_data")
    .select("date")
    .eq("user_id", userId)
    .eq("cycle_day", 1)
    .order("date", { ascending: false })
    .limit(12);

  if (error) throw error;
  return data as { date: string }[];
};

export const calculateAverageCycleLength = (
  cycleStarts: { date: string }[]
) => {
  if (cycleStarts.length < 2) return null;

  // Calculate cycle lengths
  const cycleLengths: number[] = [];
  for (let i = 0; i < cycleStarts.length - 1; i++) {
    const d1 = new Date(cycleStarts[i].date);
    const d2 = new Date(cycleStarts[i + 1].date);
    const length = Math.abs(
      (d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)
    );
    cycleLengths.push(length);
  }

  // Filter out extreme values (e.g., cycles longer than 40 days)
  const filteredLengths = cycleLengths.filter((length) => length <= 40);

  if (filteredLengths.length === 0) return null;

  // Calculate weighted average (more recent cycles have higher weight)
  let total = 0;
  let weightSum = 0;
  for (let i = 0; i < filteredLengths.length; i++) {
    const weight = i + 1; // Weight increases with recency
    total += filteredLengths[i] * weight;
    weightSum += weight;
  }

  return Math.round(total / weightSum);
};

export const getSession = async () => {
  return supabase.auth.getSession();
};

export const signOut = async () => {
  return supabase.auth.signOut();
};
