const URL_RE = /(https?:\/\/[^\s<]+)/g;

function classifyUrl(u) {
  if (/(^https?:\/\/(www\.)?youtube\.com\/watch|^https?:\/\/youtu\.be\/)/i.test(u)) return "yt-link";
  if (/^https?:\/\/(www\.)?soundcloud\.com\//i.test(u)) return "sc-link";
  return "";
}

export class Linkify {
  static toHtml(html) {
    if (!html) return html;

    // 4chan inserts <wbr> inside long unbroken strings (urls,
    // filenames) so they can line-wrap without whitespace. splitting
    // on tag boundaries then meant a url broken by a <wbr> only ever
    // matched up to the break, chopping the last chunk off the href
    // and leaving it as dangling plain text after the link. strip
    // <wbr> before anything else so the url text stays contiguous.
    html = html.replace(/<wbr\s*\/?>/gi, "");

    const tokens = html.split(/(<[^>]+>)/);
    let insideAnchor = false;

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.charAt(0) === "<") {
        if (/^<a\b/i.test(t)) insideAnchor = true;
        else if (/^<\/a>/i.test(t)) insideAnchor = false;
        continue;
      }
      if (insideAnchor || !t) continue;

      tokens[i] = t.replace(URL_RE, (raw) => {
        let trail = "";
        const m = raw.match(/[).,;:!?]+$/);
        if (m) { trail = m[0]; raw = raw.slice(0, raw.length - trail.length); }
        const cls = classifyUrl(raw);
        return `<a href="${raw}" target="_blank" rel="noopener" class="ext-link${cls ? " " + cls : ""}" data-kind="ext-link" data-url="${raw}">${raw}</a>${trail}`;
      });
    }
    return tokens.join("");
  }

  static isMediaLink(el) {
    return el.className.indexOf("yt-link") >= 0 || el.className.indexOf("sc-link") >= 0;
  }

  static classify = classifyUrl;
}
