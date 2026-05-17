export function cleanText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\u3000/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\u2022/g, '•')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function removeHtmlTags(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeWhitespace(text) {
  if (!text) return '';
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

export function removeAdsAndMetadata(text) {
  if (!text) return '';
  const adPatterns = [
    /advertisement/i,
    /chapter\s*\d+\s*of\s*\d+/i,
    /page\s*\d+\s*of\s*\d+/i,
    /^\s*\[.*?\]\s*$/m,
  ];
  let cleaned = text;
  adPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  return cleaned.trim();
}
