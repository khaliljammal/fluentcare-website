export const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
export function validateLink(href) {
  if (typeof href !== 'string' || !href || /[\s\\\x00-\x1f]/.test(href)) throw new Error('Invalid link');
  if (href.startsWith('#')) return;
  if (href.startsWith('/') && !href.startsWith('//')) return;
  const url = new URL(href);
  if (!['https:', 'http:', 'mailto:'].includes(url.protocol)) throw new Error('Unsupported link protocol');
}
