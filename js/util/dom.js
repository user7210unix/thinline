export class Dom {
  static esc(s) {
    if (!s) return "";
    return ("" + s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

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
