import { PaletteScraper } from "./PaletteScraper.js";
import { PaletteApplier } from "./PaletteApplier.js";
import { PaletteCache } from "./PaletteCache.js";

export class ColorPaletteManager {
  static #scraper = new PaletteScraper();

  static fetchPage(theme, page, cb) {
    ColorPaletteManager.#scraper.fetchPage(theme, page, cb);
  }

  static applyPalette(colors, opts) {
    PaletteApplier.apply(colors, opts);
  }

  static saveChoice(colors, theme) {
    PaletteCache.saveChoice(colors, theme);
  }

  static loadChoice() {
    return PaletteCache.loadChoice();
  }

  // "popular" mixes light and dark palettes, so let the applier
  // pick per-palette instead of forcing one mode
  static modeForTheme(theme) {
    if (theme === "dark") return "dark";
    if (theme === "popular") return null;
    return "light";
  }

  static init() {
    const choice = PaletteCache.loadChoice();
    if (choice && choice.colors) {
      PaletteApplier.apply(choice.colors, { mode: ColorPaletteManager.modeForTheme(choice.theme) });
    } else {
      PaletteApplier.apply(PaletteScraper.FALLBACK.pastel[0], { mode: "light" });
    }
  }

  static get FALLBACK() {
    return PaletteScraper.FALLBACK;
  }
}
