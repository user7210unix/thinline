import { Dom } from "../util/dom.js";
import { Proxy } from "../util/proxy.js";
import { ReaderMode } from "./ReaderMode.js";

const rawCache = new Map();
const parsedCache = new Map();

function hostOf(url) {
  try { return url.replace(/^https?:\/\//, "").split("/")[0]; } catch (e) { return url; }
}

export class SplitView {
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

  static #cloneHtml(post) {
    const clone = post.cloneNode(true);
    clone.removeAttribute("id");
    return clone.outerHTML;
  }

  static openPost(pid) {
    const post = document.querySelector(`#content [data-kind="post"][data-n="${pid}"]`);
    if (!post) return;
    const replies = [...document.querySelectorAll("#content [data-kind=\"post\"]")]
      .filter((el) => (el.getAttribute("data-quotes") || "").split(" ").includes(String(pid)));

    document.getElementById("splitSiteName").innerHTML = `No.${pid}`;
    document.getElementById("splitOpenTab").classList.add("hidden");
    document.getElementById("splitClose").onclick = SplitView.close;
    document.getElementById("splitBody").innerHTML = SplitView.#cloneHtml(post) +
      (replies.length ? `<div class="split-replies-head">${replies.length} ${replies.length === 1 ? "reply" : "replies"}</div>` : "") +
      replies.map(SplitView.#cloneHtml).join("");
    document.getElementById("splitView").className = "split-view open";
    document.body.classList.add("split-active");
  }

  static open(url) {
    const overlay = document.getElementById("splitView");
    const body = document.getElementById("splitBody");
    const nameEl = document.getElementById("splitSiteName");
    const host = hostOf(url);

    nameEl.innerHTML = Dom.esc(host);
    document.getElementById("splitOpenTab").classList.remove("hidden");
    document.getElementById("splitOpenTab").onclick = () => window.open(url, "_blank");
    document.getElementById("splitClose").onclick = SplitView.close;
    body.innerHTML = `<div class="reader-loading">loading reader view&#8230;</div>`;
    overlay.className = "split-view open";
    document.body.classList.add("split-active");

    const paint = (data) => {
      if (!overlay.classList.contains("open")) return;
      nameEl.innerHTML = Dom.esc(data.siteName || host);
      body.innerHTML = `<h1 class="split-title">${Dom.esc(data.title)}</h1>${data.bodyHtml}`;
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
    document.body.classList.remove("split-active");
  }
}
