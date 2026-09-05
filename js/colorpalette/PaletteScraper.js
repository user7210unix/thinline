import { Proxy } from "../util/proxy.js";
import { SmartCache } from "../util/smartCache.js";

const FEED_URL = "https://colorhunt.co/php/feed.php";
const PAGE_URL = "https://colorhunt.co/palettes/";
const MAX_LIVE_ATTEMPTS = 3;

// bundled palettes, used once the live scrape gives up. colorhunt has
// no public API - feed.php is what the site itself calls, scraped
// same as the gallery page as a second try.
const FALLBACK = {
    pastel: [
      ["fffdf6", "ffe0e9", "cdb4db", "a2d2ff"],
      ["fff0f3", "ffccd5", "ffb3c6", "fb6f92"],
      ["f6f4eb", "cbdfbd", "9dbf9e", "40514e"],
      ["fdf0d5", "e8d5b7", "cbaacb", "8a7090"],
      ["e0fbfc", "c2dfe3", "9db4c0", "5c6b73"],
      ["fefae0", "faedcd", "d4a373", "ccd5ae"],
      ["fff1e6", "ffd7ba", "fec89a", "fcd5ce"],
      ["e2ece9", "bee1e6", "f0efeb", "faf3dd"],
      ["ede7e3", "e0afa0", "cdc2ae", "8e8d8a"],
      ["fdecef", "f9d5e5", "eeac99", "e06377"],
      ["f1faee", "a8dadc", "457b9d", "1d3557"],
      ["fffbf0", "ffe5ec", "ffc2d1", "ffb3c6"],
      ["f8f4ea", "e8e4d8", "d6cfc3", "b8a99a"],
      ["fff8f0", "ffe8d6", "ddbea9", "cb997e"],
      ["f4f1de", "e07a5f", "3d405b", "81b29a"],
      ["fef9ef", "e4c1f9", "d0f4de", "a9def9"],
      ["fbf8cc", "fde4cf", "ffcfd2", "f1c0e8"],
      ["f0efeb", "cfe1b9", "9cadce", "7ec4cf"],
      ["fff5e4", "ffe3e1", "ffd1d1", "ff9494"],
      ["e8f6ef", "d0e6df", "d5c6e0", "aa96da"],
      ["fef6e4", "f5e9cf", "e4d1b9", "8d7b68"],
      ["fdf6f0", "faddc8", "f4b393", "e88873"],
      ["f6f7eb", "e8c5e5", "d6a2e8", "b185db"],
      ["fefaf6", "ffe4d6", "ffb4a2", "e5989b"],
      ["f4f9f9", "ccf2f4", "a4ebf3", "aaaaaa"],
      ["fff0f5", "ffdde1", "ffc2d1", "fca3b7"]
    ],
    dark: [
      ["0d1b2a", "1b263b", "415a77", "778da9"],
      ["11151c", "1f2937", "374151", "6b7280"],
      ["10002b", "240046", "3c096c", "5a189a"],
      ["000814", "001d3d", "003566", "ffc300"],
      ["03071e", "370617", "6a040f", "9d0208"],
      ["14213d", "233d4d", "fca311", "e5e5e5"],
      ["191919", "222222", "2c2c2c", "e0e0e0"],
      ["0b132b", "1c2541", "3a506b", "5bc0be"],
      ["1a1a2e", "16213e", "0f3460", "e94560"],
      ["0f0f0f", "1a1a1a", "2b2b2b", "8c8c8c"],
      ["05070a", "13202e", "1e3140", "9db5c9"],
      ["12100e", "231f20", "3a3335", "8d8380"],
      ["080708", "3d2c2e", "543c52", "a997df"],
      ["0a0e0d", "133020", "1e4d2b", "88c9a1"],
      ["090909", "1c1c1c", "2e2e2e", "b0a695"],
      ["020202", "16161a", "23232e", "6f6fbe"],
      ["0e0e10", "1c1c24", "26262f", "ff6b6b"],
      ["06070a", "0e1420", "162032", "3f7cac"],
      ["050505", "111111", "1e1e1e", "d9c5a0"],
      ["0c0a1e", "1b1533", "2e2249", "8878c3"],
      ["1a120b", "3c2a21", "d5cea3", "e5e5cb"],
      ["030027", "350036", "8b1e3f", "db4c40"],
      ["101820", "1e2a38", "3e5c76", "748cab"],
      ["16161d", "26262e", "3b3b47", "6e6e80"],
      ["0f0e17", "232946", "393d3f", "eebbc3"],
      ["1a1423", "372549", "774c60", "b75d69"],
      ["0e1013", "1c2127", "323a45", "5c6b73"],
      ["120d17", "251b2f", "3d2c4a", "7c5e8f"]
    ],
    // seed set for the Popular tab (colorhunt's all-time favorites) -
    // used only until the live scrape of sort=popular takes over
    popular: [
      ["ff6b6b", "ffd93d", "6bcb77", "4d96ff"],
      ["264653", "2a9d8f", "e9c46a", "e76f51"],
      ["03045e", "0077b6", "00b4d8", "90e0ef"],
      ["ffcdb2", "ffb4a2", "e5989b", "b5838d"],
      ["606c38", "283618", "fefae0", "dda15e"],
      ["ef476f", "ffd166", "06d6a0", "118ab2"],
      ["2b2d42", "8d99ae", "edf2f4", "ef233c"],
      ["ff9f1c", "ffbf69", "ffffff", "cbf3f0"],
      ["540d6e", "ee4266", "ffd23f", "3bceac"],
      ["05668d", "028090", "00a896", "02c39a"],
      ["7400b8", "6930c3", "5e60ce", "5390d9"],
      ["ff595e", "ffca3a", "8ac926", "1982c4"],
      ["001219", "005f73", "0a9396", "94d2bd"],
      ["333333", "ea698b", "d55d92", "ac1f5d"],
      ["f72585", "7209b7", "3a0ca3", "4361ee"],
      ["ff006e", "fb5607", "ffbe0b", "8338ec"],
      ["1b998b", "2d3047", "fffd82", "ff9b71"],
      ["390099", "9e0059", "ff0054", "ff5400"],
      ["e63946", "f1faee", "a8dadc", "457b9d"],
      ["283d3b", "197278", "edddd4", "c44536"],
      ["ffb703", "fb8500", "023047", "219ebc"],
      ["3a86ff", "8338ec", "ff006e", "fb5607"],
      ["6a4c93", "1982c4", "8ac926", "ffca3a"],
      ["e29578", "ffddd2", "006d77", "83c5be"]
    ]
  };

