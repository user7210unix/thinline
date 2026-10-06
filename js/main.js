import { Dom } from "./util/dom.js";
import { BoardApi } from "./board/BoardApi.js";
import { CatalogView } from "./board/CatalogView.js";
import { ThreadView } from "./board/ThreadView.js";
import { ColorPaletteManager } from "./colorpalette/ColorPaletteManager.js";
import { FontLoader } from "./fontloader/FontLoader.js";
import { FilterEngine } from "./filterengine/FilterEngine.js";
import { ThreadWatcher } from "./watcher/ThreadWatcher.js";
import { WatchWindow } from "./watcher/WatchWindow.js";
import { SplitView } from "./reader/SplitView.js";
import { LinkPreview } from "./preview/LinkPreview.js";
import { CursorPreview } from "./preview/CursorPreview.js";
import { Autosuggest } from "./ui/Autosuggest.js";
import { ContextMenu } from "./ui/ContextMenu.js";
import { Settings } from "./ui/Settings.js";
import { FilterPanel } from "./ui/FilterPanel.js";
import { HiddenPanel } from "./ui/HiddenPanel.js";
import { Header } from "./ui/Header.js";
import { Home } from "./ui/Home.js";
import { PostPreview } from "./preview/PostPreview.js";
import { WATCH_POLL_MS, STATUS_TICK_MS, TITLE_COM_LEN, KEY_ENTER } from "./config.js";
import { ViewControls } from "./ui/ViewControls.js";

const T0 = Date.now();

export class App {
  static BOARD = "";
  static THREAD = 0;
  static HIST = [];
  static VIEW_MODE = "index";
  static SHOW_FILTERED_ONLY = false;
  static SORT_MODE = "bump";
  static LAST_CATALOG_PAGES = null;

