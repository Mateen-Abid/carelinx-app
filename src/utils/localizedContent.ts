export type CatalogName = {
  name: string;
  name_ar?: string | null;
};

export const isArabicLanguage = (language?: string | null): boolean =>
  String(language || '').toLowerCase().startsWith('ar');

export const localizedStoredText = (
  english: string | null | undefined,
  arabic: string | null | undefined,
  language?: string | null,
): string => {
  const en = String(english || '').trim();
  const ar = String(arabic || '').trim();
  if (isArabicLanguage(language) && ar) {
    return ar;
  }
  return en;
};

export const localizedCatalogName = (
  englishName: string | null | undefined,
  language?: string | null,
  catalog?: Array<CatalogName | null | undefined> | null,
  translate?: (key: string) => string,
): string => {
  const name = String(englishName || '').trim();
  if (!name) return '';

  const match = (catalog || []).find((item) => item?.name === name);
  const storedArabic = match?.name_ar;
  const stored = localizedStoredText(name, storedArabic, language);

  if (isArabicLanguage(language) && stored !== name) {
    return stored;
  }

  if (translate) {
    const translated = translate(name);
    if (translated && translated !== name) {
      return translated;
    }
  }

  return stored || name;
};
