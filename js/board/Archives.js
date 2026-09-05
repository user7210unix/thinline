// sourced from 4chan-X's own archives.json so this points somewhere
// real instead of guessing. archived.moe is the catch-all for boards
// with no dedicated archiver.
const MAP = {
  adv: "archive.4plebs.org", f: "archive.4plebs.org", hr: "archive.4plebs.org",
  mlpol: "archive.4plebs.org", mo: "archive.4plebs.org", o: "archive.4plebs.org",
  pol: "archive.4plebs.org", s4s: "archive.4plebs.org", sp: "archive.4plebs.org",
  tg: "archive.4plebs.org", trv: "archive.4plebs.org", tv: "archive.4plebs.org", x: "archive.4plebs.org",

  a: "desuarchive.org", aco: "desuarchive.org", an: "desuarchive.org", c: "desuarchive.org",
  cgl: "desuarchive.org", co: "desuarchive.org", d: "desuarchive.org", fit: "desuarchive.org",
  g: "desuarchive.org", his: "desuarchive.org", int: "desuarchive.org", k: "desuarchive.org",
  m: "desuarchive.org", mlp: "desuarchive.org", mu: "desuarchive.org", q: "desuarchive.org",
  qa: "desuarchive.org", r9k: "desuarchive.org", trash: "desuarchive.org", vr: "desuarchive.org",
  wsg: "desuarchive.org",

  3: "warosu.org", biz: "warosu.org", ck: "warosu.org", diy: "warosu.org", fa: "warosu.org",
  ic: "warosu.org", jp: "warosu.org", lit: "warosu.org", sci: "warosu.org", vt: "warosu.org",

  qb: "arch.b4k.dev", v: "arch.b4k.dev", vg: "arch.b4k.dev", vm: "arch.b4k.dev",
  vmg: "arch.b4k.dev", vp: "arch.b4k.dev", vrpg: "arch.b4k.dev", vst: "arch.b4k.dev",

  b: "thebarchive.com", bant: "thebarchive.com",

  h: "archiveofsins.com", hc: "archiveofsins.com", hm: "archiveofsins.com", i: "archiveofsins.com",
  lgbt: "archiveofsins.com", r: "archiveofsins.com", s: "archiveofsins.com", soc: "archiveofsins.com",
  t: "archiveofsins.com", u: "archiveofsins.com",

  cm: "boards.fireden.net", vip: "boards.fireden.net", y: "boards.fireden.net",

  con: "archive.palanq.win", e: "archive.palanq.win", n: "archive.palanq.win",
  news: "archive.palanq.win", out: "archive.palanq.win", p: "archive.palanq.win",
  pw: "archive.palanq.win", qst: "archive.palanq.win", toy: "archive.palanq.win",
  w: "archive.palanq.win", wg: "archive.palanq.win", wsr: "archive.palanq.win",

  xs: "eientei.xyz"
};

const DEFAULT = "archived.moe";

export class Archives {
  static urlFor(board, no) {
    const domain = MAP[board] || DEFAULT;
    return `https://${domain}/${board}/thread/${no}/`;
  }
}
