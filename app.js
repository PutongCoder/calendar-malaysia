/* ---------------- Core calendar ---------------- */
const THIS_YEAR = 2026;
const tz = "Asia/Kuala_Lumpur";

const fmtMonth = new Intl.DateTimeFormat("en-MY", { month: "long", year: "numeric", timeZone: tz });
const fmtDayNum = new Intl.DateTimeFormat("en-MY", { day: "numeric", timeZone: tz });
const fmtCurrency = (v, c="MYR") => new Intl.NumberFormat("en-MY", { style: "currency", currency: c }).format(v);

function parseYMD(ymd){ const [y,m,d] = ymd.split("-").map(Number); return new Date(y, m-1, d); }
const fmtIcsDate = (d) => [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("");

let holidays = [];
let stateFilter = "MY";

/* DOM */
const elCalendar = document.getElementById("calendar");
const elMonthTpl = document.getElementById("monthTemplate");
const elDayTpl = document.getElementById("dayTemplate");
const elBadgeTpl = document.getElementById("badgeTemplate");

const elState = document.getElementById("stateSelect");
const elIcs = document.getElementById("icsBtn");
const elToday = document.getElementById("todayBtn");
const elPrint = document.getElementById("printBtn");
const elTheme = document.getElementById("themeToggle");

/* Planner DOM */
const drawer = document.getElementById("planner");
const openPlannerBtn = document.getElementById("plannerBtn");
const closePlannerBtn = document.getElementById("plannerClose");
const form = document.getElementById("plannerForm");
const flightList = document.getElementById("flightList");
const placeList = document.getElementById("placeList");

/* Init */
init();
async function init(){
  restoreTheme();
  attachEvents();
  try{
    const res = await fetch("holidays-2026.json", { cache: "no-store" });
    holidays = await res.json();
  }catch(e){ console.warn("Failed to load holidays", e); holidays = []; }
  renderYear(THIS_YEAR);
}

/* Events */
function attachEvents(){
  elState.addEventListener("change", e => { stateFilter = e.target.value; renderYear(THIS_YEAR); });
  elIcs.addEventListener("click", downloadICS);
  elPrint.addEventListener("click", () => window.print());
  elToday.addEventListener("click", () => {
    const now = new Date();
    const m = now.getMonth();
    const section = document.querySelectorAll(".month")[m];
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    section?.querySelector(".day--today")?.focus({ preventScroll: false });
  });

  elTheme.addEventListener("click", toggleTheme);

  // Planner open/close
  openPlannerBtn.addEventListener("click", () => drawer.setAttribute("aria-hidden","false"));
  closePlannerBtn.addEventListener("click", () => drawer.setAttribute("aria-hidden","true"));

  // Planner submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    persistKeys();
    clearResults();
    const q = readForm();
    await runPlanner(q);
  });
}

/* Rendering calendar */
function renderYear(year){
  elCalendar.innerHTML = "";
  for(let month=0; month<12; month++){
    const first = new Date(year, month, 1);
    const monthNode = elMonthTpl.content.cloneNode(true);
    const section = monthNode.querySelector(".month");
    const h2 = monthNode.querySelector("h2");
    const gridDays = monthNode.querySelector(".grid-days");

    h2.textContent = fmtMonth.format(first);
    section.setAttribute("aria-label", fmtMonth.format(first));

    const startOffset = first.getDay();
    const lastDay = new Date(year, month+1, 0).getDate();
    const prevMonthLast = new Date(year, month, 0).getDate();

    for(let i=0;i<startOffset;i++){
      const d = prevMonthLast - startOffset + i + 1;
      gridDays.appendChild(makeDay(new Date(year, month-1, d), true));
    }
    for(let d=1; d<=lastDay; d++){
      gridDays.appendChild(makeDay(new Date(year, month, d), false));
    }
    const cells = gridDays.children.length;
    const trailing = (7 - (cells % 7)) % 7;
    for(let i=1;i<=trailing;i++){
      gridDays.appendChild(makeDay(new Date(year, month+1, i), true));
    }
    elCalendar.appendChild(monthNode);
  }
}

function makeDay(dateObj, outside){
  const node = elDayTpl.content.cloneNode(true);
  const btn = node.querySelector(".day");
  const time = node.querySelector("time");
  const ul = node.querySelector(".badges");

  time.textContent = fmtDayNum.format(dateObj);
  time.setAttribute("datetime", dateObj.toISOString().slice(0,10));

  const n = new Date();
  if(n.getFullYear()===dateObj.getFullYear() && n.getMonth()===dateObj.getMonth() && n.getDate()===dateObj.getDate()){
    btn.classList.add("day--today");
  }
  if(outside) btn.classList.add("day--outside");

  const ymd = dateObj.toISOString().slice(0,10);
  const todays = holidays.filter(h => h.date === ymd && (h.regions.includes("MY") || h.regions.includes(stateFilter)));
  if(todays.length){
    btn.classList.add("day--holiday");
    todays.forEach(h => {
      const badge = elBadgeTpl.content.cloneNode(true);
      badge.querySelector(".badge").textContent = h.name;
      ul.appendChild(badge);
    });
    btn.setAttribute("aria-pressed", "true");
    btn.title = todays.map(h => h.name).join(", ");
  }

  // Click a day to prefill planner dates
  btn.addEventListener("click", () => {
    const d = dateObj.toISOString().slice(0,10);
    document.getElementById("depart").value = d;
    document.getElementById("return").value = "";
    drawer.setAttribute("aria-hidden","false");
  });

  return node;
}

