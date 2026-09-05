import { ColorPaletteManager } from "../colorpalette/ColorPaletteManager.js";

const state = { theme: "pastel", page: 0, loading: false, done: false };
let sentinel = null;
let observer = null;
const MAX_AUTOLOAD = 500; // safety valve, not a "how many palettes" cap

function swatchHtml(colors) {
  return colors.map((c) => `<i style="background:#${c}"></i>`).join("");
}

function selectPalette(colors, rowEl) {
  ColorPaletteManager.applyPalette(colors, { mode: ColorPaletteManager.modeForTheme(state.theme) });
  ColorPaletteManager.saveChoice(colors, state.theme);
  document.getElementById("curSwatch").innerHTML = swatchHtml(colors);
  document.querySelectorAll(".palette-row").forEach((r) => { r.className = "palette-row"; });
  if (rowEl) rowEl.className = "palette-row selected";
}

function ensureSentinel(wrap) {
  if (!sentinel) {
    sentinel = document.createElement("div");
    sentinel.id = "paletteSentinel";
    sentinel.style.height = "1px";
    if (observer) observer.observe(sentinel);
  }
  wrap.appendChild(sentinel);
}

function appendRows(list) {
  const wrap = document.getElementById("paletteList");
  const saved = ColorPaletteManager.loadChoice();
  list.forEach((colors) => {
    const row = document.createElement("div");
    row.className = "palette-row";
    row.innerHTML = swatchHtml(colors);
    if (saved && saved.colors && saved.colors.join(",") === colors.join(",")) row.className = "palette-row selected";
    row.onclick = () => selectPalette(colors, row);
    wrap.insertBefore(row, sentinel);
  });
  ensureSentinel(wrap);
}

function loadMore() {
  if (state.loading || state.done || state.page > MAX_AUTOLOAD) return;
  state.loading = true;
  const loading = document.getElementById("paletteLoading");
  if (loading) loading.className = "combo-loading";

  ColorPaletteManager.fetchPage(state.theme, state.page, (list, fromCache, noMore) => {
    appendRows(list);
    state.page++;
    state.loading = false;
    if (noMore) {
      state.done = true;
      if (observer && sentinel) observer.unobserve(sentinel);
      if (loading) { loading.innerHTML = "end of list"; loading.className = "combo-loading"; }
      return;
    }
    if (loading) loading.className = "combo-loading hidden";
    const wrap = document.getElementById("paletteList");
    if (wrap && sentinel && wrap.scrollHeight <= wrap.clientHeight + 4) loadMore();
  });
}

function reset() {
  const wrap = document.getElementById("paletteList");
  wrap.innerHTML = "";
  sentinel = null;
  state.page = 0;
  state.done = false;
  const loading = document.getElementById("paletteLoading");
  if (loading) loading.innerHTML = "loading more palettes&#8230;";
  loadMore();
}

export class PaletteCombo {
  static init() {
    const toggle = document.getElementById("paletteToggle");
    const menu = document.getElementById("paletteMenu");
    const listEl = document.getElementById("paletteList");
    const tabs = menu.querySelectorAll(".combo-tabs button");

    if (toggle) toggle.onclick = () => {
      const open = !menu.className.includes("hidden");
      menu.className = open ? "combo-menu hidden" : "combo-menu";
      if (!open && !listEl.children.length) loadMore();
    };

    tabs.forEach((tab) => {
      tab.onclick = function () {
        tabs.forEach((t) => { t.className = "tab"; });
        this.className = "tab active";
        state.theme = this.getAttribute("data-theme");
        reset();
      };
    });

    if (listEl && window.IntersectionObserver) {
      observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) loadMore();
      }, { root: listEl, rootMargin: "60px", threshold: 0 });
    }
    if (listEl) listEl.onscroll = () => {
      if (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 30) loadMore();
    };

    const saved = ColorPaletteManager.loadChoice();
    if (saved && saved.colors) {
      document.getElementById("curSwatch").innerHTML = swatchHtml(saved.colors);
      if (saved.theme) {
        state.theme = saved.theme;
        tabs.forEach((t) => { t.className = t.getAttribute("data-theme") === saved.theme ? "tab active" : "tab"; });
      }
    } else {
      document.getElementById("curSwatch").innerHTML = swatchHtml(ColorPaletteManager.FALLBACK.pastel[0]);
    }
  }
}
