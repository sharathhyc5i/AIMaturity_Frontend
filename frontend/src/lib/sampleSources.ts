/*
 * Placeholder sources and evidence for each question, until the real records are supplied.
 * Each entry is a sample from the run: URLs become sources (S1, S2, …), capture notes become
 * evidence (EV1, EV2, …), and "—" means none (shown as NA). Questions take the entries in turn.
 * Replace questionSources with a lookup of each question's own records when they arrive.
 */
const NOTE =
  "Captured in desktop browser, 05-Nov-2026 ~16:50 IST, logged out. Raw HTML via same-origin fetch (no JS); rendered via page text.";

const SAMPLES: string[] = [
  `${NOTE} Rendered + raw alt texts`,
  "https://developer.chrome.com/docs/crux/api/ (tool required; not run)",
  `${NOTE} JSON-LD vs rendered page`,
  `${NOTE} JSON-LD`,
  "https://developer.bestbuy.com/apis | https://www.bestbuy.com/product/microsoft-surface-pro-copilot-pc-12-touch-screen-snapdragon-x-plus-16gb-memory-512gb-ufs-device-only-platinum/6623672",
  `https://www.bestbuy.com/product/microsoft-surface-pro-copilot-pc-12-touchscreen-snapdragon-x-plus-16gb-memory-512gb-ufs-device-only-violet/JJGXPXT3FW/sku/6623677
https://www.bestbuy.com/product/microsoft-surface-pro-13-oled-touchscreen-snapdragon-x2-elite-12-core-2026-16gb-memory-512gb-ssd-device-only-black/JJGXP38GYW/sku/6677314
https://www.bestbuy.com/product/microsoft-surface-pro-copilot-pc-13-oled-touchscreen-snapdragon-x-elite-16gb-memory-512gb-ssd-device-only-11th-ed-sapphire/JJGXPX7KJ9
https://www.bestbuy.com/site/microsoft-surface-tablets/microsoft-surface-pros/pcmcat1493306657197.c?id=pcmcat1493306657197`,
  `https://www.bestbuy.com/product/microsoft-surface-pro-copilot-pc-12-touchscreen-snapdragon-x-plus-16gb-memory-512gb-ufs-device-only-violet/JJGXPXT3FW/sku/6623677
https://www.bestbuy.com/product/microsoft-surface-pro-13-oled-touchscreen-snapdragon-x2-elite-12-core-2026-16gb-memory-512gb-ssd-device-only-black/JJGXP38GYW/sku/6677314
https://www.bestbuy.com/product/microsoft-surface-pro-copilot-pc-13-oled-touchscreen-snapdragon-x-elite-16gb-memory-512gb-ssd-device-only-11th-ed-sapphire/JJGXPX7KJ9
https://www.bestbuy.com/product/apple-macbook-pro-14-inch-laptop-with-proled-xdr-touch-display-m5-pro-chip-with-15-core-cpu-24gb-memory-1tb-ssd-space-black/JJGCQPJRKV`,
  `${NOTE} sitemaps_bsin child files`,
  `${NOTE} JSON-LD`,
  `${NOTE} JSON-LD`,
  `https://www.bestbuy.com/site/brands/microsoft/pcmcat135300050050.c?id=pcmcat135300050050
https://www.bestbuy.com/site/microsoft/microsoft-surface/pcmcat1492808199261.c?id=pcmcat1492808199261
https://www.bestbuy.com/site/microsoft-surface/microsoft-surface-laptops/pcmcat1492808872042.c?id=pcmcat1492808872042
https://www.bestbuy.com/site/microsoft-surface-tablets/microsoft-surface-pros/pcmcat1493306657197.c?id=pcmcat1493306657197`,
  `https://www.bestbuy.com/site/microsoft-surface/microsoft-surface-laptops/pcmcat1492808872042.c?id=pcmcat1492808872042
https://www.bestbuy.com/product/microsoft-surface-pro-copilot-pc-12-touchscreen-snapdragon-x-plus-16gb-memory-512gb-ufs-device-only-violet/JJGXPXT3FW/sku/6623677`,
  "https://www.bestbuy.com/site/laptop-computers/all-laptops/pcmcat138500050001.c?id=pcmcat138500050001",
  `https://www.bestbuy.com/site/laptop-computers/all-laptops/pcmcat138500050001.c?id=pcmcat138500050001
https://www.bestbuy.com/product/microsoft-surface-pro-13-oled-touchscreen-snapdragon-x2-elite-12-core-2026-16gb-memory-512gb-ssd-device-only-black/JJGXP38GYW/sku/6677314`,
  `https://www.bestbuy.com/site/laptop-computers/all-laptops/pcmcat138500050001.c?id=pcmcat138500050001
https://www.bestbuy.com/site/microsoft-surface/microsoft-surface-laptops/pcmcat1492808872042.c?id=pcmcat1492808872042`,
  "—",
  `https://www.bestbuy.com/product/microsoft-surface-pro-copilot-pc-12-touchscreen-snapdragon-x-plus-16gb-memory-512gb-ufs-device-only-violet/JJGXPXT3FW/sku/6623677
https://www.bestbuy.com/site/microsoft-surface/microsoft-surface-laptops/pcmcat1492808872042.c?id=pcmcat1492808872042`,
];

export interface QuestionSources {
  /** Source pages, shown as S1, S2, …; `note` is any text that followed the URL */
  sources: { url: string; note?: string }[];
  /** Capture notes, shown as EV1, EV2, … */
  evidence: string[];
}

/** Split one sample entry into its source URLs and its evidence notes. */
function parse(entry: string): QuestionSources {
  const text = entry.trim();
  if (!text || text === "—" || text === "-") return { sources: [], evidence: [] };
  const sources: QuestionSources["sources"] = [];
  const rest = text.replace(/https?:\/\/[^\s|"]+(\s*\(([^)]*)\))?/g, (_m, _g, note) => {
    sources.push({ url: _m.replace(/\s*\([^)]*\)$/, ""), note });
    return "";
  });
  const leftover = rest.replace(/[|"\s]+/g, " ").trim();
  return { sources, evidence: leftover ? [leftover] : [] };
}

/** The placeholder sources and evidence for the question at position `n` in the full list. */
export const questionSources = (n: number): QuestionSources =>
  parse(SAMPLES[((n % SAMPLES.length) + SAMPLES.length) % SAMPLES.length]);
