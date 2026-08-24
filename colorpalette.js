/*
 * colorpalette.js
 * ---------------------------------------------------------------
 * Self-contained module that owns EVERYTHING related to color:
 *   - scraping palettes from colorhunt.co (pastel + dark)
 *   - a smart (stale-while-revalidate) cache so we don't hammer
 *     the network every time the combobox is opened
 *   - persisting the user's chosen palette across reloads
 *   - turning a 4-color palette into the CSS custom properties
 *     that drive the entire UI
 *
 * Nothing in here touches DOM structure of the reader itself -
 * it only ever writes to document.documentElement.style and to
 * the combobox markup it owns. Everything else (fonts, filters,
 * layout, board logic) lives in reader.html.
 * ---------------------------------------------------------------
 */

var ColorPaletteManager = (function () {

  "use strict";

  var PROXY = "https://chan-proxy.anonnousmes.workers.dev/?url=";
  var FEED_URL = "https://colorhunt.co/php/feed.php";
  var PAGE_URL = "https://colorhunt.co/palettes/";

  var LS_CHOICE = "cpm_choice_v1";     // the palette the user picked
  var LS_CACHE = "cpm_cache_v1";       // { key: { t: ts, data: [...] } }

  var CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // palettes barely change - 7d fresh
  var CACHE_STALE_OK = 1000 * 60 * 60 * 24 * 30; // still usable (stale) for 30d

  /* ---------------------------------------------------------------
   * A hand-picked fallback set - big enough that scrolling through
   * the combobox doesn't feel repetitive even when the live scrape
   * comes up empty (colorhunt has no documented public API, so the
   * live attempt is always best-effort - see scrapeLive below).
   * ------------------------------------------------------------- */
  var FALLBACK = {
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
      ["f6e8ea", "eaadc5", "cbaacb", "97a2ff"],
      ["fefbf6", "f5e0c3", "e6a4b4", "b392ac"],
      ["f9f5f6", "f8e8ee", "fdcedf", "f2bed1"],
      ["eef7ff", "cddafd", "bde0fe", "a2d2ff"],
      ["fffaf0", "fcefdc", "f8d9c4", "f4b393"],
      ["f4fff8", "d8f3dc", "b7e4c7", "95d5b2"],
      ["fff0f5", "ffdde1", "ffc2d4", "ff8fab"],
      ["f7ede2", "f0dbdb", "d3cedf", "b8bedd"],
      ["fdf6ec", "faedcd", "e9edc9", "ccd5ae"],
      ["fefefe", "e2ece9", "cdb4db", "ffc8dd"]
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
      ["04070d", "0c1220", "16233a", "5c7cfa"],
      ["0a0908", "1e1a17", "352f2c", "c9a66b"],
      ["030303", "0d0d0d", "1a1a1a", "e0b0ff"],
      ["07090f", "121722", "1d2333", "4cc9f0"],
      ["0b0c10", "1f2833", "2c3e50", "66fcf1"],
      ["09111a", "12232e", "1c313a", "4f7d80"],
      ["0d0d0d", "1a0f0f", "331a1a", "cc3333"],
      ["0a0a0f", "141420", "1f1f30", "7b68ee"],
      ["020508", "0a1520", "13293d", "3e8ed0"],
      ["050403", "141110", "24201d", "b08968"]
    ]
  };

  function hexToRgb(h) {
    h = h.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function luminance(hex) {
    var c = hexToRgb(hex);
    var a = [c.r, c.g, c.b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }

  function contrastRatio(h1, h2) {
    var l1 = luminance(h1) + 0.05;
    var l2 = luminance(h2) + 0.05;
    return l1 > l2 ? l1 / l2 : l2 / l1;
  }

  /* -------------------- persistence helpers -------------------- */

  function lsGet(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }

  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* -------------------- smart cache -------------------- */
  /* stale-while-revalidate: return cached data immediately (even if
     stale) so the UI never blocks, then refresh in the background
     and hand fresh data to a callback if it changed. */

  function cacheRead(key) {
    var all = lsGet(LS_CACHE, {});
    return all[key] || null;
  }

  function cacheWrite(key, data) {
    var all = lsGet(LS_CACHE, {});
    all[key] = { t: new Date().getTime(), data: data };
    // keep the cache from growing forever
    var keys = [];
    for (var k in all) if (all.hasOwnProperty(k)) keys.push(k);
    if (keys.length > 40) {
      keys.sort(function (a, b) { return all[a].t - all[b].t; });
      delete all[keys[0]];
    }
    lsSet(LS_CACHE, all);
  }

  function cacheAge(entry) {
    return new Date().getTime() - entry.t;
  }

  /* -------------------- network scrape -------------------- */

  function px(u) { return PROXY + encodeURIComponent(u); }

  function xhrGet(url, method, body, ok, err) {
    var x;
    try { x = new XMLHttpRequest(); } catch (e) { err && err(); return; }
    x.open(method || "GET", px(url), true);
    if (method === "POST") {
      x.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    }
    x.onreadystatechange = function () {
      if (x.readyState === 4) {
        if (x.status >= 200 && x.status < 300) ok(x.responseText);
        else err && err("http " + x.status);
      }
    };
    try { x.send(body || null); } catch (e) { err && err("send failed"); }
  }

  // Pull out any run of 4 hex-color codes that sit near each other -
  // this is deliberately format-agnostic (works whether the source
  // is data-code="aa-bb-cc-dd", JSON "code":"aa-bb-cc-dd", or plain
  // markup) since colorhunt exposes no stable/public API.
  function extractQuads(text) {
    var out = [];
    var re = /([0-9a-fA-F]{6})[^0-9a-zA-Z]{1,4}([0-9a-fA-F]{6})[^0-9a-zA-Z]{1,4}([0-9a-fA-F]{6})[^0-9a-zA-Z]{1,4}([0-9a-fA-F]{6})/g;
    var m;
    var seen = {};
    while ((m = re.exec(text)) !== null) {
      var quad = [m[1].toLowerCase(), m[2].toLowerCase(), m[3].toLowerCase(), m[4].toLowerCase()];
      var key = quad.join("-");
      if (seen[key]) continue;
      seen[key] = 1;
      out.push(quad);
    }
    return out;
  }

  function scrapeLive(theme, step, cb) {
    var body = "step=" + step + "&sort=random&tags=" + encodeURIComponent(theme) + "&timeframe=";
    xhrGet(FEED_URL, "POST", body, function (text) {
      var quads = extractQuads(text);
      if (quads.length) { cb(quads); return; }
      // fall through to scraping the rendered gallery page as a second try
      xhrGet(PAGE_URL + theme, "GET", null, function (text2) {
        var quads2 = extractQuads(text2);
        cb(quads2.length ? quads2 : null);
      }, function () { cb(null); });
    }, function () {
      cb(null);
    });
  }

  function mergeUnique(base, extra) {
    var seen = {};
    var out = [];
    base.concat(extra).forEach(function (q) {
      var k = q.join("-");
      if (!seen[k]) { seen[k] = 1; out.push(q); }
    });
    return out;
  }

  /* -------------------- public: fetch a page of 4 -------------------- */

  // theme: "pastel" | "dark"
  // page:  0-based page index, 4 palettes per page
  // cb(paletteArray, fromCache, noMore)
  //   noMore === true means the pool is exhausted - the caller
  //   should stop requesting further pages for this theme instead
  //   of looping back over the same swatches (that was the repeat
  //   bug: padding with a modulo wrap kept serving duplicates
  //   forever once the pool ran out).
  function fetchPage(theme, page, cb) {
    var cacheKey = "palettes:" + theme;
    var entry = cacheRead(cacheKey);
    var pool = entry ? entry.data.slice() : [];
    if (!pool.length) pool = (FALLBACK[theme] || FALLBACK.pastel).slice();

    function serveFromPool(p) {
      var start = page * 4;
      var slice = p.slice(start, start + 4);
      var noMore = start + 4 >= p.length;
      if (slice.length < 4 && p.length) {
        // only pads if the pool itself is smaller than one page -
        // never wraps back to the start, so nothing repeats
        var fb = FALLBACK[theme] || FALLBACK.pastel;
        for (var i = 0; i < fb.length && slice.length < 4; i++) {
          var dup = false;
          for (var j = 0; j < slice.length; j++) if (slice[j].join(",") === fb[i].join(",")) dup = true;
          if (!dup) slice.push(fb[i]);
        }
        noMore = true;
      }
      return { slice: slice, noMore: noMore };
    }

    if (entry && cacheAge(entry) < CACHE_TTL) {
      // fresh cache - serve immediately, no network call needed
      var r1 = serveFromPool(pool);
      cb(r1.slice, true, r1.noMore);
      return;
    }

    if (entry && cacheAge(entry) < CACHE_STALE_OK) {
      // stale but usable: serve now, refresh quietly in the background
      var r2 = serveFromPool(pool);
      cb(r2.slice, true, r2.noMore);
      scrapeLive(theme, page, function (quads) {
        if (quads && quads.length) {
          var merged = mergeUnique(pool, quads);
          cacheWrite(cacheKey, merged);
        }
      });
      return;
    }

    // nothing usable cached - try live, fall back to bundled palettes
    scrapeLive(theme, page, function (quads) {
      var merged = quads && quads.length ? mergeUnique(pool, quads) : pool;
      if (!merged.length) merged = FALLBACK[theme] || FALLBACK.pastel;
      cacheWrite(cacheKey, merged);
      var r3 = serveFromPool(merged);
      cb(r3.slice, !quads, r3.noMore);
    });
  }

  /* -------------------- applying a palette to the UI -------------------- */

  // Sorts the 4 colors by luminance and derives semantic roles.
  // `mode` ("light" | "dark") is authoritative when supplied - it
  // comes straight from which combobox tab (pastel/dark) the color
  // was picked from, so a "dark" palette always gets a dark
  // background even when its 4 colors, taken alone, would look
  // lighter on average (this was the bug: guessing purely from
  // in-palette luminance sums misclassified plenty of legitimate
  // dark palettes as "light" because their brightest accent color
  // outweighed the two darkest ones in the sum).
  function applyPalette(colors, opts) {
    opts = opts || {};
    var sorted = colors.slice().sort(function (a, b) {
      return luminance(a) - luminance(b);
    });
    var darkest = sorted[0], low = sorted[1], high = sorted[2], lightest = sorted[3];

    var isLight;
    if (opts.mode === "light") isLight = true;
    else if (opts.mode === "dark") isLight = false;
    else isLight = luminance(lightest) + luminance(high) > luminance(darkest) + luminance(low);

    var bg, bgAlt, fg, fgMuted, accent, border;
    if (isLight) {
      bg = lightest; bgAlt = high; fg = darkest; fgMuted = low; accent = low; border = high;
    } else {
      bg = darkest; bgAlt = low; fg = lightest; fgMuted = high; accent = high; border = low;
    }

    // make sure text/background always stay legible regardless of
    // what four colors we happened to scrape
    if (contrastRatio(bg, fg) < 3.5) {
      fg = isLight ? "1a1a1a" : "f2f2f2";
    }

    var root = document.documentElement.style;
    root.setProperty("--c-bg", "#" + bg);
    root.setProperty("--c-bg-alt", "#" + bgAlt);
    root.setProperty("--c-fg", "#" + fg);
    root.setProperty("--c-fg-muted", "#" + fgMuted);
    root.setProperty("--c-accent", "#" + accent);
    root.setProperty("--c-border", "#" + border);
    root.setProperty("--c-link", "#" + accent);
    document.documentElement.setAttribute("data-theme-mode", isLight ? "light" : "dark");
  }

  function saveChoice(colors, theme) {
    lsSet(LS_CHOICE, { colors: colors, theme: theme || "" });
  }

  function loadChoice() {
    return lsGet(LS_CHOICE, null);
  }

  function modeForTheme(theme) {
    return theme === "dark" ? "dark" : "light";
  }

  function init() {
    var choice = loadChoice();
    if (choice && choice.colors) applyPalette(choice.colors, { mode: modeForTheme(choice.theme) });
    else applyPalette(FALLBACK.pastel[0], { mode: "light" });
  }

  return {
    fetchPage: fetchPage,
    applyPalette: applyPalette,
    saveChoice: saveChoice,
    loadChoice: loadChoice,
    modeForTheme: modeForTheme,
    init: init,
    FALLBACK: FALLBACK
  };

})();
