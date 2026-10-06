import { App } from "../main.js";

const SORT_LABELS = { bump: "Bump", replies: "Replies", images: "Images", newest: "Newest", oldest: "Oldest" };

export class ViewControls {
  static initViewToggle() {
    App.VIEW_MODE = App.loadViewMode();
    const btns = document.querySelectorAll("#viewSeg button");
    btns.forEach((btn) => {
      btn.className = btn.getAttribute("data-mode") === App.VIEW_MODE ? "active" : "";
      btn.onclick = () => App.setViewMode(btn.getAttribute("data-mode"));
    });

    const filtBtn = document.getElementById("btnFilteredToggle");
    if (filtBtn) filtBtn.onclick = () => {
      App.SHOW_FILTERED_ONLY = !App.SHOW_FILTERED_ONLY;
      filtBtn.className = "nav-btn" + (App.SHOW_FILTERED_ONLY ? " active" : "");
      App.rerenderBoardList();
    };
  }

  static initSortControl() {
    App.SORT_MODE = App.loadSortMode();
    const toggle = document.getElementById("sortToggle");
    const menu = document.getElementById("sortMenu");
    const label = document.getElementById("curSortLabel");
    if (label) label.innerHTML = SORT_LABELS[App.SORT_MODE] || "Bump";

    const btns = menu ? menu.querySelectorAll("button") : [];
    btns.forEach((btn) => {
      btn.className = btn.getAttribute("data-sort") === App.SORT_MODE ? "active" : "";
      btn.onclick = function () {
        App.SORT_MODE = this.getAttribute("data-sort");
        App.saveSortMode(App.SORT_MODE);
        if (label) label.innerHTML = SORT_LABELS[App.SORT_MODE];
        btns.forEach((b) => { b.className = (b === this) ? "active" : ""; });
        menu.className = "nav-sort-menu hidden";
        App.rerenderBoardList();
      };
    });

    if (toggle) toggle.onclick = (e) => {
      e.stopPropagation();
      menu.className = menu.className.includes("hidden") ? "nav-sort-menu" : "nav-sort-menu hidden";
    };
    document.addEventListener("click", (e) => {
      if (menu && !menu.className.includes("hidden") && e.target !== toggle && !menu.contains(e.target)) {
        menu.className = "nav-sort-menu hidden";
      }
    });
  }
}
