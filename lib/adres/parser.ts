/**
 * Turkish address parser tuned for binbirnet (Anamur/Mersin ISP).
 *
 * Returns a structured AdresParsed; never throws. `guven` 0..1 is the
 * confidence — 1.0 means mahalle + ilçe + il + numara all extracted.
 */
import {
  ANAMUR_MAHALLE_ALIASES,
  ANAMUR_MAHALLELERI,
  MERSIN_ILCELERI,
  TR_ILLER,
  asciiFoldTurkish,
  type MersinIlce,
  type TrIl,
} from "./tr-data";

export type AdresParsed = {
  mahalle: string | null;
  ilce: MersinIlce | string | null;
  il: TrIl | string | null;
  sokak: string | null;
  numara: string | null;
  ham: string;
  normalize: string;
  guven: number;
};

const MAHALLE_RE = /([A-ZÇĞİÖŞÜ\s]+?)\s+MAH(?:ALLES[Iİ])?\.?/i;
const KOY_RE = /([A-ZÇĞİÖŞÜ\s]+?)\s+K[OÖ]Y[ÜU](?:\s+MEYDAN)?/i;
const SOKAK_RE = /([0-9A-ZÇĞİÖŞÜ\.\s\-]+?\s+(?:CAD|SOK|BUL|MEVK[Iİ])\.?)/i;
const NUMARA_RE = /\bNO[:\s]*([0-9]+(?:\s*\/\s*[0-9A-Za-z]+)?)/i;
const ILCE_IL_RE = /([A-ZÇĞİÖŞÜ]+)\s*\/\s*([A-ZÇĞİÖŞÜ]+)/;

const ILCE_SET = new Set<string>(MERSIN_ILCELERI);
const IL_SET = new Set<string>(TR_ILLER);
const ANAMUR_MAHALLE_SET = new Set<string>(ANAMUR_MAHALLELERI);

export function parseAdres(input: string | null | undefined): AdresParsed {
  const ham = (input ?? "").toString();
  const normalize = ham
    .replace(/\s+/g, " ")
    .replace(/\s*([\.,\/])\s*/g, "$1 ")
    .trim()
    .toLocaleUpperCase("tr-TR");

  if (normalize.length === 0) {
    return {
      mahalle: null,
      ilce: null,
      il: null,
      sokak: null,
      numara: null,
      ham,
      normalize,
      guven: 0,
    };
  }

  const mahalle = extractMahalle(normalize);
  const { ilce, il } = extractIlceAndIl(normalize);
  const sokak = extractSokak(normalize);
  const numara = extractNumara(normalize);

  let guven = 0;
  if (mahalle) guven += 0.35;
  if (ilce) guven += 0.25;
  if (il) guven += 0.2;
  if (numara) guven += 0.2;
  guven = Math.min(1, Number(guven.toFixed(2)));

  return { mahalle, ilce, il, sokak, numara, ham, normalize, guven };
}

function extractMahalle(normalize: string): string | null {
  const m = normalize.match(MAHALLE_RE);
  let candidate = m?.[1]?.trim() ?? null;
  if (!candidate) {
    const k = normalize.match(KOY_RE);
    candidate = k?.[1]?.trim() ?? null;
  }
  if (!candidate) return null;

  candidate = candidate.replace(/[\.,]+$/g, "").replace(/\s+/g, " ").trim();
  if (candidate.length < 2) return null;

  const blacklist = ["NO", "CAD", "SOK", "BUL", "MEVKİ", "MEVKI"];
  if (blacklist.some((b) => candidate!.endsWith(` ${b}`))) {
    candidate = candidate.split(" ").slice(0, -1).join(" ").trim();
    if (!candidate) return null;
  }

  // Fold first (İ→I, ı→i, …) then lowercase to dodge combining-dot bugs.
  const ascii = asciiFoldTurkish(candidate).toLowerCase();
  const aliased = ANAMUR_MAHALLE_ALIASES[ascii];
  if (aliased) return aliased;

  for (const known of ANAMUR_MAHALLE_SET) {
    if (asciiFoldTurkish(known).toLowerCase() === ascii) return known;
  }
  return candidate;
}

function extractIlceAndIl(normalize: string): {
  ilce: string | null;
  il: string | null;
} {
  const m = normalize.match(ILCE_IL_RE);
  if (!m || m[1] === undefined || m[2] === undefined) return { ilce: null, il: null };
  const left = m[1].trim();
  const right = m[2].trim();
  if (ILCE_SET.has(left) && IL_SET.has(right)) return { ilce: left, il: right };
  if (ILCE_SET.has(right) && IL_SET.has(left)) return { ilce: right, il: left };
  return { ilce: left, il: right };
}

function extractSokak(normalize: string): string | null {
  const m = normalize.match(SOKAK_RE);
  const raw = m?.[1]?.trim() ?? null;
  if (!raw) return null;
  return raw.replace(/\s+/g, " ").replace(/[,\.]+$/g, "").trim();
}

function extractNumara(normalize: string): string | null {
  const m = normalize.match(NUMARA_RE);
  return m?.[1]?.trim().replace(/\s+/g, "") ?? null;
}
