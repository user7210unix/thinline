export class CursorPreview {
  static #active = false;

  static #show(src, x, y) {
    const box = document.getElementById("cursorPreview");
    const img = document.getElementById("cursorPreviewImg");
    img.onload = () => CursorPreview.#position(x, y);
    img.src = src;
    box.className = "cursor-preview";
    CursorPreview.#active = true;
    CursorPreview.#position(x, y);
  }

  static #position(x, y) {
    const box = document.getElementById("cursorPreview");
    if (box.className.includes("hidden")) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = box.offsetWidth || 300, h = box.offsetHeight || 300;
    const offset = 22;
    let left = x + offset, top = y + offset;
    if (left + w > vw - 8) left = x - w - offset;
    if (top + h > vh - 8) top = y - h - offset;
    box.style.left = Math.max(8, left) + "px";
    box.style.top = Math.max(8, top) + "px";
  }

  static #hide() {
    document.getElementById("cursorPreview").className = "cursor-preview hidden";
    CursorPreview.#active = false;
  }

  static init() {
    let raf = false, lastX = 0, lastY = 0;

    document.addEventListener("mouseover", (e) => {
      const t = e.target;
      if (!t || !t.getAttribute || t.getAttribute("data-kind") !== "media" || t.tagName !== "IMG") return;
      if (t.className && t.className.includes("full")) return;
      CursorPreview.#show(t.getAttribute("data-fullsrc") || t.src, e.clientX, e.clientY);
    });

    document.addEventListener("mousemove", (e) => {
      lastX = e.clientX; lastY = e.clientY;
      if (!CursorPreview.#active || raf) return;
      raf = true;
      requestAnimationFrame(() => { CursorPreview.#position(lastX, lastY); raf = false; });
    });

    document.addEventListener("mouseout", (e) => {
      const t = e.target;
      if (!t || !t.getAttribute || t.getAttribute("data-kind") !== "media" || t.tagName !== "IMG") return;
      CursorPreview.#hide();
    });

    document.addEventListener("click", () => {
      if (CursorPreview.#active) CursorPreview.#hide();
    });
  }
}
