/**
 * Reference data — Turkish il / ilçe / mahalle for binbirnet's service area.
 *
 * binbirnet'in servis bölgesi Anamur (Mersin) ve civar köy/mahalleler.
 * Mahalle listesi resmi belediye kayıtlarından (TÜİK 2024) ve hayata geçen
 * adres standartlarından derlendi. Yeni mahalle / değişen ad geldiğinde
 * `ANAMUR_MAHALLE_ALIASES` üzerinden çift yönlü normalize edilebilir.
 *
 * Liste kapsamlı değil (yalnız sık görülenler) — eşleşmeyen mahalleler
 * `parseAdres` tarafından raw normalize edilmiş haliyle korunur.
 */

export const TR_ILLER = [
  "MERSİN",
  "ANTALYA",
  "İSTANBUL",
  "ANKARA",
  "İZMİR",
  "ADANA",
] as const;

export type TrIl = (typeof TR_ILLER)[number];

/** Mersin alt-ilçeleri (binbirnet için relevant olanlar). */
export const MERSIN_ILCELERI = [
  "ANAMUR",
  "BOZYAZI",
  "AYDINCIK",
  "GÜLNAR",
  "ERDEMLİ",
  "MUT",
] as const;

export type MersinIlce = (typeof MERSIN_ILCELERI)[number];

/**
 * Anamur içindeki bilinen mahalleler. binbirnet tarifeli müşterilerinin
 * büyük çoğunluğu bu listeden bir mahalledendir. Resmi yazımda Türkçe
 * büyük harf (İ, Ğ, Ü, Ş, Ö, Ç) kullanılıyor.
 */
export const ANAMUR_MAHALLELERI = [
  "SAĞLIK",
  "BAHÇE",
  "GÖKÇESU",
  "ESKİPAZAR",
  "YEŞİLYURT",
  "ÖRTÜLÜ",
  "TURGUT REİS",
  "MERMERLİ",
  "ÇARŞI",
  "FATİH",
  "İSKELE",
  "BAŞ",
  "EMİR",
  "ÇİĞDEM",
  "DEMİRCİLİ",
  "ALAKÖPRÜ",
  "KIZILALİLER",
  "AKINE",
  "KALEDIRAN",
  "SİVASLI",
  "ÖREN",
  "AKPINAR",
  "KÜÇÜKKÖY",
  "BÜYÜKEcELİ",
] as const;

/**
 * Yaygın yanlış yazımlar / alternatif okumalar → resmi yazım.
 *
 * Anahtarlar lowercase, türkçe karakter sıyrılmış (ASCII fold). Değer resmi
 * büyük harf yazım. `parseAdres` mahalleyi bu tablodan geçirmeden önce de
 * normalize eder.
 */
export const ANAMUR_MAHALLE_ALIASES: Record<string, string> = {
  saglik: "SAĞLIK",
  saglk: "SAĞLIK",
  bahce: "BAHÇE",
  bahse: "BAHÇE",
  gokcesu: "GÖKÇESU",
  goksu: "GÖKÇESU",
  eskipazar: "ESKİPAZAR",
  yesilyurt: "YEŞİLYURT",
  ortulu: "ÖRTÜLÜ",
  "turgutreis": "TURGUT REİS",
  "turgut reis": "TURGUT REİS",
  mermerli: "MERMERLİ",
  carsi: "ÇARŞI",
  fatih: "FATİH",
  iskele: "İSKELE",
  bas: "BAŞ",
  emir: "EMİR",
  cigdem: "ÇİĞDEM",
  demirci: "DEMİRCİLİ",
  demircili: "DEMİRCİLİ",
  alakopru: "ALAKÖPRÜ",
  kizilaliler: "KIZILALİLER",
  akine: "AKINE",
  kalediran: "KALEDIRAN",
  sivasli: "SİVASLI",
  oren: "ÖREN",
  akpinar: "AKPINAR",
  kucukkoy: "KÜÇÜKKÖY",
  buyukeceli: "BÜYÜKEcELİ",
};

/**
 * ASCII fold for Turkish characters. Used as a normalisation step so the
 * alias table doesn't need to enumerate every diacritic combination.
 */
export function asciiFoldTurkish(input: string): string {
  return input
    .replace(/İ/g, "I")
    .replace(/I/g, "I")
    .replace(/ı/g, "i")
    .replace(/Ğ/g, "G")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "U")
    .replace(/ü/g, "u")
    .replace(/Ş/g, "S")
    .replace(/ş/g, "s")
    .replace(/Ö/g, "O")
    .replace(/ö/g, "o")
    .replace(/Ç/g, "C")
    .replace(/ç/g, "c");
}