  static openSplitView(url) { SplitView.open(url); }
  static openSettings() { Settings.open(); }
  static notify(msg) { App.#status(msg); }

  static showHome() {
    App.BOARD = "";
    App.THREAD = 0;
    App.HIST = [];
    App.#clear();
    App.#status("");
    App.#updateBrand();
    Home.render();
  }

  static refreshView() {
    if (App.THREAD) App.loadThread(App.BOARD, App.THREAD);
    else App.rerenderBoardList();
  }

  static append(html) {
    const c = document.getElementById("content");
    if (c) c.innerHTML += html;
  }
  static #clear() {
    const c = document.getElementById("content");
    if (c) c.innerHTML = "";
  }
  static #status(msg) {
    const el = document.getElementById("status");
    if (el) el.innerHTML = msg || "";
  }
  static #modeline(text) {
    const el = document.getElementById("modeline");
    if (el) el.innerHTML = text;
  }

  static #tick() {
    const d = new Date();
    const pad2 = (n) => (n < 10 ? "0" : "") + n;
    const tm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
    const dt = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear() % 100}`;
    const loc = App.BOARD ? `/${App.BOARD}/${App.THREAD || "cat"}` : "-";
    const upSec = Math.floor((Date.now() - T0) / 1000);
    const up = upSec < 60 ? `${upSec}s` : `${Math.floor(upSec / 60)}m ${upSec % 60}s`;
    App.#modeline(`${loc} -- ${dt} ${tm} -- req:${BoardApi.REQ} -- up ${up} --`);
  }

  static #updateBrand() {
    const el = document.getElementById("brandBoard");
    if (!el) return;
    if (App.BOARD && BoardApi.BOARDS_MAP[App.BOARD]) {
      el.innerHTML = `<span class="brand-code">/${App.BOARD}/</span> ${Dom.esc(BoardApi.BOARDS_MAP[App.BOARD])}`;
    } else if (App.BOARD) {
      el.innerHTML = `<span class="brand-code">/${App.BOARD}/</span>`;
    } else {
      el.innerHTML = "";
    }
    Header.renderPinned();
    App.#updateTitle();
  }

  static #updateTitle() {
    if (App.BOARD) document.title = `/${App.BOARD}/${BoardApi.BOARDS_MAP[App.BOARD] ? " - " + BoardApi.BOARDS_MAP[App.BOARD] : ""}`;
    else document.title = "thinline";
  }

  static updateThreadTitle(op) {
    const t = op.sub ? Dom.decodeEnts(op.sub) : Dom.strip(Dom.decodeEnts(op.com || "")).substring(0, TITLE_COM_LEN);
    document.title = `${t ? t + " - " : ""}/${App.BOARD}/ No.${op.no}`;
  }

  static loadCatalog(board) {
    board = (board || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!board) { App.#status("board?"); return; }
    App.BOARD = board;
    App.THREAD = 0;
    App.HIST.push({ t: "c", b: board });
    App.#clear();
    App.#status("loading...");
    App.#updateBrand();

    BoardApi.fetchCatalog(board, (d, stale, err) => {
      if (err) { App.#status(err); App.append(`<div class="error">${err}</div>`); return; }
      App.#status(stale ? "(cached)" : "");
      App.LAST_CATALOG_PAGES = d;
      App.#clear();
      CatalogView.render(board, d);
    });
  }

  static rerenderBoardList() {
    if (App.BOARD && !App.THREAD && App.LAST_CATALOG_PAGES) {
      App.#clear();
      CatalogView.render(App.BOARD, App.LAST_CATALOG_PAGES);
    }
  }

  static loadThread(board, no) {
    board = (board || App.BOARD || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    no = parseInt(no, 10);
    if (!board || !no) { App.#status("need board+no"); return; }
    App.BOARD = board;
    App.THREAD = no;
    App.HIST.push({ t: "t", b: board, n: no });
    App.#clear();
    App.#status(`loading ${no}`);
    App.#updateBrand();

    BoardApi.fetchThread(board, no, (posts, stale, err) => {
      if (err) { App.#status(err); App.append(`<div class="error">${err}</div>`); return; }
      App.#status(stale ? "(cached)" : "");
      App.#clear();
      ThreadView.render(board, posts);
    });
  }

  static back() {
    if (App.HIST.length < 2) { App.showHome(); return; }
    App.HIST.pop();
    const p = App.HIST[App.HIST.length - 1];
    if (!p) return;
    if (p.t === "c") App.loadCatalog(p.b);
    else App.loadThread(p.b, p.n);
  }

  static loadViewMode() {
    try { return localStorage.getItem("view_mode_v1") || "index"; } catch (e) { return "index"; }
  }
  static setViewMode(mode) {
    App.VIEW_MODE = mode;
    try { localStorage.setItem("view_mode_v1", mode); } catch (e) {}
    document.querySelectorAll("#viewSeg button").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-mode") === mode);
    });
    App.rerenderBoardList();
  }

  static loadSortMode() {
    try { return localStorage.getItem("sort_mode_v1") || "bump"; } catch (e) { return "bump"; }
  }
  static saveSortMode(v) {
    try { localStorage.setItem("sort_mode_v1", v); } catch (e) {}
  }

  static async #init() {
    ColorPaletteManager.init();
    FontLoader.init();
    FilterEngine.init();

    const boardInput = document.getElementById("boardInput");
    const goBtn = document.getElementById("btnCatalog");
    const backBtn = document.getElementById("btnBack");
    goBtn.onclick = () => App.loadCatalog(boardInput.value);
    backBtn.onclick = () => App.back();
    boardInput.onkeydown = (e) => {
      if (e.key === KEY_ENTER) App.loadCatalog(boardInput.value);
    };

    Autosuggest.init();
    BoardApi.loadBoards(() => App.#updateBrand());
    Settings.init();
    FilterPanel.init();
    HiddenPanel.init();
    Header.init();
    PostPreview.init();
    ViewControls.initViewToggle();
    ViewControls.initSortControl();
    LinkPreview.init();
    LinkPreview.initActionPopup();
    ContextMenu.init();
    CursorPreview.init();
    WatchWindow.initControls();
    WatchWindow.initDrag();
    WatchWindow.render();

    ThreadWatcher.poll(() => WatchWindow.render());
    setInterval(() => ThreadWatcher.poll(() => WatchWindow.render()), WATCH_POLL_MS);

    setInterval(() => App.#tick(), STATUS_TICK_MS);
    App.#tick();
    App.showHome();
  }

  static start() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => App.#init());
    } else {
      App.#init();
    }
  }
}

App.start();
