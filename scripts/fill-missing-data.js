import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Validate required environment variables
const requiredEnvVars = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_USER_EMAIL: process.env.SUPABASE_USER_EMAIL,
  SUPABASE_USER_PASSWORD: process.env.SUPABASE_USER_PASSWORD,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error("Missing required environment variables");
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(
  requiredEnvVars.SUPABASE_URL,
  requiredEnvVars.SUPABASE_ANON_KEY
);

// Constants for cycle calculations
const MIN_CYCLE_DAY = 1;
const MAX_CYCLE_DAY = 35; // Reasonable maximum cycle length
const PERIOD_START_DAY = 2;
const PERIOD_END_DAY = 5;

async function signIn() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: requiredEnvVars.SUPABASE_USER_EMAIL,
      password: requiredEnvVars.SUPABASE_USER_PASSWORD,
    });

    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error("Authentication failed");
    throw error;
  }
}

async function getLastEntry(userId) {
  try {
    const { data, error } = await supabase
      .from("cycle_data")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(1);

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Failed to fetch last entry");
    throw error;
  }
}

async function checkYesterdayEntry(userId) {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("cycle_data")
      .select("*")
      .eq("user_id", userId)
      .eq("date", yesterdayStr);

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Failed to check yesterday's entry");
    throw error;
  }
}

async function insertEntry(userId, date, cycleDay, period) {
  try {
    // Validate cycle day
    if (cycleDay < MIN_CYCLE_DAY || cycleDay > MAX_CYCLE_DAY) {
      throw new Error("Invalid cycle day");
    }

    const { data, error } = await supabase
      .from("cycle_data")
      .insert([
        {
          user_id: userId,
          date,
          cycle_day: cycleDay,
          period,
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Failed to insert entry");
    throw error;
  }
}

async function main() {
  try {
    console.log("Starting daily data filler...");

    // Sign in
    const user = await signIn();
    console.log("Signed in successfully");

    // Get last entry
    const lastEntry = await getLastEntry(user.id);
    if (!lastEntry) {
      console.log("No previous entries found");
      return;
    }
    console.log("Last entry:", {
      date: lastEntry.date,
      cycle_day: lastEntry.cycle_day,
    });

    // Check if yesterday's entry exists
    const yesterdayEntry = await checkYesterdayEntry(user.id);
    if (yesterdayEntry) {
      console.log("Yesterday's entry already exists");
      return;
    }

    // Calculate new entry
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const newCycleDay = lastEntry.cycle_day + 1;
    const isPeriod =
      newCycleDay >= PERIOD_START_DAY && newCycleDay <= PERIOD_END_DAY;

    // Insert new entry
    const newEntry = await insertEntry(
      user.id,
      yesterdayStr,
      newCycleDay,
      isPeriod
    );

    console.log("Inserted new entry:", {
      date: newEntry.date,
      cycle_day: newEntry.cycle_day,
    });
    console.log("Daily data filler completed successfully");
  } catch (error) {
    console.error("Script execution failed");
    process.exit(1);
  }
}

main();
