/* Hotspot Immagini — single-file logic (no libs)
   - Two views: Editor & Presentation
   - Shapes: rect, ellipse, polygon (editable)
   - In Editor: only outline visible + handles
   - In Presentation: shapes transparent but clickable
*/
(() => {
  const LS_KEY = "hotspotAppProject.v1";

  // ---------- Utilities ----------
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  function downloadText(filename, text){
    const blob = new Blob([text], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  function readFileAsDataURL(file){
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(file);
    });
  }

  function safeJSONParse(text){
    try { return JSON.parse(text); } catch { return null; }
  }

  // ---------- Data model ----------
  const defaultProject = () => ({
    version: 1,
    createdAt: new Date().toISOString(),
    slides: [],
    firstSlideId: null,
    currentSlideId: null
  });

  let project = loadProject();

  function loadProject(){
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return defaultProject();
    const parsed = safeJSONParse(raw);
    if(!parsed || !parsed.slides) return defaultProject();
    return parsed;
  }

  function saveProject(){
    localStorage.setItem(LS_KEY, JSON.stringify(project));
    renderRepo();
    renderCounters();
    if(activeView === "present") renderPresentation();
    if(activeView === "editor") renderEditorStage();
  }

  function getCurrentSlide(){
    return project.slides.find(s => s.id === project.currentSlideId) || null;
  }

  function ensureCurrentSlide(){
    if(project.slides.length === 0){
      project.currentSlideId = null;
      project.firstSlideId = null;
      return null;
    }
    if(!project.firstSlideId) project.firstSlideId = project.slides[0].id;
    if(!project.currentSlideId) project.currentSlideId = project.firstSlideId;
    const cur = getCurrentSlide();
    if(cur) return cur;
    project.currentSlideId = project.firstSlideId;
    return getCurrentSlide();
  }

  // ---------- DOM refs ----------
  const viewEditor = $("#viewEditor");
  const viewPresent = $("#viewPresent");

  const btnEditor = $("#btnEditor");
  const btnPresent = $("#btnPresent");

  const fileImages = $("#fileImages");
  const repoEl = $("#repo");
  const stageEl = $("#stage");
  const stageTitle = $("#stageTitle");

  const toolSelect = $("#toolSelect");
  const toolRect = $("#toolRect");
  const toolEllipse = $("#toolEllipse");
  const toolPoly = $("#toolPoly");

  const actionTypeEl = $("#actionType");
  const actionValueEl = $("#actionValue");
  const btnApplyAction = $("#btnApplyAction");
  const btnDelete = $("#btnDelete");

  const btnPrevSlide = $("#btnPrevSlide");
  const btnNextSlide = $("#btnNextSlide");
  const slideCounter = $("#slideCounter");
  const btnNewSlide = $("#btnNewSlide");
  const btnRemoveSlide = $("#btnRemoveSlide");
  const btnSetAsFirst = $("#btnSetAsFirst");

  const btnExport = $("#btnExport");
  const fileImport = $("#fileImport");
  const btnReset = $("#btnReset");

  const presentStage = $("#presentStage");
  const presentTitle = $("#presentTitle");
  const btnHome = $("#btnHome");
  const btnPrevP = $("#btnPrevP");
  const btnNextP = $("#btnNextP");
  const presentCounter = $("#presentCounter");

  const modal = $("#modal");
  const modalBody = $("#modalBody");
  const btnCloseModal = $("#btnCloseModal");
  const modalBackdrop = $("#modalBackdrop");

  // ---------- View switching ----------
  let activeView = "editor"; // "editor" | "present"

  function setActiveView(which){
    activeView = which;
    viewEditor.classList.toggle("active", which === "editor");
    viewPresent.classList.toggle("active", which === "present");

    btnEditor.classList.toggle("primary", which === "editor");
    btnPresent.classList.toggle("primary", which === "present");

    if(which === "editor") renderEditorStage();
    if(which === "present") renderPresentation();
  }

  btnEditor.addEventListener("click", () => setActiveView("editor"));
  btnPresent.addEventListener("click", () => setActiveView("present"));

  // Support hash routes
  function syncRoute(){
    const h = (location.hash || "").toLowerCase();
    if(h.includes("present")) setActiveView("present");
    else setActiveView("editor");
  }
  window.addEventListener("hashchange", syncRoute);

  // ---------- Repo rendering ----------
  function renderRepo(){
    repoEl.innerHTML = "";
    ensureCurrentSlide();

    project.slides.forEach((s, idx) => {
      const div = document.createElement("div");
      div.className = "thumb" + (s.id === project.currentSlideId ? " active" : "");
      div.title = s.name || `Slide ${idx+1}`;

      const img = document.createElement("img");
      img.src = s.imgDataUrl || "";
      img.alt = s.name || `Slide ${idx+1}`;
      div.appendChild(img);

      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = (s.id === project.firstSlideId) ? "★ 1ª" : (idx+1);
      div.appendChild(badge);

      div.addEventListener("click", () => {
        project.currentSlideId = s.id;
        selectedHotspotId = null;
        saveProject();
      });

      repoEl.appendChild(div);
    });

    if(project.slides.length === 0){
      const empty = document.createElement("div");
      empty.style.gridColumn = "1 / -1";
      empty.style.color = "rgba(169,178,208,.9)";
      empty.style.fontSize = "12px";
      empty.style.lineHeight = "1.4";
      empty.textContent = "Repository vuoto. Clicca “+ Aggiungi” per inserire immagini (una per diapositiva).";
      repoEl.appendChild(empty);
    }
  }

  function renderCounters(){
    const total = project.slides.length;
    const idx = total ? project.slides.findIndex(s => s.id === project.currentSlideId) + 1 : 0;
    slideCounter.textContent = `${idx} / ${total}`;
    presentCounter.textContent = `${idx} / ${total}`;
  }

  // ---------- Slides management ----------
  async function addImagesAsSlides(files){
    const arr = Array.from(files || []);
    for(const f of arr){
      const data = await readFileAsDataURL(f);
      const slide = {
        id: uid(),
        name: f.name,
        imgDataUrl: data,
        hotspots: []
      };
      project.slides.push(slide);
      if(!project.firstSlideId) project.firstSlideId = slide.id;
      if(!project.currentSlideId) project.currentSlideId = slide.id;
    }
    saveProject();
  }

  fileImages.addEventListener("change", async (e) => {
    if(e.target.files && e.target.files.length){
      await addImagesAsSlides(e.target.files);
      e.target.value = "";
    }
  });

  btnNewSlide.addEventListener("click", async () => {
    // Create blank slide (user can later import/replace by adding image on it via "Replace" flow)
    const slide = { id: uid(), name: "Slide vuota", imgDataUrl: "", hotspots: [] };
    project.slides.push(slide);
    if(!project.firstSlideId) project.firstSlideId = slide.id;
    project.currentSlideId = slide.id;
    saveProject();
    // Quick prompt: let user pick an image for this slide
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      if(input.files && input.files[0]){
        const data = await readFileAsDataURL(input.files[0]);
        slide.imgDataUrl = data;
        slide.name = input.files[0].name;
        saveProject();
      }
    };
    input.click();
  });

  btnRemoveSlide.addEventListener("click", () => {
    const cur = ensureCurrentSlide();
    if(!cur) return;
    if(!confirm("Rimuovere questa diapositiva?")) return;

    project.slides = project.slides.filter(s => s.id !== cur.id);
    if(project.firstSlideId === cur.id) project.firstSlideId = project.slides[0]?.id || null;
    if(project.currentSlideId === cur.id) project.currentSlideId = project.firstSlideId;
    selectedHotspotId = null;
    saveProject();
  });

  btnSetAsFirst.addEventListener("click", () => {
    const cur = ensureCurrentSlide();
    if(!cur) return;
    project.firstSlideId = cur.id;
    saveProject();
  });

  function gotoSlide(delta){
    const total = project.slides.length;
    if(total === 0) return;
    const idx = project.slides.findIndex(s => s.id === project.currentSlideId);
    const next = clamp(idx + delta, 0, total-1);
    project.currentSlideId = project.slides[next].id;
    selectedHotspotId = null;
    saveProject();
  }

  btnPrevSlide.addEventListener("click", () => gotoSlide(-1));
  btnNextSlide.addEventListener("click", () => gotoSlide(+1));

  btnPrevP.addEventListener("click", () => gotoSlide(-1));
  btnNextP.addEventListener("click", () => gotoSlide(+1));
  btnHome.addEventListener("click", () => {
    if(project.firstSlideId) project.currentSlideId = project.firstSlideId;
    saveProject();
  });

  // ---------- Export / Import / Reset ----------
  btnExport.addEventListener("click", () => {
    const name = "hotspot-progetto.json";
    downloadText(name, JSON.stringify(project, null, 2));
  });

  fileImport.addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const text = await f.text();
    const parsed = safeJSONParse(text);
    if(!parsed || !parsed.slides){
      alert("File non valido.");
      e.target.value = "";
      return;
    }
    project = parsed;
    ensureCurrentSlide();
    selectedHotspotId = null;
    saveProject();
    e.target.value = "";
  });

  btnReset.addEventListener("click", () => {
    if(!confirm("Azzero tutto (localStorage)?")) return;
    project = defaultProject();
    selectedHotspotId = null;
    saveProject();
  });

  // ---------- Hotspot editing ----------
  let activeTool = "select"; // select | rect | ellipse | poly
  let selectedHotspotId = null;

  function setTool(t){
    activeTool = t;
    $$(".tool").forEach(b => b.classList.remove("active"));
    ({
      select: toolSelect,
      rect: toolRect,
      ellipse: toolEllipse,
      poly: toolPoly
    })[t].classList.add("active");
    stageEl.style.cursor = (t === "select") ? "default" : "crosshair";
  }

  toolSelect.addEventListener("click", () => setTool("select"));
  toolRect.addEventListener("click", () => setTool("rect"));
  toolEllipse.addEventListener("click", () => setTool("ellipse"));
  toolPoly.addEventListener("click", () => setTool("poly"));

  function normPointFromEvent(ev, imgRect){
    const x = (ev.clientX - imgRect.left) / imgRect.width;
    const y = (ev.clientY - imgRect.top) / imgRect.height;
    return { x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
  }

  function createDefaultHotspot(type){
    const id = uid();
    if(type === "rect"){
      return { id, type, x:0.2, y:0.2, w:0.3, h:0.2, actionType:"text", actionValue:"" };
    }
    if(type === "ellipse"){
      return { id, type, cx:0.5, cy:0.5, rx:0.18, ry:0.12, actionType:"text", actionValue:"" };
    }
    // polygon: default quad
    return { id, type:"poly", points:[{x:0.3,y:0.3},{x:0.6,y:0.3},{x:0.6,y:0.55},{x:0.3,y:0.55}], actionType:"text", actionValue:"" };
  }

  function selectHotspot(id){
    selectedHotspotId = id;
    const hs = getSelectedHotspot();
    if(hs){
      actionTypeEl.value = hs.actionType || "text";
      actionValueEl.value = hs.actionValue || "";
    } else {
      actionTypeEl.value = "text";
      actionValueEl.value = "";
    }
    renderEditorStage();
  }

  function getSelectedHotspot(){
    const slide = getCurrentSlide();
    if(!slide) return null;
    return slide.hotspots.find(h => h.id === selectedHotspotId) || null;
  }

  btnApplyAction.addEventListener("click", () => {
    const hs = getSelectedHotspot();
    if(!hs) return;
    hs.actionType = actionTypeEl.value;
    hs.actionValue = actionValueEl.value.trim();
    saveProject();
  });

  btnDelete.addEventListener("click", () => {
    const slide = getCurrentSlide();
    if(!slide) return;
    if(!selectedHotspotId) return;
    slide.hotspots = slide.hotspots.filter(h => h.id !== selectedHotspotId);
    selectedHotspotId = null;
    saveProject();
  });

  // ---------- Stage rendering (Editor) ----------
  let stageState = {
    imgEl: null,
    svgEl: null,
    overlayEl: null
  };

  function clearStage(){
    stageEl.innerHTML = `
      <div class="emptyState">
        <div class="emptyIcon">⬚</div>
        <div class="emptyText">Carica o seleziona un'immagine nel repository per iniziare.</div>
      </div>
    `;
    stageState = { imgEl:null, svgEl:null, overlayEl:null };
  }

  function renderEditorStage(){
    const slide = ensureCurrentSlide();
    renderCounters();
    renderRepo();

    if(!slide || !slide.imgDataUrl){
      stageTitle.textContent = slide ? (slide.name || "Slide") : "Nessuna immagine selezionata";
      clearStage();
      return;
    }

    stageEl.innerHTML = "";
    stageTitle.textContent = slide.name || "Diapositiva";

    const img = document.createElement("img");
    img.src = slide.imgDataUrl;
    img.alt = slide.name || "Immagine";
    img.draggable = false;

    const overlay = document.createElement("div");
    overlay.className = "overlay";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 1000 1000");
    svg.setAttribute("preserveAspectRatio", "none");
    overlay.appendChild(svg);

    stageEl.appendChild(img);
    stageEl.appendChild(overlay);

    stageState = { imgEl: img, svgEl: svg, overlayEl: overlay };

    // Render hotspots + handles
    drawHotspotsEditor(svg, slide);

    // Pointer events only on svg in editor
    svg.style.pointerEvents = "auto";
    overlay.style.pointerEvents = "auto";

    // Click to add shapes (in non-select tools)
    svg.addEventListener("pointerdown", onStagePointerDown);
  }

  function drawHotspotsEditor(svg, slide){
    svg.innerHTML = "";

    // background blocker? nope.
    for(const hs of slide.hotspots){
      const el = createShapeElement(hs, true);
      el.classList.add("hotspot");
      if(hs.id === selectedHotspotId) el.classList.add("selected");
      el.dataset.id = hs.id;
      el.style.pointerEvents = "stroke"; // easier select by outline

      el.addEventListener("pointerdown", (e) => {
        if(activeTool !== "select") return; // selection only in select mode
        e.stopPropagation();
        selectHotspot(hs.id);
        startDragShape(e, hs);
      });

      svg.appendChild(el);

      if(hs.id === selectedHotspotId){
        const handles = createHandles(hs);
        handles.forEach(h => svg.appendChild(h));
      }
    }
  }

  function createShapeElement(hs, editorMode){
    const ns = "http://www.w3.org/2000/svg";
    if(hs.type === "rect"){
      const r = document.createElementNS(ns, "rect");
      r.setAttribute("x", (hs.x*1000).toFixed(2));
      r.setAttribute("y", (hs.y*1000).toFixed(2));
      r.setAttribute("width", (hs.w*1000).toFixed(2));
      r.setAttribute("height", (hs.h*1000).toFixed(2));
      r.setAttribute("rx", "10");
      return r;
    }
    if(hs.type === "ellipse"){
      const e = document.createElementNS(ns, "ellipse");
      e.setAttribute("cx", (hs.cx*1000).toFixed(2));
      e.setAttribute("cy", (hs.cy*1000).toFixed(2));
      e.setAttribute("rx", (hs.rx*1000).toFixed(2));
      e.setAttribute("ry", (hs.ry*1000).toFixed(2));
      return e;
    }
    const p = document.createElementNS(ns, "polygon");
    const pts = hs.points.map(pt => `${(pt.x*1000).toFixed(2)},${(pt.y*1000).toFixed(2)}`).join(" ");
    p.setAttribute("points", pts);
    return p;
  }

  function createHandles(hs){
    const ns = "http://www.w3.org/2000/svg";
    const handles = [];
    const make = (x,y, kind, idx=null) => {
      const c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", (x*1000).toFixed(2));
      c.setAttribute("cy", (y*1000).toFixed(2));
      c.setAttribute("r", "10");
      c.classList.add("handle");
      c.dataset.kind = kind;
      if(idx !== null) c.dataset.idx = String(idx);
      c.style.pointerEvents = "all";
      c.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        startDragHandle(e, hs, c.dataset.kind, c.dataset.idx ? parseInt(c.dataset.idx,10) : null);
      });
      return c;
    };

    if(hs.type === "rect"){
      // 4 corners
      handles.push(make(hs.x, hs.y, "rect_tl"));
      handles.push(make(hs.x+hs.w, hs.y, "rect_tr"));
      handles.push(make(hs.x+hs.w, hs.y+hs.h, "rect_br"));
      handles.push(make(hs.x, hs.y+hs.h, "rect_bl"));
      return handles;
    }
    if(hs.type === "ellipse"){
      handles.push(make(hs.cx+hs.rx, hs.cy, "ell_rx"));
      handles.push(make(hs.cx, hs.cy+hs.ry, "ell_ry"));
      handles.push(make(hs.cx, hs.cy, "ell_c"));
      return handles;
    }
    // polygon vertices
    hs.points.forEach((pt, i) => handles.push(make(pt.x, pt.y, "poly_pt", i)));
    return handles;
  }

  function onStagePointerDown(ev){
    const slide = getCurrentSlide();
    if(!slide) return;
    if(activeTool === "select"){
      // click empty area: deselect
      selectedHotspotId = null;
      saveProject();
      return;
    }

    // add default shape and place it near click
    const imgRect = stageEl.getBoundingClientRect();
    const p = normPointFromEvent(ev, imgRect);

    const hs = createDefaultHotspot(activeTool);
    if(hs.type === "rect"){
      hs.x = clamp(p.x - hs.w/2, 0, 1-hs.w);
      hs.y = clamp(p.y - hs.h/2, 0, 1-hs.h);
    } else if(hs.type === "ellipse"){
      hs.cx = p.x; hs.cy = p.y;
      // keep inside
      hs.cx = clamp(hs.cx, hs.rx, 1-hs.rx);
      hs.cy = clamp(hs.cy, hs.ry, 1-hs.ry);
    } else {
      // translate poly so its centroid goes to p
      const pts = hs.points;
      const cx = pts.reduce((a,t)=>a+t.x,0)/pts.length;
      const cy = pts.reduce((a,t)=>a+t.y,0)/pts.length;
      const dx = p.x - cx, dy = p.y - cy;
      hs.points = pts.map(pt => ({x: clamp(pt.x+dx, 0, 1), y: clamp(pt.y+dy, 0, 1)}));
    }

    slide.hotspots.push(hs);
    selectedHotspotId = hs.id;
    // switch back to select automatically
    setTool("select");
    saveProject();
  }

  // ---------- Dragging mechanics ----------
  let drag = null;

  function startDragShape(ev, hs){
    const imgRect = stageEl.getBoundingClientRect();
    const start = normPointFromEvent(ev, imgRect);
    drag = { kind:"shape", id: hs.id, start, snapshot: JSON.parse(JSON.stringify(hs)) };
    stageEl.setPointerCapture(ev.pointerId);
    stageEl.addEventListener("pointermove", onDragMove);
    stageEl.addEventListener("pointerup", onDragEnd, { once:true });
  }

  function startDragHandle(ev, hs, kind, idx){
    const imgRect = stageEl.getBoundingClientRect();
    const start = normPointFromEvent(ev, imgRect);
    drag = { kind:"handle", id: hs.id, handleKind: kind, handleIdx: idx, start, snapshot: JSON.parse(JSON.stringify(hs)) };
    stageEl.setPointerCapture(ev.pointerId);
    stageEl.addEventListener("pointermove", onDragMove);
    stageEl.addEventListener("pointerup", onDragEnd, { once:true });
  }

  function onDragMove(ev){
    const slide = getCurrentSlide();
    if(!slide || !drag) return;
    const hs = slide.hotspots.find(h => h.id === drag.id);
    if(!hs) return;

    const imgRect = stageEl.getBoundingClientRect();
    const cur = normPointFromEvent(ev, imgRect);

    const dx = cur.x - drag.start.x;
    const dy = cur.y - drag.start.y;

    const snap = drag.snapshot;

    if(drag.kind === "shape"){
      if(hs.type === "rect"){
        hs.x = clamp(snap.x + dx, 0, 1 - snap.w);
        hs.y = clamp(snap.y + dy, 0, 1 - snap.h);
      } else if(hs.type === "ellipse"){
        hs.cx = clamp(snap.cx + dx, snap.rx, 1 - snap.rx);
        hs.cy = clamp(snap.cy + dy, snap.ry, 1 - snap.ry);
      } else {
        hs.points = snap.points.map(pt => ({x: clamp(pt.x + dx, 0, 1), y: clamp(pt.y + dy, 0, 1)}));
      }
      renderEditorStage(); // refresh
      return;
    }

    // handle drags
    if(hs.type === "rect"){
      let x1 = snap.x, y1 = snap.y, x2 = snap.x + snap.w, y2 = snap.y + snap.h;
      if(drag.handleKind === "rect_tl"){ x1 += dx; y1 += dy; }
      if(drag.handleKind === "rect_tr"){ x2 += dx; y1 += dy; }
      if(drag.handleKind === "rect_br"){ x2 += dx; y2 += dy; }
      if(drag.handleKind === "rect_bl"){ x1 += dx; y2 += dy; }

      // normalize + clamp
      x1 = clamp(x1, 0, 1); x2 = clamp(x2, 0, 1);
      y1 = clamp(y1, 0, 1); y2 = clamp(y2, 0, 1);

      const minSize = 0.02;
      const nx1 = Math.min(x1, x2), nx2 = Math.max(x1, x2);
      const ny1 = Math.min(y1, y2), ny2 = Math.max(y1, y2);

      hs.x = nx1; hs.y = ny1;
      hs.w = Math.max(minSize, nx2 - nx1);
      hs.h = Math.max(minSize, ny2 - ny1);

      // keep inside after enforcing min size
      hs.x = clamp(hs.x, 0, 1 - hs.w);
      hs.y = clamp(hs.y, 0, 1 - hs.h);

      renderEditorStage();
      return;
    }

    if(hs.type === "ellipse"){
      if(drag.handleKind === "ell_c"){
        hs.cx = clamp(snap.cx + dx, snap.rx, 1 - snap.rx);
        hs.cy = clamp(snap.cy + dy, snap.ry, 1 - snap.ry);
      }
      if(drag.handleKind === "ell_rx"){
        const newRx = clamp(snap.rx + dx, 0.02, 0.49);
        hs.rx = newRx;
        hs.cx = clamp(snap.cx, newRx, 1 - newRx);
      }
      if(drag.handleKind === "ell_ry"){
        const newRy = clamp(snap.ry + dy, 0.02, 0.49);
        hs.ry = newRy;
        hs.cy = clamp(snap.cy, newRy, 1 - newRy);
      }
      renderEditorStage();
      return;
    }

    // polygon vertex
    if(hs.type === "poly" && drag.handleKind === "poly_pt" && typeof drag.handleIdx === "number"){
      const i = drag.handleIdx;
      const pts = snap.points.map(p => ({...p}));
      pts[i] = { x: clamp(snap.points[i].x + dx, 0, 1), y: clamp(snap.points[i].y + dy, 0, 1) };
      hs.points = pts;
      renderEditorStage();
      return;
    }
  }

  function onDragEnd(){
    stageEl.removeEventListener("pointermove", onDragMove);
    drag = null;
    // Save final state
    localStorage.setItem(LS_KEY, JSON.stringify(project));
    renderRepo();
    renderCounters();
  }

  // ---------- Presentation rendering ----------
  function renderPresentation(){
    const slide = ensureCurrentSlide();
    renderCounters();

    presentStage.innerHTML = "";
    if(!slide || !slide.imgDataUrl){
      presentTitle.textContent = "Presentazione (nessuna slide)";
      const msg = document.createElement("div");
      msg.style.color = "rgba(169,178,208,.9)";
      msg.style.textAlign = "center";
      msg.style.padding = "20px";
      msg.textContent = "Non ci sono diapositive. Passa in Editor e aggiungi immagini.";
      presentStage.appendChild(msg);
      return;
    }

    presentTitle.textContent = slide.name || "Presentazione";

    const img = document.createElement("img");
    img.src = slide.imgDataUrl;
    img.alt = slide.name || "Immagine";

    const overlay = document.createElement("div");
    overlay.className = "overlay";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 1000 1000");
    svg.setAttribute("preserveAspectRatio", "none");
    overlay.appendChild(svg);

    presentStage.appendChild(img);
    presentStage.appendChild(overlay);

    drawHotspotsPresentation(svg, slide);
    svg.style.pointerEvents = "auto";
    overlay.style.pointerEvents = "auto";
  }

  function drawHotspotsPresentation(svg, slide){
    svg.innerHTML = "";
    const ns = "http://www.w3.org/2000/svg";

    for(const hs of slide.hotspots){
      const el = createShapeElement(hs, false);
      // in presentation: transparent but clickable
      el.setAttribute("fill", "transparent");
      el.setAttribute("stroke", "transparent");
      el.setAttribute("stroke-width", "20"); // enlarge click area a bit
      el.style.cursor = "pointer";
      el.style.pointerEvents = "all";

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        runHotspotAction(hs);
      });

      svg.appendChild(el);
    }
  }

  function runHotspotAction(hs){
    const type = hs.actionType || "text";
    const value = (hs.actionValue || "").trim();
    if(type === "link"){
      if(!value) return;
      // open in new tab
      window.open(value, "_blank", "noopener,noreferrer");
      return;
    }
    // text
    if(!value) return;
    openModal(value);
  }

  // ---------- Modal ----------
  function openModal(content){
    modalBody.innerHTML = "";
    // basic linkify
    const p = document.createElement("div");
    const html = content
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n/g, "<br/>");
    p.innerHTML = html;
    modalBody.appendChild(p);
    modal.classList.remove("hidden");
  }
  function closeModal(){ modal.classList.add("hidden"); }
  btnCloseModal.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);
  window.addEventListener("keydown", (e) => { if(e.key === "Escape") closeModal(); });

  // ---------- Init ----------
  ensureCurrentSlide();
  renderRepo();
  renderCounters();
  syncRoute();
})();
