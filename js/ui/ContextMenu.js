import { Dom } from "../util/dom.js";
import { Linkify } from "../board/Linkify.js";
import { HiddenStore } from "../board/HiddenStore.js";
import { ThreadView } from "../board/ThreadView.js";
import { Archives } from "../board/Archives.js";
import { FilterEngine } from "../filterengine/FilterEngine.js";
import { SplitView } from "../reader/SplitView.js";
import {
  VIEWPORT_MARGIN, CONTEXT_MENU_WIDTH, CONTEXT_MENU_ROW_H, CONTEXT_MENU_MAX_H, CONTEXT_MENU_PAD
} from "../config.js";
import { App } from "../main.js";

let nativeNext = false;

function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text); return; }
  } catch (e) {}
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.className = "offscreen";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch (e) {}
  document.body.removeChild(ta);
}

function closestByAttr(el, attr, value) {
  return el && el.closest ? el.closest(`[${attr}="${value}"]`) : null;
}

const item = (icon, label, fn) => ({ icon, label, fn });
const sep = () => ({ sep: true });
const head = (label) => ({ head: label });

function reloadView() {
  if (App.THREAD) App.loadThread(App.BOARD, App.THREAD);
  else App.rerenderBoardList();
}

function addFilter(line) {
  FilterEngine.addRule(line);
  reloadView();
}

function filterItems(post) {
  const items = [];
  const esc = FilterEngine.escapeRegex;
  const name = Dom.decodeEnts(Dom.strip(post.name || ""));
  const sub = Dom.decodeEnts(Dom.strip(post.sub || ""));
  if (name && name !== "Anonymous") items.push(item("fa-solid fa-user-slash", "Filter this name", () => addFilter(`/^${esc(name)}$/;type:name`)));
  if (post.trip) items.push(item("fa-solid fa-hashtag", "Filter this tripcode", () => addFilter(`/${esc(post.trip)}/;type:tripcode`)));
  if (sub) items.push(item("fa-solid fa-filter", "Filter this subject", () => addFilter(`/${esc(sub)}/i;type:subject;op:only`)));
  if (post.filename) items.push(item("fa-solid fa-file-circle-xmark", "Filter this file name", () => addFilter(`/${esc(post.filename)}/;type:filename`)));
  return items;
}

function postItems(postEl) {
  const b = postEl.getAttribute("data-b"), tn = postEl.getAttribute("data-thread"), no = postEl.getAttribute("data-n");
  const post = ThreadView.getPost(parseInt(no, 10)) || {};
  const comEl = postEl.querySelector(".post-com");
  const hidden = HiddenStore.isPostHidden(b, tn, no);
  const isOp = no === tn;
  const items = [
    head(`post No.${no}`),
    item("fa-solid fa-table-columns", "Open in split view", () => SplitView.openPost(no)),
    item("fa-solid fa-link", "Copy post link", () => copyText(`${location.href.split("#")[0]}#p${no}`)),
    item("fa-solid fa-copy", "Copy post text", () => copyText(comEl ? Dom.strip(comEl.innerHTML) : "")),
    item("fa-solid fa-box-archive", "View thread in archive", () => window.open(Archives.urlFor(b, tn), "_blank")),
    sep(),
    item(hidden ? "fa-solid fa-eye" : "fa-solid fa-eye-slash", hidden ? "Unhide this post" : "Hide this post", () => {
      HiddenStore.togglePostHidden(b, tn, no, { label: Dom.strip(post.name || "Anonymous") });
      App.loadThread(b, tn);
    })
  ];
  if (isOp) {
    items.push(item("fa-solid fa-ban", "Hide this thread", () => {
      HiddenStore.toggleThreadHidden(b, tn, { sub: Dom.decodeEnts(post.sub || "") });
      App.loadCatalog(b);
    }));
  }
  const filters = filterItems(post);
  return filters.length ? items.concat(sep(), filters) : items;
}

