# Hotspot Immagini — Web App (Editor + Presentazione)

Questa è una web app **offline** (solo HTML/CSS/JS) per:
- caricare immagini (una per diapositiva),
- disegnare **forme cliccabili** sopra le immagini,
- deformare le forme a piacere (trascinando i punti),
- passare in modalità **Presentazione** dove le forme diventano **trasparenti** ma restano cliccabili.

## Come si usa (rapido)
1. Apri `index.html` con Chrome/Edge/Firefox (anche offline).
2. Vai in **Editor**.
3. Clicca **+ Aggiungi** e carica una o più immagini.
4. Seleziona una slide dal repository (a sinistra).
5. Scegli una forma: **Rettangolo / Ellisse / Poligono**.
6. Clicca sull’immagine per inserire la forma.
7. Trascina la forma per spostarla; trascina i **punti** (handle) per deformarla.
8. Imposta l’azione: **Testo** (popup) o **Link**.
9. Vai su **Presentazione**: le forme sono invisibili e cliccabili.
10. In presentazione hai l’icona **Home** per tornare alla **prima diapositiva** (quella marcata ★).

## Salvataggio
Il progetto è salvato automaticamente nel browser (localStorage).
- **Esporta**: salva un file JSON.
- **Importa**: ricarica un JSON esportato.
- **Reset**: azzera tutto.

> Nota: se carichi immagini molto pesanti, il localStorage può saturarsi. In quel caso riduci le immagini o usa meno slide.

## Idee per estensioni (se vuoi)
- esportazione in pacchetto con immagini separate
- più tipi di azioni (audio, video, link interno a slide)
- snap / griglia, zoom, duplicazione hotspot

Buon lavoro.
