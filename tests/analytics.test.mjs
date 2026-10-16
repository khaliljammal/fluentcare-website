import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createAnalytics,acquisition,sourceCategory,linkTarget,clickArea,referringSite,STORAGE} from '../dist/analytics.mjs';
const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),values};};
function setup(changes={}){
 const sent=[],local=storage(),session=storage();let time=Date.UTC(2026,9,16,12);
 const dependencies={location:{protocol:'https:',hostname:'www.fluentcare.io',pathname:'/',search:'?patient=PRIVATE&email=PRIVATE'},navigator:{userAgent:'Mozilla Chrome/1.0'},localStorage:local,sessionStorage:session,crypto:webcrypto,referrer:'https://www.google.com/search?q=PRIVATE',fetch:(url,options)=>{sent.push({url,options,payload:JSON.parse(options.body)});return Promise.resolve({ok:true});},now:()=>time,viewportWidth:390,...changes};
 return {analytics:createAnalytics(dependencies),sent,local,session,dependencies,advance:ms=>time+=ms};
}
const events=(s,name)=>s.sent.filter(e=>e.payload.event===name);
const last=s=>s.sent.at(-1).payload;
test('no identity, attribution persistence or capture before renewed consent',()=>{
 const s=setup();assert.equal(s.analytics.capture('marketing_page_viewed'),false);assert.equal(s.sent.length,0);assert.equal(s.local.values.size,0);assert.equal(s.session.values.size,0);
 const local=storage();local.setItem('fluentcare-marketing-consent-v1','allowed');const old=setup({localStorage:local});assert.equal(old.analytics.choice,'unset');assert.equal(old.analytics.capture('marketing_page_viewed'),false);assert.equal(old.sent.length,0);
});
test('old No thanks is respected without asking a previous decliner again',()=>{const local=storage();local.setItem('fluentcare-marketing-consent-v1','denied');const s=setup({localStorage:local});assert.equal(s.analytics.choice,'denied');assert.equal(s.analytics.capture('marketing_page_viewed'),false);});
test('canonical native page events omit secrets and match one legacy view per navigation',()=>{
 const s=setup();s.analytics.choose('allowed');s.analytics.capture('marketing_page_viewed');
 assert.deepEqual(s.sent.map(e=>e.payload.event),['website_session_started','marketing_page_viewed','$pageview']);
 const page=last(s);assert.equal(page.properties.$current_url,'https://www.fluentcare.io/');assert.equal(page.properties.$pathname,'/');assert.equal(page.properties.$process_person_profile,false);assert.equal(page.properties.$geoip_disable,true);assert.equal(page.properties.viewport_type,'phone');
 assert.doesNotMatch(JSON.stringify(s.sent),/PRIVATE|patient|email|\$set|\$referrer/);assert.equal(s.sent[0].options.credentials,'omit');assert.equal(s.sent[0].options.referrerPolicy,'no-referrer');
 assert.match(page.properties.$session_id,/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
test('extra caller fields never become payload fields, even on tracked clicks',()=>{
 const s=setup();s.analytics.choose('allowed');s.analytics.capture('website_link_clicked',{target_key:'get_started',click_area:'hero',placement_index:1,email:'PRIVATE',label:'PRIVATE',href:'https://PRIVATE'});s.analytics.capture('get_started_clicked',{route_choice:'availability',target_key:'get_started',click_area:'header_cta',form:{secret:'PRIVATE'}});
 assert.doesNotMatch(JSON.stringify(s.sent),/PRIVATE/);assert.equal(Object.hasOwn(last(s).properties,'form'),false);assert.equal(Object.hasOwn(last(s).properties,'label'),false);assert.equal(last(s).properties.click_area,'header_cta');assert.equal(last(s).properties.target_key,'get_started');
});
test('host, protocol and page registry block previews, app pages and unknown routes',()=>{
 for(const location of [{protocol:'https:',hostname:'preview.vercel.app',pathname:'/'},{protocol:'http:',hostname:'www.fluentcare.io',pathname:'/'},{protocol:'https:',hostname:'fluentcare.web.app',pathname:'/'},{protocol:'https:',hostname:'www.fluentcare.io',pathname:'/patient/private/'}]){const s=setup({location});s.analytics.choose('allowed');assert.equal(s.sent.length,0);assert.equal(s.session.values.size,0);assert.equal(s.local.values.has(STORAGE.visitor),false);}
});
test('GPC and DNT override consent and erase previously stored journey identifiers',()=>{
 for(const navigator of [{globalPrivacyControl:true},{doNotTrack:'1'},{doNotTrack:'yes'}]){const s=setup({navigator});s.analytics.choose('allowed');assert.equal(s.sent.length,0);assert.equal(s.session.values.size,0);assert.equal(s.local.values.has(STORAGE.visitor),false);}
 const s=setup();s.analytics.choose('allowed');s.dependencies.navigator.globalPrivacyControl=true;assert.equal(s.analytics.capture('demo_started',{demo_key:'visual_conversation'}),false);assert.equal(s.session.values.size,0);assert.equal(s.local.values.has(STORAGE.visitor),false);
});
test('withdrawal removes IDs and attribution and immediately stops capture',()=>{const s=setup();s.analytics.choose('allowed');const before=s.sent.length;s.analytics.choose('denied');assert.equal(s.session.values.size,0);assert.equal(s.local.values.has(STORAGE.visitor),false);assert.equal(s.analytics.capture('get_started_clicked',{route_choice:'availability'}),false);assert.equal(s.sent.length,before);});
test('consent withdrawal in another page stops this page without waiting for navigation',()=>{const s=setup();s.analytics.choose('allowed');s.local.setItem(STORAGE.consent,'denied');const before=s.sent.length;assert.equal(s.analytics.capture('demo_started',{demo_key:'visual_conversation'}),false);assert.equal(s.sent.length,before);});
test('acquisition uses named platforms and approved campaigns, never arbitrary UTM content',()=>{
 assert.equal(sourceCategory('https://www.fluentcare.io/pricing/?secret=yes'),'internal');assert.equal(sourceCategory(''),'direct');assert.equal(sourceCategory('not a url'),'unknown');assert.equal(acquisition('https://chatgpt.com/?secret=PRIVATE').platform,'chatgpt');assert.equal(acquisition('https://www.linkedin.com/feed/').platform,'linkedin');assert.equal(acquisition('https://google.attacker.com/').source,'referral');
 const value=acquisition('https://PRIVATE.example/path','?utm_source=linkedin&utm_medium=social&utm_campaign=ai-medical-translator&utm_term=PRIVATE&utm_content=PRIVATE','resources');assert.deepEqual(value,{source:'campaign',platform:'linkedin',medium:'social',campaign:'ai_medical_translator',site:'none',page:'resources'});
 assert.equal(acquisition('','?utm_campaign=PRIVATE').campaign,'unrecognized');assert.doesNotMatch(JSON.stringify(acquisition('','?utm_source=PRIVATE&utm_medium=PRIVATE&utm_campaign=PRIVATE')),/PRIVATE/);
});
test('source, entry page, previous page and sequence survive real multi-page creation',()=>{
 const s=setup();s.analytics.choose('allowed');const initial=last(s),firstId=initial.distinct_id,sessionId=initial.properties.$session_id;
 const {fetch:ignoredFetch,...shared}=s.dependencies;
 const next=setup({...shared,location:{protocol:'https:',hostname:'www.fluentcare.io',pathname:'/pricing/',search:'?email=PRIVATE'},referrer:'https://www.fluentcare.io/'});next.analytics.capture('marketing_page_viewed');
 const page=last(next);assert.equal(page.distinct_id,firstId);assert.equal(page.properties.$session_id,sessionId);assert.equal(page.properties.acquisition_source,'organic_search');assert.equal(page.properties.acquisition_platform,'google');assert.equal(page.properties.first_page_key,'home');assert.equal(page.properties.previous_page_key,'home');assert.equal(page.properties.entry_page_key,'home');assert.equal(page.properties.page_number,2);assert.equal(page.properties.event_sequence,5);assert.notEqual(page.properties.page_view_id,initial.properties.page_view_id);assert.equal(events(next,'website_session_started').length,0);
});
test('30-minute idle creates a new session with a fresh page view before the next click',()=>{
 const s=setup();s.analytics.choose('allowed');const first=last(s);s.advance(30*60000);s.analytics.capture('get_started_clicked',{route_choice:'availability'});
 const current=last(s);assert.notEqual(current.properties.$session_id,first.properties.$session_id);assert.equal(current.distinct_id,first.distinct_id);assert.equal(events(s,'website_session_started').length,2);assert.equal(events(s,'marketing_page_viewed').length,2);assert.equal(current.properties.page_number,1);
});
test('24-hour maximum rotates a session even if activity continues',()=>{
 const s=setup();s.analytics.choose('allowed');const first=last(s).properties.$session_id;
 for(let i=0;i<49;i++){s.advance(29*60000);s.analytics.capture('website_control_used',{control_key:'demo_play',click_area:'hero'});}
 s.advance(20*60000);s.analytics.capture('website_control_used',{control_key:'demo_play',click_area:'hero'});assert.notEqual(last(s).properties.$session_id,first);
});
test('first touch survives returning visits and new campaigns update last non-direct attribution',()=>{
 const s=setup();s.analytics.choose('allowed');s.advance(31*60000);
 const {fetch:ignoredFetch,...shared}=s.dependencies;
 const returned=setup({...shared,location:{protocol:'https:',hostname:'www.fluentcare.io',pathname:'/resources/',search:'?utm_source=linkedin&utm_medium=social&utm_campaign=website-launch'},referrer:''});returned.analytics.capture('marketing_page_viewed');const p=last(returned).properties;
 assert.equal(p.first_platform,'google');assert.equal(p.acquisition_platform,'linkedin');assert.equal(p.campaign_key,'website_launch');assert.equal(p.last_nondirect_platform,'linkedin');assert.equal(p.entry_page_key,'resources');
});
test('30-day absolute visitor expiry rotates both identity and first-touch data',()=>{
 const s=setup();s.analytics.choose('allowed');const first=last(s).distinct_id;s.advance(30*86400000+1);s.analytics.capture('marketing_page_viewed');assert.notEqual(last(s).distinct_id,first);assert.equal(last(s).properties.page_number,1);
});
test('corrupt storage is ignored and cannot inject arbitrary properties',()=>{
 const local=storage(),session=storage();local.setItem(STORAGE.consent,'allowed');local.setItem(STORAGE.visitor,JSON.stringify({id:'PRIVATE',expires:1,first:{source:'PRIVATE'}}));session.setItem(STORAGE.session,'not json');const s=setup({localStorage:local,sessionStorage:session});s.analytics.capture('marketing_page_viewed');assert.equal(s.sent.length,3);assert.doesNotMatch(JSON.stringify(s.sent),/PRIVATE/);
});
test('blocked local storage falls back to tab storage and never breaks the website',()=>{
 const blocked={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');},removeItem(){throw new Error('blocked');}};
 const s=setup({localStorage:blocked});assert.doesNotThrow(()=>s.analytics.choose('allowed'));assert.equal(last(s).properties.continuity,'tab');const memory=setup({localStorage:blocked,sessionStorage:blocked});assert.doesNotThrow(()=>memory.analytics.choose('allowed'));assert.equal(last(memory).properties.continuity,'memory');
});
test('unsupported events, arbitrary IDs and unknown controls are rejected',()=>{
 const s=setup();s.analytics.choose('allowed');const before=s.sent.length;
 for(const [event,extra] of [['early_access_submitted',{}],['$pageview',{}],['website_link_clicked',{target_key:'PRIVATE',click_area:'hero'}],['website_control_used',{control_key:'PRIVATE',click_area:'hero'}],['website_scroll_reached',{scroll_percent:51}],['website_section_viewed',{section_index:31}],['get_started_clicked',{route_choice:'PRIVATE'}]])assert.equal(s.analytics.capture(event,extra),false);
 assert.equal(s.sent.length,before);
});
test('engagement is bounded and native pageleave carries only canonical addresses',()=>{
 const s=setup();s.analytics.choose('allowed');s.analytics.capture('website_engagement',{reason:'pagehide',active_seconds:1e100,max_scroll_percent:999,transcript:'PRIVATE'});const event=events(s,'website_engagement')[0].payload;assert.equal(event.properties.active_seconds,86400);assert.equal(event.properties.max_scroll_percent,100);assert.equal(last(s).event,'$pageleave');assert.doesNotMatch(JSON.stringify(s.sent),/PRIVATE|transcript/);
});
test('click target normalization discards credentials, dynamic paths and query values',()=>{
 assert.equal(linkTarget('/get-started/?email=PRIVATE'),'get_started');assert.equal(linkTarget('https://fluentcare.web.app/support/?secret=PRIVATE'),'app_support');assert.equal(linkTarget('mailto:PRIVATE@example.com'),null);assert.equal(linkTarget('javascript:alert(1)'),null);assert.equal(linkTarget('https://www.fluentcare.io/PRIVATE/'),null);assert.equal(linkTarget('https://PRIVATE@fluentcare.web.app/support/'),null);assert.equal(linkTarget('https://PRIVATE.example/PRIVATE'),'other_external');
});
test('click positions distinguish header navigation, header CTA, hero and footer',()=>{
 for(const [selector,key] of [['.site-header nav','header_navigation'],['header.site-header','header_cta'],['.hero-actions,.hero-copy,.page-hero','hero'],['.site-footer','footer']])assert.equal(clickArea({closest:s=>s===selector}),key);
});
test('BFCache resume starts a new page view while keeping the active visit',()=>{const s=setup();s.analytics.choose('allowed');const first=last(s);s.analytics.beginPage();const resumed=last(s);assert.equal(resumed.properties.$session_id,first.properties.$session_id);assert.notEqual(resumed.properties.page_view_id,first.properties.page_view_id);assert.equal(resumed.properties.page_number,2);});
test('network failure cannot interrupt navigation and capture is bounded per document',async()=>{
 const s=setup({fetch:()=>Promise.reject(new Error('offline'))});assert.doesNotThrow(()=>s.analytics.choose('allowed'));await Promise.resolve();const flood=setup();flood.analytics.choose('allowed');for(let i=0;i<1000;i++)flood.analytics.capture('website_control_used',{control_key:'demo_play',click_area:'hero'});assert.equal(flood.sent.length,200);
});

test('controlled test-traffic flag follows the full visit after query parameters disappear',()=>{
 const s=setup({location:{protocol:'https:',hostname:'www.fluentcare.io',pathname:'/',search:'?fc_test=1'}});s.analytics.choose('allowed');
 const {fetch:ignored,...shared}=s.dependencies;const next=setup({...shared,location:{protocol:'https:',hostname:'www.fluentcare.io',pathname:'/pricing/',search:''},referrer:'https://www.fluentcare.io/'});next.analytics.capture('marketing_page_viewed');
 assert.equal(last(next).properties.traffic_type,'test');
});

test('referring site preserves useful public source domains but strips subdomains and URL data',()=>{
 assert.equal(referringSite('patient-123.portal.example.edu'),'example.edu');assert.equal(referringSite('news.example.co.uk'),'example.co.uk');
 for(const host of ['127.0.0.1','localhost','patient.internal','PRIVATE.example','foo:8080','not a domain'])assert.equal(referringSite(host),'none');
 const a=acquisition('https://private-subdomain.example.edu/path?email=PRIVATE');assert.equal(a.site,'example.edu');assert.doesNotMatch(JSON.stringify(a),/PRIVATE|private-subdomain|email|path/);
});
