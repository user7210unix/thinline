import { Settings } from "./Settings.js";
import { HOME_ART, HOME_ART_SIZE } from "../config.js";
import { App } from "../main.js";

const UNDERLINE = `<svg class="home-stroke" viewBox="0 0 300 18" preserveAspectRatio="none" aria-hidden="true">` +
  `<path d="M4 11 C 50 3, 90 15, 140 8 S 230 4, 296 10" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`;

export class Home {
  static render() {
    const boards = Settings.pinnedBoards().map((b) => `<button type="button" data-b="${b}">/${b}/</button>`).join("");
    App.append(
      `<section class="home">` +
      `<img class="home-art" src="${HOME_ART}" width="${HOME_ART_SIZE}" height="${HOME_ART_SIZE}" alt="" decoding="async">` +
      `<h1 class="home-title">thinline${UNDERLINE}</h1>` +
      `<p class="home-sub">a quiet reader for imageboards</p>` +
      `<div class="home-boards">${boards}</div></section>`
    );
    document.querySelectorAll(".home-boards button").forEach((btn) => {
      btn.onclick = () => App.loadCatalog(btn.getAttribute("data-b"));
    });
  }
}
