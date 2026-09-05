import { Proxy } from "../util/proxy.js";
import { SmartCache } from "../util/smartCache.js";

const API = "https://a.4cdn.org/";
const IMG = "https://i.4cdn.org/";

// covers both board list metadata and catalog/thread json - one
// cache instance, ttl differs per call site
const cache = new SmartCache("sc_board_cache_v1");

function xhrGet(url, ok, err) {
  BoardApi.REQ++;
  let x;
  try { x = new XMLHttpRequest(); } catch (e) { err && err("no xhr"); return; }
  x.open("GET", Proxy.wrap(url), true);
  x.onreadystatechange = () => {
    if (x.readyState === 4) {
      if (x.status >= 200 && x.status < 300) ok(x.responseText);
      else err && err("http " + x.status);
    }
  };
  try { x.send(null); } catch (e) { err && err("fail"); }
}

function xhrGetJson(url, ok, err) {
  xhrGet(url, (t) => {
    try { ok(JSON.parse(t)); } catch (e) { err && err("json"); }
  }, err);
}

export class BoardApi {
  static API = API;
  static IMG = IMG;
  static REQ = 0;
  static BOARDS = [];
  static BOARDS_MAP = {};
  static WS_MAP = {};

  static loadBoards(onDone) {
    cache.fetch("boards", 1000 * 60 * 60 * 24, 1000 * 60 * 60 * 24 * 7, (ok, err) => {
      xhrGetJson(API + "boards.json", (d) => {
        if (d && d.boards) ok(d.boards.map((b) => ({ board: b.board, title: b.title, ws: b.ws_board })));
        else err("bad boards");
      }, err);
    }, (data) => {
      if (!data) return;
      BoardApi.BOARDS = data;
      BoardApi.BOARDS_MAP = {};
      BoardApi.WS_MAP = {};
      for (const b of data) {
        BoardApi.BOARDS_MAP[b.board] = b.title;
        BoardApi.WS_MAP[b.board] = b.ws;
      }
      onDone && onDone();
    });
  }

  static fetchCatalog(board, onData) {
    cache.fetch(`catalog:${board}`, 1000 * 30, 1000 * 60 * 10, (ok, err) => {
      xhrGetJson(`${API}${board}/catalog.json`, ok, err);
    }, onData);
  }

  static fetchThread(board, no, onData) {
    cache.fetch(`thread:${board}:${no}`, 1000 * 15, 1000 * 60 * 5, (ok, err) => {
      xhrGetJson(`${API}${board}/thread/${no}.json`, (d) => {
        if (!d || !d.posts) { err("no posts"); return; }
        ok(d.posts);
      }, err);
    }, onData);
  }

  // used directly by the watcher poll - doesn't go through the smart
  // cache since it needs a live reply count every time, not a cached one
  static fetchThreadLive(board, no, ok, err) {
    xhrGetJson(`${API}${board}/thread/${no}.json`, ok, err);
  }

  static clearCache() { cache.clear(); }
}
