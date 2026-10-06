import { Dom } from "../util/dom.js";
import { Proxy } from "../util/proxy.js";
import { Time } from "../util/time.js";
import { StubRenderer } from "../util/stubRenderer.js";
import { BoardApi } from "./BoardApi.js";
import { HiddenStore } from "./HiddenStore.js";
import { Linkify } from "./Linkify.js";
import { FilterEngine } from "../filterengine/FilterEngine.js";
import { ThreadWatcher } from "../watcher/ThreadWatcher.js";
import { WatchWindow } from "../watcher/WatchWindow.js";
import { THREAD_SUB_LEN, MAX_INDENT_DEPTH } from "../config.js";
import { App } from "../main.js";

const QUOTE_RE = /&gt;&gt;(\d+)/g;
const HASH_RE = /#p(\d+)/g;
const LOCAL_QUOTE_RE = /<a href="#p(\d+)" class="quote">/g;

let postsByNo = {};
let indexByNo = {};
let backlinksByNo = {};

function quotes(com) {
  const found = new Set();
  for (const re of [QUOTE_RE, HASH_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(com || "")) !== null) found.add(parseInt(m[1], 10));
  }
  return [...found];
}

function buildMaps(posts) {
  const children = {};
  postsByNo = {};
  indexByNo = {};
  backlinksByNo = {};
  posts.forEach((p, i) => { postsByNo[p.no] = p; children[p.no] = []; indexByNo[p.no] = i; });
  for (const p of posts) {
    const qs = quotes(p.com).filter((q) => postsByNo[q] && q !== p.no);
    qs.forEach((q) => { (backlinksByNo[q] = backlinksByNo[q] || []).push(p.no); });
    const parent = qs.length ? qs[0] : (p.resto && postsByNo[p.resto] ? p.resto : null);
    if (parent !== null) children[parent].push(p);
  }
  return children;
}

function filterVerdict(post, isOp) {
  return FilterEngine.evaluate(post, { board: App.BOARD, isOp, hasFile: !!post.filename, wsBoard: BoardApi.WS_MAP[App.BOARD] });
}

function isVideo(ext) { return ext === ".webm" || ext === ".mp4"; }

function quoteLink(no) {
  return `<a href="#p${no}" class="quote" data-kind="quote" data-pid="${no}">&gt;&gt;${no}</a>`;
}

export class ThreadView {
  static getPost(no) { return postsByNo[no]; }

  static render(board, posts) {
    const op = posts[0];
    App.updateThreadTitle(op);
    const children = buildMaps(posts);

    let h = ThreadView.#head(board, op);
    const seen = { [op.no]: true };
    h += ThreadView.#renderPost(board, op, true, op.no);
    h += ThreadView.#kids(board, children[op.no], children, seen, op.no, 0);
    for (const p of posts.slice(1)) {
      if (seen[p.no]) continue;
      seen[p.no] = true;
      h += ThreadView.#renderPost(board, p, false, op.no);
      h += ThreadView.#kids(board, children[p.no], children, seen, op.no, 0);
    }

    App.append(`<div class="thread">${h}</div>`);
    ThreadView.#bindMedia();
    ThreadView.#bindPostHide(board, op.no);
    StubRenderer.bind();
    ThreadView.#initHead(board, op);
  }

