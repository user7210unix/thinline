function absUrl(rel, base) {
  try { return new URL(rel, base).href; } catch (e) { return rel; }
}

function textScore(el) {
  const text = el.textContent || "";
  let linkTextLen = 0;
  el.querySelectorAll("a").forEach((a) => { linkTextLen += (a.textContent || "").length; });
  const pCount = el.querySelectorAll("p").length;
  return text.length - linkTextLen * 1.5 + pCount * 40;
}

function pickMain(doc) {
  const sel = "article, main, [role=main], .article, .post-content, .entry-content, .article-body, .story-body, #content, .content";
  const candidates = doc.querySelectorAll(sel);
  const pool = candidates.length ? candidates : doc.querySelectorAll("div, section");
  let best = null, bestScore = 200; // floor so a small nav blob never wins
  pool.forEach((el) => {
    const s = textScore(el);
    if (s > bestScore) { bestScore = s; best = el; }
  });
  return best || doc.body;
}

const JUNK_SELECTOR = [
  "script", "style", "noscript", "iframe", "form", "button", "svg", "nav", "header", "footer", "aside",
  "[class*='ad-']", "[class*='-ad']", "[id*='ad-']", "[class*='advert']", "[class*='promo']",
  "[class*='subscribe']", "[class*='newsletter']", "[class*='social']", "[class*='share']",
  "[class*='comment']", "[class*='related']", "[class*='sidebar']", "[class*='cookie']", "[class*='popup']"
].join(",");

function clean(node, baseUrl) {
  const clone = node.cloneNode(true);
  clone.querySelectorAll(JUNK_SELECTOR).forEach((el) => el.parentNode && el.parentNode.removeChild(el));

  clone.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || img.getAttribute("data-src");
    if (src) img.setAttribute("src", absUrl(src, baseUrl));
    img.removeAttribute("srcset");
    img.removeAttribute("loading");
  });
  clone.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href) a.setAttribute("href", absUrl(href, baseUrl));
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener");
  });

  // strip everything that could fight our own theme or run script
  clone.querySelectorAll("*").forEach((el) => {
    el.removeAttribute("style");
    el.removeAttribute("class");
    el.removeAttribute("id");
    [...el.attributes].forEach((attr) => {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
    });
  });
  return clone.innerHTML;
}

// heuristic extraction, no per-site rules: score candidate containers
// by paragraph text vs. link text (a rough nav-vs-body-copy signal),
// pick the best one, strip the junk list, resolve relative urls.
export class ReaderMode {
  static extract(html, baseUrl) {
    let doc;
    try { doc = new DOMParser().parseFromString(html, "text/html"); }
    catch (e) { return null; }

    const titleMeta = doc.querySelector("meta[property='og:title']");
    const title = titleMeta ? titleMeta.getAttribute("content") : (doc.querySelector("title")?.textContent || "");
    const siteMeta = doc.querySelector("meta[property='og:site_name']");
    const siteName = siteMeta ? siteMeta.getAttribute("content") : baseUrl.replace(/^https?:\/\//, "").split("/")[0];

    const main = pickMain(doc);
    const bodyHtml = clean(main, baseUrl);
    return { title: (title || siteName || "").trim(), siteName, bodyHtml };
  }
}
