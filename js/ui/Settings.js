import { FontLoader } from "../fontloader/FontLoader.js";
import { BoardApi } from "../board/BoardApi.js";
import { PaletteCombo } from "./PaletteCombo.js";
import { FontCombo } from "./FontCombo.js";

function boolPref(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch (e) { return fallback; }
}
function setBoolPref(key, v) {
  try { localStorage.setItem(key, v ? "1" : "0"); } catch (e) {}
}
function intPref(key, fallback) {
  try { const v = parseInt(localStorage.getItem(key), 10); return isNaN(v) ? fallback : v; }
  catch (e) { return fallback; }
}
function setIntPref(key, v) {
  try { localStorage.setItem(key, String(v)); } catch (e) {}
}

export class Settings {
  static hideMd5Enabled() { return boolPref("hide_md5", true); }
  static linkPreviewEnabled() { return boolPref("link_preview_enabled", true); }

  static #applyHideMd5(on) {
    document.body.className = (document.body.className || "").replace(/\bhide-md5\b/g, "").trim();
    if (on) document.body.className = (document.body.className + " hide-md5").trim();
  }

  static #applyRadius(v) {
    document.documentElement.style.setProperty("--ui-radius", v + "px");
    const lbl = document.getElementById("radiusVal");
    if (lbl) lbl.innerHTML = v;
    const sl = document.getElementById("radiusSlider");
    if (sl) sl.value = v;
  }

  static #applyShadow(on) {
    document.documentElement.style.setProperty("--ui-shadow", on ? "0 3px 10px rgba(0,0,0,.10)" : "none");
  }

  static #applyWatchShadow(on) {
    document.documentElement.style.setProperty("--watch-shadow", on ? "0 10px 30px rgba(0,0,0,.25)" : "none");
  }

  static #applyStatusBar(on) {
    const el = document.getElementById("modeline");
    if (el) el.style.display = on ? "" : "none";
  }

  static #applyColumns(n) {
    document.documentElement.style.setProperty("--index-columns", n);
    document.querySelectorAll("#columnsSeg button").forEach((btn) => {
      btn.className = parseInt(btn.getAttribute("data-cols"), 10) === n ? "active" : "";
    });
  }

  static #applyFontSize(px) {
    document.documentElement.style.setProperty("--ui-fontsize", px + "px");
    const lbl = document.getElementById("fontSizeVal");
    if (lbl) lbl.innerHTML = px;
    const sl = document.getElementById("fontSizeSlider");
    if (sl) sl.value = px;
  }

  static init() {
    const gear = document.getElementById("gearBtn");
    const panel = document.getElementById("settings");
    const closeBtn = document.getElementById("closeSettings");
    if (gear) gear.onclick = () => { panel.className = "open"; };
    if (closeBtn) closeBtn.onclick = () => { panel.className = ""; };

    Settings.#applyFontSize(FontLoader.loadSize());
    const savedFont = FontLoader.loadChoice();
    FontLoader.applyFont(savedFont && savedFont.family ? savedFont.family : "Plus Jakarta Sans");
    const fontLbl = document.getElementById("curFontLabel");
    if (fontLbl) fontLbl.innerHTML = savedFont && savedFont.family ? savedFont.family : "Plus Jakarta Sans";

    const sizeSlider = document.getElementById("fontSizeSlider");
    if (sizeSlider) sizeSlider.oninput = function () {
      Settings.#applyFontSize(this.value);
      FontLoader.saveSize(parseInt(this.value, 10));
    };

    Settings.#applyRadius(intPref("ui_radius_v1", 0));
    const radiusSlider = document.getElementById("radiusSlider");
    if (radiusSlider) radiusSlider.oninput = function () {
      Settings.#applyRadius(this.value);
      setIntPref("ui_radius_v1", parseInt(this.value, 10));
    };

    const shadowOn = boolPref("ui_shadow_v1", false);
    Settings.#applyShadow(shadowOn);
    const shadowChk = document.getElementById("shadowChk");
    if (shadowChk) {
      shadowChk.checked = shadowOn;
      shadowChk.onchange = function () { Settings.#applyShadow(this.checked); setBoolPref("ui_shadow_v1", this.checked); };
    }

    const watchShadowOn = boolPref("watch_shadow_v1", true);
    Settings.#applyWatchShadow(watchShadowOn);
    const watchShadowChk = document.getElementById("watchShadowChk");
    if (watchShadowChk) {
      watchShadowChk.checked = watchShadowOn;
      watchShadowChk.onchange = function () { Settings.#applyWatchShadow(this.checked); setBoolPref("watch_shadow_v1", this.checked); };
    }

    const statusBarOn = boolPref("status_bar_v1", true);
    Settings.#applyStatusBar(statusBarOn);
    const statusBarChk = document.getElementById("statusBarChk");
    if (statusBarChk) {
      statusBarChk.checked = statusBarOn;
      statusBarChk.onchange = function () { Settings.#applyStatusBar(this.checked); setBoolPref("status_bar_v1", this.checked); };
    }

    Settings.#applyColumns(intPref("index_columns_v1", 1));
    document.querySelectorAll("#columnsSeg button").forEach((btn) => {
      btn.onclick = function () {
        const n = parseInt(this.getAttribute("data-cols"), 10);
        Settings.#applyColumns(n);
        setIntPref("index_columns_v1", n);
      };
    });

    const md5On = Settings.hideMd5Enabled();
    Settings.#applyHideMd5(md5On);
    const md5Chk = document.getElementById("hideMd5Chk");
    if (md5Chk) {
      md5Chk.checked = md5On;
      md5Chk.onchange = function () { Settings.#applyHideMd5(this.checked); setBoolPref("hide_md5", this.checked); };
    }

    const lpChk = document.getElementById("linkPreviewChk");
    if (lpChk) {
      lpChk.checked = Settings.linkPreviewEnabled();
      lpChk.onchange = function () { setBoolPref("link_preview_enabled", this.checked); };
    }

    const clearBtn = document.getElementById("btnClearCache");
    if (clearBtn) clearBtn.onclick = () => {
      BoardApi.clearCache();
      const statusEl = document.getElementById("status");
      if (statusEl) statusEl.innerHTML = "cache cleared";
    };

    PaletteCombo.init();
    FontCombo.init();
  }
}
