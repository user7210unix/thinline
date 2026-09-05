import { Dom } from "../util/dom.js";
import { Proxy } from "../util/proxy.js";
import { StubRenderer } from "../util/stubRenderer.js";
import { BoardApi } from "./BoardApi.js";
import { HiddenStore } from "./HiddenStore.js";
import { FilterEngine } from "../filterengine/FilterEngine.js";
import { App } from "../main.js";

function filterVerdict(post, isOp) {
  return FilterEngine.evaluate(post, { board: App.BOARD, isOp, hasFile: !!post.filename, wsBoard: BoardApi.WS_MAP[App.BOARD] });
}

export class CatalogView {
  static sortThreads(items) {
    const arr = items.slice();
    if (App.SORT_MODE === "replies") arr.sort((a, b) => (b.th.replies || 0) - (a.th.replies || 0));
    else if (App.SORT_MODE === "images") arr.sort((a, b) => (b.th.images || 0) - (a.th.images || 0));
    else if (App.SORT_MODE === "newest") arr.sort((a, b) => (b.th.time || 0) - (a.th.time || 0));
    else if (App.SORT_MODE === "oldest") arr.sort((a, b) => (a.th.time || 0) - (b.th.time || 0));
    // "bump" - leave 4chan's own catalog order alone
    return arr;
  }

  static render(board, pages) {
    if (!pages) { App.append(`<b>/${board}/</b><br><div class="error">empty</div>`); return; }

    const visibleTop = [], visibleNormal = [], filteredOut = [];
    for (const pg of pages) {
      if (!pg.threads) continue;
      for (const th of pg.threads) {
        const manual = HiddenStore.isThreadHidden(board, th.no);
        const verdict = filterVerdict(th, true);
        if (verdict && verdict.notify) FilterEngine.notifyOnce(th, `/${board}/ No.${th.no} matched a filter`);

        if (manual || (verdict && verdict.hidden)) {
          filteredOut.push({ th, manual, verdict });
          continue;
        }
        const hl = verdict && verdict.highlight ? { cls: verdict.highlightClass } : null;
        (verdict && verdict.top ? visibleTop : visibleNormal).push({ th, hl });
      }
    }

    CatalogView.#updateFilteredBadge(filteredOut.length);

    const header = `<b>/${board}/</b> <span style="font-size:var(--fs-sm);color:var(--c-fg-muted)">(` +
      (App.SHOW_FILTERED_ONLY ? "showing filtered" : (App.VIEW_MODE === "catalog" ? "catalog" : "index")) + `)</span><br>`;

    if (App.SHOW_FILTERED_ONLY) {
      App.append(header + CatalogView.#renderFilteredOnly(board, filteredOut));
      CatalogView.#bindFilteredOnlyRows(board);
      return;
    }

    const items = visibleTop.concat(CatalogView.sortThreads(visibleNormal));
    if (App.VIEW_MODE === "catalog") {
      App.append(header + `<div class="cat-grid">${items.map((x) => CatalogView.#card(board, x.th, x.hl)).join("")}</div>`);
      CatalogView.#bindItems("cat-card");
    } else {
      App.append(header + `<div class="index-list">${items.map((x) => CatalogView.#item(board, x.th, x.hl)).join("")}</div>`);
      CatalogView.#bindItems("thread-item");
    }
    StubRenderer.bind();
  }

  static #renderFilteredOnly(board, filteredOut) {
    if (!filteredOut.length) return `<div class="filtered-empty">nothing filtered on this board right now.</div>`;
    return filteredOut.map((f) => {
      const reason = f.manual ? "manually hidden" : "matched a filter rule";
      const sub = f.th.sub ? Dom.decodeEnts(f.th.sub) : "";
      const label = `No.${f.th.no}${sub ? " - " + sub : ""} (${reason})`;
      return `<div class="manually-hidden-note" data-b="${board}" data-n="${f.th.no}" data-manual="${f.manual ? 1 : 0}">` +
             `${Dom.esc(label)} &mdash; <i>click to restore, shift-click to open anyway</i></div>`;
    }).join("");
  }

