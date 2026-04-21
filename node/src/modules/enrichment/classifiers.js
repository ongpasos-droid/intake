/**
 * classifiers.js — derive categorical fields from extracted data and raw text.
 *
 * Independent of cheerio / DOM; works on plain extracted strings. Makes it
 * easy to re-run classification without re-fetching.
 */

// ── Legal form detection ──────────────────────────────────────────
// Keyed by normalized code; each entry lists exact-match tokens (case-insensitive)
// that appear in the entity's legal name or footer.
const LEGAL_FORM_MATCHERS = [
  { code: 'ets',           tokens: ['ETS', 'Ente del Terzo Settore'] },
  { code: 'onlus',         tokens: ['ONLUS'] },
  { code: 'aps',           tokens: ['APS', 'Associazione di Promozione Sociale'] },
  { code: 'srl',           tokens: ['S.r.l.', 'Srl ', 'S.R.L.'] },
  { code: 'spa',           tokens: ['S.p.A.', 'SpA ', 'S.P.A.'] },
  { code: 'ev',            tokens: ['e.V.', 'e. V.', ' eV ', 'eingetragener Verein'] },
  { code: 'ggmbh',         tokens: ['gGmbH', 'g.GmbH'] },
  { code: 'gmbh',          tokens: ['GmbH'] },
  { code: 'ag',            tokens: [' AG ', 'Aktiengesellschaft'] },
  { code: 'asbl',          tokens: ['asbl', 'ASBL'] },
  { code: 'vzw',           tokens: ['vzw', 'VZW'] },
  { code: 'mtu',           tokens: ['MTÜ'] },
  { code: 'amke',          tokens: ['ΑΜΚΕ', 'AMKE', 'Α.Μ.Κ.Ε.'] },
  { code: 'sjalfseign',    tokens: ['sjálfseignarstofnun'] },
  { code: 'ry',            tokens: [' ry ', ' ry,', 'rekisteröity yhdistys'] },
  { code: 'association',   tokens: ['Association ', 'Asociación ', 'Associazione ', 'Verein ', 'Stowarzyszenie '] },
  { code: 'fundacion',     tokens: ['Fundación', 'Fundação', 'Fundacja', 'Foundation', 'Stiftung', 'Fondation', 'Fondazione'] },
  { code: 'sp_zoo',        tokens: ['sp. z o.o.', 'Sp. z o.o.', 'Sp. z o. o.'] },
  { code: 'plc_ltd',       tokens: ['Ltd', 'PLC', 'Limited'] },
  { code: 'municipality',  tokens: ['Comune di', 'Ayuntamiento', 'Gemeinde', 'Commune de', 'Município'] },
  { code: 'state_school',  tokens: ['meb.k12.tr', 'blogs.sch.gr', '.sch.gr', 'Scuola Statale', 'Szkoła Podstawowa', 'Gymnasium', 'Lise', 'Ortaokulu', 'Lisesi'] },
  { code: 'university',    tokens: ['University', 'Università', 'Universität', 'Universidad', 'Uniwersytet'] },
  { code: 'religious',     tokens: ['Erzbistum', 'Diocese', 'Parrocchia', 'Parroquia', 'Iglesia', 'Archdiocese'] },
  { code: 'public_inst',   tokens: ['Ente Pubblico', 'ЈУ ', 'Javna ustanova'] },
];

function detectLegalForm(name, text) {
  const haystack = ((name || '') + ' ' + (text || '')).slice(0, 10_000);
  for (const m of LEGAL_FORM_MATCHERS) {
    for (const tok of m.tokens) {
      if (haystack.toLowerCase().includes(tok.toLowerCase())) {
        return m.code;
      }
    }
  }
  return null;
}