function buildItems(e) {
  const mediaEl = closestByAttr(e.target, "data-kind", "media");
  const quoteEl = closestByAttr(e.target, "data-kind", "quote");
  const linkEl = closestByAttr(e.target, "data-kind", "ext-link");
  const postEl = closestByAttr(e.target, "data-kind", "post");
  const threadEl = closestByAttr(e.target, "data-kind", "thread-item") || closestByAttr(e.target, "data-kind", "cat-card");

  if (mediaEl) {
    const src = mediaEl.getAttribute("data-fullsrc") || mediaEl.src;
    const md5El = mediaEl.closest(".post") ? mediaEl.closest(".post").querySelector(".md5") : null;
    const md5 = md5El ? md5El.getAttribute("data-md5") : "";
    const items = [
      head("media"),
      item("fa-solid fa-up-right-from-square", "Open original", () => window.open(src, "_blank")),
      item("fa-solid fa-link", "Copy image URL", () => copyText(src)),
      item("fa-solid fa-download", "Download image", () => {
        const a = document.createElement("a");
        a.href = src; a.download = ""; a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      })
    ];
    if (md5) items.push(item("fa-solid fa-fingerprint", "Copy MD5", () => copyText(md5)));
    return items;
  }

  if (quoteEl) {
    const pid = quoteEl.getAttribute("data-pid");
    return [
      head(`quote >>${pid}`),
      item("fa-solid fa-table-columns", "Open in split view", () => SplitView.openPost(pid)),
      item("fa-solid fa-link", "Copy post link", () => copyText(`${location.href.split("#")[0]}#p${pid}`))
    ];
  }

  if (linkEl) {
    const url = linkEl.getAttribute("data-url");
    return [
      head("link"),
      item("fa-solid fa-up-right-from-square", "Open in new tab", () => window.open(url, "_blank")),
      item("fa-solid fa-link", "Copy link", () => copyText(url))
    ];
  }

  if (postEl) return postItems(postEl);

  if (threadEl) {
    const b = threadEl.getAttribute("data-b"), n = threadEl.getAttribute("data-n");
    const hidden = HiddenStore.isThreadHidden(b, n);
    return [
      head(`thread No.${n}`),
      item("fa-solid fa-up-right-from-square", "Open thread", () => App.loadThread(b, n)),
      item("fa-solid fa-link", "Copy thread link", () => copyText(`https://boards.4chan.org/${b}/thread/${n}`)),
      item("fa-solid fa-box-archive", "View in archive", () => window.open(Archives.urlFor(b, n), "_blank")),
      sep(),
      item(hidden ? "fa-solid fa-eye" : "fa-solid fa-eye-slash", hidden ? "Unhide thread" : "Hide thread", () => {
        HiddenStore.toggleThreadHidden(b, n, { sub: threadEl.getAttribute("data-sub") || "" });
        App.rerenderBoardList();
      })
    ];
  }

  const items = [head(App.BOARD ? `/${App.BOARD}/` : "thinline")];
  if (App.BOARD && !App.THREAD) {
    items.push(item("fa-solid fa-arrows-rotate", "Reload board", () => App.loadCatalog(App.BOARD)));
    const catalog = App.VIEW_MODE === "catalog";
    items.push(item(catalog ? "fa-solid fa-list" : "fa-solid fa-table-cells", catalog ? "Switch to index" : "Switch to catalog",
      () => App.setViewMode(catalog ? "index" : "catalog")));
  } else if (App.THREAD) {
    items.push(item("fa-solid fa-arrows-rotate", "Reload thread", () => App.loadThread(App.BOARD, App.THREAD)));
    items.push(item("fa-solid fa-box-archive", "View in archive", () => window.open(Archives.urlFor(App.BOARD, App.THREAD), "_blank")));
  }
  items.push(item("fa-solid fa-arrow-left", "Back", () => App.back()));
  items.push(item("fa-solid fa-gears", "Settings", () => App.openSettings()));
  return items;
}

function withNativeEntry(items) {
  return items.concat(sep(), item("fa-solid fa-window-restore", "Browser menu", () => {
    nativeNext = true;
    App.notify("right-click again for the browser menu");
  }));
}

function render(items, x, y) {
  const menu = document.getElementById("ctxMenu");
  menu.innerHTML = items.map((it, i) => {
    if (it.sep) return `<div class="ctx-sep"></div>`;
    if (it.head) return `<div class="ctx-head">${Dom.esc(it.head)}</div>`;
    return `<div class="ctx-item" data-idx="${i}"><i class="${it.icon}"></i>${Dom.esc(it.label)}</div>`;
  }).join("");
  menu.className = "ctxmenu";

  const height = Math.min(CONTEXT_MENU_MAX_H, items.length * CONTEXT_MENU_ROW_H + CONTEXT_MENU_PAD);
  menu.style.left = Math.max(VIEWPORT_MARGIN, Math.min(x, window.innerWidth - CONTEXT_MENU_WIDTH - VIEWPORT_MARGIN)) + "px";
  menu.style.top = Math.max(VIEWPORT_MARGIN, Math.min(y, window.innerHeight - height - VIEWPORT_MARGIN)) + "px";

  menu.querySelectorAll(".ctx-item").forEach((row) => {
    row.onclick = () => {
      const entry = items[parseInt(row.getAttribute("data-idx"), 10)];
      ContextMenu.close();
      if (entry && entry.fn) entry.fn();
    };
  });
}

export class ContextMenu {
  static close() {
    document.getElementById("ctxMenu").className = "ctxmenu hidden";
  }

  static init() {
    document.addEventListener("contextmenu", (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.shiftKey) return;
      if (nativeNext) { nativeNext = false; return; }
      e.preventDefault();
      render(withNativeEntry(buildItems(e)), e.clientX, e.clientY);
    });

    document.addEventListener("click", (e) => {
      const btn = closestByAttr(e.target, "data-kind", "post-menu");
      const menu = document.getElementById("ctxMenu");
      if (btn) {
        e.stopPropagation();
        const rect = btn.getBoundingClientRect();
        render(withNativeEntry(postItems(closestByAttr(btn, "data-kind", "post"))), rect.left, rect.bottom);
        return;
      }
      if (!menu.classList.contains("hidden") && !menu.contains(e.target)) ContextMenu.close();
    }, true);

    document.addEventListener("scroll", ContextMenu.close, true);
    window.addEventListener("resize", ContextMenu.close);
  }
}
