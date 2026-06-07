const QUOTE_MARK = /[\u201c\u201d"\u2018\u2019']/;

export function isDialogueSentence(text: string | undefined | null): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (QUOTE_MARK.test(trimmed[0])) return true;
  if (QUOTE_MARK.test(trimmed[trimmed.length - 1])) return true;
  const matchCount = (trimmed.match(/[\u201c\u201d"\u2018\u2019']/g) || []).length;
  return matchCount >= 2;
}

export function dialogueIntensity(text: string | undefined | null): number {
  if (!text) return 0;
  const markers = (text.match(/[\u201c\u201d"\u2018\u2019']/g) || []).length;
  return Math.min(1, markers / 4);
}
