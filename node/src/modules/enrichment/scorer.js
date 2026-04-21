/**
 * scorer.js — compute 0-100 quality/fit scores from the extracted + classified
 * record. Scores are heuristic, meant for rough sorting/filtering, not for
 * decisioning. All scores default to 0 and accumulate points when signals
 * are present, then clamp to [0, 100].
 */

const clamp = (x) => Math.max(0, Math.min(100, Math.round(x)));

function scoreProfessionalism(rec) {
  let s = 0;
  // Own corporate email domain (not gmail/yahoo/etc)
  if (rec.emails && rec.emails.length > 0) {
    const corporate = rec.emails.some((e) => {
      const domain = e.split('@')[1] || '';
      return !/gmail|yahoo|hotmail|outlook|live|yandex|mail\.ru|web\.de|gmx|aol/i.test(domain);
    });
    s += corporate ? 30 : 5;
  }
  // Phone available
  if (rec.phones && rec.phones.length > 0) s += 10;
  // Physical address
  if (rec.addresses && rec.addresses.length > 0) s += 15;
  // Social media presence (count)
  const socialCount = rec.social_links ? Object.keys(rec.social_links).length : 0;
  s += Math.min(15, socialCount * 5);
  // SSL valid
  if (rec.ssl_valid === true) s += 10;
  // Copyright year recent (last 3 years)
  if (rec.copyright_year) {
    const thisYear = new Date().getFullYear();
    if (rec.copyright_year >= thisYear - 2) s += 10;
    else if (rec.copyright_year >= thisYear - 5) s += 5;
  }
  // Privacy policy
  if (rec.has_privacy_policy) s += 5;
  // Newsletter signup (engagement tier)
  if (rec.has_newsletter_signup) s += 5;
  return clamp(s);
}

function scoreEuReadiness(rec) {
  let s = 0;
  const programs = rec.eu_programs || [];
  // Count each distinct program; Erasmus+ accreditation weighs heavily.
  if (programs.includes('erasmus_accreditation')) s += 40;
  else if (programs.includes('erasmus_plus')) s += 20;
  if (programs.includes('etwinning')) s += 15;
  if (programs.includes('horizon')) s += 10;
  if (programs.includes('creative_europe')) s += 10;
  if (programs.includes('fse_plus')) s += 8;
  if (programs.includes('interreg')) s += 7;
  if (programs.includes('leader')) s += 5;
  // Non-program signals
  if ((rec.website_languages || []).length >= 2) s += 10;
  if (rec.oid_erasmus_on_site) s += 10;
  if (rec.pic_on_site) s += 10;
  return clamp(s);
}

function scoreVitality(rec) {
  // Inverse-age signal. Points for recent activity.
  let s = 0;
  const now = Date.now();
  // Copyright year as a rough baseline
  if (rec.copyright_year) {
    const years = new Date().getFullYear() - rec.copyright_year;
    if (years <= 1) s += 40;
    else if (years <= 3) s += 25;
    else if (years <= 5) s += 10;
  }
  // Last news date (if extracted)
  if (rec.last_news_date) {
    const ageDays = (now - new Date(rec.last_news_date).getTime()) / 86_400_000;
    if (ageDays <= 60) s += 40;
    else if (ageDays <= 180) s += 25;
    else if (ageDays <= 365) s += 10;
  }
  // Sitemap freshness
  if (rec.sitemap_lastmod) {
    const ageDays = (now - new Date(rec.sitemap_lastmod).getTime()) / 86_400_000;
    if (ageDays <= 60) s += 20;
    else if (ageDays <= 365) s += 10;
  }
  return clamp(s);
}

function scoreSquatRisk(rec) {
  // High score = more suspicious. Used for prioritizing manual review.
  let s = 0;
  if (rec.name_matches_domain === 0) s += 40;
  if (rec.mismatch_level === 'tld_mismatch') s += 15;
  if (rec.mismatch_level === 'redirect_to_other_country') s += 30;
  if (!rec.emails || rec.emails.length === 0) s += 10;
  if (!rec.addresses || rec.addresses.length === 0) s += 10;
  if (!rec.copyright_year) s += 5;
  // If CMS is a free-blog/wix and there are no corporate signals, bump risk.
  if (['blogspot', 'wix', 'wordpress_com', 'godaddy_builder'].includes(rec.cms_detected)) {
    if (!rec.addresses && !rec.phones) s += 15;
  }
  return clamp(s);
}

function computeScores(rec) {
  return {
    score_professionalism: scoreProfessionalism(rec),
    score_eu_readiness: scoreEuReadiness(rec),
    score_vitality: scoreVitality(rec),
    score_squat_risk: scoreSquatRisk(rec),
  };
}

module.exports = { computeScores };
