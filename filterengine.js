/*
 * filterengine.js
 * ---------------------------------------------------------------
 * Self-contained module owning the entire filter system:
 *   - parsing a 4chan-X style filter list (one rule per line)
 *   - evaluating a post/thread against all rules
 *   - persisting the raw filter text + "show stubs" setting
 *
 * Syntax per line:
 *   /regex/flags  option:value; option:value; bareOption;
 *   plain literal text   (used verbatim, see MD5/uniqueID below)
 *   # a comment line is ignored
 *
 * Recognised options: type: boards: exclude: op: file: stub:
 * highlight / highlight:class  top: notify
 * ---------------------------------------------------------------
 */

var FilterEngine = (function () {

  "use strict";

  var LS_TEXT = "flt_text_v1";
  var LS_STUBS = "flt_stubs_v1";
  var LS_NOTIFIED = "flt_notified_v1";

  var DEFAULT_TYPES = [["subject"], ["name"], ["filename"], ["comment"]];
  var EXACT_FIELDS = { md5: 1, uniqueid: 1 }; // matched by exact string, never regex

  var FIELD_ALIASES = {
    postid: "postID", name: "name", uniqueid: "uniqueID", tripcode: "tripcode",
    capcode: "capcode", pass: "pass", email: "email", subject: "subject",
    comment: "comment", flag: "flag", filename: "filename",
    dimensions: "dimensions", filesize: "filesize", md5: "MD5"
  };

  var rules = [];

  /* -------------------- persistence -------------------- */

  function lsGetStr(key, fallback) {
    try { var v = localStorage.getItem(key); return v === null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function lsSetStr(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function lsGetJson(key, fallback) {
    try { var v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  }
  function lsSetJson(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  function getText() { return lsGetStr(LS_TEXT, DEFAULT_TEXT()); }
  function setText(text) { lsSetStr(LS_TEXT, text); rules = parse(text); }

  function getShowStubs() { return lsGetJson(LS_STUBS, true); }
  function setShowStubs(v) { lsSetJson(LS_STUBS, !!v); }

  function DEFAULT_TEXT() {
    return "# One filter per line. Lines starting with # are ignored.\n" +
           "# example: /weeaboo/i type:comment; boards:a,jp;\n";
  }

  /* -------------------- board-list parsing -------------------- */

  // "4:a,jp,sama:a,z" -> { "4": ["a","jp"], "sama": ["a","z"] }
  // a bare board with no preceding site prefix goes under "__default__"
  // (meaning: the current site, i.e. always 4chan for this reader)
  function parseBoardList(value) {
    var out = {};
    var currentSite = "__default__";
    var tokens = value.split(",");
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i].trim();
      if (!tok) continue;
      var ci = tok.indexOf(":");
      if (ci >= 0) {
        currentSite = tok.slice(0, ci).trim().toLowerCase();
        var board = tok.slice(ci + 1).trim().toLowerCase();
        if (!out[currentSite]) out[currentSite] = [];
        if (board) out[currentSite].push(board);
      } else {
        if (!out[currentSite]) out[currentSite] = [];
        out[currentSite].push(tok.toLowerCase());
      }
    }
    return out;
  }

  function boardListMatches(map, board, wsBoard) {
    var applicable = [];
    if (map["4"]) applicable = applicable.concat(map["4"]);
    if (map["4chan"]) applicable = applicable.concat(map["4chan"]);
    if (map.__default__) applicable = applicable.concat(map.__default__);
    for (var i = 0; i < applicable.length; i++) {
      var b = applicable[i];
      if (b === "*") return true;
      if (b === "sfw" && wsBoard === 1) return true;
      if (b === "nsfw" && wsBoard === 0) return true;
      if (b === board) return true;
    }
    return false;
  }

  /* -------------------- type-list parsing -------------------- */

  // "filename+filesize,comment" -> [["filename","filesize"], ["comment"]]
  function parseTypes(value) {
    var groups = value.split(",");
    var out = [];
    for (var i = 0; i < groups.length; i++) {
      var parts = groups[i].split("+");
      var g = [];
      for (var j = 0; j < parts.length; j++) {
        var key = parts[j].trim().toLowerCase();
        if (FIELD_ALIASES[key]) g.push(key);
      }
      if (g.length) out.push(g);
    }
    return out.length ? out : DEFAULT_TYPES;
  }

  /* -------------------- rule line parsing -------------------- */

  function parseLine(line) {
    var trimmed = line.trim();
    if (!trimmed || trimmed.charAt(0) === "#") return null;

    var segments = trimmed.split(";");
    for (var s = 0; s < segments.length; s++) segments[s] = segments[s].trim();
    while (segments.length && !segments[segments.length - 1]) segments.pop();
    if (!segments.length) return null;

    var patternPart = segments[0];
    var rule = {
      raw: line,
      regex: null,
      literal: null,
      types: null,
      boards: null,
      exclude: null,
      op: null,
      file: null,
      stub: null,
      highlight: false,
      highlightClass: null,
      top: null,
      notify: false
    };

    if (patternPart.charAt(0) === "/") {
      var lastSlash = patternPart.lastIndexOf("/");
      if (lastSlash > 0) {
        var body = patternPart.slice(1, lastSlash);
        var flags = patternPart.slice(lastSlash + 1);
        try { rule.regex = new RegExp(body, flags); }
        catch (e) { rule.regex = null; rule.literal = patternPart; }
      } else {
        rule.literal = patternPart;
      }
    } else {
      rule.literal = patternPart;
    }

    for (var i = 1; i < segments.length; i++) {
      var opt = segments[i];
      var ci = opt.indexOf(":");
      var key = (ci >= 0 ? opt.slice(0, ci) : opt).trim().toLowerCase();
      var val = ci >= 0 ? opt.slice(ci + 1).trim() : "";

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

  function parse(text) {
    var lines = (text || "").split("\n");
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var r = parseLine(lines[i]);
      if (r) out.push(r);
    }
    return out;
  }

  /* -------------------- field extraction -------------------- */

  function stripTags(s) {
    return ("" + (s || "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  function fmtSize(b) {
    if (!b) return "";
    if (b < 1024) return b + "B";
    if (b < 1048576) return Math.floor(b / 1024) + "K";
    return Math.floor(b / 1048576) + "M";
  }

  function getField(post, key) {
    switch (key) {
      case "postid": return String(post.no || "");
      case "name": return post.name || "Anonymous";
      case "uniqueid": return post.id || "";
      case "tripcode": return post.trip || "";
      case "capcode": return post.capcode || "";
      case "pass": return post.since4pass ? String(post.since4pass) : "";
      case "email": return post.email || "";
      case "subject": return post.sub || "";
      case "comment": return stripTags(post.com || "");
      case "flag": return post.country_name || post.country || "";
      case "filename": return post.filename || "";
      case "dimensions": return (post.w && post.h) ? (post.w + "x" + post.h) : "";
      case "filesize": return fmtSize(post.fsize);
      case "md5": return post.md5 || "";
      default: return "";
    }
  }

  /* -------------------- matching -------------------- */

  function groupMatches(rule, group) {
    var isExact = group.length === 1 && EXACT_FIELDS[group[0]];
    var value = [];
    for (var i = 0; i < group.length; i++) value.push(getField(rule._post, group[i]));
    value = value.join("\n");

    if (isExact) {
      var needle = rule.literal !== null ? rule.literal : (rule.regex ? rule.regex.source : "");
      return value === needle;
    }
    if (rule.regex) return rule.regex.test(value);
    if (rule.literal !== null) return value.toLowerCase().indexOf(rule.literal.toLowerCase()) >= 0;
    return false;
  }

  function ruleAppliesToContext(rule, ctx) {
    if (rule.op === "only" && !ctx.isOp) return false;
    if (rule.op === "no" && ctx.isOp) return false;
    if (rule.file === "only" && !ctx.hasFile) return false;
    if (rule.file === "no" && ctx.hasFile) return false;

    if (rule.exclude && boardListMatches(rule.exclude, ctx.board, ctx.wsBoard)) return false;
    if (rule.boards && !boardListMatches(rule.boards, ctx.board, ctx.wsBoard)) return false;
    return true;
  }

  // returns null (no match) or a verdict object describing what to do
  function evaluate(post, ctx) {
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (!ruleAppliesToContext(rule, ctx)) continue;

      rule._post = post;
      var matched = false;
      for (var g = 0; g < rule.types.length; g++) {
        if (groupMatches(rule, rule.types[g])) { matched = true; break; }
      }
      rule._post = null;
      if (!matched) continue;

      var showStubDefault = getShowStubs();
      var stub = rule.stub === "yes" ? true : rule.stub === "no" ? false : showStubDefault;
      var visible = rule.highlight || rule.notify;

      return {
        rule: rule,
        hidden: !visible,
        stub: stub,
        highlight: rule.highlight,
        highlightClass: rule.highlightClass,
        top: rule.top === "yes",
        notify: rule.notify
      };
    }
    return null;
  }

  /* -------------------- notifications -------------------- */

  function notifyOnce(post, text) {
    var seen = lsGetJson(LS_NOTIFIED, []);
    var key = String(post.no);
    if (seen.indexOf(key) >= 0) return;
    seen.push(key);
    if (seen.length > 300) seen = seen.slice(seen.length - 300);
    lsSetJson(LS_NOTIFIED, seen);

    try {
      if (window.Notification) {
        if (Notification.permission === "granted") {
          new Notification("thinline filter match", { body: text });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(function (perm) {
            if (perm === "granted") new Notification("thinline filter match", { body: text });
          });
        }
      }
    } catch (e) {}
  }

  function init() {
    rules = parse(getText());
  }

  return {
    init: init,
    setText: setText,
    getText: getText,
    getRules: function () { return rules; },
    getShowStubs: getShowStubs,
    setShowStubs: setShowStubs,
    evaluate: evaluate,
    notifyOnce: notifyOnce
  };

})();
