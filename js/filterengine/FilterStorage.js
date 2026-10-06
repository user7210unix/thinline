const LS_TEXT = "flt_text_v1";
const LS_STUBS = "flt_stubs_v1";
const LS_NOTIFIED = "flt_notified_v1";

const DEFAULT_TEXT =
  "# One filter per line. Lines starting with # are ignored.\n" +
  "# example: /weeaboo/i type:comment; boards:a,jp;\n";

export class FilterStorage {
  static getText() {
    try {
      const v = localStorage.getItem(LS_TEXT);
      return v === null ? DEFAULT_TEXT : v;
    } catch (e) { return DEFAULT_TEXT; }
  }

  static setText(text) {
    try { localStorage.setItem(LS_TEXT, text); } catch (e) {}
  }

  static getShowStubs() {
    try {
      const v = localStorage.getItem(LS_STUBS);
      return v === null ? true : JSON.parse(v);
    } catch (e) { return true; }
  }

  static setShowStubs(v) {
    try { localStorage.setItem(LS_STUBS, JSON.stringify(!!v)); } catch (e) {}
  }

  static getNotified() {
    try {
      const v = localStorage.getItem(LS_NOTIFIED);
      return v === null ? [] : JSON.parse(v);
    } catch (e) { return []; }
  }

  static setNotified(list) {
    try { localStorage.setItem(LS_NOTIFIED, JSON.stringify(list)); } catch (e) {}
  }
}
