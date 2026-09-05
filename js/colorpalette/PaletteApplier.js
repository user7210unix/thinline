function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function luminance(hex) {
  const c = hexToRgb(hex);
  const a = [c.r, c.g, c.b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrastRatio(h1, h2) {
  const l1 = luminance(h1) + 0.05;
  const l2 = luminance(h2) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}

// picks bg/fg/accent roles out of an unordered 4-color palette and
// writes them as CSS custom properties. bumps contrast if a palette
// is too flat to read (some ColorHunt entries are gradients, not
// actually meant to be text-on-background pairs).
export class PaletteApplier {
  static apply(colors, opts = {}) {
    const sorted = [...colors].sort((a, b) => luminance(a) - luminance(b));
    const [darkest, low, high, lightest] = sorted;

    let isLight;
    if (opts.mode === "light") isLight = true;
    else if (opts.mode === "dark") isLight = false;
    else isLight = luminance(lightest) + luminance(high) > luminance(darkest) + luminance(low);

    let bg, bgAlt, fg, fgMuted, accent, border;
    if (isLight) {
      bg = lightest; bgAlt = high; fg = darkest; fgMuted = low; accent = low; border = high;
    } else {
      bg = darkest; bgAlt = low; fg = lightest; fgMuted = high; accent = high; border = low;
    }

    if (contrastRatio(bg, fg) < 3.5) fg = isLight ? "1a1a1a" : "f2f2f2";

    const root = document.documentElement.style;
    root.setProperty("--c-bg", "#" + bg);
    root.setProperty("--c-bg-alt", "#" + bgAlt);
    root.setProperty("--c-fg", "#" + fg);
    root.setProperty("--c-fg-muted", "#" + fgMuted);
    root.setProperty("--c-accent", "#" + accent);
    root.setProperty("--c-border", "#" + border);
    root.setProperty("--c-link", "#" + accent);
    document.documentElement.setAttribute("data-theme-mode", isLight ? "light" : "dark");
  }
}