/* ICS export */
function downloadICS(){
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Malaysia Calendar 2026//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  const filtered = holidays.filter(h => h.regions.includes("MY") || h.regions.includes(stateFilter))
                           .filter(h => /^\d{4}-\d{2}-\d{2}$/.test(h.date));
  for(const h of filtered){
    const dt = parseYMD(h.date);
    const uid = `malaysia-2026-${h.name.replace(/[^a-z0-9]+/gi,'-')}-${fmtIcsDate(dt)}@calendar`;
    const dtEnd = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()+1);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`SUMMARY:${escapeICS(h.name)}`);
    lines.push(`DTSTART;VALUE=DATE:${fmtIcsDate(dt)}`);
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
  document.body.appendChild(a); a.click(); URL.revokeObjectURL(a.href); a.remove();
}
function escapeICS(s){ return String(s).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n"); }

/* ---------------- Theme ---------------- */
function restoreTheme(){
  const v = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", v);
  document.getElementById("themeToggle").textContent = (v==="dark" ? "🌞" : "🌙");
}
function toggleTheme(){
  const curr = document.documentElement.getAttribute("data-theme")==="dark" ? "dark" : "light";
  const next = curr==="dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  document.getElementById("themeToggle").textContent = (next==="dark" ? "🌞" : "🌙");
}

/* ---------------- Trip Planner ---------------- */
/*
  APIs used (all free-tier, require keys you can get in minutes):
  - Flights: Kiwi.com Tequila API (https://tequila.kiwi.com/)
      * GET /locations/query  (resolve city/airport -> IATA code)
      * GET /v2/search        (cheapest flights)
  - Places/Hotels ideas: OpenTripMap (https://opentripmap.io/)
      * We'll use /places/geoname + /places/radius to suggest top places,
        and generate hotel booking links (no API) with dates.
*/

function persistKeys(){
  const kiwi = document.getElementById("kiwiKey").value.trim();
  const otm  = document.getElementById("otmKey").value.trim();
  if(kiwi) localStorage.setItem("tequila_key", kiwi);
  if(otm)  localStorage.setItem("otm_key", otm);
}
function readForm(){
  return {
    origin: document.getElementById("origin").value.trim(),
    destination: document.getElementById("destination").value.trim(),
    depart: document.getElementById("depart").value,
    ret: document.getElementById("return").value,
    currency: document.getElementById("currency").value,
    adults: Math.max(1, parseInt(document.getElementById("adults").value||"1",10)),
    tequilaKey: localStorage.getItem("tequila_key") || document.getElementById("kiwiKey").value.trim(),
    otmKey: localStorage.getItem("otm_key") || document.getElementById("otmKey").value.trim(),
  };
}
function clearResults(){ flightList.innerHTML = ""; placeList.innerHTML = ""; }

async function runPlanner(q){
  // Resolve IATA codes
  const [fromCode, toCode] = await Promise.all([
    resolveIata(q.origin, q.tequilaKey),
    q.destination ? resolveIata(q.destination, q.tequilaKey) : Promise.resolve(null)
  ]);

  // Flights
  if(q.tequilaKey && fromCode){
    const flights = await searchFlights({ from: fromCode, to: toCode, depart: q.depart, ret: q.ret, currency: q.currency, adults: q.adults, key: q.tequilaKey });
    renderFlights(flights, q.currency);
  }else{
    flightList.innerHTML = `<li class="card"><div class="meta">Add a Kiwi Tequila API key to see cheap flights.</div></li>`;
  }

  // Places + hotel links (uses OTM to suggest, then links to Booking/Agoda)
  const destName = q.destination || "popular city";
  if(q.otmKey && (toCode || q.destination)){
    const city = q.destination || "Kuala Lumpur";
    const places = await suggestPlaces(city, q.otmKey);
    renderPlaces(places, q.depart, q.ret);
  }else{
    placeList.innerHTML = `<li class="card"><div class="meta">Add an OpenTripMap API key to get destination ideas and hotel links.</div></li>`;
  }
}

/* --- Kiwi helpers --- */
async function resolveIata(query, key){
  if(!key || !query) return null;
  const url = new URL("https://api.tequila.kiwi.com/locations/query");
  url.searchParams.set("term", query);
  url.searchParams.set("locale", "en-US");
  url.searchParams.set("location_types","airport,city");
  const res = await fetch(url, { headers: { apikey: key }});
  if(!res.ok) return null;
  const data = await res.json();
  return data?.locations?.[0]?.code || null;
}

async function searchFlights({ from, to, depart, ret, currency, adults, key }){
  const url = new URL("https://api.tequila.kiwi.com/v2/search");
  url.searchParams.set("fly_from", from);
  url.searchParams.set("curr", currency || "MYR");
  url.searchParams.set("adults", String(adults||1));
  url.searchParams.set("sort","price");
  url.searchParams.set("limit","10");
  if(to) url.searchParams.set("fly_to", to);
  if(depart) url.searchParams.set("date_from", toDMY(depart)), url.searchParams.set("date_to", toDMY(depart));
  if(ret) url.searchParams.set("return_from", toDMY(ret)), url.searchParams.set("return_to", toDMY(ret));

  const res = await fetch(url, { headers: { apikey: key }});
  if(!res.ok){ 
    const txt = await res.text().catch(()=>res.statusText);
    flightList.innerHTML = `<li class="card"><div class="meta">Flight search error: ${res.status} ${txt}</div></li>`;
    return [];
  }
  const data = await res.json();
  return data?.data || [];
}
function toDMY(ymd){ const [y,m,d] = ymd.split("-"); return `${d}/${m}/${y}`; }

function renderFlights(items, currency){
  if(!items.length){ flightList.innerHTML = `<li class="card"><div class="meta">No flights found for those dates.</div></li>`; return; }
  const frag = document.createDocumentFragment();
  items.forEach(it => {
    const price = fmtCurrency(it.price, currency);
    const route = it.route?.[0];
    const title = `${route?.cityFrom || it.cityFrom} → ${route?.cityTo || it.cityTo}`;
    const departTS = route?.utc_departure || it.utc_departure;
    const airline = route?.airline || (it.route?.[0]?.airline ?? "");
    const deepLink = it.deep_link || `https://www.kiwi.com/en/search/results/${it.cityFrom}/${it.cityTo}/${(it.local_departure||"").slice(0,10)}`;

    const li = document.createElement("li");
    li.className = "card";
    li.innerHTML = `
      <h5>${title}</h5>
      <div class="meta">${airline || "Multiple airlines"} • ${it.nightsInDest ? `${it.nightsInDest} nights` : "Trip"}</div>
      <div class="meta">${new Date(departTS).toLocaleString()}</div>
      <div class="cta"><a class="btn-link" href="${deepLink}" target="_blank" rel="noopener">View deal (${price})</a></div>
    `;
    frag.appendChild(li);
  });
  flightList.innerHTML = ""; flightList.appendChild(frag);
}

/* --- OpenTripMap helpers --- */
async function suggestPlaces(city, key){
  // 1) Resolve city to lat/lon
  const geonameUrl = new URL("https://api.opentripmap.com/0.1/en/places/geoname");
  geonameUrl.searchParams.set("name", city);
  geonameUrl.searchParams.set("apikey", key);
  const g = await fetch(geonameUrl);
  if(!g.ok) return [];
  const geo = await g.json();
  if(!geo?.lat) return [];

  // 2) Fetch notable places around city center
  const radiusUrl = new URL("https://api.opentripmap.com/0.1/en/places/radius");
  radiusUrl.searchParams.set("radius","20000"); // 20km
  radiusUrl.searchParams.set("lon", geo.lon);
  radiusUrl.searchParams.set("lat", geo.lat);
  radiusUrl.searchParams.set("rate","3");
  radiusUrl.searchParams.set("limit","10");
  radiusUrl.searchParams.set("apikey", key);

  const r = await fetch(radiusUrl);
  if(!r.ok) return [];
  const data = await r.json();
  return data?.features || [];
}

function renderPlaces(features, checkIn, checkOut){
  if(!features.length){
    placeList.innerHTML = `<li class="card"><div class="meta">No place ideas found.</div></li>`;
    return;
  }
  const frag = document.createDocumentFragment();
  features.forEach(f => {
    const name = f.properties?.name || "Attraction";
    const kinds = f.properties?.kinds?.split(",").slice(0,3).join(" • ") || "";
    const city = name; // fallback for hotel query
    // Build simple hotel links (no API, just deep links)
    const ci = checkIn || new Date().toISOString().slice(0,10);
    const co = checkOut || new Date(Date.now()+2*86400000).toISOString().slice(0,10);
    const booking = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${ci}&checkout=${co}`;
    const agoda   = `https://www.agoda.com/search?city=${encodeURIComponent(city)}&checkIn=${ci}&checkOut=${co}`;

    const li = document.createElement("li");
    li.className = "card";
    li.innerHTML = `
      <h5>${name}</h5>
      <div class="meta">${kinds}</div>
      <div class="cta">
        <a class="btn-link" href="${booking}" target="_blank" rel="noopener">Hotels (Booking)</a>
        <a class="btn-link" href="${agoda}" target="_blank" rel="noopener">Hotels (Agoda)</a>
      </div>
    `;
    frag.appendChild(li);
  });
  placeList.innerHTML = ""; placeList.appendChild(frag);
}
