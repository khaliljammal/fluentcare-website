// Public write-only project token. Never put a personal API key here.
const PROJECT_TOKEN = 'phc_zTxQh4u5AKLL7VaktZ6Gb9aLH5Bry9rX8UNsUwZY2776';
const ENDPOINT = 'https://us.i.posthog.com/i/v0/e/';
const CONSENT_KEY = 'fluentcare-marketing-consent-v1';
const VISITOR_KEY = 'fluentcare-marketing-tab-v1';
const PAGES = Object.freeze({
  '/': ['home', 'home'],
  '/medical-translation-app/': ['medical_translation_app', 'product'],
  '/get-started/': ['get_started', 'utility'],
  '/pricing/': ['pricing', 'utility'],
  '/privacy-and-security/': ['privacy_and_security', 'utility'],
  '/resources/': ['resources', 'utility'],
  '/resources/language-barriers-in-healthcare/': ['language_barriers_healthcare', 'guide']
});
export function sourceCategory(referrer) {
  if (!referrer) return 'direct';
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host === 'www.fluentcare.io' || host === 'fluentcare.io') return 'internal';
    if (/^(?:www\.)?(?:google\.com|bing\.com|duckduckgo\.com)$/.test(host)) return 'organic_search';
    return 'referral';
  } catch { return 'unknown'; }
}
export function privacyBlocked(navigator) {
  return navigator.globalPrivacyControl === true || ['1', 'yes'].includes(navigator.doNotTrack);
}
export function createAnalytics({location, navigator, localStorage, sessionStorage, crypto, fetch, referrer = ''}) {
  const page = Object.hasOwn(PAGES, location.pathname) ? PAGES[location.pathname] : null;
  const eligible = location.protocol === 'https:' && location.hostname === 'www.fluentcare.io' && page;
  let choice = 'unset', visitorId, viewed = false;
  try { const value = localStorage.getItem(CONSENT_KEY); if (['allowed', 'denied'].includes(value)) choice = value; } catch {}
  function permitted() { return Boolean(eligible && choice === 'allowed' && !privacyBlocked(navigator)); }
  function identity() {
    if (visitorId) return visitorId;
    try {
      const saved = sessionStorage.getItem(VISITOR_KEY);
      visitorId = /^web_[0-9a-f-]{36}$/.test(saved || '') ? saved : `web_${crypto.randomUUID()}`;
      sessionStorage.setItem(VISITOR_KEY, visitorId);
      return visitorId;
    } catch { return null; }
  }
  function capture(event, extra = {}) {
    if (!permitted()) return false;
    const properties = {page_key: page[0], page_type: page[1], source_category: sourceCategory(referrer), environment: 'production', schema_version: 1, $process_person_profile: false, $geoip_disable: true};
    if (event === 'marketing_page_viewed') {
      if (viewed) return false;
    } else if (event === 'get_started_clicked') {
      if (!['clinic_owner', 'staff', 'availability'].includes(extra.route_choice)) return false;
      properties.route_choice = extra.route_choice;
    } else if (event === 'demo_started') {
      if (extra.demo_key !== 'visual_conversation') return false;
      properties.demo_key = 'visual_conversation';
    } else return false;
    const distinctId = identity();
    if (!distinctId) return false;
    if (event === 'marketing_page_viewed') viewed = true;
    // Explicit payload only: never spread caller properties, URLs, or form values.
    const payload = {api_key: PROJECT_TOKEN, distinct_id: distinctId, event, properties};
    try {
      Promise.resolve(fetch(ENDPOINT, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload), credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true})).catch(() => {});
    } catch {}
    return true;
  }
  function choose(value) {
    if (!['allowed', 'denied'].includes(value)) return;
    choice = value;
    try { localStorage.setItem(CONSENT_KEY, value); } catch {}
    if (value === 'denied') {
      visitorId = undefined;
      try { sessionStorage.removeItem(VISITOR_KEY); } catch {}
    } else capture('marketing_page_viewed');
  }
  return {capture, choose, permitted, get choice() {return choice;}, get blocked() {return privacyBlocked(navigator);}};
}
export function initialiseWebsite(window, document) {
  let analytics;
  try {
    analytics = createAnalytics({location: window.location, navigator: window.navigator, localStorage: window.localStorage, sessionStorage: window.sessionStorage, crypto: window.crypto, fetch: window.fetch.bind(window), referrer: document.referrer});
  } catch { return; }
  const banner = document.createElement('section');
  banner.className = 'analytics-choice';
  banner.setAttribute('aria-label', 'Optional website analytics');
  banner.innerHTML = '<p><strong>Help improve the website?</strong> Allow limited page and button statistics. No form contents or session recordings. <a href="/privacy-and-security/">Details</a></p><div><button type="button" data-consent="allowed">Allow</button><button type="button" data-consent="denied">No thanks</button></div>';
  const notice = document.createElement('p');
  notice.className = 'analytics-choice';
  notice.hidden = true;
  notice.textContent = 'Your browser privacy preference prevents website analytics.';
  document.body.append(banner, notice);
  banner.hidden = analytics.choice !== 'unset' || analytics.blocked;
  analytics.capture('marketing_page_viewed');
  document.addEventListener('click', event => {
    const consent = event.target.closest('[data-consent]');
    if (consent) {analytics.choose(consent.dataset.consent); banner.hidden = true; return;}
    if (event.target.closest('[data-analytics-choices]')) {
      if (analytics.blocked) notice.hidden = !notice.hidden;
      else banner.hidden = false;
      return;
    }
    const demo = event.target.closest('#play-preview');
    if (demo && demo.getAttribute('aria-pressed') === 'true') analytics.capture('demo_started', {demo_key: 'visual_conversation'});
    const link = event.target.closest('a[href]');
    if (!link) return;
    const destination = new URL(link.href, window.location.href);
    if (destination.origin === 'https://www.fluentcare.io' && destination.pathname === '/get-started/') analytics.capture('get_started_clicked', {route_choice: 'availability'});
    else if (destination.origin === 'https://fluentcare.web.app' && destination.pathname === '/support/') analytics.capture('get_started_clicked', {route_choice: 'availability'});
    else if (destination.origin === 'https://fluentcare.web.app' && destination.pathname === '/') analytics.capture('get_started_clicked', {route_choice: 'clinic_owner'});
  });
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') initialiseWebsite(window, document);
