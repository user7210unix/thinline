const DEFAULT_TYPES = [["subject"], ["name"], ["filename"], ["comment"]];

const FIELD_ALIASES = {
  postid: "postID", name: "name", uniqueid: "uniqueID", tripcode: "tripcode",
  capcode: "capcode", pass: "pass", email: "email", subject: "subject",
  comment: "comment", flag: "flag", filename: "filename",
  dimensions: "dimensions", filesize: "filesize", md5: "MD5"
};

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

const REGEX_LINE = /^\/((?:\\.|[^\/\\])+)\/([a-z]*)(?=\s|$)\s*(.*)$/;
const STATEFUL_FLAGS = /[gy]/g;

function applyOption(rule, key, val) {
  if (key === "type") rule.types = parseTypes(val);
  else if (key === "boards") rule.boards = parseBoardList(val);
  else if (key === "exclude") rule.exclude = parseBoardList(val);
  else if (key === "op" || key === "file" || key === "stub" || key === "top") rule[key] = val.toLowerCase();
  else if (key === "notify") rule.notify = true;
  else if (key === "highlight") { rule.highlight = true; rule.highlightClass = val || null; }
}

function parseOption(rule, chunk) {
  const opt = chunk.trim();
  if (!opt) return;
  const ci = opt.indexOf(":");
  applyOption(rule, (ci >= 0 ? opt.slice(0, ci) : opt).trim().toLowerCase(), ci >= 0 ? opt.slice(ci + 1).trim() : "");
}

function parsePattern(rule, head) {
  const m = head.match(REGEX_LINE);
  if (!m) { rule.literal = head; return; }
  try {
    rule.regex = new RegExp(m[1], m[2].replace(STATEFUL_FLAGS, ""));
  } catch (e) {
    rule.error = "invalid regular expression";
    return;
  }
  m[3].split(/\s+/).forEach((chunk) => parseOption(rule, chunk));
}

export class FilterParser {
  static DEFAULT_TYPES = DEFAULT_TYPES;
  static parseBoardList = parseBoardList;

  static parseLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.charAt(0) === "#") return null;

    const segments = trimmed.split(";").map((s) => s.trim());
    const rule = {
      raw: line, regex: null, literal: null, types: null, boards: null,
      exclude: null, op: null, file: null, stub: null, error: null,
      highlight: false, highlightClass: null, top: null, notify: false
    };

    parsePattern(rule, segments[0]);
    segments.slice(1).forEach((chunk) => parseOption(rule, chunk));
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
