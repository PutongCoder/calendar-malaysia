# 🇲🇾 Malaysia Calendar 2026

A **responsive, fast-loading 2026 calendar** for Malaysia with:
- **State & national holidays** (JSON-driven)
- **Long-weekend detection** (state-aware Fri–Sat vs Sat–Sun) + **one-click Trip Planner**
- **.ics export**, **print view**, **dark/light theme**
- Optional **cheap flights** + **places/hotels** via public APIs

No frameworks, no build steps. Deploys on **GitHub Pages** for free.

---

## ✨ Features

- **Clean UI (light by default) + dark toggle**
- **State filter** for holidays (Johor/Kedah/Kelantan/Terengganu use **Fri–Sat** weekends)
- **Long Weekends panel** (auto-detects 3+ day breaks; can include *one bridge weekday*)
- **“Plan this trip”** button pre-fills the Trip Planner dates
- **Trip Planner drawer** (optional):
  - **Kiwi (Tequila) API** → cheap flight search
  - **OpenTripMap API** → destination ideas; hotel deep links (Booking/Agoda)
  - Keys are stored in **localStorage** only
- **ICS download** (all-day events)
- **Print-friendly layout** (A4 clean)

---

## 🗂 Project Structure

calendar-malaysia/
├── index.html # UI + templates + planner drawer
├── styles.css # Light/dark theme, calendar grid, planner UI
├── app.js # Calendar render, long-weekend logic, planner + APIs
└── holidays-2026.json # Your editable holiday list


---

## 🔧 Holiday Data (edit `holidays-2026.json`)

Each entry is `name`, `date` (YYYY-MM-DD), `regions` (["MY"] for national or state codes), `notes`.

```json
[
  { "name": "New Year’s Day", "date": "2026-01-01", "regions": ["MY"], "notes": "" },
  { "name": "Federal Territory Day", "date": "2026-02-01", "regions": ["KUL","LBN","PJY"], "notes": "" },
  { "name": "Malaysia Day", "date": "2026-09-16", "regions": ["MY"], "notes": "" }
]


Long-Weekend Detection (how it works)

Weekends depend on selected state:

Fri–Sat: Johor, Kedah, Kelantan, Terengganu

Sat–Sun: everyone else

A long weekend is any ≥3 days of time-off made of weekends + holidays.

We allow one bridge weekday (e.g., holiday Fri + weekend; or weekend + Mon holiday).

Make it stricter/looser

In app.js, adjust findLongWeekends():

Change if (r.length >= 3) for min length.

Set bridges < 1 to 0 if you don’t want bridge days.

✈️ Optional: Trip Planner (Flights & Places)

Get free keys:

Kiwi (Tequila): https://tequila.kiwi.com/

OpenTripMap: https://opentripmap.io/

Open the site → Open Trip Planner → API keys → paste keys.
Keys are saved locally (browser localStorage), not uploaded to any server.

APIs used:

Kiwi /locations/query + /v2/search (cheap flights)

OpenTripMap /places/geoname + /places/radius (POIs).
Hotels are simple deep links (Booking/Agoda), no key required.

No keys? Planner UI still loads and prompts the user to add keys.


🗺 Roadmap (so we can pick up later)

 Multi-language (BM / EN / 中文 / தமிழ்)

 Long-weekend variants (strict/no-bridge, 4+ day only)

 “Export long weekends to .ics”

 Search box: highlight holiday by name

 State-specific workweek coloring in the grid

 PWA (offline install)

 PDF generator (A4/Letter, light & dark)

 Optional Ad/affiliate blocks (non-intrusive)

 2027 calendar (clone repo, swap year + JSON)
