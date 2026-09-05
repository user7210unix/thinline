const LS_THREADS = "hidden_threads_v1";
const LS_POSTS = "hidden_posts_v1";

// manual shift-click hides, separate from FilterEngine's regex rules.
// kept in their own store so both feed into the same "filtered" count
// without conflating rule matches with a one-off "don't want to see
// this" click.
export class HiddenStore {
  static #all(key) {
    try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (e) { return {}; }
  }
  static #save(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
  }

  static threadKey(board, no) { return `${board}:${no}`; }
  static postKey(board, threadNo, no) { return `${board}:${threadNo}:${no}`; }

  static isThreadHidden(board, no) {
    return !!HiddenStore.#all(LS_THREADS)[HiddenStore.threadKey(board, no)];
  }

  static toggleThreadHidden(board, no, meta) {
    const all = HiddenStore.#all(LS_THREADS);
    const k = HiddenStore.threadKey(board, no);
    if (all[k]) delete all[k]; else all[k] = meta || true;
    HiddenStore.#save(LS_THREADS, all);
  }

  static isPostHidden(board, threadNo, no) {
    return !!HiddenStore.#all(LS_POSTS)[HiddenStore.postKey(board, threadNo, no)];
  }

  static togglePostHidden(board, threadNo, no, meta) {
    const all = HiddenStore.#all(LS_POSTS);
    const k = HiddenStore.postKey(board, threadNo, no);
    if (all[k]) delete all[k]; else all[k] = meta || true;
    HiddenStore.#save(LS_POSTS, all);
  }

  static allHiddenThreads() { return HiddenStore.#all(LS_THREADS); }
}
