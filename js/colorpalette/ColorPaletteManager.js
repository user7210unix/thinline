import { PaletteApplier } from "./PaletteApplier.js";
import { PaletteCache } from "./PaletteCache.js";
import { PALETTES, paletteById } from "./palettes.js";

export class ColorPaletteManager {
  static list() { return PALETTES; }

  static currentId() { return paletteById(PaletteCache.loadChoice()).id; }

  static select(id) {
    PaletteApplier.apply(paletteById(id));
    PaletteCache.saveChoice(id);
  }

  static init() {
    PaletteApplier.apply(paletteById(PaletteCache.loadChoice()));
  }
}
