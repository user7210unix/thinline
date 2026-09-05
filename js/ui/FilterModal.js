import { FilterEngine } from "../filterengine/FilterEngine.js";
import { App } from "../main.js";

export class FilterModal {
  static init() {
    const openBtn = document.getElementById("btnOpenFilters");
    const overlay = document.getElementById("filterOverlay");
    const closeBtn = document.getElementById("closeFilters");
    const saveBtn = document.getElementById("saveFilters");
    const textarea = document.getElementById("filterText");
    const stubsChk = document.getElementById("showStubsChk");

    const open = () => {
      if (textarea) textarea.value = FilterEngine.getText();
      if (stubsChk) stubsChk.checked = FilterEngine.getShowStubs();
      if (overlay) overlay.className = "modal-overlay";
    };
    const close = () => { if (overlay) overlay.className = "modal-overlay hidden"; };

    if (openBtn) openBtn.onclick = open;
    if (closeBtn) closeBtn.onclick = close;
    if (overlay) overlay.onclick = (e) => { if (e.target === overlay) close(); };
    if (saveBtn) saveBtn.onclick = () => {
      FilterEngine.setText(textarea ? textarea.value : "");
      FilterEngine.setShowStubs(stubsChk ? stubsChk.checked : true);
      close();
      if (App.BOARD && App.THREAD) App.loadThread(App.BOARD, App.THREAD);
      else if (App.BOARD) App.loadCatalog(App.BOARD);
    };
  }
}
