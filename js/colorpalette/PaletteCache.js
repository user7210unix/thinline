const LS_CHOICE = "cpm_choice_v1";

export class PaletteCache {
  static saveChoice(colors, theme) {
    try { localStorage.setItem(LS_CHOICE, JSON.stringify({ colors, theme: theme || "" })); }
    catch (e) {}
  }

  static loadChoice() {
    try {
      const v = localStorage.getItem(LS_CHOICE);
      return v === null ? null : JSON.parse(v);
    } catch (e) { return null; }
  }
}
