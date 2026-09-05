import { Dom } from "../util/dom.js";
import { Linkify } from "../board/Linkify.js";
import { HiddenStore } from "../board/HiddenStore.js";
import { Archives } from "../board/Archives.js";
import { App } from "../main.js";

function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text); return; }
  } catch (e) {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  } catch (e) {}
}

function closestByAttr(el, attr, value) {
  while (el && el !== document.body) {
    if (el.getAttribute && el.getAttribute(attr) === value) return el;
    el = el.parentNode;
  }
  return null;
}

function item(icon, label, fn) { return { icon, label, fn }; }
function sep() { return { sep: true }; }
function head(label) { return { head: label }; }

function buildItems(e) {
  const mediaEl = closestByAttr(e.target, "data-kind", "media");
  const linkEl = closestByAttr(e.target, "data-kind", "ext-link");
  const postEl = closestByAttr(e.target, "data-kind", "post");
  const threadItemEl = closestByAttr(e.target, "data-kind", "thread-item") || closestByAttr(e.target, "data-kind", "cat-card");

  if (mediaEl) {
    const src = mediaEl.getAttribute("data-fullsrc") || mediaEl.src;
    const postWrap = mediaEl.closest ? mediaEl.closest(".post") : null;
    const md5El = postWrap ? postWrap.querySelector(".md5") : null;
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

  if (linkEl) {
    const url = linkEl.getAttribute("data-url");
    const isMedia = Linkify.isMediaLink(linkEl);
    const items = [
      head("link"),
      item("fa-solid fa-up-right-from-square", "Open in new tab", () => window.open(url, "_blank")),
      item("fa-solid fa-link", "Copy link", () => copyText(url))
    ];
    if (!isMedia) items.push(item("fa-solid fa-table-columns", "Open in split view", () => App.openSplitView(url)));
    return items;
  }

  if (postEl) {
    const b = postEl.getAttribute("data-b"), tn = postEl.getAttribute("data-thread"), no = postEl.getAttribute("data-n");
    const comEl = postEl.querySelector(".post-com");
    const hidden = HiddenStore.isPostHidden(b, tn, no);
    return [
      head(`post No.${no}`),
      item("fa-solid fa-link", `Copy post link (#p${no})`, () => copyText(location.href.split("#")[0] + "#p" + no)),
      item("fa-solid fa-copy", "Copy post text", () => copyText(comEl ? Dom.strip(comEl.innerHTML) : "")),
      item("fa-solid fa-box-archive", "View thread in archive", () => window.open(Archives.urlFor(b, tn), "_blank")),
      sep(),
      item(hidden ? "fa-solid fa-eye" : "fa-solid fa-eye-slash", hidden ? "Unhide this post" : "Hide this post", () => {
        HiddenStore.togglePostHidden(b, tn, no);
        App.loadThread(b, tn);
      })
    ];
  }

  if (threadItemEl) {
    const b = threadItemEl.getAttribute("data-b"), n = threadItemEl.getAttribute("data-n");
    const hidden = HiddenStore.isThreadHidden(b, n);
    return [
      head(`thread No.${n}`),
      item("fa-solid fa-up-right-from-square", "Open thread", () => App.loadThread(b, n)),
      item("fa-solid fa-link", "Copy thread link", () => copyText(`https://boards.4chan.org/${b}/thread/${n}`)),
      item("fa-solid fa-box-archive", "View in archive", () => window.open(Archives.urlFor(b, n), "_blank")),
      sep(),
      item(hidden ? "fa-solid fa-eye" : "fa-solid fa-eye-slash", hidden ? "Unhide thread" : "Hide thread", () => {
        HiddenStore.toggleThreadHidden(b, n);
        App.rerenderBoardList();
      })
    ];
  }

  const items = [head(App.BOARD ? `/${App.BOARD}/` : "menu")];
  if (App.BOARD && !App.THREAD) {
    items.push(item("fa-solid fa-arrows-rotate", `Reload ${App.VIEW_MODE === "catalog" ? "catalog" : "index"}`, () => App.loadCatalog(App.BOARD)));
    items.push(item(App.VIEW_MODE === "catalog" ? "fa-solid fa-list" : "fa-solid fa-table-cells",
      App.VIEW_MODE === "catalog" ? "Switch to Index" : "Switch to Catalog",
      () => App.setViewMode(App.VIEW_MODE === "catalog" ? "index" : "catalog")));
  } else if (App.THREAD) {
    items.push(item("fa-solid fa-arrows-rotate", "Reload thread", () => App.loadThread(App.BOARD, App.THREAD)));
    items.push(item("fa-solid fa-box-archive", "View in archive", () => window.open(Archives.urlFor(App.BOARD, App.THREAD), "_blank")));
  }
  items.push(item("fa-solid fa-arrow-left", "Back", () => App.back()));
  items.push(item("fa-solid fa-gears", "Settings", () => { document.getElementById("settings").className = "open"; }));
  return items;
}

function render(items, x, y) {
  const menu = document.getElementById("ctxMenu");
  menu.innerHTML = items.map((it, i) => {
    if (it.sep) return `<div class="ctx-sep"></div>`;
    if (it.head) return `<div class="ctx-head">${Dom.esc(it.head)}</div>`;
    return `<div class="ctx-item" data-idx="${i}"><i class="${it.icon}"></i>${Dom.esc(it.label)}</div>`;
  }).join("");
  menu.className = "ctxmenu";

  const vw = window.innerWidth, vh = window.innerHeight;
  const mw = 210, mh = Math.min(400, items.length * 32 + 10);
  menu.style.left = Math.max(4, Math.min(x, vw - mw - 4)) + "px";
  menu.style.top = Math.max(4, Math.min(y, vh - mh - 4)) + "px";

  menu.querySelectorAll(".ctx-item").forEach((row) => {
    row.onclick = () => {
      const idx = parseInt(row.getAttribute("data-idx"), 10);
      ContextMenu.close();
      items[idx] && items[idx].fn && items[idx].fn();
    };
  });
}

export class ContextMenu {
  static close() {
    document.getElementById("ctxMenu").className = "ctxmenu hidden";
  }

  static init() {
    document.addEventListener("contextmenu", (e) => {
      // native menu still works in inputs/textareas - typing, paste, etc.
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      e.preventDefault();
      render(buildItems(e), e.clientX, e.clientY);
    });
    document.addEventListener("click", (e) => {
      const menu = document.getElementById("ctxMenu");
      if (!menu.className.includes("hidden") && !menu.contains(e.target)) ContextMenu.close();
    });
    document.addEventListener("scroll", ContextMenu.close, true);
    window.addEventListener("resize", ContextMenu.close);
  }
}