// ── EU program detection ──────────────────────────────────────────
// Multi-program: returns an array of tags found in the page.
const EU_PROGRAM_MATCHERS = [
  { tag: 'erasmus_plus',       rx: /erasmus\s*\+|erasmus\s*plus|erasmus\+/i },
  { tag: 'etwinning',          rx: /etwinning|e-twinning/i },
  { tag: 'erasmus_accreditation', rx: /erasmus\+?\s*accreditation|erasmus\+?\s*acreditac|erasmus\+?\s*akkreditier/i },
  { tag: 'fse_plus',           rx: /\bFSE\+?\b|European\s*Social\s*Fund|Fondo\s*Social\s*Europeo|Fonds\s*Social\s*Europ/i },
  { tag: 'creative_europe',    rx: /creative\s*europe|europa\s*creativa|europ[ea]\s*cr[eé]ative/i },
  { tag: 'leader',             rx: /\bLEADER\b\s*(program|programme|Initiative|Initiative)?|EAFRD|FEADER/i },
  { tag: 'interreg',           rx: /\bInterreg\b/i },
  { tag: 'horizon',            rx: /Horizon\s*(2020|Europe)|H2020/i },
  { tag: 'ka1',                rx: /\bKA1(?:\d{2})?\b|Key\s*Action\s*1/i },
  { tag: 'ka2',                rx: /\bKA2(?:\d{2})?\b|Key\s*Action\s*2/i },
  { tag: 'ka3',                rx: /\bKA3(?:\d{2})?\b|Key\s*Action\s*3/i },
  { tag: 'lifelong_learning',  rx: /Lifelong\s*Learning\s*Programme|Llp\b/i },
  { tag: 'youth_in_action',    rx: /Youth\s*in\s*Action/i },
  { tag: 'solidarity_corps',   rx: /European\s*Solidarity\s*Corps|ESC\b/i },
  { tag: 'nextgen_eu',         rx: /NextGen(?:eration)?\s*EU|PNRR|Plan\s*de\s*Recuperaci/i },
];

function detectEuPrograms(text) {
  if (!text) return null;
  const found = [];
  for (const m of EU_PROGRAM_MATCHERS) {
    if (m.rx.test(text)) found.push(m.tag);
  }
  return found.length > 0 ? found : null;
}

function hasErasmusAccreditation(programs) {
  return programs && programs.includes('erasmus_accreditation') ? 1 : 0;
}

function hasEtwinningLabel(programs, text) {
  if (programs && programs.includes('etwinning')) return 1;
  if (text && /eTwinning\s*School\s*Label/i.test(text)) return 1;
  return 0;
}

// ── CMS detection ────────────────────────────────────────────────
function detectCms(rawHtml, finalUrl) {
  if (!rawHtml) return null;
  const h = rawHtml;
  const u = finalUrl || '';

  // 1. Subdomain / URL hints — authoritative when present.
  if (/\.wixsite\.com/i.test(u) || /wix\.com\/website/i.test(h)) return 'wix';
  if (/\.blogspot\.com/i.test(u) || /\.blogspot\.[a-z.]+/i.test(u)) return 'blogspot';
  if (/\.wordpress\.com/i.test(u)) return 'wordpress_com';
  if (/blogs\.sch\.gr/i.test(u)) return 'sch_gr';
  if (/\.sch\.gr/i.test(u)) return 'sch_gr';
  if (/\.meb\.k12\.tr/i.test(u) || /meb\.gov\.tr/i.test(u) || /mebk12/i.test(u)) return 'meb_tr';
  if (/\.edupage\.org/i.test(u)) return 'edupage';
  if (/municipiumapp\.it/i.test(h)) return 'municipium';

  // 2. Body content markers BEFORE generator meta — these are stronger
  // because plugins (Elementor/WPML/AIOSEO) often hijack the generator tag
  // even though the underlying CMS is WordPress.
  if (/wp-content|wp-includes/.test(h)) return 'wordpress';
  if (/\/sites\/default\/files|Drupal\.settings/i.test(h)) return 'drupal';
  if (/joomla!|\/components\/com_/i.test(h)) return 'joomla';
  if (/typo3conf|typo3temp/.test(h)) return 'typo3';
  if (/Enjin\.be|my\.enjin\.be/i.test(h)) return 'enjin';
  if (/img1\.wsimg\.com|GoDaddy/i.test(h)) return 'godaddy_builder';
  if (/odoo\.|odoo_website/i.test(h)) return 'odoo';

  // 3. Generator meta only as fallback, normalized to known CMS labels.
  const gen = h.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i);
  if (gen) {
    const g = gen[1].toLowerCase();
    if (g.includes('wordpress')) return 'wordpress';
    if (g.includes('drupal')) return 'drupal';
    if (g.includes('joomla')) return 'joomla';
    if (g.includes('typo3')) return 'typo3';
    if (g.includes('wix')) return 'wix';
    if (g.includes('wpml')) return 'wordpress'; // plugin → underlying CMS
    if (g.includes('elementor')) return 'wordpress';
    if (g.includes('aioseo') || g.includes('all in one seo')) return 'wordpress';
    if (g.includes('cms made simple')) return 'cmsms';
    if (g.includes('mywebsite')) return 'ionos_mywebsite';
    if (g.includes('weblication')) return 'weblication';
    // Return only a short canonical token, not the whole plugin version string.
    const first = g.split(/\s+/)[0].replace(/[^a-z0-9_]/g, '').slice(0, 30);
    return first || null;
  }
  return null;
}

