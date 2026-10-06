import { FontCatalog } from "./FontCatalog.js";

const CSS_URL = "https://fonts.googleapis.com/css2";

export class FontInjector {
  static #loaded = new Set();

  static ensureLoaded(family) {
    if (FontInjector.#loaded.has(family)) return;
    FontInjector.#loaded.add(family);
    const q = family.replace(/ /g, "+");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${CSS_URL}?family=${q}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }

  static applyFont(family) {
    if (!FontCatalog.isSystem(family)) FontInjector.ensureLoaded(family);
    const stack = `'${family}', ${FontCatalog.fallbackStackFor(family)}`;
    document.documentElement.style.setProperty("--ui-font", stack);
  }
}
