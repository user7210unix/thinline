import { Dom } from "../util/dom.js";
import { Proxy } from "../util/proxy.js";
import { ReaderMode } from "./ReaderMode.js";

const rawCache = new Map();   // url -> raw html, filled by hover-prefetch or on open
const parsedCache = new Map(); // url -> extracted { title, siteName, bodyHtml }

function hostOf(url) {
  try { return url.replace(/^https?:\/\//, "").split("/")[0]; } catch (e) { return url; }
}

export class SplitView {
  // fire-and-forget on hover so opening feels instant if the user
  // does click through. no parsing here, that's real cpu work and
  // stays deferred to actually opening the pane.
  static prefetch(url) {
    if (rawCache.has(url)) return;
    let x;
    try { x = new XMLHttpRequest(); } catch (e) { return; }
    x.open("GET", Proxy.wrap(url), true);
    x.onreadystatechange = () => {
      if (x.readyState === 4 && x.status >= 200 && x.status < 300) rawCache.set(url, x.responseText);
    };
    try { x.send(null); } catch (e) {}
  }

  static open(url) {
    const overlay = document.getElementById("splitView");
    const body = document.getElementById("splitBody");
    const nameEl = document.getElementById("splitSiteName");
    const host = hostOf(url);

    nameEl.innerHTML = Dom.esc(host);
    document.getElementById("splitOpenTab").onclick = () => window.open(url, "_blank");
    document.getElementById("splitClose").onclick = SplitView.close;
    body.innerHTML = `<div class="reader-loading">loading reader view&#8230;</div>`;
    overlay.className = "split-view open";
    document.body.className = ((document.body.className || "") + " split-active").trim();

    const paint = (data) => {
      if (!overlay.className.includes("open")) return; // closed before this resolved
      nameEl.innerHTML = Dom.esc(data.siteName || host);
      body.innerHTML = `<h1 style="font-family:var(--ui-font);font-size:20px;margin:0 0 14px;color:var(--c-fg);">${Dom.esc(data.title)}</h1>${data.bodyHtml}`;
    };
    const paintError = () => {
      if (!overlay.className.includes("open")) return;
      body.innerHTML = `<div class="reader-error">Couldn't load a reader view for this site.<br>` +
        `<a href="${url}" target="_blank" rel="noopener">Open it in a new tab instead</a></div>`;
    };
    const fromRaw = (raw) => {
      const run = () => {
        const data = ReaderMode.extract(raw, url);
        if (!data) { paintError(); return; }
        parsedCache.set(url, data);
        paint(data);
      };
      window.requestIdleCallback ? requestIdleCallback(run) : setTimeout(run, 0);
    };

    if (parsedCache.has(url)) { paint(parsedCache.get(url)); return; }
    if (rawCache.has(url)) { fromRaw(rawCache.get(url)); return; }

    let x;
    try { x = new XMLHttpRequest(); } catch (e) { paintError(); return; }
    x.open("GET", Proxy.wrap(url), true);
    x.onreadystatechange = () => {
      if (x.readyState !== 4) return;
      if (x.status < 200 || x.status >= 300) { paintError(); return; }
      rawCache.set(url, x.responseText);
      fromRaw(x.responseText);
    };
    try { x.send(null); } catch (e) { paintError(); }
  }

  static close() {
    document.getElementById("splitView").className = "split-view";
    document.body.className = (document.body.className || "").replace(/\bsplit-active\b/g, "").trim();
  }
}
