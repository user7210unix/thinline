import { Dom } from "../util/dom.js";
import { Proxy } from "../util/proxy.js";
import { StubRenderer } from "../util/stubRenderer.js";
import { BoardApi } from "./BoardApi.js";
import { HiddenStore } from "./HiddenStore.js";
import { Linkify } from "./Linkify.js";
import { FilterEngine } from "../filterengine/FilterEngine.js";
import { ThreadWatcher } from "../watcher/ThreadWatcher.js";
import { WatchWindow } from "../watcher/WatchWindow.js";
import { App } from "../main.js";

function quotes(com) {
  const r = [];
  if (!com) return r;
  let m;
  const reQuote = /&gt;&gt;(\d+)/g;
  while ((m = reQuote.exec(com)) !== null) {
    const v = parseInt(m[1], 10);
    if (!r.includes(v)) r.push(v);
  }
  const reHash = /#p(\d+)/g;
  while ((m = reHash.exec(com)) !== null) {
    const v = parseInt(m[1], 10);
    if (!r.includes(v)) r.push(v);
  }
  return r;
}

function buildMap(posts) {
  const map = {}, by = {};
  for (const p of posts) { by[p.no] = p; map[p.no] = []; }
  for (const p of posts) {
    const qs = quotes(p.com || "");
    let parent = null;
    for (const q of qs) {
      if (by[q] && q !== p.no) { parent = q; break; }
    }
    if (parent != null) map[parent].push(p);
    else if (p.resto && by[p.resto]) map[p.resto].push(p);
  }
  return { map, by };
}

function filterVerdict(post, isOp) {
  return FilterEngine.evaluate(post, { board: App.BOARD, isOp, hasFile: !!post.filename, wsBoard: BoardApi.WS_MAP[App.BOARD] });
}

export class ThreadView {
  static render(board, posts) {
    const op = posts[0];
    App.updateThreadTitle(op);
    const { map } = buildMap(posts);

    let opThumb = "";
    if (op.tim) {
      const isVid = op.ext === ".webm" || op.ext === ".mp4";
      const thumb = Proxy.wrap(`${BoardApi.IMG}${board}/${op.tim}s.jpg`);
      const full = isVid ? thumb : Proxy.wrap(`${BoardApi.IMG}${board}/${op.tim}${op.ext}`);
      opThumb = `<img class="thread-head-thumb" id="threadHeadThumb" loading="lazy" src="${thumb}" data-fullsrc="${full}" alt="">`;
    }
    const subLine = op.sub || Dom.strip(op.com || "").substring(0, 90);

    let h = `<div class="thread-head">${opThumb}<div class="thread-head-info">` +
      `<div class="thread-head-title">/${board}/ No.${op.no}</div>` +
      (subLine ? `<div class="thread-head-sub">${subLine}</div>` : "") +
      `<button type="button" id="watchToggleBtn"></button></div></div>`;

    h += ThreadView.#renderPost(board, op, true, op.no);
    const seen = { [op.no]: 1 };
    h += ThreadView.#kids(board, map[op.no] || [], map, seen, op.no);
    for (let i = 1; i < posts.length; i++) {
      const p = posts[i];
      if (seen[p.no]) continue;
      seen[p.no] = 1;
      h += ThreadView.#renderPost(board, p, false, op.no);
      h += ThreadView.#kids(board, map[p.no] || [], map, seen, op.no);
    }

    App.append(h);
    ThreadView.#bindMedia();
    ThreadView.#bindPostHide(board, op.no);
    StubRenderer.bind();
    ThreadView.#initHead(board, op);
  }

  static #renderPost(board, p, isOp, threadNo) {
    if (HiddenStore.isPostHidden(board, threadNo, p.no)) {
      return StubRenderer.wrap(ThreadView.#postHtml(board, p, isOp, null, threadNo), `[hidden] No.${p.no} by ${p.name || "Anonymous"}`, `h${p.no}`);
    }
    const verdict = filterVerdict(p, isOp);
    if (verdict && verdict.notify) FilterEngine.notifyOnce(p, `/${board}/ No.${p.no} matched a filter`);
    if (verdict && verdict.hidden) {
      if (!verdict.stub) return "";
      return StubRenderer.wrap(ThreadView.#postHtml(board, p, isOp, null, threadNo), `[filtered] No.${p.no} by ${p.name || "Anonymous"}`, `t${p.no}`);
    }
    const hl = verdict && verdict.highlight ? { cls: verdict.highlightClass } : null;
    return ThreadView.#postHtml(board, p, isOp, hl, threadNo);
  }

  static #kids(board, list, map, seen, threadNo) {
    let h = "";
    for (const p of list) {
      if (seen[p.no]) continue;
      seen[p.no] = 1;
      const rendered = ThreadView.#renderPost(board, p, false, threadNo);
      if (!rendered) {
        // fully hidden, no stub - still recurse so its replies aren't lost
        h += ThreadView.#kids(board, map[p.no] || [], map, seen, threadNo);
        continue;
      }
      h += `<div class="tree-indent">${rendered}${ThreadView.#kids(board, map[p.no] || [], map, seen, threadNo)}</div>`;
    }
    return h;
  }