// ── Name ↔ domain match ───────────────────────────────────────────
/**
 * Returns 1 if a normalized token from the legal name appears in the host,
 * 0 otherwise. Very rough — an LLM pass can refine in v2.
 */
function nameMatchesDomain(legalName, finalUrl) {
  if (!legalName || !finalUrl) return null;
  let host;
  try { host = new URL(finalUrl).hostname.toLowerCase(); } catch { return null; }
  host = host.replace(/\.(com|org|net|eu|info|biz)(\.\w{2})?$/, '')
             .replace(/^(www|m)\./, '');
  const tokens = legalName.toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 4)
    .filter(t => !['asociación','associazione','foundation','school','ngo','center','centro','the','and','for','university','gymnasium','ortaokulu','lisesi'].includes(t));
  for (const t of tokens) {
    if (host.includes(t.slice(0, 8))) return 1;
  }
  return 0;
}

// ── TLD vs declared country ───────────────────────────────────────
const TLD_COUNTRY = {
  es: 'ES', it: 'IT', de: 'DE', fr: 'FR', pt: 'PT', pl: 'PL', nl: 'NL',
  be: 'BE', at: 'AT', ch: 'CH', uk: 'GB', ie: 'IE', gr: 'EL', tr: 'TR',
  ro: 'RO', bg: 'BG', cz: 'CZ', sk: 'SK', hu: 'HU', si: 'SI', hr: 'HR',
  lt: 'LT', lv: 'LV', ee: 'EE', fi: 'FI', se: 'SE', dk: 'DK', no: 'NO',
  is: 'IS', mt: 'MT', cy: 'CY', lu: 'LU', al: 'AL', me: 'ME', mk: 'MK',
  ba: 'BA', rs: 'RS', ua: 'UA',
};

function detectMismatchLevel(declaredCountryCode, finalUrl, redirectChain) {
  if (!finalUrl) return 'unknown';
  let host;
  try { host = new URL(finalUrl).hostname.toLowerCase(); } catch { return 'unknown'; }
  const parts = host.split('.');
  const tld = parts[parts.length - 1];
  const expected = TLD_COUNTRY[tld];
  // If TLD is generic (com/org/net/edu/info) we can't judge from TLD alone.
  if (!expected) return 'none';
  if (declaredCountryCode && expected !== declaredCountryCode) {
    // Was there a redirect across countries? If so it's stronger signal.
    if (redirectChain && redirectChain.length > 0) {
      try {
        const originalHost = new URL(redirectChain[0].url).hostname.toLowerCase();
        const originalTld = originalHost.split('.').pop();
        if (TLD_COUNTRY[originalTld] && TLD_COUNTRY[originalTld] === declaredCountryCode) {
          return 'redirect_to_other_country';
        }
      } catch {}
    }
    return 'tld_mismatch';
  }
  return 'none';
}

module.exports = {
  detectLegalForm,
  detectEuPrograms,
  hasErasmusAccreditation,
  hasEtwinningLabel,
  detectCms,
  nameMatchesDomain,
  detectMismatchLevel,
};

// --- Self-test ---
if (require.main === module) {
  console.log('legal form:', detectLegalForm('AIAS Bologna ETS', 'some text ONLUS info'));
  console.log('legal form2:', detectLegalForm('Netzwerk Spiel e.V.', ''));
  console.log('legal form3:', detectLegalForm('Fundación Ejemplo', ''));
  console.log('eu programs:', detectEuPrograms('Erasmus+ accreditation, eTwinning, Creative Europe'));
  console.log('cms wix:', detectCms('<html></html>', 'https://1muhendis.wixsite.com/x'));
  console.log('cms wordpress:', detectCms('<link href="/wp-content/x.css">', 'https://example.org'));
  console.log('name-domain-match:', nameMatchesDomain('Netzwerk Spiel/Kultur Prenzlauer Berg', 'https://netzwerkspielkultur.de'));
  console.log('name-domain-mismatch:', nameMatchesDomain('KTZ sp. z o.o.', 'https://halej.pl'));
  console.log('mismatch:', detectMismatchLevel('ES', 'https://example.ro/', []));
  console.log('mismatch none:', detectMismatchLevel('ES', 'https://example.com/', []));
}
