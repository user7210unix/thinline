import { Proxy } from "../util/proxy.js";
import { SmartCache } from "../util/smartCache.js";

const META_URL = "https://fonts.google.com/metadata/fonts";
const PAGE_SIZE = 6;

// google has no key-free public fonts API, metadata endpoint is
// undocumented and could change shape - fallback list keeps every
// category browsable regardless.
const FALLBACK = {
    sans: ["Plus Jakarta Sans", "Inter", "Manrope", "Work Sans", "Space Grotesk",
           "Sora", "Outfit", "DM Sans", "Karla", "Rubik", "Lexend", "Figtree",
           "Mulish", "Urbanist", "Hanken Grotesk", "Onest", "Public Sans",
           "Be Vietnam Pro", "Plus Jakarta Display", "Schibsted Grotesk", "Albert Sans"],
    serif: ["Source Serif 4", "Lora", "Playfair Display", "Merriweather", "Newsreader",
            "Bitter", "Cormorant Garamond", "Spectral", "Crimson Pro", "Libre Baskerville",
            "Fraunces", "Zilla Slab", "Petrona", "Domine", "Bree Serif",
            "Alegreya", "Vollkorn", "PT Serif", "Noto Serif", "Literata"],
    mono: ["JetBrains Mono", "IBM Plex Mono", "Space Mono", "Fira Code", "Roboto Mono",
           "Courier Prime", "Source Code Pro", "Red Hat Mono", "Fragment Mono",
           "Ubuntu Mono", "Overpass Mono", "Azeret Mono", "Martian Mono", "DM Mono"],
    hand: ["Caveat", "Dancing Script", "Kalam", "Shadows Into Light", "Patrick Hand",
           "Indie Flower", "Gochi Hand", "Reenie Beanie", "Homemade Apple",
           "Sacramento", "Satisfy", "Pacifico", "Nanum Pen Script", "Neucha", "Marck Script"],
    display: ["Bungee", "Abril Fatface", "Righteous", "Passion One", "Alfa Slab One",
              "Anton", "Bebas Neue", "Fjalla One", "Archivo Black",
              "Staatliches", "Rammetto One", "Titan One", "Bowlby One", "Luckiest Guy"]
  };

const SYSTEM = [
    { family: "Times New Roman", fallback: "serif" },
    { family: "Georgia", fallback: "serif" },
    { family: "Arial", fallback: "sans-serif" },
    { family: "Courier New", fallback: "monospace" }
  ];

const CATEGORY_MAP = {
  "sans-serif": "sans",
  "serif": "serif",
  "monospace": "mono",
  "handwriting": "hand",
  "display": "display"
};

function xhrGet(url, ok, err) {
  let x;
  try { x = new XMLHttpRequest(); } catch (e) { err && err(); return; }
  x.open("GET", Proxy.wrap(url), true);
  x.onreadystatechange = () => {
    if (x.readyState === 4) {
      if (x.status >= 200 && x.status < 300) ok(x.responseText);
      else err && err("http " + x.status);
    }
  };
  try { x.send(null); } catch (e) { err && err("send failed"); }
}

// response body is prefixed with an anti-hijack guard, )]}' - strip
// everything before the first { and parse what's left
function parseMeta(text) {
  const idx = text.indexOf("{");
  if (idx < 0) return null;
  try {
    const json = JSON.parse(text.slice(idx));
    const list = json.familyMetadataList || [];
    const out = { sans: [], serif: [], mono: [], hand: [], display: [] };
    for (const f of list) {
      const cat = CATEGORY_MAP[(f.category || "").toLowerCase()];
      if (cat && f.family) out[cat].push(f.family);
    }
    return out;
  } catch (e) { return null; }
}

export class FontCatalog {
  static FALLBACK = FALLBACK;
  static SYSTEM = SYSTEM;
  static #cache = new SmartCache("flm_meta_cache_v1", 1);
  static #CACHE_TTL = 1000 * 60 * 60 * 24 * 7;
  static #CACHE_STALE_OK = 1000 * 60 * 60 * 24 * 30;

  static #scrapeLive(cb) {
    xhrGet(META_URL, (text) => cb(parseMeta(text)), () => cb(null));
  }

  static #serveFromPool(pool, category, page) {
    const list = (pool && pool[category] && pool[category].length) ? pool[category] : FALLBACK[category];
    const start = page * PAGE_SIZE;
    let slice = list.slice(start, start + PAGE_SIZE);
    let noMore = start + PAGE_SIZE >= list.length;
    if (slice.length < PAGE_SIZE && list.length) {
      // pad from fallback without wrapping back over what we already
      // sent - the wraparound was the old repeat bug
      const fb = FALLBACK[category];
      for (let i = 0; i < fb.length && slice.length < PAGE_SIZE; i++) {
        if (!slice.includes(fb[i])) slice.push(fb[i]);
      }
      noMore = true;
    }
    return { slice, noMore };
  }

  static fetchPage(category, page, cb) {
    if (category === "system") { cb(SYSTEM.map((s) => s.family), true); return; }

    const entry = FontCatalog.#cache.read("meta");
    const now = Date.now();

    if (entry && (now - entry.t) < FontCatalog.#CACHE_TTL) {
      const r = FontCatalog.#serveFromPool(entry.data, category, page);
      cb(r.slice, r.noMore);
      return;
    }
    if (entry && (now - entry.t) < FontCatalog.#CACHE_STALE_OK) {
      const r = FontCatalog.#serveFromPool(entry.data, category, page);
      cb(r.slice, r.noMore);
      FontCatalog.#scrapeLive((fresh) => { if (fresh) FontCatalog.#cache.write("meta", fresh); });
      return;
    }
    FontCatalog.#scrapeLive((fresh) => {
      const pool = fresh || (entry ? entry.data : null);
      if (pool) FontCatalog.#cache.write("meta", pool);
      const r = FontCatalog.#serveFromPool(pool, category, page);
      cb(r.slice, r.noMore);
    });
  }

  static isSystem(family) {
    return SYSTEM.some((s) => s.family === family);
  }

  static fallbackStackFor(family) {
    const hit = SYSTEM.find((s) => s.family === family);
    return hit ? hit.fallback : "sans-serif";
  }
}