  static #postHtml(board, p, isOp, hl, threadNo) {
    const cls = "post" + (hl ? ` post-highlight${hl.cls ? " hl-" + Dom.esc(hl.cls) : ""}` : "");
    let h = `<div class="${cls}" id="p${p.no}" data-kind="post" data-b="${board}" data-thread="${threadNo}" data-n="${p.no}">`;
    h += `<div class="post-header"><span class="post-no">No.${p.no}</span> ${p.name || "Anonymous"}`;
    if (p.trip) h += ` ${p.trip}`;
    h += ` ${p.now || ""}</div>`;
    if (isOp && p.sub) h += `<div class="post-sub">${p.sub}</div>`;
    if (p.filename && p.ext && p.tim) h += ThreadView.#fileHtml(board, p);

    let c = (p.com || "").replace(/class="quotelink"/g, 'class="quote"');
    c = Linkify.toHtml(c);
    h += `<div class="post-com">${c}</div></div>`;
    return h;
  }

  static #fileHtml(board, p) {
    const url = `${BoardApi.IMG}${board}/${p.tim}${p.ext}`;
    const proxied = Proxy.wrap(url);
    const isVid = p.ext === ".webm" || p.ext === ".mp4";
    let h = `<div class="file-info">${p.filename}${p.ext} (${Dom.size(p.fsize)}, ${p.w || "?"}x${p.h || "?"}) ` +
      `<span class="md5" data-md5="${p.md5 || ""}">MD5:${p.md5 || "-"}</span></div>`;
    h += isVid
      ? `<video controls width="250" class="media" data-kind="media" data-fullsrc="${proxied}" src="${proxied}"></video>`
      : `<img class="media" data-kind="media" data-fullsrc="${proxied}" src="${proxied}" alt="">`;
    return h;
  }

  static #bindMedia() {
    document.querySelectorAll("img.media, video.media").forEach((el) => {
      el.onclick = function () { this.className = this.className.includes("full") ? "media" : "media full"; };
    });
  }

  // shift+click on a post stubs just that post, independent of thread-level hide
  static #bindPostHide(board, threadNo) {
    document.querySelectorAll('[data-kind="post"]').forEach((el) => {
      el.addEventListener("click", (e) => {
        if (!e.shiftKey) return;
        if (e.target !== el && e.target.getAttribute && e.target.getAttribute("data-kind")) return;
        HiddenStore.togglePostHidden(board, threadNo, el.getAttribute("data-n"));
        App.loadThread(board, threadNo);
      });
    });
  }

  static #initHead(board, op) {
    const btn = document.getElementById("watchToggleBtn");
    const refresh = () => {
      if (!btn) return;
      if (ThreadWatcher.isWatched(board, op.no)) {
        btn.className = "active";
        btn.innerHTML = `<i class="fa-solid fa-star"></i> Watching`;
      } else {
        btn.className = "";
        btn.innerHTML = `<i class="fa-regular fa-star"></i> Watch`;
      }
    };
    if (btn) {
      btn.onclick = () => {
        if (ThreadWatcher.isWatched(board, op.no)) ThreadWatcher.remove(board, op.no);
        else ThreadWatcher.add(board, op);
        refresh();
        WatchWindow.render();
      };
      refresh();
    }
    if (ThreadWatcher.isWatched(board, op.no)) {
      ThreadWatcher.markSeen(board, op.no);
      WatchWindow.render();
    }

    const thumb = document.getElementById("threadHeadThumb");
    if (thumb) thumb.onclick = function () { window.open(this.getAttribute("data-fullsrc"), "_blank"); };
  }
}
