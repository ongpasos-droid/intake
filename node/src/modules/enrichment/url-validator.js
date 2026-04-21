/**
 * url-validator.js — validate and normalize URLs BEFORE we spend a network
 * request on them. Upstream ORS data is dirty; many `website` fields are
 * emails, malformed domains, or social-network profile links.
 *
 * Returns either:
 *   { ok: true, url: <normalized URL string>, kind: <'web' | 'social_only'> }
 *   { ok: false, error_type: <string> }
 *
 * error_type values align with entity_enrichment.error_type enum usage:
 *   - invalid_url_format   — garbage, emails, nothing parseable
 *   - social_only          — the URL points to a facebook/instagram/etc profile
 */

const SOCIAL_ONLY_HOSTS = new Set([
  'facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com',
  'instagram.com', 'www.instagram.com',
  'twitter.com', 'www.twitter.com', 'x.com', 'www.x.com',
  'linkedin.com', 'www.linkedin.com',
  'youtube.com', 'www.youtube.com',
  'tiktok.com', 'www.tiktok.com',
  't.me', 'telegram.me',
]);

// Rough shape: local@domain.tld
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateAndNormalize(raw) {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, error_type: 'invalid_url_format' };
  }
  let s = raw.trim();

  // Common ORS dirt: "http://e.gajewska1@gmail.com" — strip the http:// to see
  // if what remains is an email.
  const stripped = s.replace(/^https?:\/\//i, '').replace(/^\/+/, '');
  if (EMAIL_RX.test(stripped)) {
    return { ok: false, error_type: 'invalid_url_format' };
  }

  // Must begin with a scheme — prepend http:// if naked domain.
  if (!/^https?:\/\//i.test(s)) {
    s = 'http://' + s;
  }

  let parsed;
  try {
    parsed = new URL(s);
  } catch {
    return { ok: false, error_type: 'invalid_url_format' };
  }

  // Reject URLs whose host contains '@' (user-info section) — almost always
  // an email shoved into the website field.
  if (parsed.hostname.includes('@') || parsed.username || parsed.password) {
    return { ok: false, error_type: 'invalid_url_format' };
  }

  // Host must look like a domain: at least one dot and no whitespace.
  if (!parsed.hostname.includes('.') || /\s/.test(parsed.hostname)) {
    return { ok: false, error_type: 'invalid_url_format' };
  }

  // Reject obviously broken hosts with invalid TLDs like "stagescholen/augent"
  // (the / appears inside hostname component — URL parser keeps it as path,
  // leaving the host truncated and TLD missing).
  const tld = parsed.hostname.split('.').pop();
  if (!/^[a-z]{2,}$/i.test(tld)) {
    return { ok: false, error_type: 'invalid_url_format' };
  }

  // Normalize: host lowercase (path stays case-sensitive).
  parsed.hostname = parsed.hostname.toLowerCase();

  // Detect social-only URLs — we will not scrape them.
  if (SOCIAL_ONLY_HOSTS.has(parsed.hostname)) {
    return { ok: false, error_type: 'social_only', url: parsed.toString() };
  }

  return { ok: true, url: parsed.toString(), host: parsed.hostname };
}

/** Return the registrable domain used for per-domain rate limiting. */
function rateLimitKey(parsedUrl) {
  // Minimal: use hostname as-is. Sub-shared-hosts like *.meb.k12.tr all go to
  // the same upstream server anyway, so this is the right granularity.
  try {
    return new URL(parsedUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

module.exports = { validateAndNormalize, rateLimitKey };

// --- Self-test ---
if (require.main === module) {
  const cases = [
    // Edge cases from the 100-URL sample
    'http://e.gajewska1@gmail.com',
    'http://www.stagescholen/augent.be',
    'http://www.CYTADELASYRIUSZA.org',
    'https://1MUHENDIS.wixsite.com/bedelyilmaz',
    'http://www.facebook.com/OSPSlupsko',
    'https://m.facebook.com/kaomsportclub',
    // Normal URLs
    'http://www.example.org',
    'https://www.sekundarschule-brilon.de',
    'http://771624.mebk12.gov.tr',
    // Garbage
    '',
    null,
    'not a url',
    'http://',
    'mailto:foo@bar.com',
    'ftp://old-school.com',
    // Just the TLD or no TLD
    'http://localhost',
    'http://example',
  ];
  for (const c of cases) {
    console.log(JSON.stringify(c), '→', JSON.stringify(validateAndNormalize(c)));
  }
}
