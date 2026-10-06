import { Settings } from "../ui/Settings.js";
import { SplitView } from "../reader/SplitView.js";
import { POST_PREVIEW_DELAY_MS, POST_PREVIEW_HIDE_MS, VIEWPORT_MARGIN } from "../config.js";

const GAP = 6;

function quoteTarget(node) {
  return node && node.closest ? node.closest('[data-kind="quote"]') : null;
}

function sourcePost(pid) {
  return document.querySelector(`#content [data-kind="post"][data-n="${pid}"]`);
}

function place(box, anchor) {
  const rect = anchor.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = box.offsetWidth, h = box.offsetHeight;
  const below = rect.bottom + GAP;
  const top = below + h > vh - VIEWPORT_MARGIN ? Math.max(VIEWPORT_MARGIN, rect.top - h - GAP) : below;
  const left = Math.min(Math.max(VIEWPORT_MARGIN, rect.left), vw - w - VIEWPORT_MARGIN);
  box.style.left = Math.max(VIEWPORT_MARGIN, left) + "px";
  box.style.top = top + "px";
}

export class PostPreview {
  static #showTimer = null;
  static #hideTimer = null;

  static #hide() {
    document.getElementById("postPreview").className = "post-preview hidden";
  }

  static #show(anchor) {
    const src = sourcePost(anchor.getAttribute("data-pid"));
    if (!src) return;
    const box = document.getElementById("postPreview");
    const clone = src.cloneNode(true);
    clone.removeAttribute("id");
    box.innerHTML = "";
    box.appendChild(clone);
    box.className = "post-preview";
    place(box, anchor);
  }

  static init() {
    const box = document.getElementById("postPreview");

    document.addEventListener("mouseover", (e) => {
      const a = quoteTarget(e.target);
      if (!a || !Settings.postPreviewEnabled()) return;
      clearTimeout(PostPreview.#hideTimer);
      clearTimeout(PostPreview.#showTimer);
      PostPreview.#showTimer = setTimeout(() => PostPreview.#show(a), POST_PREVIEW_DELAY_MS);
    });

    document.addEventListener("mouseout", (e) => {
      if (!quoteTarget(e.target)) return;
      clearTimeout(PostPreview.#showTimer);
      PostPreview.#hideTimer = setTimeout(PostPreview.#hide, POST_PREVIEW_HIDE_MS);
    });

    box.addEventListener("mouseenter", () => clearTimeout(PostPreview.#hideTimer));
    box.addEventListener("mouseleave", () => { PostPreview.#hideTimer = setTimeout(PostPreview.#hide, POST_PREVIEW_HIDE_MS); });
    document.addEventListener("scroll", PostPreview.#hide, true);
    document.addEventListener("click", (e) => {
      const a = quoteTarget(e.target);
      if (!a) return;
      e.preventDefault();
      PostPreview.#hide();
      SplitView.openPost(a.getAttribute("data-pid"));
    });
  }
}
