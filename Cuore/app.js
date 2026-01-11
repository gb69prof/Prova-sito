/* Foggia — Feste cittadine e di quartiere
   - Leaflet map + Nominatim geocoding (client-side)
   - Filter + search + card/marker sync
*/

const STATE = {
  events: [],
  filter: "Tutte",
  query: "",
  markersById: new Map(),
  coordsByPlace: new Map(), // cache geocoding responses
  activeId: null
};

function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

function normalize(s){
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .trim();
}

function matchesEvent(ev){
  const fOk = (STATE.filter === "Tutte") || (ev.category === STATE.filter);
  if(!fOk) return false;

  const q = normalize(STATE.query);
  if(!q) return true;

  const hay = normalize([
    ev.title, ev.date, ev.category, ev.place, ev.summary, ...(ev.tags || [])
  ].join(" | "));
  return hay.includes(q);
}

function setActiveCard(id){
  STATE.activeId = id;

  $all(".card").forEach(c => c.classList.toggle("active", c.dataset.id === id));

  const marker = STATE.markersById.get(id);
  if(marker){
    marker.openPopup();
    map.panTo(marker.getLatLng(), { animate: true, duration: 0.6 });
  }
}

async function geocode(place){
  const key = place.trim();
  if(STATE.coordsByPlace.has(key)) return STATE.coordsByPlace.get(key);

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", place);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try{
    const res = await fetch(url.toString(), {
      headers: { "Accept": "application/json" }
    });
    const data = await res.json();
    if(Array.isArray(data) && data[0]){
      const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      STATE.coordsByPlace.set(key, coords);
      return coords;
    }
  }catch(e){
    console.warn("Geocoding failed:", place, e);
  }

  // fallback: centro Foggia
  const fallback = { lat: 41.4622, lon: 15.5446 };
  STATE.coordsByPlace.set(key, fallback);
  return fallback;
}

function eventCard(ev){
  const tags = (ev.tags || []).slice(0,4).map(t => `<span class="pill">${escapeHtml(t)}</span>`).join("");
  return `
    <article class="card" data-id="${ev.id}" tabindex="0" role="button" aria-label="Apri evento: ${escapeHtml(ev.title)}">
      <div class="meta">
        <span>${escapeHtml(ev.category)}</span>
        <span>${escapeHtml(ev.date)}</span>
      </div>
      <div class="title">${escapeHtml(ev.title)}</div>
      <div class="place">${escapeHtml(ev.place)}</div>
      <div class="pills">${tags}</div>
    </article>
  `;
}

function escapeHtml(str){
  return (str || "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[m]));
}

// Map init
const map = L.map("map", { zoomControl: true, scrollWheelZoom: true });
const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
});
osm.addTo(map);

map.setView([41.4622, 15.5446], 13);

// UI wiring
function wireUI(){
  $all(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      $all(".chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      STATE.filter = btn.dataset.filter;
      render();
    });
  });

  $("#searchInput").addEventListener("input", (e) => {
    STATE.query = e.target.value;
    render();
  });

  $("#btnCenter").addEventListener("click", () => {
    map.setView([41.4622, 15.5446], 13, { animate:true });
  });

  $("#btnFit").addEventListener("click", () => fitAllMarkers());
}

function fitAllMarkers(){
  const markers = Array.from(STATE.markersById.values());
  if(markers.length === 0) return;
  const group = L.featureGroup(markers);
  map.fitBounds(group.getBounds().pad(0.18));
}

async function buildMarkers(filteredEvents){
  // remove old markers not in filtered list
  const keep = new Set(filteredEvents.map(e => e.id));
  for(const [id, marker] of STATE.markersById.entries()){
    if(!keep.has(id)){
      map.removeLayer(marker);
      STATE.markersById.delete(id);
    }
  }

  // add markers for filtered
  for(const ev of filteredEvents){
    if(STATE.markersById.has(ev.id)) continue;

    const coords = await geocode(ev.place);
    const marker = L.marker([coords.lat, coords.lon]).addTo(map);
    marker.bindPopup(`
      <div style="min-width:220px">
        <div style="font-weight:800; margin-bottom:6px">${escapeHtml(ev.title)}</div>
        <div style="color:rgba(0,0,0,.72); font-size:12px">${escapeHtml(ev.date)} · ${escapeHtml(ev.category)}</div>
        <div style="margin-top:8px; font-size:13px">${escapeHtml(ev.summary || "")}</div>
      </div>
    `);

    marker.on("click", () => setActiveCard(ev.id));
    STATE.markersById.set(ev.id, marker);
  }

  // if there is an active id but filtered out, reset
  if(STATE.activeId && !keep.has(STATE.activeId)){
    STATE.activeId = null;
    $all(".card").forEach(c => c.classList.remove("active"));
  }
}

async function render(){
  const filtered = STATE.events.filter(matchesEvent);

  const list = $("#eventsList");
  list.innerHTML = filtered.map(eventCard).join("") || `
    <div class="small" style="padding:10px 6px;color:rgba(255,255,255,.68)">
      Nessun evento trovato con questi filtri.
    </div>
  `;

  // Wire cards
  $all(".card").forEach(card => {
    const id = card.dataset.id;
    const activate = () => setActiveCard(id);

    card.addEventListener("click", activate);
    card.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        activate();
      }
    });
  });

  await buildMarkers(filtered);

  // First render: fit bounds gently
  if(!STATE._didFitOnce && filtered.length){
    STATE._didFitOnce = true;
    setTimeout(() => fitAllMarkers(), 250);
  }
}

async function init(){
  wireUI();
  const res = await fetch("data/events.json", { cache: "no-store" });
  STATE.events = await res.json();
  await render();
}

init();
