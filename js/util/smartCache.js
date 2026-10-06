export class SmartCache {
  constructor(storageKey, maxEntries = 60) {
    this.storageKey = storageKey;
    this.maxEntries = maxEntries;
  }

  _all() {
    try { return JSON.parse(localStorage.getItem(this.storageKey) || "{}"); }
    catch (e) { return {}; }
  }

  _save(all) {
    try { localStorage.setItem(this.storageKey, JSON.stringify(all)); }
    catch (e) {}
  }

  read(key) {
    return this._all()[key] || null;
  }

  write(key, data) {
    const all = this._all();
    all[key] = { t: Date.now(), data };
    const keys = Object.keys(all);
    if (keys.length > this.maxEntries) {
      keys.sort((a, b) => all[a].t - all[b].t);
      delete all[keys[0]];
    }
    this._save(all);
  }

  clear() {
    try { localStorage.removeItem(this.storageKey); } catch (e) {}
  }

  fetch(key, ttlFresh, ttlStale, loader, onData) {
    const entry = this.read(key);
    const now = Date.now();

    if (entry && (now - entry.t) < ttlFresh) {
      onData(entry.data, true);
      return;
    }
    if (entry && (now - entry.t) < ttlStale) {
      onData(entry.data, true);
      loader((data) => { this.write(key, data); onData(data, false); }, () => {});
      return;
    }
    loader(
      (data) => { this.write(key, data); onData(data, false); },
      (err) => { entry ? onData(entry.data, true) : onData(null, false, err); }
    );
  }
}
