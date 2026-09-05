import { Dom } from "../util/dom.js";
import { Proxy } from "../util/proxy.js";
import { Linkify } from "../board/Linkify.js";
import { SplitView } from "../reader/SplitView.js";
import { Settings } from "../ui/Settings.js";

const oembedCache = new Map();

function hostOf(url) {
  try { return url.replace(/^https?:\/\//, "").split("/")[0]; } catch (e) { return url; }
}
function faviconUrl(host) {
  return `https://www.google.com/s2/favicons?domain=${host}`;
}

function fetchOEmbed(url, cb) {
  if (oembedCache.has(url)) { cb(oembedCache.get(url)); return; }
  let x;
  try { x = new XMLHttpRequest(); } catch (e) { cb(null); return; }
  x.open("GET", Proxy.wrap(url), true);
  x.onreadystatechange = () => {
    if (x.readyState !== 4) return;
    if (x.status < 200 || x.status >= 300) { cb(null); return; }
    try { const data = JSON.parse(x.responseText); oembedCache.set(url, data); cb(data); }
    catch (e) { cb(null); }
  };
  try { x.send(null); } catch (e) { cb(null); }
}

// hover on a plain link only ever shows a tiny instant tooltip
// (favicon + domain, zero network cost). yt/sc get the richer oembed
// card since that fetch is small json, not a full page load. clicking
// a plain link asks split-view-or-new-tab instead of navigating away.
export class LinkPreview {
  static #curUrl = null;
  static #hoverTimer = null;
  static #prefetchTimer = null;
  static #hideTimer = null;
  static #rafPending = false;
  static #lastMove = { x: 0, y: 0 };

  static #position(el, x, y) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = el.offsetWidth || 260, h = el.offsetHeight || 60;
    let left = x + 16, top = y + 16;
    if (left + w > vw - 8) left = x - w - 16;
    if (top + h > vh - 8) top = Math.max(8, vh - h - 8);
    el.style.left = Math.max(8, left) + "px";
    el.style.top = Math.max(8, top) + "px";
  }

  static #showLite(url, x, y) {
    const el = document.getElementById("linkPreview");
    const host = hostOf(url);
    el.innerHTML = `<div class="lp-lite-row"><img src="${faviconUrl(host)}">${Dom.esc(host)}</div>` +
                   `<div class="lp-lite-hint">click for options</div>`;
    el.className = "link-preview lp-lite";
    LinkPreview.#position(el, x, y);
  }

  static #showLoading(x, y) {
    const el = document.getElementById("linkPreview");
    el.innerHTML = `<div class="lp-loading">loading preview&#8230;</div>`;
    el.className = "link-preview";
    LinkPreview.#position(el, x, y);
  }

  static #renderEmbed(url, html) {
    const el = document.getElementById("linkPreview");
    if (LinkPreview.#curUrl !== url) return;
    el.innerHTML = `<div class="lp-embed">${html}</div>`;
  }

  static #renderEmbedFallback(url) {
    const el = document.getElementById("linkPreview");
    if (LinkPreview.#curUrl !== url) return;
    const host = hostOf(url);
    el.innerHTML = `<div class="lp-body"><div class="lp-site"><img src="${faviconUrl(host)}">${Dom.esc(host)}</div></div>`;
  }

  static loadMediaEmbed(url, kind) {
    LinkPreview.#curUrl = url;
    if (kind === "yt-link") {
      fetchOEmbed(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, (data) => {
        if (!data) { LinkPreview.#renderEmbedFallback(url); return; }
        LinkPreview.#renderEmbed(url,
          `<img class="lp-img" src="${data.thumbnail_url}"><div class="lp-body">` +
          `<div class="lp-site"><i class="fa-brands fa-youtube"></i> YouTube</div>` +
          `<div class="lp-title">${Dom.esc(data.title || "")}</div>` +
          `<div class="lp-desc">${Dom.esc(data.author_name || "")}</div></div>`);
      });
    } else if (kind === "sc-link") {
      fetchOEmbed(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`, (data) => {
        if (!data) { LinkPreview.#renderEmbedFallback(url); return; }
        const body = `<div class="lp-body"><div class="lp-site"><i class="fa-brands fa-soundcloud"></i> SoundCloud</div>` +
          `<div class="lp-title">${Dom.esc(data.title || "")}</div>` +
          `<div class="lp-desc">${Dom.esc(data.author_name || "")}</div></div>`;
        LinkPreview.#renderEmbed(url, (data.thumbnail_url ? `<img class="lp-img" src="${data.thumbnail_url}">` : "") + body);
      });
    }
  }

  static init() {
    const popup = document.getElementById("linkPreview");

    document.addEventListener("mouseover", (e) => {
      if (!Settings.linkPreviewEnabled()) return;
      const t = e.target;
      if (!t || !t.getAttribute || t.getAttribute("data-kind") !== "ext-link") return;
      const url = t.getAttribute("data-url");
      const media = Linkify.isMediaLink(t);
      clearTimeout(LinkPreview.#hideTimer);
      clearTimeout(LinkPreview.#hoverTimer);
      clearTimeout(LinkPreview.#prefetchTimer);
      LinkPreview.#curUrl = url;
      const mx = e.clientX, my = e.clientY;
      if (media) {
        LinkPreview.#hoverTimer = setTimeout(() => {
          LinkPreview.#showLoading(mx, my);
          LinkPreview.loadMediaEmbed(url, t.className.includes("yt-link") ? "yt-link" : "sc-link");
        }, 200);
      } else {
        LinkPreview.#showLite(url, mx, my);
        LinkPreview.#prefetchTimer = setTimeout(() => SplitView.prefetch(url), 300);
      }
    });

    document.addEventListener("mousemove", (e) => {
      LinkPreview.#lastMove = { x: e.clientX, y: e.clientY };
      const t = e.target;
      if (!(t && t.getAttribute && t.getAttribute("data-kind") === "ext-link")) return;
      if (LinkPreview.#rafPending) return;
      LinkPreview.#rafPending = true;
      requestAnimationFrame(() => {
        LinkPreview.#position(popup, LinkPreview.#lastMove.x, LinkPreview.#lastMove.y);
        LinkPreview.#rafPending = false;
      });
    });

    document.addEventListener("mouseout", (e) => {
      const t = e.target;
      if (!t || !t.getAttribute || t.getAttribute("data-kind") !== "ext-link") return;
      clearTimeout(LinkPreview.#hoverTimer);
      clearTimeout(LinkPreview.#prefetchTimer);
      LinkPreview.#hideTimer = setTimeout(() => {
        popup.className = "link-preview hidden";
        LinkPreview.#curUrl = null;
      }, 120);
    });

    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!t || !t.getAttribute || t.getAttribute("data-kind") !== "ext-link") return;
      if (Linkify.isMediaLink(t)) return;
      e.preventDefault();
      LinkPreview.#showAction(t.getAttribute("data-url"), e.clientX, e.clientY);
    });
  }

  static #showAction(url, x, y) {
    const el = document.getElementById("linkAction");
    el.innerHTML =
      `<div class="link-action-url">${Dom.esc(hostOf(url))}</div>` +
      `<button type="button" data-act="split"><i class="fa-solid fa-table-columns"></i> Open in split view</button>` +
      `<button type="button" data-act="tab"><i class="fa-solid fa-up-right-from-square"></i> Open in new tab</button>`;
    el.className = "link-action";
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = el.offsetWidth || 210, h = el.offsetHeight || 90;
    const left = Math.min(x, vw - w - 8);
    const top = (y + h + 14 > vh - 8) ? (y - h - 10) : (y + 10);
    el.style.left = Math.max(8, left) + "px";
    el.style.top = Math.max(8, top) + "px";
    el.querySelector('[data-act="split"]').onclick = () => { LinkPreview.closeAction(); SplitView.open(url); };
    el.querySelector('[data-act="tab"]').onclick = () => { LinkPreview.closeAction(); window.open(url, "_blank"); };
  }

  static closeAction() {
    const el = document.getElementById("linkAction");
    if (el) el.className = "link-action hidden";
  }

  static initActionPopup() {
    document.addEventListener("click", (e) => {
      const el = document.getElementById("linkAction");
      if (el && !el.className.includes("hidden") && !el.contains(e.target)) LinkPreview.closeAction();
    });
    document.addEventListener("scroll", LinkPreview.closeAction, true);
    document.addEventListener("keydown", (e) => {
      if (e.keyCode === 27) { LinkPreview.closeAction(); SplitView.close(); }
    });
  }
}
