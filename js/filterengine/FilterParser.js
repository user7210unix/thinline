const DEFAULT_TYPES = [["subject"], ["name"], ["filename"], ["comment"]];

const FIELD_ALIASES = {
  postid: "postID", name: "name", uniqueid: "uniqueID", tripcode: "tripcode",
  capcode: "capcode", pass: "pass", email: "email", subject: "subject",
  comment: "comment", flag: "flag", filename: "filename",
  dimensions: "dimensions", filesize: "filesize", md5: "MD5"
};

// "4:a,jp,sama:a,z" -> { "4": ["a","jp"], "sama": ["a","z"] }
// a bare board with no site prefix goes under __default__, meaning
// "this site" - always 4chan here, but kept generic on purpose
function parseBoardList(value) {
  const out = {};
  let currentSite = "__default__";
  for (const raw of value.split(",")) {
    const tok = raw.trim();
    if (!tok) continue;
    const ci = tok.indexOf(":");
    if (ci >= 0) {
      currentSite = tok.slice(0, ci).trim().toLowerCase();
      const board = tok.slice(ci + 1).trim().toLowerCase();
      if (!out[currentSite]) out[currentSite] = [];
      if (board) out[currentSite].push(board);
    } else {
      if (!out[currentSite]) out[currentSite] = [];
      out[currentSite].push(tok.toLowerCase());
    }
  }
  return out;
}

// "filename+filesize,comment" -> [["filename","filesize"], ["comment"]]
function parseTypes(value) {
  const out = [];
  for (const group of value.split(",")) {
    const g = [];
    for (const part of group.split("+")) {
      const key = part.trim().toLowerCase();
      if (FIELD_ALIASES[key]) g.push(key);
    }
    if (g.length) out.push(g);
  }
  return out.length ? out : DEFAULT_TYPES;
}

export class FilterParser {
  static DEFAULT_TYPES = DEFAULT_TYPES;
  static parseBoardList = parseBoardList;

  static parseLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.charAt(0) === "#") return null;

    const segments = trimmed.split(";").map((s) => s.trim());
    while (segments.length && !segments[segments.length - 1]) segments.pop();
    if (!segments.length) return null;

    const patternPart = segments[0];
    const rule = {
      raw: line, regex: null, literal: null, types: null, boards: null,
      exclude: null, op: null, file: null, stub: null,
      highlight: false, highlightClass: null, top: null, notify: false
    };

    if (patternPart.charAt(0) === "/") {
      const lastSlash = patternPart.lastIndexOf("/");
      if (lastSlash > 0) {
        const body = patternPart.slice(1, lastSlash);
        const flags = patternPart.slice(lastSlash + 1);
        try { rule.regex = new RegExp(body, flags); }
        catch (e) { rule.regex = null; rule.literal = patternPart; }
      } else {
        rule.literal = patternPart;
      }
    } else {
      rule.literal = patternPart;
    }

    for (let i = 1; i < segments.length; i++) {
      const opt = segments[i];
      const ci = opt.indexOf(":");
      const key = (ci >= 0 ? opt.slice(0, ci) : opt).trim().toLowerCase();
      const val = ci >= 0 ? opt.slice(ci + 1).trim() : "";

      if (key === "type") rule.types = parseTypes(val);
      else if (key === "boards") rule.boards = parseBoardList(val);
      else if (key === "exclude") rule.exclude = parseBoardList(val);
      else if (key === "op") rule.op = val.toLowerCase();
      else if (key === "file") rule.file = val.toLowerCase();
      else if (key === "stub") rule.stub = val.toLowerCase();
      else if (key === "top") rule.top = val.toLowerCase();
      else if (key === "notify") rule.notify = true;
      else if (key === "highlight") { rule.highlight = true; rule.highlightClass = val || null; }
    }

    if (!rule.types) rule.types = DEFAULT_TYPES;
    return rule;
  }

  static parse(text) {
    const out = [];
    for (const line of (text || "").split("\n")) {
      const r = FilterParser.parseLine(line);
      if (r) out.push(r);
    }
    return out;
  }
}
