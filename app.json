/* ---------- Utility ---------- */
const THIS_YEAR = 2026;
const tz = "Asia/Kuala_Lumpur";

/** Format helpers */
const fmtMonth = new Intl.DateTimeFormat("en-MY", { month: "long", year: "numeric", timeZone: tz });
const fmtDayNum = new Intl.DateTimeFormat("en-MY", { day: "numeric", timeZone: tz });
const fmtIcsDate = (d) => {
  // ICS uses local or UTC; we’ll export as date-only (floating) for all-day events
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}${m}${day}`;
};

/** Parse YYYY-MM-DD safely (no timezone shift) */
function parseYMD(ymd) {
  const [y,m,d] = ymd.split("-").map(Number);
  return new Date(y, (m-1), d);
}

/* ---------- State ---------- */
let holidays = []; // loaded from JSON
let stateFilter = "MY";

/* ---------- DOM ---------- */
const elCalendar = document.getElementById("calendar");
const elMonthTpl = document.getElementById("monthTemplate");
const elDayTpl = document.getElementById("dayTemplate");
const elBadgeTpl = document.getElementById("badgeTemplate");
const elState = document.getElementById("stateSelect");
const elIcs = document.getElementById("icsBtn");
const elToday = document.getElementById("todayBtn");
const elPrint = document.getElementById("printBtn");

/* ---------- App ---------- */
init();

async function init(){
  attachEvents();

  try{
    const res = await fetch("holidays-2026.json", { cache: "no-store" });
    holidays = await res.json();
  }catch(e){
    console.warn("Failed loading holidays. Using empty list.", e);
    holidays = [];
  }

  renderYear(THIS_YEAR);
}

function attachEvents(){
  elState.addEventListener("change", e => {
    stateFilter = e.target.value;
    renderYear(THIS_YEAR);
  });

  elIcs.addEventListener("click", downloadICS);
  elPrint.addEventListener("click", () => window.print());
  elToday.addEventListener("click", () => {
    const now = new Date();
    const m = now.getMonth(); // 0-11 current month (today)
    const section = document.querySelectorAll(".month")[m];
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    section?.querySelector(".day--today")?.focus({ preventScroll: false });
  });
}

/* ---------- Rendering ---------- */
function renderYear(year){
  elCalendar.innerHTML = "";

  for(let month=0; month<12; month++){
    const first = new Date(year, month, 1);
    const monthNode = elMonthTpl.content.cloneNode(true);
    const section = monthNode.querySelector(".month");
    const h2 = monthNode.querySelector("h2");
    const gridDays = monthNode.querySelector(".grid--days");

    h2.textContent = fmtMonth.format(first);
    section.setAttribute("aria-label", fmtMonth.format(first));

    // Day-of-week offset (Sunday = 0)
    const startOffset = first.getDay();
    const lastDay = new Date(year, month+1, 0).getDate();

    // previous month days to fill grid
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    // Fill leading blanks
    for(let i=0;i<startOffset;i++){
      const d = prevMonthLastDay - startOffset + i + 1;
      gridDays.appendChild(makeDayButton(new Date(year, month-1, d), true));
    }

    // Fill current month
    for(let d=1; d<=lastDay; d++){
      gridDays.appendChild(makeDayButton(new Date(year, month, d), false));
    }

    // Trailing blanks to complete rows
    const cells = gridDays.children.length;
    const trailing = (7 - (cells % 7)) % 7;
    for(let i=1;i<=trailing;i++){
      gridDays.appendChild(makeDayButton(new Date(year, month+1, i), true));
    }

    elCalendar.appendChild(monthNode);
  }
}

function makeDayButton(dateObj, outside){
  const node = elDayTpl.content.cloneNode(true);
  const btn = node.querySelector(".day");
  const time = node.querySelector("time");
  const ul = node.querySelector(".badges");

  time.textContent = fmtDayNum.format(dateObj);
  time.setAttribute("datetime", dateObj.toISOString().slice(0,10));

  const today = (() => { const n = new Date(); return n.getFullYear()===dateObj.getFullYear() && n.getMonth()===dateObj.getMonth() && n.getDate()===dateObj.getDate(); })();
  if(today) btn.classList.add("day--today");
  if(outside) btn.classList.add("day--outside");

  // holiday lookup (filter for selected state or MY)
  const ymd = dateObj.toISOString().slice(0,10);
  const todaysHolidays = holidays.filter(h => h.date === ymd && (h.regions.includes("MY") || h.regions.includes(stateFilter)));

  if(todaysHolidays.length){
    btn.classList.add("day--holiday");
    todaysHolidays.forEach(h => {
      const badge = elBadgeTpl.content.cloneNode(true);
      badge.querySelector(".badge").textContent = h.name;
      ul.appendChild(badge);
    });
    btn.setAttribute("aria-pressed", "true");
    btn.title = todaysHolidays.map(h => h.name).join(", ");
  }

  // No click handler needed; button for keyboard focusability & a11y
  return node;
}

/* ---------- ICS Export ---------- */
function downloadICS(){
  const lines = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Malaysia Calendar 2026//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");

  const filtered = holidays.filter(h => h.regions.includes("MY") || h.regions.includes(stateFilter))
                           .filter(h => /^\d{4}-\d{2}-\d{2}$/.test(h.date)); // skip TBD

  for(const h of filtered){
    const dt = parseYMD(h.date);
    const uid = `malaysia-2026-${h.name.replace(/[^a-z0-9]+/gi,'-')}-${fmtIcsDate(dt)}@yourdomain`;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`SUMMARY:${escapeICS(h.name)}`);
    lines.push(`DTSTART;VALUE=DATE:${fmtIcsDate(dt)}`);
    // All-day events end is next day in ICS
    const dtEnd = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()+1);
    lines.push(`DTEND;VALUE=DATE:${fmtIcsDate(dtEnd)}`);
    if(h.notes) lines.push(`DESCRIPTION:${escapeICS(h.notes)}`);
    lines.push("TRANSP:TRANSPARENT");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Malaysia-Calendar-${THIS_YEAR}-${stateFilter}.ics`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
}

function escapeICS(s){
  return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