function xhrGet(url, method, body, ok, err) {
  let x;
  try { x = new XMLHttpRequest(); } catch (e) { err && err(); return; }
  x.open(method || "GET", Proxy.wrap(url), true);
  if (method === "POST") x.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  x.onreadystatechange = () => {
    if (x.readyState === 4) {
      if (x.status >= 200 && x.status < 300) ok(x.responseText);
      else err && err("http " + x.status);
    }
  };
  try { x.send(body || null); } catch (e) { err && err("send failed"); }
}

// pulls any run of 4 hex codes sitting near each other. deliberately
// format-agnostic since there's no stable markup contract to rely on.
function extractQuads(text) {
  const re = /([0-9a-fA-F]{6})[^0-9a-zA-Z]{1,4}([0-9a-fA-F]{6})[^0-9a-zA-Z]{1,4}([0-9a-fA-F]{6})[^0-9a-zA-Z]{1,4}([0-9a-fA-F]{6})/g;
  const seen = new Set();
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const quad = [m[1], m[2], m[3], m[4]].map((s) => s.toLowerCase());
    const key = quad.join("-");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(quad);
  }
  return out;
}

function feedBody(theme, step) {
  if (theme === "popular") return `step=${step}&sort=popular&tags=&timeframe=`;
  return `step=${step}&sort=random&tags=${encodeURIComponent(theme)}&timeframe=`;
}

function scrapeLive(theme, step, cb) {
  xhrGet(FEED_URL, "POST", feedBody(theme, step), (text) => {
    const quads = extractQuads(text);
    if (quads.length) { cb(quads); return; }
    const pageUrl = theme === "popular" ? (PAGE_URL + "popular") : (PAGE_URL + theme);
    xhrGet(pageUrl, "GET", null, (text2) => {
      const quads2 = extractQuads(text2);
      cb(quads2.length ? quads2 : null);
    }, () => cb(null));
  }, () => cb(null));
}

function mergeUnique(base, extra) {
  const seen = new Set();
  const out = [];
  for (const q of [...base, ...extra]) {
    const k = q.join("-");
    if (!seen.has(k)) { seen.add(k); out.push(q); }
  }
  return out;
}

// pages through live-scraped + fallback combined, so a blocked proxy
// still serves the whole fallback set instead of looping the same
// four entries forever (that was the actual bug in the old version).
export class PaletteScraper {
  static FALLBACK = FALLBACK;
  #cache = new SmartCache("cpm_pool_cache_v1");
  #live = {}; // theme -> { live: [], feedStep, liveAttempts, liveDead }

  #state(theme) {
    if (!this.#live[theme]) {
      const cached = this.#cache.read(theme);
      this.#live[theme] = {
        live: cached ? cached.data.slice() : [],
        feedStep: 0,
        liveAttempts: 0,
        liveDead: false
      };
    }
    return this.#live[theme];
  }

  #pool(theme) {
    const st = this.#state(theme);
    return mergeUnique(st.live, FALLBACK[theme] || FALLBACK.pastel);
  }

  // cb(paletteArray, fromCache, noMore)
  fetchPage(theme, page, cb) {
    theme = theme || "pastel";
    const st = this.#state(theme);
    const need = (page + 1) * 4;

    const finish = () => {
      const pool = this.#pool(theme);
      const start = page * 4;
      const slice = pool.slice(start, start + 4);
      const givenUp = st.liveDead || st.liveAttempts >= MAX_LIVE_ATTEMPTS;
      const noMore = givenUp && (start + 4 >= pool.length);
      cb(slice, false, noMore);
    };

    const pool = this.#pool(theme);
    const givenUp = st.liveDead || st.liveAttempts >= MAX_LIVE_ATTEMPTS;
    if (pool.length >= need || givenUp) { finish(); return; }

    st.liveAttempts++;
    scrapeLive(theme, st.feedStep, (quads) => {
      st.feedStep++;
      if (quads && quads.length) {
        st.live = mergeUnique(st.live, quads);
        this.#cache.write(theme, st.live);
      } else {
        st.liveDead = true;
      }
      finish();
    });
  }
}
