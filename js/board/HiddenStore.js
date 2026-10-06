const LS_THREADS = "hidden_threads_v1";
const LS_POSTS = "hidden_posts_v1";

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
  static allHiddenPosts() { return HiddenStore.#all(LS_POSTS); }

  static restore(kind, key) {
    const storeKey = kind === "thread" ? LS_THREADS : LS_POSTS;
    const all = HiddenStore.#all(storeKey);
    delete all[key];
    HiddenStore.#save(storeKey, all);
  }

  static clearAll() {
    HiddenStore.#save(LS_THREADS, {});
    HiddenStore.#save(LS_POSTS, {});
  }
}
