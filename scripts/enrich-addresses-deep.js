#!/usr/bin/env node
/**
 * enrich-addresses-deep.js
 *
 * Goal: lift entity_enrichment.addresses coverage from ~5.9% to 30-50%.
 *
 * Strategy (per OID):
 *   1. Re-fetch the home page (using already-validated final_url).
 *   2. Find links to "contact"-like pages in the page's own language (and a
 *      few common ones), fetch up to MAX_EXTRA_PAGES of them.
 *   3. Run an enriched extractor on every fetched HTML:
 *        a. JSON-LD schema.org PostalAddress  (already in main extractor)
 *        b. HTML microdata (itemtype=PostalAddress with itemprop=*)
 *        c. <address> tags                    (already in main extractor)
 *        d. Footer / contact-block regex with country-specific postal codes
 *        e. Google Maps embed/links with address in querystring
 *   4. Normalize results into a JSON array of objects and UPDATE only:
 *        addresses, addresses_parsed, last_addr_extract_at
 *      (does NOT touch other columns produced by the main pipeline)
 *
 * Selection (in order):
 *   - archived = 0
 *   - (addresses IS NULL OR JSON_LENGTH(addresses) = 0)
 *   - final_url IS NOT NULL
 *   - last_addr_extract_at IS NULL OR older than --skip-recent-days
 *   - optional --countries CSV filter (priority: DE,AT,CH,LU,LI first by default
 *     because Impressum is legally mandatory there)
 *
 * Usage:
 *   node scripts/enrich-addresses-deep.js [options]
 *
 * Options:
 *   --batch <N>             Max OIDs per run     (default 500)
 *   --concurrency <N>       Parallel OIDs        (default 5)
 *   --per-domain-ms <N>     Min ms between requests to same host (default 1500)
 *   --skip-recent-days <N>  Skip if last_addr_extract_at within N days (default 14)
 *   --countries <CSV>       e.g. "DE,AT,CH,LU"   (default: all)
 *   --priority-de-at        Process DE/AT/CH/LU first within the batch
 *   --max-extra-pages <N>   Contact-like pages to follow per OID (default 2)
 *   --request-timeout <ms>  Per-request timeout  (default 15000)
 *   --dry-run               Do not write to DB
 *   --verbose               Per-row logging
 *
 * Examples:
 *   node scripts/enrich-addresses-deep.js --batch 200 --concurrency 5 --countries DE,AT
 *   node scripts/enrich-addresses-deep.js --batch 1000 --priority-de-at --verbose
 */

require('dotenv').config();

const { parseArgs } = require('node:util');
const { URL } = require('node:url');
const cheerio = require('cheerio');

const pool = require('../node/src/utils/db');
const { fetchPage } = require('../node/src/modules/enrichment/fetcher');

// ── CLI ────────────────────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    batch:               { type: 'string', default: '500'  },
    concurrency:         { type: 'string', default: '5'    },
    'per-domain-ms':     { type: 'string', default: '1500' },
    'skip-recent-days':  { type: 'string', default: '14'   },
    countries:           { type: 'string' },
    'priority-de-at':    { type: 'boolean' },
    'max-extra-pages':   { type: 'string', default: '2'    },
    'request-timeout':   { type: 'string', default: '15000'},
    'dry-run':           { type: 'boolean' },
    verbose:             { type: 'boolean' },
  },
});

const BATCH            = parseInt(args.batch, 10);
const CONCURRENCY      = parseInt(args.concurrency, 10);
const PER_DOMAIN_MS    = parseInt(args['per-domain-ms'], 10);
const SKIP_RECENT_DAYS = parseInt(args['skip-recent-days'], 10);
const MAX_EXTRA_PAGES  = parseInt(args['max-extra-pages'], 10);
const REQUEST_TIMEOUT  = parseInt(args['request-timeout'], 10);
const DRY_RUN          = !!args['dry-run'];
const VERBOSE          = !!args.verbose;
const COUNTRIES        = args.countries
  ? args.countries.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
  : null;

