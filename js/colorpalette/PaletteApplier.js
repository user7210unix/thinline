const MIN_TEXT_CONTRAST = 4.5;
const ALT_MIX = 0.06;
const BORDER_MIX = 0.16;
const MUTED_MIX = 0.42;
const LUMINANCE_SPLIT = 0.4;
const CHANNEL_MAX = 255;
const SRGB_LINEAR_CUTOFF = 0.03928;

function rgb(hex) {
  const n = parseInt(hex, 16);
  return [(n >> 16) & CHANNEL_MAX, (n >> 8) & CHANNEL_MAX, n & CHANNEL_MAX];
}

function toHex(channels) {
  return channels.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function mix(a, b, t) {
  const ca = rgb(a), cb = rgb(b);
  return toHex(ca.map((v, i) => v + (cb[i] - v) * t));
}

function luminance(hex) {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / CHANNEL_MAX;
    return s <= SRGB_LINEAR_CUTOFF ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const la = luminance(a) + 0.05, lb = luminance(b) + 0.05;
  return la > lb ? la / lb : lb / la;
}

export class PaletteApplier {
  static apply(p) {
    const fg = contrast(p.bg, p.fg) < MIN_TEXT_CONTRAST ? mix(p.fg, p.mode === "dark" ? "FFFFFF" : "000000", 0.5) : p.fg;
    const vars = {
      "--c-bg": p.bg,
      "--c-bg-alt": mix(p.bg, fg, ALT_MIX),
      "--c-fg": fg,
      "--c-fg-muted": mix(fg, p.bg, MUTED_MIX),
      "--c-border": mix(p.bg, fg, BORDER_MIX),
      "--c-accent": p.accent,
      "--c-on-accent": luminance(p.accent) > LUMINANCE_SPLIT ? "111111" : "FFFFFF",
      "--c-link": p.blue,
      "--c-quote": p.green,
      "--c-red": p.red,
      "--c-green": p.green,
      "--c-yellow": p.yellow,
      "--c-cyan": p.cyan,
      "--c-magenta": p.magenta
    };
    const root = document.documentElement;
    for (const [name, hex] of Object.entries(vars)) root.style.setProperty(name, "#" + hex);
    root.setAttribute("data-theme-mode", p.mode);
  }
}
