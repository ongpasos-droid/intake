/* ── OpenAlex API Client ──────────────────────────────────────── */
const https = require('https');

const BASE = 'https://api.openalex.org';
const MAILTO = 'oscarargumosa@gmail.com'; // polite pool — faster rate limits

/**
 * Search works (papers, reports, etc.)
 * @param {object} opts
 * @param {string} opts.query - search text
 * @param {string} [opts.country] - ISO 2-letter code (filters by institution country)
 * @param {number} [opts.yearFrom] - publication year min
 * @param {number} [opts.yearTo] - publication year max
 * @param {boolean} [opts.openAccess] - only open access
 * @param {number} [opts.page=1]
 * @param {number} [opts.perPage=20]
 */
async function searchWorks(opts) {
  const filters = [];
  if (opts.openAccess) filters.push('is_oa:true');
  if (opts.yearFrom && opts.yearTo) filters.push(`publication_year:${opts.yearFrom}-${opts.yearTo}`);
  else if (opts.yearFrom) filters.push(`from_publication_date:${opts.yearFrom}-01-01`);
  else if (opts.yearTo) filters.push(`to_publication_date:${opts.yearTo}-12-31`);
  if (opts.country) filters.push(`institutions.country_code:${opts.country.toUpperCase()}`);

  const params = new URLSearchParams({
    search: opts.query,
    page: opts.page || 1,
    per_page: opts.perPage || 20,
    mailto: MAILTO,
  });
  if (filters.length) params.set('filter', filters.join(','));

  const url = `${BASE}/works?${params}`;
  const raw = await httpGet(url);
  const data = JSON.parse(raw);

  return {
    total: data.meta?.count || 0,
    page: data.meta?.page || 1,
    perPage: data.meta?.per_page || 20,
    results: (data.results || []).map(normalizeWork),
  };
}

/**
 * Get a single work by OpenAlex ID
 */
async function getWork(openalexId) {
  const url = `${BASE}/works/${openalexId}?mailto=${MAILTO}`;
  const raw = await httpGet(url);
  return normalizeWork(JSON.parse(raw));
}

/**
 * Normalize OpenAlex work to our internal format
 */
function normalizeWork(w) {
  return {
    external_id: w.doi || w.id,
    openalex_id: w.id,
    source_api: 'openalex',
    title: w.title || '',
    authors: (w.authorships || []).map(a => ({
      name: a.author?.display_name || '',
      institution: a.institutions?.[0]?.display_name || '',
      country: a.institutions?.[0]?.country_code || '',
    })),
    publication_year: w.publication_year,
    abstract: reconstructAbstract(w.abstract_inverted_index),
    url: w.doi ? `https://doi.org/${w.doi.replace('https://doi.org/', '')}` : w.id,
    pdf_url: w.open_access?.oa_url || w.best_oa_location?.pdf_url || null,
    language: w.language,
    is_open_access: w.open_access?.is_oa || false,
    citation_count: w.cited_by_count || 0,
    topics: (w.topics || []).slice(0, 5).map(t => t.display_name),
    type: w.type || 'article',
    source_name: w.primary_location?.source?.display_name || '',
  };
}

/**
 * OpenAlex stores abstracts as inverted index — reconstruct to plain text
 */
function reconstructAbstract(inverted) {
  if (!inverted) return '';
  const words = [];
  for (const [word, positions] of Object.entries(inverted)) {
    for (const pos of positions) {
      words[pos] = word;
    }
  }
  return words.join(' ');
}

/**
 * Simple HTTPS GET returning body as string
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'EplusTools/1.0 (mailto:oscarargumosa@gmail.com)' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpGet(res.headers.location).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`OpenAlex API error ${res.statusCode}: ${body.slice(0, 200)}`));
        else resolve(body);
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

module.exports = { searchWorks, getWork };
