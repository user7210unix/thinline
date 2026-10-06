import { Dom } from "../util/dom.js";
import { FontLoader } from "../fontloader/FontLoader.js";

const state = { cat: "sans", page: 0, loading: false, done: false };
let sentinel = null;
let observer = null;
const MAX_AUTOLOAD = 60;

function selectFont(family, rowEl) {
  FontLoader.applyFont(family);
  const lbl = document.getElementById("curFontLabel");
  if (lbl) lbl.innerHTML = family;
  FontLoader.saveChoice(family);
  document.querySelectorAll(".font-row").forEach((r) => { r.className = "font-row"; });
  if (rowEl) rowEl.className = "font-row selected";
}

function ensureSentinel(wrap) {
  if (!sentinel) {
    sentinel = document.createElement("div");
    sentinel.id = "fontSentinel";
    sentinel.style.height = "1px";
    if (observer) observer.observe(sentinel);
  }
  wrap.appendChild(sentinel);
}

function appendRows(list) {
  const wrap = document.getElementById("fontList");
  const saved = FontLoader.loadChoice();
  list.forEach((family) => {
    const row = document.createElement("div");
    row.className = "font-row";
    row.innerHTML = `<span class="font-name">${Dom.esc(family)}</span><span class="font-sample">Ag Bb Cc 0123</span>`;
    if (saved && saved.family === family) row.className = "font-row selected";
    row.onclick = () => selectFont(family, row);
    wrap.insertBefore(row, sentinel);
    if (state.cat !== "system") {
      const stack = `'${family}'`;
      row.querySelector(".font-name").style.fontFamily = stack;
      row.querySelector(".font-sample").style.fontFamily = stack;
      FontLoader.ensureLoaded(family);
    }
  });
  ensureSentinel(wrap);
}

function loadMore() {
  if (state.loading || state.done || state.page > MAX_AUTOLOAD) return;
  state.loading = true;
  const loading = document.getElementById("fontLoading");
  if (loading) loading.className = "combo-loading";

  FontLoader.fetchPage(state.cat, state.page, (list, noMore) => {
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
    const wrap = document.getElementById("fontList");
    if (wrap && sentinel && wrap.scrollHeight <= wrap.clientHeight + 4) loadMore();
  });
}

function reset() {
  const wrap = document.getElementById("fontList");
  wrap.innerHTML = "";
  sentinel = null;
  state.page = 0;
  state.done = false;
  const loading = document.getElementById("fontLoading");
  if (loading) loading.innerHTML = "loading more fonts&#8230;";
  loadMore();
}

export class FontCombo {
  static init() {
    const toggle = document.getElementById("fontToggle");
    const menu = document.getElementById("fontMenu");
    const listEl = document.getElementById("fontList");
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
        state.cat = this.getAttribute("data-cat");
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
  }
}
