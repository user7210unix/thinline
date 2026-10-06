const LS_CHOICE = "palette_id_v2";

export class PaletteCache {
  static saveChoice(id) {
    try { localStorage.setItem(LS_CHOICE, id); } catch (e) {}
  }

  static loadChoice() {
    try { return localStorage.getItem(LS_CHOICE); } catch (e) { return null; }
  }
}
