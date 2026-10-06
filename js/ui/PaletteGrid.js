import { ColorPaletteManager } from "../colorpalette/ColorPaletteManager.js";

const SWATCH_KEYS = ["bg", "red", "green", "yellow", "blue", "magenta", "cyan", "fg"];

function card(p, selected) {
  const dots = SWATCH_KEYS.map((k) => `<i style="background:#${p[k]}"></i>`).join("");
  return `<button type="button" class="pal-card${selected ? " selected" : ""}" data-id="${p.id}" data-mode="${p.mode}">` +
    `<span class="pal-dots">${dots}</span><span class="pal-name">${p.name}</span></button>`;
}

export class PaletteGrid {
  static #filter = "all";

  static render() {
    const grid = document.getElementById("paletteGrid");
    const current = ColorPaletteManager.currentId();
    const list = ColorPaletteManager.list().filter((p) => PaletteGrid.#filter === "all" || p.mode === PaletteGrid.#filter);
    grid.innerHTML = list.map((p) => card(p, p.id === current)).join("");
    grid.querySelectorAll(".pal-card").forEach((el) => {
      el.onclick = () => {
        ColorPaletteManager.select(el.getAttribute("data-id"));
        PaletteGrid.render();
      };
    });
  }

  static init() {
    const tabs = document.querySelectorAll("#paletteTabs button");
    tabs.forEach((tab) => {
      tab.onclick = () => {
        tabs.forEach((t) => t.classList.toggle("active", t === tab));
        PaletteGrid.#filter = tab.getAttribute("data-mode");
        PaletteGrid.render();
      };
    });
    PaletteGrid.render();
  }
}
