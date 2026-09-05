import { FontCatalog } from "./FontCatalog.js";
import { FontInjector } from "./FontInjector.js";
import { FontCache } from "./FontCache.js";

export class FontLoader {
  static fetchPage(category, page, cb) { FontCatalog.fetchPage(category, page, cb); }
  static ensureLoaded(family) { FontInjector.ensureLoaded(family); }
  static applyFont(family) { FontInjector.applyFont(family); }
  static saveChoice(family) { FontCache.saveChoice(family); }
  static loadChoice() { return FontCache.loadChoice(); }
  static saveSize(px) { FontCache.saveSize(px); }
  static loadSize() { return FontCache.loadSize(); }

  static get FALLBACK() { return FontCatalog.FALLBACK; }
  static get SYSTEM() { return FontCatalog.SYSTEM; }

  static init() {
    const choice = FontCache.loadChoice();
    FontInjector.applyFont(choice && choice.family ? choice.family : "Plus Jakarta Sans");
  }
}
