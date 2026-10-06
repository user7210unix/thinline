import { FilterEngine } from "../filterengine/FilterEngine.js";
import { Dom } from "../util/dom.js";
import { Settings } from "./Settings.js";
import { App } from "../main.js";

const PRESETS = {
  general: "/general/i;op:only;type:subject",
  nosub: "/^$/;op:only;type:subject"
};

function showErrors(text) {
  const list = document.getElementById("filterErrors");
  list.innerHTML = FilterEngine.errors(text)
    .map((e) => `<li><code>${Dom.esc(e.raw)}</code> ${e.error}</li>`).join("");
}

export class FilterPanel {
  static init() {
    const textarea = document.getElementById("filterText");
    const stubs = document.getElementById("showStubsChk");
    textarea.value = FilterEngine.getText();
    stubs.checked = FilterEngine.getShowStubs();
    showErrors(textarea.value);

    textarea.oninput = () => showErrors(textarea.value);

    document.querySelectorAll("#filterPresets button").forEach((btn) => {
      btn.onclick = () => {
        const line = PRESETS[btn.getAttribute("data-preset")];
        const sep = textarea.value && !textarea.value.endsWith("\n") ? "\n" : "";
        textarea.value += sep + line + "\n";
        showErrors(textarea.value);
      };
    });

    document.getElementById("saveFilters").onclick = () => {
      FilterEngine.setText(textarea.value);
      FilterEngine.setShowStubs(stubs.checked);
      showErrors(textarea.value);
      Settings.close();
      if (App.BOARD && App.THREAD) App.loadThread(App.BOARD, App.THREAD);
      else if (App.BOARD) App.loadCatalog(App.BOARD);
    };

    document.getElementById("gearBtn").addEventListener("click", () => { textarea.value = FilterEngine.getText(); });
  }
}
