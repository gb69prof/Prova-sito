// Script per rendere la image map più flessibile
// (ridimensiona le coordinate quando l'immagine cambia dimensione)

document.addEventListener("DOMContentLoaded", () => {
  const img = document.getElementById("hero-image");
  const map = document.getElementById("mappa-home");
  if (!img || !map) return;

  // Coord originali (in base all'immagine 1152x768)
  const originalWidth = 1152;
  const originalHeight = 768;

  // Salva le coord originali in data-attribute
  map.querySelectorAll("area").forEach(area => {
    const coords = area.coords.split(",").map(Number);
    area.dataset.originalCoords = coords.join(",");
  });

  function resizeMap() {
    const currentWidth = img.clientWidth;
    const currentHeight = img.clientHeight;

    const scaleX = currentWidth / originalWidth;
    const scaleY = currentHeight / originalHeight;

    map.querySelectorAll("area").forEach(area => {
      const original = area.dataset.originalCoords.split(",").map(Number);
      const scaled = original.map((value, index) =>
        index % 2 === 0 ? Math.round(value * scaleX) : Math.round(value * scaleY)
      );
      area.coords = scaled.join(",");
    });
  }

  // Ridimensiona alla partenza e al resize
  window.addEventListener("resize", resizeMap);
  if (img.complete) {
    resizeMap();
  } else {
    img.addEventListener("load", resizeMap);
  }
});
