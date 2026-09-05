import { Dom } from "../util/dom.js";
import { BoardApi } from "../board/BoardApi.js";

const LS_LIST = "watch_list_v1";

export class ThreadWatcher {
  static #all() {
    try { return JSON.parse(localStorage.getItem(LS_LIST) || "{}"); } catch (e) { return {}; }
  }
  static #save(all) {
    try { localStorage.setItem(LS_LIST, JSON.stringify(all)); } catch (e) {}
  }
  static #key(board, no) { return `${board}:${no}`; }

  static all() { return ThreadWatcher.#all(); }

  static isWatched(board, no) {
    return !!ThreadWatcher.#all()[ThreadWatcher.#key(board, no)];
  }

  static add(board, op) {
    const all = ThreadWatcher.#all();
    const k = ThreadWatcher.#key(board, op.no);
    const existing = all[k];
    all[k] = {
      board, no: op.no,
      sub: op.sub || "",
      com: Dom.strip(op.com || "").substring(0, 140),
      tim: op.tim || null,
      ext: op.ext || "",
      replies: op.replies || 0,
      lastSeenReplies: op.replies || 0,
      dead: false,
      addedAt: existing ? existing.addedAt : Date.now()
    };
    ThreadWatcher.#save(all);
  }

  static remove(board, no) {
    const all = ThreadWatcher.#all();
    delete all[ThreadWatcher.#key(board, no)];
    ThreadWatcher.#save(all);
  }

  static markSeen(board, no) {
    const all = ThreadWatcher.#all();
    const k = ThreadWatcher.#key(board, no);
    if (all[k]) { all[k].lastSeenReplies = all[k].replies; ThreadWatcher.#save(all); }
  }

  static count() { return Object.keys(ThreadWatcher.#all()).length; }

  static newCount() {
    const all = ThreadWatcher.#all();
    return Object.values(all).filter((w) => (w.replies || 0) > (w.lastSeenReplies || 0)).length;
  }

  // staggers requests so a long watch list doesn't burst the proxy
  static poll(onProgress) {
    const all = ThreadWatcher.#all();
    const keys = Object.keys(all);
    if (!keys.length) return;

    let i = 0;
    const next = () => {
      if (i >= keys.length) { onProgress && onProgress(); return; }
      const k = keys[i], w = all[k];
      i++;
      BoardApi.fetchThreadLive(w.board, w.no, (d) => {
        const cur = ThreadWatcher.#all();
        if (cur[k]) {
          if (d && d.posts && d.posts.length) {
            cur[k].replies = d.posts[0].replies || (d.posts.length - 1);
            cur[k].dead = false;
          } else {
            cur[k].dead = true;
          }
          ThreadWatcher.#save(cur);
        }
        setTimeout(next, 700);
      }, () => {
        const cur = ThreadWatcher.#all();
        if (cur[k]) { cur[k].dead = true; ThreadWatcher.#save(cur); }
        setTimeout(next, 700);
      });
    };
    next();
  }
}
