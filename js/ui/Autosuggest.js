import { Dom } from "../util/dom.js";
import { BoardApi } from "../board/BoardApi.js";
import { App } from "../main.js";

export class Autosuggest {
  static init() {
    const input = document.getElementById("boardInput");
    const list = document.getElementById("boardAC");
    if (!input || !list) return;

    const render = (matches) => {
      if (!matches.length) { list.className = "ac-list hidden"; return; }
      list.innerHTML = matches.slice(0, 8).map((m) =>
        `<div class="ac-item" data-b="${m.board}"><b>/${m.board}/</b><span>${Dom.esc(m.title)}</span></div>`
      ).join("");
      list.className = "ac-list";
      list.querySelectorAll(".ac-item").forEach((item) => {
        item.onclick = () => {
          input.value = item.getAttribute("data-b");
          list.className = "ac-list hidden";
          App.loadCatalog(input.value);
        };
      });
    };

    input.oninput = () => {
      const v = input.value.trim().toLowerCase();
      if (!v || !BoardApi.BOARDS.length) { list.className = "ac-list hidden"; return; }
      render(BoardApi.BOARDS.filter((b) => b.board.indexOf(v) === 0 || b.title.toLowerCase().includes(v)));
    };
    document.addEventListener("click", (e) => {
      if (e.target !== input) list.className = "ac-list hidden";
    });
  }
}
