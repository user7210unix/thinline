import { FilterStorage } from "./FilterStorage.js";

const EXACT_FIELDS = { md5: 1, uniqueid: 1 }; // exact string match, regex doesn't apply

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
    case "dimensions": return (post.w && post.h) ? `${post.w}x${post.h}` : "";
    case "filesize": return fmtSize(post.fsize);
    case "md5": return post.md5 || "";
    default: return "";
  }
}

function boardListMatches(map, board, wsBoard) {
  const applicable = [...(map["4"] || []), ...(map["4chan"] || []), ...(map.__default__ || [])];
  for (const b of applicable) {
    if (b === "*") return true;
    if (b === "sfw" && wsBoard === 1) return true;
    if (b === "nsfw" && wsBoard === 0) return true;
    if (b === board) return true;
  }
  return false;
}

function groupMatches(rule, post, group) {
  const isExact = group.length === 1 && EXACT_FIELDS[group[0]];
  const value = group.map((k) => getField(post, k)).join("\n");

  if (isExact) {
    const needle = rule.literal !== null ? rule.literal : (rule.regex ? rule.regex.source : "");
    return value === needle;
  }
  if (rule.regex) return rule.regex.test(value);
  if (rule.literal !== null) return value.toLowerCase().includes(rule.literal.toLowerCase());
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

export class FilterMatcher {
  static boardListMatches = boardListMatches;

  // returns null (no match) or a verdict describing what to do
  static evaluate(rules, post, ctx) {
    for (const rule of rules) {
      if (!ruleAppliesToContext(rule, ctx)) continue;

      let matched = false;
      for (const group of rule.types) {
        if (groupMatches(rule, post, group)) { matched = true; break; }
      }
      if (!matched) continue;

      const stub = rule.stub === "yes" ? true : rule.stub === "no" ? false : FilterStorage.getShowStubs();
      const visible = rule.highlight || rule.notify;

      return {
        rule,
        hidden: !visible,
        stub,
        highlight: rule.highlight,
        highlightClass: rule.highlightClass,
        top: rule.top === "yes",
        notify: rule.notify
      };
    }
    return null;
  }
}