const PRIORITY_COUNTRIES = ['DE', 'AT', 'CH', 'LU', 'LI']; // Impressum legally mandatory

// ── Per-country postal-code regex ──────────────────────────────────────
// Matches at WORD boundaries to reduce noise. Capturing group 1 = the code.
// Sources: UPU + national postal authorities. Tweak in PRs, not on the fly.
const POSTAL_CODE_RX = {
  AT: /\b(\d{4})\b/,
  BE: /\b(\d{4})\b/,
  BG: /\b(\d{4})\b/,
  CH: /\b(\d{4})\b/,
  CY: /\b(\d{4})\b/,
  CZ: /\b(\d{3}\s?\d{2})\b/,
  DE: /\b(\d{5})\b/,
  DK: /\b(\d{4})\b/,
  EE: /\b(\d{5})\b/,
  EL: /\b(\d{3}\s?\d{2})\b/,         // Greece (ISO is GR but EU often uses EL)
  GR: /\b(\d{3}\s?\d{2})\b/,
  ES: /\b(\d{5})\b/,
  FI: /\b(\d{5})\b/,
  FR: /\b(\d{5})\b/,
  HR: /\b(\d{5})\b/,
  HU: /\b(\d{4})\b/,
  IE: /\b([A-Z]\d{2}\s?[A-Z0-9]{4})\b/i, // Eircode
  IS: /\b(\d{3})\b/,
  IT: /\b(\d{5})\b/,
  LI: /\b(\d{4})\b/,
  LT: /\b(LT-?\d{5}|\d{5})\b/,
  LU: /\b(L-?\d{4}|\d{4})\b/,
  LV: /\b(LV-?\d{4})\b/,
  MK: /\b(\d{4})\b/,
  MT: /\b([A-Z]{3}\s?\d{4})\b/,
  NL: /\b(\d{4}\s?[A-Z]{2})\b/,
  NO: /\b(\d{4})\b/,
  PL: /\b(\d{2}-\d{3})\b/,
  PT: /\b(\d{4}-\d{3})\b/,
  RO: /\b(\d{6})\b/,
  RS: /\b(\d{5})\b/,
  SE: /\b(\d{3}\s?\d{2})\b/,
  SI: /\b(\d{4}|SI-?\d{4})\b/,
  SK: /\b(\d{3}\s?\d{2})\b/,
  TR: /\b(\d{5})\b/,
  UA: /\b(\d{5})\b/,
  UK: /\b([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/i, // UK postcode
  GB: /\b([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/i,
  US: /\b(\d{5}(?:-\d{4})?)\b/,
};

// ── Contact-page link keywords by language ─────────────────────────────
// Matched against href (lowercased) and link text. Generic enough to also
// catch /contact/ vs /contact-us/ vs /kontakt-uns/.
const CONTACT_KEYWORDS = [
  // English
  'contact', 'contacts', 'contact-us', 'contactus', 'about-us', 'about', 'reach-us',
  // German + Austrian/Swiss
  'kontakt', 'impressum', 'imprint',
  // Spanish/Portuguese
  'contacto', 'contactos', 'contato', 'contatos', 'sobre-nosotros', 'sobre-nos', 'sobre',
  // French
  'contactez', 'contactez-nous', 'mentions-legales', 'mentions', 'a-propos', 'apropos', 'qui-sommes-nous',
  // Italian
  'contatti', 'contattaci', 'chi-siamo',
  // Dutch
  'contact-opnemen', 'over-ons',
  // Polish
  'kontakt-z-nami', 'o-nas',
  // Czech / Slovak
  'kontakty', 'o-nas', 'kontakte',
  // Greek (transliterated path is rare; sites usually use English)
  'epikoinonia',
  // Turkish
  'iletisim', 'hakkimizda', 'bize-ulasin',
  // Hungarian
  'kapcsolat', 'rolunk',
  // Romanian
  'contacteaza', 'despre-noi', 'despre',
  // Croatian / Serbian / Slovene
  'kontakt-nas', 'o-nama',
];

// Footer-ish DOM selectors that often hold the legal address.
const ADDRESS_DOM_HINTS = [
  'footer', '#footer', '.footer', '.site-footer', '.page-footer',
  '[class*="address"]', '[id*="address"]',
  '[class*="contact"]', '[id*="contact"]',
  '[class*="impressum"]', '[id*="impressum"]',
  '.vcard', '.h-card', '.adr',
];

// ── Utilities ──────────────────────────────────────────────────────────
function log(...m) { console.log('[addr-deep]', ...m); }
function vlog(...m) { if (VERBOSE) console.log('[addr-deep]', ...m); }
function err(...m) { console.error('[addr-deep]', ...m); }

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function hostKey(u) {
  try { return new URL(u).host.toLowerCase(); } catch { return null; }
}

const lastHostHit = new Map();
async function throttleHost(host) {
  if (!host) return;
  const last = lastHostHit.get(host) || 0;
  const wait = PER_DOMAIN_MS - (Date.now() - last);
  if (wait > 0) await sleep(wait);
  lastHostHit.set(host, Date.now());
}

function squashWs(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

// Garbled-text detection: too many U+FFFD replacement chars or stray "?"
// inside otherwise-Latin text indicates the page was decoded with the
// wrong charset upstream. Discarding these avoids polluting the DB.
function countReplacementChars(s) {
  if (!s) return 0;
  const m = s.match(/�/g);
  return m ? m.length : 0;
}
function isGarbled(text) {
  if (!text) return false;
  if (text.indexOf('�') >= 0) return true;
  return false;
}

// Detects when a "candidate slice" actually contains JavaScript code
// (common: email-obfuscator scripts in footers that include 5-digit numbers).
// We don't want those polluting the address pool.
function looksLikeCode(text) {
  if (!text) return false;
  if (/(function\s*\(|var\s+[A-Za-z_$]\w*\s*=|document\.|\.charAt\(|\.length|for\s*\(\s*var)/i.test(text)) return true;
  // Lots of curly/square brackets or backslashes is a strong code smell
  const symbols = (text.match(/[{}\[\];]/g) || []).length;
  if (symbols >= 4) return true;
  return false;
}

// Tokens that, when appearing immediately BEFORE a number, mean it's a
// phone/fax/mobile prefix — NOT a postal code.
const PHONE_PREFIX_RX = /(\(0|\+\d|tel\.?|telefon|telefax|fax\.?|phone|mobile|gsm|whatsapp|hotline|©|copyright|all rights reserved)\s*[:\-]?\s*$/i;

// 4-digit countries where copyright years (1900-2099) overlap with postal
// codes. We reject matches that look like a year if the year is the entire
// captured code.
const FOUR_DIGIT_YEAR_RX = /^(19|20)\d{2}$/;
const COUNTRIES_4_DIGIT = new Set(['AT','BE','BG','CH','CY','DK','HU','IS','LI','LU','LV','MK','NO','SI']);

// Street keywords useful to disambiguate postal-code matches.
const STREET_HINT_RX = /(stra[ßs]se|str\.|weg|allee|platz|gasse|ring|chaussee|rue|avenue|via|piazza|calle|carrer|carretera|street|road|laan|plein|ulica|aleja|bulvar)/i;

// Noise prefixes commonly stuck to a footer-extracted street.
const STREET_NOISE_PREFIX_RX = /^(impressum|datenschutz|kontakt|contact|über uns|ueber uns|about\b|footer|home|s! mitglied werden|mitglied werden|cookie\b)[\s\W]+/i;

// Pick the most plausible postal code in a free-text block.
// Returns {code, idx, full} or null. Skips phone-like neighbours and
// prefers codes followed by a capitalized word (= likely city).
function pickPostalCode(text, countryCode) {
  const rx = POSTAL_CODE_RX[countryCode];
  if (!rx) return null;
  const flags = rx.flags.includes('g') ? rx.flags : rx.flags + 'g';
  const grx = new RegExp(rx.source, flags);
  const cands = [];
  let m;
  while ((m = grx.exec(text)) !== null) {
    const idx = m.index;
    const before = text.slice(Math.max(0, idx - 20), idx);
    if (PHONE_PREFIX_RX.test(before)) continue;
    // Reject obvious copyright years for 4-digit-postal countries
    if (COUNTRIES_4_DIGIT.has(countryCode) && FOUR_DIGIT_YEAR_RX.test(m[1])) continue;
    const after = text.slice(idx + m[0].length, idx + m[0].length + 50);
    let score = 0;
    if (/^\s*[A-ZÄÖÜÅÆØÉÈÑÇŠŽŁŚĆ][\p{L}\.\-]+/u.test(after)) score += 3;
    if (STREET_HINT_RX.test(text.slice(0, idx))) score += 2;
    cands.push({ code: m[1], idx, full: m[0], score });
  }
  if (cands.length === 0) return null;
  cands.sort((a, b) => b.score - a.score || a.idx - b.idx);
  return cands[0];
}

// City picker: first 1-3 capitalized words after postal code, stopping at
// any digit, "@", parenthesis, or punctuation typical of phone/email blocks.
function extractCityAfter(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  const out = [];
  for (const t of tokens) {
    if (out.length >= 4) break;
    if (/[\d@\(\)\[\]:;<>"?]/.test(t)) break;
    // Must start with a capital letter (or hyphen for compound names like Bad-Münder)
    if (out.length === 0 && !/^[A-ZÄÖÜÅÆØÉÈÑÇŠŽŁŚĆ]/.test(t)) break;
    const cleaned = t.replace(/[,.;\s]+$/, '').replace(/^[,.;\s]+/, '');
    if (!cleaned) break;
    out.push(cleaned);
  }
  const joined = out.join(' ').trim();
  return joined.length >= 2 && joined.length <= 80 ? joined : null;
}

// Street picker: text before postal code, with noise prefix stripped and
// length capped to the last 80 chars (most footer noise lives at the start).
function extractStreetBefore(text) {
  let s = text.replace(/[,\s]+$/, '').trim();
  s = s.replace(STREET_NOISE_PREFIX_RX, '').trim();
  if (!s) return null;
  if (s.length > 80) s = s.slice(-80).replace(/^\W+/, '');
  return squashWs(s);
}

// ── Extractors ─────────────────────────────────────────────────────────

// JSON-LD walker — same idea as main extractor but returns structured objects
function walkJsonLd(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const n of node) walkJsonLd(n, out); return; }
  const t = node['@type'];
  const isAddr = t === 'PostalAddress' || (Array.isArray(t) && t.includes('PostalAddress'));
  if (isAddr) {
    const country = typeof node.addressCountry === 'string'
      ? node.addressCountry
      : (node.addressCountry && (node.addressCountry.name || node.addressCountry.addressCountry)) || null;
    const obj = {
      street:      squashWs(node.streetAddress) || null,
      postal_code: squashWs(node.postalCode) || null,
      city:        squashWs(node.addressLocality) || null,
      region:      squashWs(node.addressRegion) || null,
      country:     squashWs(country) || null,
      source:      'jsonld',
    };
    obj.raw = [obj.street, obj.postal_code, obj.city, obj.region, obj.country].filter(Boolean).join(', ');
    if (obj.raw.length >= 8 && obj.raw.length <= 300 && !isGarbled(obj.raw)) out.push(obj);
  }
  for (const v of Object.values(node)) walkJsonLd(v, out);
}

function extractFromJsonLd(rawHtml) {
  const out = [];
  if (!rawHtml) return out;
  const rx = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = rx.exec(rawHtml)) !== null) {
    const raw = m[1].trim(); if (!raw) continue;
    try { walkJsonLd(JSON.parse(raw), out); }
    catch {
      for (const line of raw.split(/\n\s*\n/)) {
        try { walkJsonLd(JSON.parse(line), out); } catch {}
      }
    }
  }
  return out;
}

// HTML microdata — itemtype="...PostalAddress" with itemprop="streetAddress" etc.
function extractFromMicrodata($) {
  const out = [];
  $('[itemtype*="PostalAddress" i]').each((_, el) => {
    const $el = $(el);
    const get = (prop) => squashWs($el.find(`[itemprop="${prop}"]`).first().text());
    const street      = get('streetAddress');
    const postal_code = get('postalCode');
    const city        = get('addressLocality');
    const region      = get('addressRegion');
    const country     = get('addressCountry');
    const obj = {
      street: street || null,
      postal_code: postal_code || null,
      city: city || null,
      region: region || null,
      country: country || null,
      source: 'microdata',
    };
    obj.raw = [obj.street, obj.postal_code, obj.city, obj.region, obj.country].filter(Boolean).join(', ');
    if (obj.raw.length >= 8 && obj.raw.length <= 300 && !isGarbled(obj.raw)) out.push(obj);
  });
  return out;
}

// <address> tags — keep raw, try to split using country postal regex
function extractFromAddressTag($, countryCode) {
  const out = [];
  $('address').each((_, el) => {
    const t = squashWs($(el).text());
    if (t.length >= 10 && t.length <= 300) {
      const parsed = parseFreeText(t, countryCode, 'address_tag');
      if (parsed) out.push(parsed);
    }
  });
  return out;
}

// Footer / contact-block regex — pull text from common containers, then try
// to slice out a block that contains a postal code matching the country.
function extractFromDomHints($, countryCode) {
  const out = [];
  const rx = POSTAL_CODE_RX[countryCode];
  if (!rx) return out;
  const seen = new Set();
  for (const sel of ADDRESS_DOM_HINTS) {
    $(sel).each((_, el) => {
      const text = squashWs($(el).text());
      if (text.length < 10 || text.length > 1500) return;
      const m = rx.exec(text);
      if (!m) return;
      // Slice ~80 chars around the postal code as the candidate address
      const idx = text.indexOf(m[0]);
      const start = Math.max(0, idx - 60);
      const end   = Math.min(text.length, idx + m[0].length + 60);
      const slice = text.slice(start, end).replace(/^\W+|\W+$/g, '');
      const key = slice.toLowerCase();
      if (seen.has(key) || slice.length < 10) return;
      seen.add(key);
      const parsed = parseFreeText(slice, countryCode, 'footer_regex');
      if (parsed) out.push(parsed);
    });
  }
  return out;
}

// Google Maps links — captures `?q=...` or `/place/<addr>/...`
function extractFromMapsLinks($) {
  const out = [];
  $('a[href*="google.com/maps"], a[href*="goo.gl/maps"], a[href*="maps.app.goo.gl"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    let candidate = null;
    try {
      const u = new URL(href, 'https://example.com');
      const q = u.searchParams.get('q') || u.searchParams.get('query');
      if (q) candidate = decodeURIComponent(q.replace(/\+/g, ' '));
      if (!candidate && /\/place\//.test(u.pathname)) {
        const m = u.pathname.match(/\/place\/([^/]+)/);
        if (m) candidate = decodeURIComponent(m[1].replace(/\+/g, ' '));
      }
    } catch { /* ignore */ }
    if (candidate && candidate.length >= 10 && candidate.length <= 300 && !isGarbled(candidate)) {
      out.push({ raw: squashWs(candidate), source: 'gmaps_link',
                 street: null, postal_code: null, city: null, region: null, country: null });
    }
  });
  return out;
}

// Try to split a free-text address using country postal regex.
// Returns null when the text looks too garbled or is actual JS code.
function parseFreeText(rawText, countryCode, source) {
  if (isGarbled(rawText)) return null;
  if (looksLikeCode(rawText)) return null;
  const obj = {
    street: null, postal_code: null, city: null, region: null,
    country: countryCode || null, raw: rawText, source,
  };
  const best = pickPostalCode(rawText, countryCode);
  if (best) {
    obj.postal_code = squashWs(best.code);
    obj.street = extractStreetBefore(rawText.slice(0, best.idx));
    obj.city   = extractCityAfter(rawText.slice(best.idx + best.full.length));
  }
  return obj;
}

// Pick contact-like links from a page, return absolute URLs (max N)
function findContactLinks($, baseUrl, max) {
  const links = new Map(); // url -> score (higher = more contact-y)
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    let abs;
    try { abs = new URL(href, baseUrl).toString().split('#')[0]; } catch { return; }
    const lc = abs.toLowerCase();
    const txt = squashWs($(el).text()).toLowerCase();
    let score = 0;
    for (const kw of CONTACT_KEYWORDS) {
      if (lc.includes('/' + kw) || lc.endsWith('/' + kw + '/') || lc.endsWith('/' + kw)) score += 3;
      if (txt === kw || txt.includes(kw)) score += 2;
    }
    if (score === 0) return;
    // Prefer same-host pages
    try {
      if (new URL(abs).host !== new URL(baseUrl).host) score -= 2;
    } catch {}
    const prev = links.get(abs) || 0;
    if (score > prev) links.set(abs, score);
  });
  return [...links.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([u]) => u);
}

// Master extractor: takes an array of {html, url} and returns deduped
// structured + raw arrays.
function extractAddressesFromPages(pages, countryCode) {
  const seen = new Set();
  const parsed = [];
  for (const { html } of pages) {
    if (!html) continue;
    const $ = cheerio.load(html, { decodeEntities: true });
    const candidates = [
      ...extractFromJsonLd(html),
      ...extractFromMicrodata($),
      ...extractFromAddressTag($, countryCode),
      ...extractFromDomHints($, countryCode),
      ...extractFromMapsLinks($),
    ];
    for (const c of candidates) {
      const key = (c.raw || '').toLowerCase().replace(/[^\w]+/g, '');
      if (key.length < 6 || seen.has(key)) continue;
      seen.add(key);
      parsed.push(c);
      if (parsed.length >= 5) return parsed;
    }
  }
  return parsed;
}

// ── DB ────────────────────────────────────────────────────────────────
async function selectBatch() {
  const conds = [
    'ee.archived = 0',
    '(ee.addresses IS NULL OR JSON_LENGTH(ee.addresses) = 0)',
    'ee.final_url IS NOT NULL',
    'ee.final_url <> ""',
    `(ee.last_addr_extract_at IS NULL OR ee.last_addr_extract_at < NOW() - INTERVAL ? DAY)`,
  ];
  const params = [SKIP_RECENT_DAYS];
  if (COUNTRIES) {
    conds.push(`e.country_code IN (${COUNTRIES.map(() => '?').join(',')})`);
    params.push(...COUNTRIES);
  }
  const orderClause = args['priority-de-at']
    ? `ORDER BY (e.country_code IN (${PRIORITY_COUNTRIES.map(() => '?').join(',')})) DESC, ee.last_addr_extract_at IS NULL DESC, ee.oid`
    : `ORDER BY ee.last_addr_extract_at IS NULL DESC, ee.oid`;
  if (args['priority-de-at']) params.push(...PRIORITY_COUNTRIES);
  params.push(BATCH);

  const sql = `
    SELECT ee.oid, ee.final_url, e.country_code
      FROM entity_enrichment ee
      JOIN entities e ON e.oid = ee.oid
     WHERE ${conds.join(' AND ')}
     ${orderClause}
     LIMIT ?
  `;
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function persist(oid, parsed) {
  // addresses (legacy: array of strings) ← rebuild from parsed for back-compat
  const rawArr = parsed.map(p => p.raw).filter(Boolean).slice(0, 5);
  const addresses       = rawArr.length > 0 ? JSON.stringify(rawArr) : null;
  const addressesParsed = parsed.length > 0 ? JSON.stringify(parsed) : null;

  if (DRY_RUN) {
    vlog(`[DRY] ${oid} addresses=${rawArr.length} parsed=${parsed.length}`);
    return;
  }
  await pool.query(
    `UPDATE entity_enrichment
        SET addresses = ?,
            addresses_parsed = ?,
            last_addr_extract_at = NOW()
      WHERE oid = ?`,
    [addresses, addressesParsed, oid]
  );
}

// ── Per-OID worker ─────────────────────────────────────────────────────
async function processOid(row) {
  const { oid, final_url, country_code } = row;
  const host = hostKey(final_url);
  const pages = [];
  try {
    await throttleHost(host);
    const r = await fetchPage(final_url, { timeoutMs: REQUEST_TIMEOUT });
    if (r.ok && r.html) {
      pages.push({ url: r.final_url || final_url, html: r.html });
      // Find contact-like links and follow up to MAX_EXTRA_PAGES
      const $ = cheerio.load(r.html, { decodeEntities: true });
      const extra = findContactLinks($, r.final_url || final_url, MAX_EXTRA_PAGES);
      for (const u of extra) {
        const h2 = hostKey(u);
        await throttleHost(h2);
        try {
          const r2 = await fetchPage(u, { timeoutMs: REQUEST_TIMEOUT });
          if (r2.ok && r2.html) pages.push({ url: r2.final_url || u, html: r2.html });
        } catch (e) {
          vlog(`  ${oid} extra fetch fail ${u}: ${e.message}`);
        }
      }
    } else {
      vlog(`  ${oid} home fetch !ok (${r.error_type || r.http_status_final})`);
    }
  } catch (e) {
    vlog(`  ${oid} home fetch threw: ${e.message}`);
  }

  const parsed = extractAddressesFromPages(pages, country_code);
  await persist(oid, parsed);
  return { oid, country: country_code, pages: pages.length, found: parsed.length };
}

// ── Concurrency runner ────────────────────────────────────────────────
async function runPool(items, n, fn) {
  const queue = items.slice();
  const stats = { ok: 0, found: 0, errors: 0 };
  const workers = Array.from({ length: n }, async () => {
    while (queue.length) {
      const item = queue.shift();
      try {
        const r = await fn(item);
        stats.ok++;
        if (r.found > 0) stats.found++;
        if (VERBOSE) vlog(`  ✓ ${r.oid} [${r.country}] pages=${r.pages} addresses=${r.found}`);
      } catch (e) {
        stats.errors++;
        err(`  ✗ ${item.oid}: ${e.message}`);
      }
    }
  });
  await Promise.all(workers);
  return stats;
}

// ── Main ──────────────────────────────────────────────────────────────
(async () => {
  const t0 = Date.now();
  log(`start batch=${BATCH} concurrency=${CONCURRENCY} dryRun=${DRY_RUN} ` +
      `countries=${COUNTRIES ? COUNTRIES.join(',') : 'all'} priorityDEAT=${!!args['priority-de-at']}`);

  const rows = await selectBatch();
  log(`selected ${rows.length} OIDs`);
  if (rows.length === 0) { await pool.end(); return; }

  const stats = await runPool(rows, CONCURRENCY, processOid);

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  log(`done in ${dt}s — processed=${stats.ok} withAddress=${stats.found} errors=${stats.errors}`);
  await pool.end();
})().catch(async (e) => {
  err('fatal:', e.stack || e.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});
