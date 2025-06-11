# ✅ Menstrual Cycle Tracker – Implementation Checklist

## 📍 Phase 1: Base Setup and Logging

### ✅ Environment & Supabase Setup

- [x] Configure `.env` file with Supabase URL, keys, and user credentials
      **Acceptance Criteria**: `.env` is loaded; can authenticate and connect to Supabase programmatically.

- [x] Set up Supabase client and test auth with email/password
      **Acceptance Criteria**: Successfully logs in and logs success or error.

- [x] Connect to existing `cycle_data` table and fetch current data
      **Acceptance Criteria**: Can read and display existing records.

---

### 🩸 Period Logging

- [x] Create a "Log Period" button
      **Acceptance Criteria**: Button is visible and clickable on screen.

- [x] When clicked, insert today's date with `cycle_day = 1`, `period = true`, and correct `user_id`
      **Acceptance Criteria**: Entry appears in Supabase with today's date and correct values.

- [x] Recalculate predictions and update calendar view on log
      **Acceptance Criteria**: Next predicted period and PMS days update correctly after logging.

---

## 🛠 Phase 2: Cron Job and Data Continuity

### ⏱️ Daily Cron-Based Data Filler

- [x] Create script to run via GitHub Actions (or locally)
      **Acceptance Criteria**: Script runs daily and logs output.

- [x] Check if yesterday's entry is missing
      **Acceptance Criteria**: Script detects missing date.

- [x] If missing, insert:

  - `cycle_day = last + 1`
  - `period = true` if 2–5
  - `period = false` if 6+
    **Acceptance Criteria**: Entry is correctly added with valid values and `user_id`.

---

## 🔮 Phase 3: Prediction Engine

- [x] Fetch last 12 `cycle_day = 1` entries to calculate average cycle length
      **Acceptance Criteria**: Average cycle length is calculated accurately.

- [x] Predict next period based on average
      **Acceptance Criteria**: Predicted next period appears on the calendar.

- [x] Calculate PMS window (6–8 days before predicted period start)
      **Acceptance Criteria**: PMS days are correctly marked in data.

---

## 📅 Phase 4: Calendar UI

- [x] Display traditional calendar grid
      **Acceptance Criteria**: Current month is shown in grid format.

- [x] Style:

  - Period days (pink-red)
  - PMS days (dark gray with white text and small cycle day inside)
  - Neutral days (default)
    **Acceptance Criteria**: Visual styling matches specification and mockup.

- [x] Show cycle day for each date
      **Acceptance Criteria**: Cycle day is clearly displayed inside day cell.

---

## 🔐 Phase 5: Login Authentication

### 🔑 User Login Flow

- [x] Add login screen using Supabase email/password auth  
       **Acceptance Criteria**: User sees login form on app load and can submit credentials.

- [x] Prevent access to main app until logged in  
       **Acceptance Criteria**: Redirects to login if user is not authenticated; authenticated users see the full app.

- [x] Store and reuse Supabase session token  
       **Acceptance Criteria**: Logged-in state persists across refreshes (until token expires).

- [x] Add logout button to clear session  
       **Acceptance Criteria**: Clicking "Logout" returns user to login screen and clears session.

- [x] Hide "Log Period" and calendar UI when logged out  
       **Acceptance Criteria**: All data-related features are fully inaccessible until logged in.

---

## 🆕 Phase 6: Multi-Month Navigation

- [x] Render **current month + next month** on login  
       **Acceptance Criteria**: Two stacked month grids are visible immediately after successful login.

- [x] Add **"Load Previous Month" button** at the top of the calendar container  
       **Acceptance Criteria**: Button is visible and clickable; button shows loading state when fetching data.

- [x] **Fetch previous month** from Supabase and prepend when button is clicked (limit = 6 months back)  
       **Acceptance Criteria**: Clicking button prepends exactly one month's grid with correct historical data; button becomes disabled once six past months have loaded.

- [x] Add **"Load Next Month" button** at the bottom of the calendar container  
       **Acceptance Criteria**: Button is visible and clickable; generates prediction data for future months.

- [x] **Generate next month** via prediction engine and append when button is clicked (limit = 3 months ahead)  
       **Acceptance Criteria**: Clicking button appends one month's grid using prediction data; button becomes disabled after three future months are displayed.

- [x] Add **fade/slide-in animation** for month entry  
       **Acceptance Criteria**: New month grids appear with a smooth transition; no jarring jump is observed.

---

## 🆕 Phase 7: Ovulation Day Prediction

- [x] Extend prediction engine to calculate **future ovulation day** (14 days before predicted period start)  
       **Acceptance Criteria**: Function returns correct ovulation dates and calendar shows dotted-circle marker for all predicted months (max 3 months ahead).

- [x] Infer **past ovulation day** for each completed cycle (14 days before logged `cycle_day = 1`) when fetching historical data  
       **Acceptance Criteria**: Upon past months display the ovulation marker on the correct date for every cycle retrieved (up to 6 months back).

- [x] Render ovulation marker as **dark-grey dotted outline, no fill** inside the day cell  
       **Acceptance Criteria**: Visual style matches spec; marker does not obscure period or PMS colours.

- [x] Ensure ovulation markers integrate with **button fetch logic**  
       **Acceptance Criteria**: Markers appear immediately after a month grid is prepended/appended without additional refresh.

Here is the new section to add to your `TODO.md`, starting at **Phase 8**, in the same style:

---

## 🆕 Phase 8: Google Calendar Integration

### 📆 Sync Predictions to Google Calendar

- [x] Set up `.env` with `GOOGLE_CYCLE_CALENDAR_ID`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`
      **Acceptance Criteria**: All credentials are present and loaded without error.

- [x] Add Google OAuth flow and store tokens in `google_auth_tokens` table
      **Acceptance Criteria**: User completes OAuth flow and their tokens are stored in Supabase as per schema.

- [x] On period log: detect next predicted PMS window and period
      **Acceptance Criteria**: After logging a new period, both predictions are calculated and available in memory.

- [x] Create PMS window event (3 days before predicted period)
      **Acceptance Criteria**: Google Calendar shows 3-day all-day event titled `🧘‍♀️ 8 days before bleeding` ending the day before bleeding.

- [x] Create Period event (5-day starting on predicted period)
      **Acceptance Criteria**: Google Calendar shows 5-day all-day event titled `🩸 Bleeding` starting on predicted period day.

- [x] Use user's local timezone for event times
      **Acceptance Criteria**: Events appear as all-day in local time, not UTC.

- [x] Do not update or delete previously created calendar events
      **Acceptance Criteria**: Re-logging a period does not modify existing events.
