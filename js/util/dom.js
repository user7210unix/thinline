export class Dom {
  static esc(s) {
    if (!s) return "";
    return ("" + s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // 4chan's API already HTML-escapes sub/com/name/filename before we
  // ever see them. this decodes back to plain text - only use it where
  // we need genuinely plain text (tab title, filtered-list labels),
  // never for anything getting re-inserted as innerHTML.
  static decodeEnts(s) {
    if (!s) return "";
    const ta = document.createElement("textarea");
    ta.innerHTML = s;
    return ta.value;
  }

  static strip(s) {
    if (!s) return "";
    return ("" + s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  static size(bytes) {
    if (!bytes) return "0";
    if (bytes < 1024) return bytes + "B";
    if (bytes < 1048576) return Math.floor(bytes / 1024) + "K";
    return Math.floor(bytes / 1048576) + "M";
  }
}