  static #head(board, op) {
    let thumb = "";
    if (op.tim) {
      const small = Proxy.wrap(`${BoardApi.IMG}${board}/${op.tim}s.jpg`);
      const full = isVideo(op.ext) ? small : Proxy.wrap(`${BoardApi.IMG}${board}/${op.tim}${op.ext}`);
      thumb = `<img class="thread-head-thumb" id="threadHeadThumb" loading="lazy" src="${small}" data-fullsrc="${full}" alt="">`;
    }
    const subLine = op.sub || Dom.strip(op.com || "").substring(0, THREAD_SUB_LEN);
    return `<div class="thread-head">${thumb}<div class="thread-head-info">` +
      `<div class="thread-head-title">/${board}/ No.${op.no}</div>` +
      (subLine ? `<div class="thread-head-sub">${subLine}</div>` : "") +
      `<div class="thread-head-actions"><button type="button" id="watchToggleBtn"></button>` +
      `<button type="button" id="hideThreadBtn"><i class="fa-solid fa-eye-slash"></i> Hide thread</button></div>` +
      `</div></div>`;
  }

  static #renderPost(board, p, isOp, threadNo) {
    const label = `No.${p.no} by ${p.name || "Anonymous"}`;
    if (HiddenStore.isPostHidden(board, threadNo, p.no)) {
      return StubRenderer.wrap(ThreadView.#postHtml(board, p, isOp, null, threadNo), `[hidden] ${label}`, `h${p.no}`);
    }
    const verdict = filterVerdict(p, isOp);
    if (verdict && verdict.notify) FilterEngine.notifyOnce(p, `/${board}/ No.${p.no} matched a filter`);
    if (verdict && verdict.hidden) {
      if (!verdict.stub) return "";
      return StubRenderer.wrap(ThreadView.#postHtml(board, p, isOp, null, threadNo), `[filtered] ${label}`, `t${p.no}`);
    }
    const hl = verdict && verdict.highlight ? { cls: verdict.highlightClass } : null;
    return ThreadView.#postHtml(board, p, isOp, hl, threadNo);
  }

  static #kids(board, list, children, seen, threadNo, depth) {
    let h = "";
    for (const p of list || []) {
      if (seen[p.no]) continue;
      seen[p.no] = true;
      const rendered = ThreadView.#renderPost(board, p, false, threadNo);
      const nested = ThreadView.#kids(board, children[p.no], children, seen, threadNo, depth + 1);
      if (!rendered) { h += nested; continue; }
      h += depth < MAX_INDENT_DEPTH ? `<div class="tree-indent">${rendered}${nested}</div>` : rendered + nested;
    }
    return h;
  }

  static #header(p, isOp) {
    const t = p.time ? Time.parts(p.time) : null;
    const date = t
      ? `<time class="post-date" datetime="${t.iso}" title="${t.full}"><b>${t.day} ${t.month}</b><span>${t.weekday} ${t.time}</span></time>`
      : `<span class="post-date"><span>${p.now || ""}</span></span>`;
    const trip = p.trip ? `<span class="post-trip">${p.trip}</span>` : "";
    const rel = p.time ? `<span class="post-rel">${Time.relative(p.time)}</span>` : "";
    return `<div class="post-header">${date}<span class="post-author"><span class="post-name">${p.name || "Anonymous"}</span>${trip}</span>` +
      `${rel}<span class="post-idx" title="position in thread">#${isOp ? "OP" : indexByNo[p.no]}</span>` +
      `<a class="post-no" href="#p${p.no}" data-kind="post-no">No.${p.no}</a>` +
      `<button type="button" class="post-menu-btn" data-kind="post-menu" aria-label="post options"><i class="fa-solid fa-ellipsis"></i></button></div>`;
  }

  static #postHtml(board, p, isOp, hl, threadNo) {
    const cls = "post" + (isOp ? " is-op" : "") + (hl ? ` post-highlight${hl.cls ? " hl-" + Dom.esc(hl.cls) : ""}` : "");
    const quoted = quotes(p.com).filter((q) => postsByNo[q]).join(" ");
    let h = `<div class="${cls}" id="p${p.no}" data-kind="post" data-b="${board}" data-thread="${threadNo}" data-n="${p.no}" data-quotes="${quoted}">`;
    h += ThreadView.#header(p, isOp);
    if (isOp && p.sub) h += `<div class="post-sub">${p.sub}</div>`;
    if (p.filename && p.ext && p.tim) h += ThreadView.#fileHtml(board, p);

    let c = (p.com || "").replace(/class="quotelink"/g, 'class="quote"');
    c = c.replace(LOCAL_QUOTE_RE, (_, no) => `<a href="#p${no}" class="quote" data-kind="quote" data-pid="${no}">`);
    h += `<div class="post-com">${Linkify.toHtml(c)}</div>`;

    const replies = backlinksByNo[p.no];
    if (replies && replies.length) h += `<div class="backlinks"><span>${replies.length} ${replies.length === 1 ? "reply" : "replies"}</span>${replies.map(quoteLink).join("")}</div>`;
    return h + "</div>";
  }

  static #fileHtml(board, p) {
    const proxied = Proxy.wrap(`${BoardApi.IMG}${board}/${p.tim}${p.ext}`);
    let h = `<div class="file-info">${p.filename}${p.ext} (${Dom.size(p.fsize)}, ${p.w || "?"}x${p.h || "?"}) ` +
      `<span class="md5" data-md5="${p.md5 || ""}">MD5:${p.md5 || "-"}</span></div>`;
    h += isVideo(p.ext)
      ? `<video controls width="250" class="media" data-kind="media" data-fullsrc="${proxied}" src="${proxied}"></video>`
      : `<img class="media" data-kind="media" data-fullsrc="${proxied}" src="${proxied}" alt="">`;
    return h;
  }

  static #bindMedia() {
    document.querySelectorAll("img.media, video.media").forEach((el) => {
      el.onclick = function () { this.classList.toggle("full"); };
    });
  }

  static #bindPostHide(board, threadNo) {
    document.querySelectorAll('#content [data-kind="post"]').forEach((el) => {
      el.addEventListener("click", (e) => {
        if (!e.shiftKey) return;
        if (e.target !== el && e.target.getAttribute && e.target.getAttribute("data-kind")) return;
        HiddenStore.togglePostHidden(board, threadNo, el.getAttribute("data-n"), { label: el.querySelector(".post-name")?.textContent });
        App.loadThread(board, threadNo);
      });
    });
  }

  static #initHead(board, op) {
    const watchBtn = document.getElementById("watchToggleBtn");
    const refresh = () => {
      const on = ThreadWatcher.isWatched(board, op.no);
      watchBtn.className = on ? "active" : "";
      watchBtn.innerHTML = on ? `<i class="fa-solid fa-star"></i> Watching` : `<i class="fa-regular fa-star"></i> Watch`;
    };
    watchBtn.onclick = () => {
      if (ThreadWatcher.isWatched(board, op.no)) ThreadWatcher.remove(board, op.no);
      else ThreadWatcher.add(board, op);
      refresh();
      WatchWindow.render();
    };
    refresh();
    if (ThreadWatcher.isWatched(board, op.no)) {
      ThreadWatcher.markSeen(board, op.no);
      WatchWindow.render();
    }

    document.getElementById("hideThreadBtn").onclick = () => {
      HiddenStore.toggleThreadHidden(board, op.no, { sub: Dom.decodeEnts(op.sub || "") });
      App.loadCatalog(board);
    };

    const thumb = document.getElementById("threadHeadThumb");
    if (thumb) thumb.onclick = function () { window.open(this.getAttribute("data-fullsrc"), "_blank"); };
  }
}
