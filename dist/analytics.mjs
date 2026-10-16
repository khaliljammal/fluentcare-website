// Public write-only token. Fixed public-page journeys only; never capture app/patient data.
const PROJECT_TOKEN = 'phc_zTxQh4u5AKLL7VaktZ6Gb9aLH5Bry9rX8UNsUwZY2776';
const ENDPOINT = 'https://us.i.posthog.com/i/v0/e/';
export const STORAGE = Object.freeze({consent:'fluentcare-marketing-consent-v2',visitor:'fluentcare-marketing-visitor-v2',session:'fluentcare-marketing-session-v2'});
const LEGACY_CONSENT='fluentcare-marketing-consent-v1', LEGACY_VISITOR='fluentcare-marketing-tab-v1';
const VISITOR_TTL=30*86400000, SESSION_IDLE=30*60000, SESSION_MAX=24*3600000;
export const PAGES=Object.freeze({
 '/':['home','home'], '/medical-translation-app/':['medical_translation_app','product'],
 '/get-started/':['get_started','utility'], '/pricing/':['pricing','utility'],
 '/privacy-and-security/':['privacy_and_security','utility'], '/resources/':['resources','utility'],
 '/resources/language-barriers-in-healthcare/':['language_barriers_healthcare','guide'],
 '/resources/ai-medical-translator/':['ai_medical_translator','guide']
});
const PAGE_KEYS=new Set(Object.values(PAGES).map(p=>p[0]));
const SOURCES=new Set(['direct','organic_search','social','ai_referral','referral','campaign','internal','unknown']);
const PLATFORMS=new Set(['none','google','bing','duckduckgo','yahoo','brave','linkedin','facebook','instagram','reddit','youtube','x','chatgpt','perplexity','copilot','newsletter','other']);
const MEDIUMS=new Set(['none','organic','social','email','referral','cpc','paid_social','unknown']);
// Reviewed campaign tags. Unknown/free-text UTMs are never copied into analytics.
export const CAMPAIGNS=Object.freeze({'website-launch':'website_launch','ai-medical-translator':'ai_medical_translator','language-access-guide':'language_access_guide','clinic-outreach':'clinic_outreach'});
const CAMPAIGN_KEYS=new Set(['none','unrecognized',...Object.values(CAMPAIGNS)]);
const AREAS=new Set(['header_navigation','header_cta','hero','footer','next_step','section_navigation','article','faq','owner_card','staff_card','pricing_card','breadcrumbs','content']);
const TARGETS=new Set([...PAGE_KEYS,'app_dashboard','app_support','app_terms','app_privacy','source_ahrq','source_pubmed','other_external','page_section']);
const CONTROLS=new Set(['demo_play','demo_stop','example_welcome','example_appointment','example_comfort','walkthrough_1','walkthrough_2','walkthrough_3','pricing_calculator',...Array.from({length:20},(_,i)=>'disclosure_'+(i+1))]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const read=(s,k)=>{try{return s.getItem(k);}catch{return null;}};
const write=(s,k,v)=>{try{s.setItem(k,v);return true;}catch{return false;}};
const remove=(s,k)=>{try{s.removeItem(k);}catch{}};
const parse=text=>{try{return JSON.parse(text);}catch{return null;}};
const member=(set,value,fallback)=>set.has(value)?value:fallback;
const validTime=n=>Number.isFinite(n)&&n>=0;
const bounded=(n,max)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.round(n))):0;
// Site-level grouping drops subdomains, paths and queries. Common country suffixes
// retain their site label; uncommon public suffixes may be grouped more broadly.
export function referringSite(host){
 if(typeof host!=='string'||host.length>253)return 'none';
 host=host.toLowerCase().replace(/\.$/,'');
 if(!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)||/\.(?:local|internal|localhost|test|invalid|example|lan)$/.test(host))return 'none';
 const labels=host.split('.'),suffix=labels.slice(-2).join('.');
 const compound=new Set(['co.uk','org.uk','ac.uk','gov.uk','com.au','net.au','org.au','edu.au','co.nz','co.in','co.jp','co.za','com.br','com.sg','com.mx','com.tr','com.cn','com.hk','com.tw','com.sa','com.eg','co.kr','co.id','co.il','com.my','com.ph']);
 return labels.slice(compound.has(suffix)?-3:-2).join('.');
}
function safeTouch(t){
 if(!t||typeof t!=='object')return null;
 return {source:member(SOURCES,t.source,'unknown'),platform:member(PLATFORMS,t.platform,'other'),medium:member(MEDIUMS,t.medium,'unknown'),campaign:member(CAMPAIGN_KEYS,t.campaign,'unrecognized'),site:referringSite(t.site),page:member(PAGE_KEYS,t.page,'home')};
}
function uuid7(crypto,time){
 const random=crypto.randomUUID().replaceAll('-','');
 const hex=Math.floor(time).toString(16).padStart(12,'0').slice(-12);
 return `${hex.slice(0,8)}-${hex.slice(8)}-7${random.slice(13,16)}-${random.slice(16,20)}-${random.slice(20)}`;
}
function platformFor(host){
 if(['google.com','www.google.com','www.google.co.uk','www.google.com.au','www.google.ca','www.google.ae','www.google.co.in'].includes(host))return ['organic_search','google'];
 const groups=[['organic_search','bing',['bing.com','www.bing.com']],['organic_search','duckduckgo',['duckduckgo.com']],['organic_search','yahoo',['search.yahoo.com']],['organic_search','brave',['search.brave.com']],['social','linkedin',['linkedin.com','www.linkedin.com','lnkd.in']],['social','facebook',['facebook.com','www.facebook.com','m.facebook.com','l.facebook.com']],['social','instagram',['instagram.com','www.instagram.com','l.instagram.com']],['social','reddit',['reddit.com','www.reddit.com']],['social','youtube',['youtube.com','www.youtube.com']],['social','x',['t.co','x.com','twitter.com']],['ai_referral','chatgpt',['chatgpt.com','chat.openai.com']],['ai_referral','perplexity',['perplexity.ai','www.perplexity.ai']],['ai_referral','copilot',['copilot.microsoft.com']]];
 for(const [source,platform,hosts] of groups)if(hosts.includes(host))return [source,platform];
 return ['referral','other'];
}
export function acquisition(referrer='',search='',page='home'){
 let source='direct',platform='none',medium='none',site='none';
 if(referrer){try{const url=new URL(referrer);if(!['https:','http:'].includes(url.protocol))throw new Error();site=referringSite(url.hostname);if(['www.fluentcare.io','fluentcare.io'].includes(url.hostname))source='internal';else [source,platform]=platformFor(url.hostname.toLowerCase());}catch{source='unknown';platform='other';}}
 medium=source==='organic_search'?'organic':source==='social'?'social':['ai_referral','referral'].includes(source)?'referral':'none';
 let campaign='none';
 try{
  const q=new URLSearchParams(search),utmSource=q.get('utm_source'),utmMedium=q.get('utm_medium'),utmCampaign=q.get('utm_campaign');
  if(utmSource!==null||utmMedium!==null||utmCampaign!==null){
   source='campaign';platform=member(PLATFORMS,utmSource,'other');medium=member(MEDIUMS,utmMedium,'unknown');campaign=Object.hasOwn(CAMPAIGNS,utmCampaign)?CAMPAIGNS[utmCampaign]:(utmCampaign?'unrecognized':'none');
  }
 }catch{}
 return {source,platform,medium,campaign,site,page:member(PAGE_KEYS,page,'home')};
}
export const sourceCategory=referrer=>acquisition(referrer).source;
export const privacyBlocked=navigator=>navigator.globalPrivacyControl===true||['1','yes'].includes(navigator.doNotTrack);
export function createAnalytics({location,navigator,localStorage,sessionStorage,crypto,fetch,referrer='',now=Date.now,viewportWidth=0}){
 const page=Object.hasOwn(PAGES,location.pathname)?PAGES[location.pathname]:null;
 const eligible=location.protocol==='https:'&&location.hostname==='www.fluentcare.io'&&Boolean(page);
 const initial=acquisition(referrer,location.search,page?.[0]);
 let choice=read(localStorage,STORAGE.consent);
 if(!['allowed','denied'].includes(choice))choice=read(localStorage,LEGACY_CONSENT)==='denied'?'denied':'unset';
 remove(sessionStorage,LEGACY_VISITOR);
 let visitor=null,session=null,viewId=null,viewed=false,previousPage='none',pageNumber=0,sentCount=0;
 const userAgent=navigator.userAgent||'';
 const device=/iPad|Tablet/i.test(userAgent)?'Tablet':/Mobi|iPhone|Android/i.test(userAgent)?'Mobile':'Desktop';
 const browser=/Edg\//.test(userAgent)?'Edge':/Firefox\//.test(userAgent)?'Firefox':/Chrome\//.test(userAgent)?'Chrome':/Safari\//.test(userAgent)?'Safari':'Other';
 const os=/Android/.test(userAgent)?'Android':/iPhone|iPad/.test(userAgent)?'iOS':/Windows/.test(userAgent)?'Windows':/Macintosh/.test(userAgent)?'macOS':/Linux/.test(userAgent)?'Linux':'Other';
 const layout=viewportWidth>0&&viewportWidth<650?'phone':viewportWidth>0&&viewportWidth<1000?'tablet':'desktop';
 let traffic='regular';try{if(new URLSearchParams(location.search).get('fc_test')==='1'||navigator.webdriver===true)traffic='test';}catch{}
 function clearIdentity(){visitor=null;session=null;viewId=null;viewed=false;remove(localStorage,STORAGE.visitor);remove(sessionStorage,STORAGE.visitor);remove(sessionStorage,STORAGE.session);remove(sessionStorage,LEGACY_VISITOR);}
 function permitted(){
  const saved=read(localStorage,STORAGE.consent);if(saved==='denied'){choice='denied';clearIdentity();}
  if(privacyBlocked(navigator)){clearIdentity();return false;}
  return eligible&&choice==='allowed';
 }
 if(choice==='denied'||privacyBlocked(navigator))clearIdentity();
 function context(passive=false){
  const time=now();
  const stored=parse(read(localStorage,STORAGE.visitor))||parse(read(sessionStorage,STORAGE.visitor))||visitor;
  if(stored&&UUID.test(stored.id)&&validTime(stored.expires)&&stored.expires>time&&stored.expires<=time+VISITOR_TTL&&safeTouch(stored.first))visitor={id:stored.id,expires:stored.expires,first:safeTouch(stored.first),last:safeTouch(stored.last)||safeTouch(stored.first)};
  else{visitor={id:crypto.randomUUID(),expires:time+VISITOR_TTL,first:initial,last:initial};session=null;remove(sessionStorage,STORAGE.session);}
  if(!UUID.test(visitor.id))return null;
  const storedSession=parse(read(sessionStorage,STORAGE.session))||session;
  let isNew=!storedSession||storedSession.visitor!==visitor.id||!UUID.test(storedSession.id)||!validTime(storedSession.started)||!validTime(storedSession.last)||storedSession.started>time||storedSession.last>time;
  if(!isNew&&!passive)isNew=time-storedSession.last>=SESSION_IDLE||time-storedSession.started>=SESSION_MAX;
  if(isNew){
   const touch=initial.source==='internal'?(safeTouch(visitor.last)||initial):initial;
   session={id:uuid7(crypto,time),visitor:visitor.id,started:time,last:time,touch,entry:page[0],previous:'none',pageNumber:0,sequence:0,traffic};
   if(!['internal','direct','unknown'].includes(initial.source))visitor.last=initial;
   viewed=false;viewId=null;
  }else session={id:storedSession.id,visitor:visitor.id,started:storedSession.started,last:storedSession.last,touch:safeTouch(storedSession.touch)||initial,entry:member(PAGE_KEYS,storedSession.entry,page[0]),previous:member(PAGE_KEYS,storedSession.previous,'none'),pageNumber:bounded(storedSession.pageNumber,10000),sequence:bounded(storedSession.sequence,1000000),traffic:traffic==='test'||storedSession.traffic==='test'?'test':'regular'};
  if(!passive)session.last=time;
  const continuity=write(localStorage,STORAGE.visitor,JSON.stringify(visitor))?'browser':write(sessionStorage,STORAGE.visitor,JSON.stringify(visitor))?'tab':'memory';
  return {time,isNew,continuity};
 }
 function baseProperties(c){
  const first=visitor.first,touch=session.touch,last=visitor.last;
  return {page_key:page[0],page_type:page[1],source_category:initial.source,acquisition_source:touch.source,acquisition_platform:touch.platform,acquisition_medium:touch.medium,acquisition_site:touch.site,campaign_key:touch.campaign,first_source:first.source,first_platform:first.platform,first_site:first.site,first_campaign:first.campaign,first_page_key:first.page,last_nondirect_source:['internal','direct','unknown'].includes(last.source)?'unknown':last.source,last_nondirect_platform:['internal','direct','unknown'].includes(last.source)?'none':last.platform,last_nondirect_site:['internal','direct','unknown'].includes(last.source)?'none':last.site,last_nondirect_campaign:['internal','direct','unknown'].includes(last.source)?'none':last.campaign,entry_page_key:session.entry,previous_page_key:previousPage,page_number:pageNumber,page_view_id:viewId,$session_id:session.id,event_sequence:session.sequence,continuity:c.continuity,traffic_type:session.traffic,viewport_type:layout,$browser:browser,$os:os,$device_type:device,environment:'production',schema_version:2,$process_person_profile:false,$geoip_disable:true};
 }
 function send(event,extra,c){
  if(sentCount>=200)return false;
  session.sequence++;
  const properties={...baseProperties(c),...extra};
  const payload={api_key:PROJECT_TOKEN,distinct_id:'web_'+visitor.id,event,timestamp:new Date(c.time).toISOString(),properties};
  write(sessionStorage,STORAGE.session,JSON.stringify(session));sentCount++;
  try{Promise.resolve(fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'omit',referrerPolicy:'no-referrer',keepalive:true})).catch(()=>{});}catch{}
  return true;
 }
 function capture(event,extra={}){
  if(!permitted())return false;
  let clean={};
  if(event==='marketing_page_viewed'){}
  else if(event==='get_started_clicked'){if(!['clinic_owner','staff','availability'].includes(extra.route_choice))return false;clean.route_choice=extra.route_choice;if(TARGETS.has(extra.target_key))clean.target_key=extra.target_key;if(AREAS.has(extra.click_area))clean.click_area=extra.click_area;}
  else if(event==='demo_started'){if(extra.demo_key!=='visual_conversation')return false;clean.demo_key='visual_conversation';}
  else if(event==='website_link_clicked'){if(!TARGETS.has(extra.target_key)||!AREAS.has(extra.click_area))return false;clean={target_key:extra.target_key,click_area:extra.click_area,placement_index:bounded(extra.placement_index,100)};if(Number.isInteger(extra.section_index)&&extra.section_index>0&&extra.section_index<=30)clean.section_index=extra.section_index;}
  else if(event==='website_control_used'){if(!CONTROLS.has(extra.control_key)||!AREAS.has(extra.click_area))return false;clean={control_key:extra.control_key,click_area:extra.click_area};}
  else if(event==='website_scroll_reached'){if(![25,50,75,90,100].includes(extra.scroll_percent))return false;clean.scroll_percent=extra.scroll_percent;}
  else if(event==='website_section_viewed'){if(!Number.isInteger(extra.section_index)||extra.section_index<1||extra.section_index>30)return false;clean.section_index=extra.section_index;}
  else if(event==='website_engagement'){if(!['hidden','pagehide'].includes(extra.reason))return false;clean={reason:extra.reason,active_seconds:bounded(extra.active_seconds,86400),max_scroll_percent:bounded(extra.max_scroll_percent,100)};}
  else return false;
  try{
   const c=context(event==='website_engagement');if(!c)return false;
   if(event==='marketing_page_viewed'&&viewed)return false;
   if(!viewed){
    viewId=crypto.randomUUID();previousPage=session.previous;session.pageNumber++;pageNumber=session.pageNumber;session.previous=page[0];viewed=true;
    if(c.isNew)send('website_session_started',{},c);
    send('marketing_page_viewed',{},c);
    // Native page events use registry-built canonical URLs, never location.href/search/hash.
    send('$pageview',{$current_url:'https://www.fluentcare.io'+location.pathname,$pathname:location.pathname,$host:'www.fluentcare.io'},c);
   }
   if(event==='marketing_page_viewed')return true;
   const sent=send(event,clean,c);
   if(event==='website_engagement'&&extra.reason==='pagehide')send('$pageleave',{$current_url:'https://www.fluentcare.io'+location.pathname,$pathname:location.pathname,active_seconds:clean.active_seconds},c);
   return sent;
  }catch{return false;}
 }
 function choose(value){
  if(!['allowed','denied'].includes(value))return;
  choice=value;write(localStorage,STORAGE.consent,value);
  if(value==='denied')clearIdentity();else capture('marketing_page_viewed');
 }
 return {capture,choose,permitted,beginPage(){viewed=false;viewId=null;pageNumber=0;return capture('marketing_page_viewed');},get choice(){return choice;},get blocked(){return privacyBlocked(navigator);}};
}
export function clickArea(element){
 const locations=[['.site-header nav','header_navigation'],['.breadcrumbs','breadcrumbs'],['header.site-header','header_cta'],['.site-footer','footer'],['.hero-actions,.hero-copy,.page-hero','hero'],['.next-step,.download-section','next_step'],['.guide-sidebar','section_navigation'],['.choice-owner','owner_card'],['.choice-staff','staff_card'],['.plan-card','pricing_card'],['.faq,.faq-list','faq'],['.guide-content','article']];
 for(const [selector,key] of locations)if(element.closest(selector))return key;
 return 'content';
}
export function linkTarget(href,base='https://www.fluentcare.io/'){
 try{
  const url=new URL(href,base);if(url.username||url.password||!['http:','https:'].includes(url.protocol))return null;
  if(['www.fluentcare.io','fluentcare.io'].includes(url.hostname))return PAGES[url.pathname]?.[0]||null;
  if(url.origin==='https://fluentcare.web.app')return ({'/':'app_dashboard','/support/':'app_support','/terms/':'app_terms','/privacy-policy/':'app_privacy'})[url.pathname]||null;
  if(url.hostname==='www.ahrq.gov')return 'source_ahrq';
  if(url.hostname==='pubmed.ncbi.nlm.nih.gov')return 'source_pubmed';
  return 'other_external';
 }catch{return null;}
}
export function initialiseWebsite(window,document){
 let analytics;try{analytics=createAnalytics({location:window.location,navigator:window.navigator,localStorage:window.localStorage,sessionStorage:window.sessionStorage,crypto:window.crypto,fetch:window.fetch.bind(window),referrer:document.referrer,viewportWidth:window.innerWidth});}catch{return;}
 const banner=document.createElement('section');banner.className='analytics-choice';banner.setAttribute('aria-label','Optional website analytics');
 banner.innerHTML='<p><strong>Help improve FluentCare?</strong> Allow website journey statistics: traffic source, pages, clicks and reading engagement. A random ID is stored in this browser for up to 30 days. No form contents or session recordings. <a href="/privacy-and-security/">Details</a></p><div><button type="button" data-consent="allowed">Allow</button><button type="button" data-consent="denied">No thanks</button></div>';
 const notice=document.createElement('p');notice.className='analytics-choice';notice.hidden=true;notice.textContent='Your browser privacy preference prevents website analytics.';document.body.append(banner,notice);
 const refreshChoice=()=>{banner.hidden=analytics.choice!=='unset'||analytics.blocked;};refreshChoice();analytics.capture('marketing_page_viewed');
 let activeMs=0,lastTick=Date.now(),lastInput=lastTick,visible=!document.hidden,maxScroll=0,dirty=false;
 let milestones=new Set(),sectionsSeen=new Set(),left=false;
 const sections=[...document.querySelectorAll('main section')].slice(0,30),visibleSections=new Set();
 function reportSections(){if(!analytics.permitted())return;for(const index of visibleSections)if(!sectionsSeen.has(index)){sectionsSeen.add(index);analytics.capture('website_section_viewed',{section_index:index});dirty=true;}}
 function tick(input=false){const time=Date.now();if(visible)activeMs+=Math.max(0,Math.min(time,lastInput+30000)-lastTick);lastTick=time;if(input)lastInput=time;}
 function snapshot(reason){tick();if(analytics.permitted()&&(dirty||(reason==='pagehide'&&!left))){analytics.capture('website_engagement',{reason,active_seconds:activeMs/1000,max_scroll_percent:maxScroll});dirty=false;if(reason==='pagehide')left=true;}}
 document.addEventListener('click',event=>{
  tick(true);dirty=true;
  const target=event.target?.closest?.('a,button,summary');if(!target)return;
  const consent=target.closest('[data-consent]');if(consent){analytics.choose(consent.dataset.consent);banner.hidden=true;activeMs=0;lastTick=lastInput=Date.now();if(consent.dataset.consent==='allowed')reportSections();return;}
  if(target.closest('[data-analytics-choices]')){if(analytics.blocked)notice.hidden=!notice.hidden;else banner.hidden=false;return;}
  const area=clickArea(target);
  if(target.matches('a[href]')){
   const key=linkTarget(target.getAttribute('href'),window.location.href);if(!key)return;
   const index=[...document.querySelectorAll('a[href]')].filter(a=>clickArea(a)===area&&linkTarget(a.getAttribute('href'),window.location.href)===key).indexOf(target)+1;
   let sectionIndex=0;try{const hash=new URL(target.getAttribute('href'),window.location.href).hash;if(hash)sectionIndex=sections.indexOf(document.getElementById(decodeURIComponent(hash.slice(1))))+1;}catch{}
   analytics.capture('website_link_clicked',{target_key:key,click_area:area,placement_index:index,section_index:sectionIndex});
   if(['get_started','app_support','app_dashboard'].includes(key))analytics.capture('get_started_clicked',{route_choice:key==='app_dashboard'?'clinic_owner':['clinic_owner','staff'].includes(target.dataset.routeChoice)?target.dataset.routeChoice:'availability',target_key:key,click_area:area});
   return;
  }
  let key=null;
  if(target.id==='play-preview'){const playing=target.getAttribute('aria-pressed')==='true';key=playing?'demo_play':'demo_stop';if(playing)analytics.capture('demo_started',{demo_key:'visual_conversation'});}
  else if(['welcome','appointment','comfort'].includes(target.dataset.example))key='example_'+target.dataset.example;
  else if(['1','2','3'].includes(target.dataset.step))key='walkthrough_'+target.dataset.step;
  else if(target.matches('summary'))key='disclosure_'+([...document.querySelectorAll('summary')].indexOf(target)+1);
  if(key)analytics.capture('website_control_used',{control_key:key,click_area:area});
 });
 window.addEventListener('scroll',()=>{
  tick(true);dirty=true;if(!analytics.permitted())return;
  const height=document.documentElement.scrollHeight-window.innerHeight;
  const percent=height>0?bounded(window.scrollY/height*100,100):100;maxScroll=Math.max(maxScroll,percent);
  for(const value of [25,50,75,90,100])if(percent>=value&&!milestones.has(value)){milestones.add(value);analytics.capture('website_scroll_reached',{scroll_percent:value});}
 },{passive:true});
 document.addEventListener('change',event=>{if(event.target?.matches?.('[data-usage-example] input[type="range"]')){tick(true);dirty=true;analytics.capture('website_control_used',{control_key:'pricing_calculator',click_area:'pricing_card'});}},{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){snapshot('hidden');visible=false;}else{visible=true;lastTick=Date.now();}});
 window.addEventListener('pagehide',()=>snapshot('pagehide'));
 window.addEventListener('pageshow',event=>{if(event.persisted){activeMs=0;lastTick=lastInput=Date.now();visible=!document.hidden;maxScroll=0;dirty=false;milestones=new Set();sectionsSeen=new Set();left=false;analytics.beginPage();reportSections();}});
 window.addEventListener('storage',event=>{if(event.key===STORAGE.consent&&event.newValue==='denied'){analytics.choose('denied');banner.hidden=true;}});
 if(window.IntersectionObserver){
  const observer=new window.IntersectionObserver(entries=>{for(const entry of entries){const index=sections.indexOf(entry.target)+1;if(entry.isIntersecting)visibleSections.add(index);else visibleSections.delete(index);}reportSections();},{threshold:0.15});
  sections.forEach(section=>observer.observe(section));
 }
 return analytics;
}
if(typeof window!=='undefined'&&typeof document!=='undefined')initialiseWebsite(window,document);
