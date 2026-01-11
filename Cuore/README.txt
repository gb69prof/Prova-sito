# Foggia — Feste cittadine e di quartiere (web app)

## Come usare
- Apri `index.html` in un browser moderno.
- Per evitare limiti di sicurezza su iOS/iPadOS (fetch di `data/events.json`), è consigliato aprire tramite un piccolo server locale.
  - Esempio: se hai Python installato, nella cartella del progetto esegui:
    - `python3 -m http.server 8000`
    - poi apri `http://localhost:8000`

## Note tecniche
- Mappa: Leaflet + OpenStreetMap.
- Geolocalizzazione: geocoding client-side con Nominatim (OpenStreetMap). Serve connessione Internet.
