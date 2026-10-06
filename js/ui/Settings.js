import { FontLoader } from "../fontloader/FontLoader.js";
import { BoardApi } from "../board/BoardApi.js";
import { PaletteGrid } from "./PaletteGrid.js";
import { FontCombo } from "./FontCombo.js";
import { Header } from "./Header.js";
import { DEFAULT_PINNED_BOARDS, KEY_ESCAPE } from "../config.js";

const SHADOW_CARD = "0 3px 10px rgba(0,0,0,.12)";
const SHADOW_WATCH = "0 10px 30px rgba(0,0,0,.28)";
const DEFAULT_FONT = "Plus Jakarta Sans";

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
function strPref(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v; }
  catch (e) { return fallback; }
}
function setPref(key, v) {
  try { localStorage.setItem(key, String(v)); } catch (e) {}
}

function bindCheck(id, key, fallback, apply) {
  const el = document.getElementById(id);
  const on = boolPref(key, fallback);
  if (apply) apply(on);
  el.checked = on;
  el.onchange = () => { if (apply) apply(el.checked); setBoolPref(key, el.checked); };
}

const root = () => document.documentElement.style;

export class Settings {
  static hideMd5Enabled() { return boolPref("hide_md5", true); }
  static linkPreviewEnabled() { return boolPref("link_preview_enabled", true); }
  static postPreviewEnabled() { return boolPref("post_preview_enabled", true); }
  static pinnedBoards() {
    return strPref("pinned_boards_v1", DEFAULT_PINNED_BOARDS).split(",").map((b) => b.trim().toLowerCase()).filter(Boolean);
  }

  static open() { document.getElementById("settingsOverlay").classList.remove("hidden"); }
  static close() { document.getElementById("settingsOverlay").classList.add("hidden"); }

  static #applyRadius(v) {
    root().setProperty("--ui-radius", v + "px");
    document.getElementById("radiusVal").innerHTML = v;
    document.getElementById("radiusSlider").value = v;
  }

  static #applyFontSize(px) {
    root().setProperty("--ui-fontsize", px + "px");
    document.getElementById("fontSizeVal").innerHTML = px;
    document.getElementById("fontSizeSlider").value = px;
  }

  static #applyColumns(n) {
    root().setProperty("--index-columns", n);
    document.querySelectorAll("#columnsSeg button").forEach((btn) => {
      btn.classList.toggle("active", parseInt(btn.getAttribute("data-cols"), 10) === n);
    });
  }

  static #initTabs() {
    const tabs = document.querySelectorAll("#settingsTabs button");
    const pages = document.querySelectorAll(".settings-pages section");
    tabs.forEach((tab) => {
      tab.onclick = () => {
        const name = tab.getAttribute("data-tab");
        tabs.forEach((t) => t.classList.toggle("active", t === tab));
        pages.forEach((p) => p.classList.toggle("active", p.getAttribute("data-page") === name));
      };
    });
  }

  static #initAppearance() {
    Settings.#applyFontSize(FontLoader.loadSize());
    document.getElementById("fontSizeSlider").oninput = function () {
      Settings.#applyFontSize(this.value);
      FontLoader.saveSize(parseInt(this.value, 10));
    };

    Settings.#applyRadius(intPref("ui_radius_v1", 0));
    document.getElementById("radiusSlider").oninput = function () {
      Settings.#applyRadius(this.value);
      setPref("ui_radius_v1", this.value);
    };

    Settings.#applyColumns(intPref("index_columns_v1", 1));
    document.querySelectorAll("#columnsSeg button").forEach((btn) => {
      btn.onclick = () => {
        const n = parseInt(btn.getAttribute("data-cols"), 10);
        Settings.#applyColumns(n);
        setPref("index_columns_v1", n);
      };
    });

    bindCheck("shadowChk", "ui_shadow_v1", false, (on) => root().setProperty("--ui-shadow", on ? SHADOW_CARD : "none"));

    const pinned = document.getElementById("pinnedInput");
    pinned.value = Settings.pinnedBoards().join(",");
    pinned.onchange = () => {
      setPref("pinned_boards_v1", pinned.value);
      Header.renderPinned();
    };
  }

  static #initBehavior() {
    bindCheck("hideMd5Chk", "hide_md5", true, (on) => document.body.classList.toggle("hide-md5", on));
    bindCheck("postPreviewChk", "post_preview_enabled", true);
    bindCheck("linkPreviewChk", "link_preview_enabled", true);
    bindCheck("watchShadowChk", "watch_shadow_v1", true, (on) => root().setProperty("--watch-shadow", on ? SHADOW_WATCH : "none"));
    bindCheck("statusBarChk", "status_bar_v1", true, (on) => {
      document.getElementById("modeline").style.display = on ? "" : "none";
    });

    document.getElementById("btnClearCache").onclick = () => {
      BoardApi.clearCache();
      document.getElementById("status").innerHTML = "cache cleared";
    };
  }

  static init() {
    document.getElementById("gearBtn").onclick = Settings.open;
    document.getElementById("closeSettings").onclick = Settings.close;
    const overlay = document.getElementById("settingsOverlay");
    overlay.onclick = (e) => { if (e.target === overlay) Settings.close(); };
    document.addEventListener("keydown", (e) => { if (e.key === KEY_ESCAPE) Settings.close(); });

    const saved = FontLoader.loadChoice();
    const family = saved && saved.family ? saved.family : DEFAULT_FONT;
    FontLoader.applyFont(family);
    document.getElementById("curFontLabel").innerHTML = family;

    Settings.#initTabs();
    Settings.#initAppearance();
    Settings.#initBehavior();
    PaletteGrid.init();
    FontCombo.init();
  }
}
