import { Settings } from "./Settings.js";
import { App } from "../main.js";

export class Header {
  static renderPinned() {
    const nav = document.getElementById("pinned");
    nav.innerHTML = Settings.pinnedBoards()
      .map((b) => `<a href="#" data-b="${b}" class="${b === App.BOARD ? "active" : ""}">/${b}/</a>`).join("");
    nav.querySelectorAll("a").forEach((a) => {
      a.onclick = (e) => { e.preventDefault(); App.loadCatalog(a.getAttribute("data-b")); };
    });
  }

  static init() {
    document.getElementById("brand").onclick = () => App.showHome();
    Header.renderPinned();
  }
}
