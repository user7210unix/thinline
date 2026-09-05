// worker only allowlists 4chan domains right now - anything else
// (amazon, youtube oembed, arbitrary reader-mode targets) 400s with
// no CORS header. not fixable from here, it's server-side config.
export class Proxy {
  static BASE = "https://chan-proxy.anonnousmes.workers.dev/?url=";

  static wrap(url) {
    return Proxy.BASE + encodeURIComponent(url);
  }
}
