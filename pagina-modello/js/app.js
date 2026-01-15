/* =========================================================
   app.js — Logica di switching (immagine / mappa / video / 3D)
   ---------------------------------------------------------
   NOTE:
   - Nessun framework
   - Compatibile GitHub Pages
   - CONFIG modificabile qui sotto
   ========================================================= */

const CONFIG = {
  // URL immagine principale (locale o remoto)
  imageUrl: "assets/campi-diomedei.jpeg",

  // Google Maps embed (senza API key)
  mapEmbedUrl: "https://www.google.com/maps?q=41.458022,15.563635&z=17&output=embed",

  // Video embed (YouTube/Vimeo)
  videoEmbedUrl: "https://www.youtube.com/embed/jQPxf3NOF0w",

  // 3D: qui usiamo Sketchfab (iframe). Se in futuro vuoi Three.js,
  // puoi sostituire la funzione renderSketchfab con renderThree().
  sketchfabEmbedUrl: "https://sketchfab.com/models/0a306cc6e14647f1960cd30c82fe0b2c/embed"
};

const stage = document.getElementById("mediaStage");
const loading = document.getElementById("mediaLoading");
const pills = Array.from(document.querySelectorAll(".pill[data-view]"));
const btnBackToImage = document.getElementById("btnBackToImage");

function setLoading(isLoading){
  loading.hidden = !isLoading;
}

function clearStage(){
  stage.innerHTML = "";
}

function setActive(view){
  pills.forEach(p => {
    const isActive = p.dataset.view === view;
    p.classList.toggle("active", isActive);
    p.setAttribute("aria-pressed", String(isActive));
  });
}

function renderImage(){
  clearStage();
  setLoading(true);

  const img = new Image();
  img.alt = "Campi Diomedei – immagine principale";
  img.loading = "eager";
  img.src = CONFIG.imageUrl;

  img.onload = () => setLoading(false);
  img.onerror = () => {
    setLoading(false);
    stage.innerHTML = "<div style='padding:16px;color:#5b6476;font-weight:600'>Immagine non disponibile. Controlla CONFIG.imageUrl.</div>";
  };

  stage.appendChild(img);
  setActive("image");
}

function renderIframe(src, title){
  clearStage();
  setLoading(true);

  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = title;
  iframe.loading = "lazy";
  iframe.allow = "autoplay; fullscreen; xr-spatial-tracking";
  iframe.allowFullscreen = true;

  iframe.addEventListener("load", () => setLoading(false), { once:true });
  stage.appendChild(iframe);
}

function renderMap(){
  renderIframe(CONFIG.mapEmbedUrl, "Mappa – Campi Diomedei (Google Maps)");
  setActive("map");
}

function renderVideo(){
  renderIframe(CONFIG.videoEmbedUrl, "Video – Campi Diomedei");
  setActive("video");
}

function renderSketchfab(){
  renderIframe(CONFIG.sketchfabEmbedUrl, "3D – Villaggio Campi Diomedei (Sketchfab)");
  setActive("sketchfab");
}

// Hook UI
pills.forEach(pill => {
  pill.addEventListener("click", () => {
    const view = pill.dataset.view;
    if(!view) return;

    if(view === "image") renderImage();
    if(view === "map") renderMap();
    if(view === "video") renderVideo();
    if(view === "sketchfab") renderSketchfab();
  });
});

btnBackToImage?.addEventListener("click", renderImage);

// Init
renderImage();
