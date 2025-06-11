import { supabase } from "./supabase";
import { format, addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

const GOOGLE_CALENDAR_ID = import.meta.env.VITE_GOOGLE_CYCLE_CALENDAR_ID;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

export interface GoogleAuthTokens {
  user_id: string;
  refresh_token: string;
  access_token?: string;
  token_pickle: Uint8Array;
}

/**
 * Get stored Google auth tokens for a user
 */
export async function getGoogleAuthTokens(
  userId: string
): Promise<GoogleAuthTokens | null> {
  const { data, error } = await supabase
    .from("google_auth_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as GoogleAuthTokens;
}

/**
 * Store Google auth tokens for a user
 */
export async function storeGoogleAuthTokens(
  userId: string,
  refreshToken: string,
  accessToken: string
): Promise<void> {
  const tokenData = {
    refresh_token: refreshToken,
    access_token: accessToken,
  };
  const tokenPickle = new TextEncoder().encode(JSON.stringify(tokenData));

  const { error } = await supabase.from("google_auth_tokens").upsert({
    user_id: userId,
    refresh_token: refreshToken,
    token_pickle: tokenPickle,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to store Google auth tokens: ${error.message}`);
  }
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh access token");
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Get valid access token for API calls
 */
async function getValidAccessToken(userId: string): Promise<string> {
  const tokens = await getGoogleAuthTokens(userId);
  if (!tokens) {
    throw new Error("No Google auth tokens found for user");
  }

  try {
    // Try to refresh the access token
    return await refreshAccessToken(tokens.refresh_token);
  } catch (error) {
    throw new Error("Failed to get valid access token");
  }
}

/**
 * Create PMS window event in Google Calendar
 * 3-day event ending the day before predicted period start
 */
export async function createPMSEvent(
  userId: string,
  pmsStartDate: Date,
  pmsEndDate: Date,
  userTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): Promise<void> {
  try {
    const accessToken = await getValidAccessToken(userId);

    // Format dates for all-day events in user's timezone
    const startDateStr = formatInTimeZone(
      pmsStartDate,
      userTimezone,
      "yyyy-MM-dd"
    );
    const endDateStr = formatInTimeZone(
      addDays(pmsEndDate, 1),
      userTimezone,
      "yyyy-MM-dd"
    ); // All-day events need end date + 1

    const event = {
      summary: "🧘‍♀️ 8 days before bleeding",
      start: {
        date: startDateStr,
        timeZone: userTimezone,
      },
      end: {
        date: endDateStr,
        timeZone: userTimezone,
      },
      description: "PMS window - prepare for upcoming period",
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        GOOGLE_CALENDAR_ID
      )}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create PMS event: ${response.statusText}`);
    }

    console.log(
      `Created PMS event from ${startDateStr} to ${format(
        pmsEndDate,
        "yyyy-MM-dd"
      )}`
    );
  } catch (error) {
    console.error("Failed to create PMS event:", error);
    throw error;
  }
}

/**
 * Create Period event in Google Calendar
 * 5-day event starting on predicted period start
 */
export async function createPeriodEvent(
  userId: string,
  periodStartDate: Date,
  userTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): Promise<void> {
  try {
    const accessToken = await getValidAccessToken(userId);

    // 5-day period event
    const periodEndDate = addDays(periodStartDate, 4); // 5 days total (start day + 4 more)

    const startDateStr = formatInTimeZone(
      periodStartDate,
      userTimezone,
      "yyyy-MM-dd"
    );
    const endDateStr = formatInTimeZone(
      addDays(periodEndDate, 1),
      userTimezone,
      "yyyy-MM-dd"
    ); // All-day events need end date + 1

    const event = {
      summary: "🩸 Bleeding",
      start: {
        date: startDateStr,
        timeZone: userTimezone,
      },
      end: {
        date: endDateStr,
        timeZone: userTimezone,
      },
      description: "Menstrual period - bleeding phase",
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        GOOGLE_CALENDAR_ID
      )}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create Period event: ${response.statusText}`);
    }

    console.log(
      `Created Period event from ${startDateStr} to ${format(
        periodEndDate,
        "yyyy-MM-dd"
      )}`
    );
  } catch (error) {
    console.error("Failed to create Period event:", error);
    throw error;
  }
}

/**
 * Create both PMS and Period events after period logging
 */
export async function createCycleEvents(
  userId: string,
  nextPeriodStart: Date,
  userTimezone?: string
): Promise<void> {
  const timezone =
    userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    // Calculate PMS window: 3 days ending the day before period start
    const pmsEndDate = addDays(nextPeriodStart, -1); // Day before period
    const pmsStartDate = addDays(pmsEndDate, -2); // 3 days total

    // Create both events
    await Promise.all([
      createPMSEvent(userId, pmsStartDate, pmsEndDate, timezone),
      createPeriodEvent(userId, nextPeriodStart, timezone),
    ]);

    console.log("Successfully created cycle events for user:", userId);
  } catch (error) {
    console.error("Failed to create cycle events:", error);
    throw error;
  }
}

/**
 * Initialize Google OAuth flow
 */
export function getOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/oauth/callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Handle OAuth callback
 */
export async function handleOAuthCallback(
  userId: string,
  code: string
): Promise<void> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: `${window.location.origin}/oauth/callback`,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange authorization code for tokens");
  }

  const tokens = await response.json();

  if (tokens.refresh_token && tokens.access_token) {
    await storeGoogleAuthTokens(
      userId,
      tokens.refresh_token,
      tokens.access_token
    );
  } else {
    throw new Error("No refresh token received from Google");
  }
}
