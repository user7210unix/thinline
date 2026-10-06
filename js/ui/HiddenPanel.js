import { Dom } from "../util/dom.js";
import { HiddenStore } from "../board/HiddenStore.js";
import { App } from "../main.js";

function row(kind, key, label) {
  return `<div class="hidden-row"><span>${Dom.esc(label)}</span>` +
    `<button type="button" data-kind-hidden="${kind}" data-key="${Dom.esc(key)}">Restore</button></div>`;
}

function threadLabel(key, meta) {
  const sub = meta && meta.sub ? ` ${meta.sub}` : "";
  return `thread ${key.replace(":", " No.")}${sub}`;
}

function postLabel(key, meta) {
  const who = meta && meta.label ? ` by ${meta.label}` : "";
  return `post ${key.split(":").join(" ")}${who}`;
}

export class HiddenPanel {
  static render() {
    const threads = Object.entries(HiddenStore.allHiddenThreads()).map(([k, m]) => row("thread", k, threadLabel(k, m)));
    const posts = Object.entries(HiddenStore.allHiddenPosts()).map(([k, m]) => row("post", k, postLabel(k, m)));
    const list = document.getElementById("hiddenList");
    list.innerHTML = threads.concat(posts).join("") || `<div class="hidden-empty">nothing hidden</div>`;
    list.querySelectorAll("button").forEach((btn) => {
      btn.onclick = () => {
        HiddenStore.restore(btn.getAttribute("data-kind-hidden"), btn.getAttribute("data-key"));
        HiddenPanel.render();
        App.refreshView();
      };
    });
  }

  static init() {
    document.getElementById("gearBtn").addEventListener("click", HiddenPanel.render);
    document.getElementById("btnRestoreAll").onclick = () => {
      HiddenStore.clearAll();
      HiddenPanel.render();
      App.refreshView();
    };
    HiddenPanel.render();
  }
}
