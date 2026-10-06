import { FilterStorage } from "./FilterStorage.js";
import { FilterParser } from "./FilterParser.js";
import { FilterMatcher } from "./FilterMatcher.js";
import { NOTIFIED_MAX } from "../config.js";

export class FilterEngine {
  static #rules = [];

  static init() {
    FilterEngine.#rules = FilterParser.parse(FilterStorage.getText());
  }

  static setText(text) {
    FilterStorage.setText(text);
    FilterEngine.#rules = FilterParser.parse(text);
  }

  static addRule(line) {
    const text = FilterStorage.getText();
    const sep = text.endsWith("\n") || !text ? "" : "\n";
    FilterEngine.setText(text + sep + line + "\n");
  }

  static escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&"); }

  static errors(text) {
    return FilterParser.parse(text).filter((r) => r.error).map((r) => ({ raw: r.raw.trim(), error: r.error }));
  }

  static getText() { return FilterStorage.getText(); }
  static getRules() { return FilterEngine.#rules; }
  static getShowStubs() { return FilterStorage.getShowStubs(); }
  static setShowStubs(v) { FilterStorage.setShowStubs(v); }

  static evaluate(post, ctx) {
    return FilterMatcher.evaluate(FilterEngine.#rules, post, ctx);
  }

  static notifyOnce(post, text) {
    const seen = FilterStorage.getNotified();
    const key = String(post.no);
    if (seen.includes(key)) return;
    seen.push(key);
    FilterStorage.setNotified(seen.length > NOTIFIED_MAX ? seen.slice(-NOTIFIED_MAX) : seen);

    try {
      if (!window.Notification) return;
      if (Notification.permission === "granted") {
        new Notification("thinline filter match", { body: text });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") new Notification("thinline filter match", { body: text });
        });
      }
    } catch (e) {}
  }
}