  static #bindFilteredOnlyRows(board) {
    document.querySelectorAll(".manually-hidden-note").forEach((row) => {
      row.onclick = (e) => {
        const b = row.getAttribute("data-b"), n = row.getAttribute("data-n");
        if (e.shiftKey) { App.loadThread(b, n); return; }
        if (row.getAttribute("data-manual") === "1") HiddenStore.toggleThreadHidden(b, n);
        App.loadCatalog(b);
      };
    });
  }

  static #updateFilteredBadge(n) {
    const badge = document.getElementById("filtBadge");
    if (!badge) return;
    badge.innerHTML = n;
    badge.className = "filt-badge" + (n === 0 ? " zero" : "");
  }

  // index-mode row. sub/com come pre-escaped from the 4chan api -
  // re-escaping them here is the bug that used to turn ">>Go to" into
  // the literal text "&gt;Go to" on screen.
  static #item(board, th, hl) {
    const cls = "thread-item" + (hl ? ` post-highlight${hl.cls ? " hl-" + Dom.esc(hl.cls) : ""}` : "");
    const sub = th.sub || "";
    const com = Dom.strip(th.com || "").substring(0, 100);
    let h = `<div class="${cls}" data-kind="thread-item" data-b="${board}" data-n="${th.no}">`;
    h += `<div class="cat-meta">No.${th.no} <i class="fa-solid fa-reply-all"></i> ${th.replies || 0} <i class="fa-solid fa-image"></i> ${th.images || 0}</div>`;
    if (sub) h += `<div class="cat-sub">${sub}</div>`;
    if (com) h += `<div class="cat-com">${com}${com.length >= 100 ? ".." : ""}</div>`;
    if (th.tim) {
      const isVid = th.ext === ".webm" || th.ext === ".mp4";
      const thumb = Proxy.wrap(`${BoardApi.IMG}${board}/${th.tim}s.jpg`);
      const full = isVid ? thumb : Proxy.wrap(`${BoardApi.IMG}${board}/${th.tim}${th.ext || ".jpg"}`);
      h += `<img class="cat-thumb" data-kind="media" data-fullsrc="${full}" src="${thumb}" width="${th.tn_w || 40}" height="${th.tn_h || 40}">`;
    }
    h += "</div>";
    return h;
  }

  // catalog-mode portrait card. "No subject" never appears as a
  // placeholder - the caption just omits the subject line entirely
  // when the thread doesn't have one.
  static #card(board, th, hl) {
    const cls = "cat-card" + (hl ? ` post-highlight${hl.cls ? " hl-" + Dom.esc(hl.cls) : ""}` : "");
    const sub = th.sub ? Dom.strip(th.sub) : "";
    const com = Dom.strip(th.com || "").substring(0, 220);
    let h = `<div class="${cls}" data-kind="cat-card" data-b="${board}" data-n="${th.no}"><div class="cat-card-imgwrap">`;
    if (th.tim) {
      const isVid = th.ext === ".webm" || th.ext === ".mp4";
      const thumb = Proxy.wrap(`${BoardApi.IMG}${board}/${th.tim}s.jpg`);
      if (isVid || !th.ext) {
        h += `<img data-kind="media" loading="lazy" decoding="async" src="${thumb}" alt="">`;
      } else {
        // full-res through the proxy instead of the 4chan thumbnail,
        // which caps out ~150-250px and looks smeared once stretched
        // to fill a big card. falls back to the thumb if it 404s.
        const full = Proxy.wrap(`${BoardApi.IMG}${board}/${th.tim}${th.ext}`);
        h += `<img data-kind="media" loading="lazy" decoding="async" src="${full}" onerror="this.onerror=null;this.src='${thumb}';" alt="">`;
      }
    } else {
      h += `<span class="cat-card-noimg">No.${th.no}</span>`;
    }
    h += `</div><div class="cat-card-cap">`;
    if (sub) h += `<span class="cat-card-sub">${sub}</span>`;
    if (com) h += `<span class="cat-card-com">${com}</span>`;
    h += `<div class="cat-card-meta"><span><i class="fa-solid fa-reply-all"></i>${th.replies || 0}</span>` +
         `<span><i class="fa-solid fa-image"></i>${th.images || 0}</span></div>`;
    h += "</div></div>";
    return h;
  }

  // shift+click hides a thread instead of opening it, in both view modes
  static #bindItems(className) {
    document.querySelectorAll(`.${className}`).forEach((el) => {
      const b = el.getAttribute("data-b"), n = el.getAttribute("data-n");
      el.onclick = (e) => {
        if (e.shiftKey) {
          HiddenStore.toggleThreadHidden(b, n);
          if (App.BOARD) CatalogView.render(App.BOARD, App.LAST_CATALOG_PAGES);
          return;
        }
        App.loadThread(b, n);
      };
    });
  }
}
