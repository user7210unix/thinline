import { Dom } from "../util/dom.js";
import { Proxy } from "../util/proxy.js";
import { BoardApi } from "../board/BoardApi.js";
import { ThreadWatcher } from "./ThreadWatcher.js";
import { App } from "../main.js";

export class WatchWindow {
  static render() {
    const body = document.getElementById("watchBody");
    if (!body) return;

    const all = ThreadWatcher.all();
    const keys = Object.keys(all).sort((a, b) => all[b].addedAt - all[a].addedAt);

    if (!keys.length) {
      body.innerHTML = `<div class="watch-empty">Not watching any threads yet. Open a thread and hit "Watch".</div>`;
    } else {
      body.innerHTML = keys.map((k) => {
        const w = all[k];
        const thumb = w.tim ? Proxy.wrap(`${BoardApi.IMG}${w.board}/${w.tim}s.jpg`) : "";
        const label = w.sub ? Dom.esc(w.sub) : (w.com ? Dom.esc(w.com.substring(0, 60)) : `No.${w.no}`);
        const delta = (w.replies || 0) - (w.lastSeenReplies || 0);
        const status = w.dead
          ? ` &middot; <span style="color:#c0392b">404</span>`
          : (delta > 0 ? ` <span class="watch-item-new">+${delta} new</span>` : "");
        return `<div class="watch-item" data-b="${w.board}" data-n="${w.no}">` +
          (thumb ? `<img class="watch-item-thumb" loading="lazy" src="${thumb}" alt="">` : `<div class="watch-item-thumb"></div>`) +
          `<div class="watch-item-body"><div class="watch-item-sub">${label}</div>` +
          `<div class="watch-item-meta">/${w.board}/ &middot; ${w.replies || 0} replies${status}</div></div>` +
          `<span class="watch-item-close" data-close="1" title="stop watching">&#10005;</span></div>`;
      }).join("");
    }

    const total = ThreadWatcher.count(), fresh = ThreadWatcher.newCount();
    ["watchBadge", "watchWinBadge"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      // always the real total - swapping this for "threads with new
      // replies" made the count look stuck once only one thread ever
      // had activity. "new" is a color, not a different number.
      el.innerHTML = total;
      el.className = "filt-badge" + (total === 0 ? " zero" : "") + (fresh > 0 ? " has-new" : "");
    });

    WatchWindow.#bindItems();
  }

  static #bindItems() {
    document.querySelectorAll(".watch-item").forEach((el) => {
      el.onclick = (e) => {
        if (e.target && e.target.getAttribute && e.target.getAttribute("data-close")) return;
        App.loadThread(el.getAttribute("data-b"), el.getAttribute("data-n"));
      };
      const closeBtn = el.querySelector("[data-close]");
      if (closeBtn) closeBtn.onclick = (e) => {
        e.stopPropagation();
        ThreadWatcher.remove(el.getAttribute("data-b"), el.getAttribute("data-n"));
        WatchWindow.render();
      };
    });
  }

  static initControls() {
    const win = document.getElementById("watchWindow");
    const minBtn = document.getElementById("watchMinBtn");
    const closeBtn = document.getElementById("watchCloseBtn");
    const navBtn = document.getElementById("navWatchBtn");

    if (minBtn) minBtn.onclick = () => {
      win.className = win.className.includes("minimized")
        ? win.className.replace(/\bminimized\b/g, "").trim()
        : (win.className + " minimized").trim();
    };
    if (closeBtn) closeBtn.onclick = () => { win.className = "watch-window hidden"; };
    if (navBtn) navBtn.onclick = () => {
      if (win.className.includes("hidden")) {
        win.className = "watch-window";
        WatchWindow.render();
      } else {
        win.className = "watch-window hidden";
      }
    };
  }

  // plain drag, no library - mousedown on the header switches to
  // left/top positioning and tracks the pointer to mouseup
  static initDrag() {
    const head = document.getElementById("watchHead");
    const win = document.getElementById("watchWindow");
    if (!head || !win) return;

    let dragging = false, offX = 0, offY = 0;
    head.addEventListener("mousedown", (e) => {
      dragging = true;
      const rect = win.getBoundingClientRect();
      offX = e.clientX - rect.left;
      offY = e.clientY - rect.top;
      win.style.left = rect.left + "px";
      win.style.top = rect.top + "px";
      win.style.right = "auto";
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      win.style.left = Math.max(4, Math.min(e.clientX - offX, window.innerWidth - 60)) + "px";
      win.style.top = Math.max(4, Math.min(e.clientY - offY, window.innerHeight - 40)) + "px";
    });
    document.addEventListener("mouseup", () => { dragging = false; });
  }
}
