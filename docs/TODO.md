Here's your TODO checklist in **Markdown** format, structured in phases from easiest to hardest, with **acceptance criteria** for each item.

---

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

- [ ] Recalculate predictions and update calendar view on log
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

- [ ] Display traditional calendar grid
      **Acceptance Criteria**: Current month is shown in grid format.

- [ ] Style:

  - Period days (pink-red)
  - PMS days (dark gray with white text and small cycle day inside)
  - Neutral days (default)
    **Acceptance Criteria**: Visual styling matches specification and mockup.

- [ ] Show cycle day for each date
      **Acceptance Criteria**: Cycle day is clearly displayed inside day cell.

- [ ] Animate month transitions and data updates
      **Acceptance Criteria**: Navigating between months feels smooth.

- [ ] Click a day to manually edit `period` or `cycle_day`
      **Acceptance Criteria**: Click opens a modal or inline editor; changes are saved to Supabase.

---

Let me know if you'd like this turned into a GitHub issue list or need help building the cron script or UI components next.
