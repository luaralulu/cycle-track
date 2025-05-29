import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { format, parseISO, addDays, differenceInDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

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
const TIMEZONE = "Australia/Sydney"; // AEST timezone

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

async function checkEntryExists(userId, date) {
  try {
    const { data, error } = await supabase
      .from("cycle_data")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date);

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Failed to check entry");
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

function getAESTDate() {
  const now = new Date();
  return new Date(formatInTimeZone(now, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX"));
}

function formatDate(date) {
  return format(date, "yyyy-MM-dd");
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

    // Get current date in AEST
    const currentDate = getAESTDate();
    // Calculate yesterday in AEST
    const yesterdayAEST = addDays(currentDate, -1);

    const lastEntryDate = parseISO(lastEntry.date);
    // Only fill up to yesterday
    const daysDifference = differenceInDays(yesterdayAEST, lastEntryDate);

    if (daysDifference <= 0) {
      console.log("No missing days to fill");
      return;
    }

    console.log(`Found ${daysDifference} missing days to fill`);

    // Fill missing days
    let currentCycleDay = lastEntry.cycle_day;
    let currentDateToFill = addDays(lastEntryDate, 1);

    for (let i = 0; i < daysDifference; i++) {
      const dateStr = formatDate(currentDateToFill);

      // Check if entry already exists
      const existingEntry = await checkEntryExists(user.id, dateStr);
      if (existingEntry) {
        console.log(`Entry for ${dateStr} already exists, skipping`);
        currentDateToFill = addDays(currentDateToFill, 1);
        continue;
      }

      // Calculate new cycle day
      currentCycleDay = currentCycleDay + 1;
      if (currentCycleDay > MAX_CYCLE_DAY) {
        currentCycleDay = MIN_CYCLE_DAY;
      }

      const isPeriod =
        currentCycleDay >= PERIOD_START_DAY &&
        currentCycleDay <= PERIOD_END_DAY;

      // Insert new entry
      const newEntry = await insertEntry(
        user.id,
        dateStr,
        currentCycleDay,
        isPeriod
      );

      console.log("Inserted new entry:", {
        date: newEntry.date,
        cycle_day: newEntry.cycle_day,
      });

      currentDateToFill = addDays(currentDateToFill, 1);
    }

    console.log("Daily data filler completed successfully");
  } catch (error) {
    console.error("Script execution failed");
    process.exit(1);
  }
}

main();
