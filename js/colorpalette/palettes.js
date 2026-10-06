function scheme(id, name, mode, bg, fg, accent, c) {
  const [red, green, yellow, blue, magenta, cyan] = c;
  return { id, name, mode, bg, fg, accent, red, green, yellow, blue, magenta, cyan };
}

export const PALETTES = [
  scheme("lovelace", "Lovelace", "dark", "1D1F28", "FDFDFD", "C574DD",
    ["F37F97", "5ADECD", "F2A272", "8897F4", "C574DD", "79E6F3"]),
  scheme("manta", "Manta", "dark", "1E2541", "EEFFFF", "C792EA",
    ["F0719B", "5AF7B0", "FFA56B", "57C7FF", "C792EA", "89DDFF"]),
  scheme("tokyonight", "Tokyo Night", "dark", "1A1B26", "C0CAF5", "7AA2F7",
    ["F7768E", "9ECE6A", "E0AF68", "7AA2F7", "BB9AF7", "7DCFFF"]),
  scheme("catppuccin-mocha", "Catppuccin Mocha", "dark", "1E1E2E", "CDD6F4", "CBA6F7",
    ["F38BA8", "A6E3A1", "F9E2AF", "89B4FA", "F5C2E7", "94E2D5"]),
  scheme("gruvbox-dark", "Gruvbox Dark", "dark", "282828", "EBDBB2", "FE8019",
    ["FB4934", "B8BB26", "FABD2F", "83A598", "D3869B", "8EC07C"]),
  scheme("nord", "Nord", "dark", "2E3440", "D8DEE9", "88C0D0",
    ["BF616A", "A3BE8C", "EBCB8B", "81A1C1", "B48EAD", "88C0D0"]),
  scheme("dracula", "Dracula", "dark", "282A36", "F8F8F2", "BD93F9",
    ["FF5555", "50FA7B", "F1FA8C", "8BE9FD", "FF79C6", "8BE9FD"]),
  scheme("rosepine", "Rose Pine", "dark", "191724", "E0DEF4", "EBBCBA",
    ["EB6F92", "31748F", "F6C177", "9CCFD8", "C4A7E7", "9CCFD8"]),
  scheme("everforest", "Everforest", "dark", "2D353B", "D3C6AA", "A7C080",
    ["E67E80", "A7C080", "DBBC7F", "7FBBB3", "D699B6", "83C092"]),
  scheme("onedark", "One Dark", "dark", "282C34", "ABB2BF", "61AFEF",
    ["E06C75", "98C379", "E5C07B", "61AFEF", "C678DD", "56B6C2"]),
  scheme("solarized-dark", "Solarized Dark", "dark", "002B36", "93A1A1", "268BD2",
    ["DC322F", "859900", "B58900", "268BD2", "D33682", "2AA198"]),
  scheme("catppuccin-latte", "Catppuccin Latte", "light", "EFF1F5", "4C4F69", "8839EF",
    ["D20F39", "40A02B", "DF8E1D", "1E66F5", "EA76CB", "179299"]),
  scheme("gruvbox-light", "Gruvbox Light", "light", "FBF1C7", "3C3836", "AF3A03",
    ["9D0006", "79740E", "B57614", "076678", "8F3F71", "427B58"]),
  scheme("rosepine-dawn", "Rose Pine Dawn", "light", "FAF4ED", "575279", "D7827E",
    ["B4637A", "286983", "EA9D34", "56949F", "907AA9", "56949F"]),
  scheme("solarized-light", "Solarized Light", "light", "FDF6E3", "586E75", "268BD2",
    ["DC322F", "859900", "B58900", "268BD2", "D33682", "2AA198"])
];

export const DEFAULT_PALETTE_ID = "lovelace";

export function paletteById(id) {
  return PALETTES.find((p) => p.id === id) || PALETTES.find((p) => p.id === DEFAULT_PALETTE_ID);
}
