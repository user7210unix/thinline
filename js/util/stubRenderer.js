export class StubRenderer {
  static wrap(bodyHtml, label, id) {
    return `<div class="stub-row" data-target="fb${id}">${label} &mdash; <i>click to show</i></div>` +
           `<div class="filtered-body" id="fb${id}">${bodyHtml}</div>`;
  }

  static bind() {
    document.querySelectorAll(".stub-row").forEach((row) => {
      row.onclick = () => {
        const body = document.getElementById(row.getAttribute("data-target"));
        if (body) body.className = "filtered-body shown";
        row.style.display = "none";
      };
    });
  }
}
