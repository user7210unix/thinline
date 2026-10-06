export class Proxy {
  static BASE = "https://chan-proxy.anonnousmes.workers.dev/?url=";

  static wrap(url) {
    return Proxy.BASE + encodeURIComponent(url);
  }
}
