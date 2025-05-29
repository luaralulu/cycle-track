import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const getCycleData = async (userId: string) => {
  const { data, error } = await supabase
    .from("cycle_data")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) throw error;
  return data;
};

export const logPeriod = async (userId: string) => {
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
  return data;
};
