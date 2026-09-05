const LS_CHOICE = "flm_choice_v1";
const LS_SIZE = "flm_size_v1";

export class FontCache {
  static saveChoice(family) {
    try { localStorage.setItem(LS_CHOICE, JSON.stringify({ family })); } catch (e) {}
  }
  static loadChoice() {
    try {
      const v = localStorage.getItem(LS_CHOICE);
      return v === null ? null : JSON.parse(v);
    } catch (e) { return null; }
  }
  static saveSize(px) {
    try { localStorage.setItem(LS_SIZE, JSON.stringify(px)); } catch (e) {}
  }
  static loadSize() {
    try {
      const v = localStorage.getItem(LS_SIZE);
      return v === null ? 14 : JSON.parse(v);
    } catch (e) { return 14; }
  }
}
