import {marked} from 'marked';
import {escapeHTML as e, validateLink} from './render-utils.mjs';
const ICONS = new Set(['ArrowUpRight','ArrowRight','MessagesSquare','Users','UserRound','CreditCard','ShieldCheck','LockKeyhole','Languages','ClipboardList','Mail','Check','BookOpen','Mic','Cloud','Settings','LogIn','CalendarDays','Headphones','CircleCheck','AudioLines']);
const LAYOUTS = new Set(['reading','product','onboarding','pricing','privacy','resources','guide']);
const icon=(name,light=false)=>{if(!ICONS.has(name))throw new Error('Unknown component icon');return `<img class="component-icon" src="/icons/${name}${light?'-light':''}.svg" alt="" width="24" height="24" aria-hidden="true">`;};
const idFor=text=>text.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const image=(src,alt,width,height,priority=false)=>`<img src="${src}" alt="${e(alt)}" width="${width}" height="${height}" ${priority?'fetchpriority="high"':'loading="lazy"'} decoding="async">`;
function link(href,label,classes='text-link',route){validateLink(href);return `<a class="${classes}" href="${e(href)}"${route?` data-route-choice="${e(route)}"`:''}>${e(label)}${icon('ArrowUpRight',classes.includes('inverse'))}</a>`;}
export function validatePresentation(meta) {
  const p=meta.presentation;
  if(p===undefined)return;
  if(!p||typeof p!=='object'||Array.isArray(p)||!LAYOUTS.has(p.layout))throw new Error('Unknown presentation layout');
  for(const field of ['eyebrow','breadcrumb','image_caption','card_title'])if(p[field]!==undefined&&(typeof p[field]!=='string'||p[field].length>250))throw new Error('Invalid presentation text');
  if(p.primary_cta){if(typeof p.primary_cta.label!=='string')throw new Error('Invalid primary CTA');validateLink(p.primary_cta.href);if(p.primary_cta.route&&!['clinic_owner','staff','availability'].includes(p.primary_cta.route))throw new Error('Invalid route choice');}
  for(const key of ['features','steps','choices','routine_moments'])if(p[key]!==undefined){
    if(!Array.isArray(p[key])||p[key].length>8)throw new Error('Invalid component collection');
    for(const item of p[key]){if(!item||typeof item.title!=='string'||typeof item.text!=='string')throw new Error('Invalid component content');if(item.icon&&!ICONS.has(item.icon))throw new Error('Unknown component icon');if(item.href)validateLink(item.href);if(item.route&&!['clinic_owner','staff','availability'].includes(item.route))throw new Error('Invalid route choice');}
  }
  if(p.layout==='pricing'){
    if(!p.plan||Object.keys(p.plan).sort().join(',')!=='included_minutes,monthly,overage,trial')throw new Error('Incomplete pricing component');
    for(const value of Object.values(p.plan))if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100000)throw new Error('Invalid pricing component amount');
  }
}
export function sectionContent(page) {
  const tokens=marked.lexer(page.body||'');const intro=[],sections=[];let active=null;const ids=new Set();
  for(const token of tokens){
    if(token.type==='heading'&&token.depth===2){let id=idFor(token.text)||'section';const base=id;let n=2;while(ids.has(id))id=base+'-'+n++;ids.add(id);active={title:token.text,id,tokens:[]};sections.push(active);}
    else(active?active.tokens:intro).push(token);
  }
  return {introHTML:marked.parser(intro),sections:sections.map(s=>({...s,html:marked.parser(s.tokens)}))};
}
const section=(s,classes='')=>`<section class="story-section ${classes}" id="${e(s.id)}"><h2>${e(s.title)}</h2><div class="story-copy">${s.html}</div></section>`;
const ctaBand=(title,copy,href='/get-started/',label='Find your next step',eyebrow='Let’s talk about your clinic')=>`<section class="next-step"><div><p class="eyebrow">${e(eyebrow)}</p><h2>${e(title)}</h2><p>${e(copy)}</p></div>${link(href,label,'button')}</section>`;
function hero(page,crumbs,extra='',classes='') {
  const p=page.meta.presentation;const {introHTML}=sectionContent(page);
  return `<section class="page-hero ${classes}">${crumbs}<div class="hero-grid"><div class="page-hero-copy"><p class="eyebrow">${e(p.eyebrow||'For independent clinic teams')}</p><h1>${e(page.meta.heading)}</h1><div class="hero-lead">${introHTML}</div>${p.primary_cta?link(p.primary_cta.href,p.primary_cta.label,'button'):''}</div>${extra}</div></section>`;
}
const photo=(caption='Generated illustrative clinic scene',alt='A receptionist and adult visitor speaking at a welcoming clinic front desk')=>`<figure class="story-photo">${image('/assets/clinic-front-desk.jpg',alt,1586,992,true)}<figcaption>${e(caption)}</figcaption></figure>`;
function product(page,crumbs) {
  const p=page.meta.presentation,{sections}=sectionContent(page);
  const app=`<figure class="app-preview"><div class="app-preview-top"><span>Inside FluentCare</span><span class="label-pill">App preview</span></div>${image('/assets/app-sign-in.png','FluentCare sign-in screen with the clinic team login form',393,853,true)}<figcaption>Current sign-in preview · public downloads coming soon</figcaption></figure>`;
  const features=(p.features||[]).map(f=>`<div class="feature-point">${icon(f.icon||'CircleCheck')}<div><h2>${e(f.title)}</h2><p>${e(f.text)}</p></div></div>`).join('');
  const steps=(p.steps||[]).map((s,i)=>`<li><span class="step-count">0${i+1}</span>${icon(s.icon||'MessagesSquare')}<h3>${e(s.title)}</h3><p>${e(s.text)}</p></li>`).join('');
  const moments=(p.routine_moments||[]).map(m=>`<li><span class="icon-tile">${icon(m.icon||'MessagesSquare')}</span><h3>${e(m.title)}</h3><p>${e(m.text)}</p></li>`).join('');
  const audioFlow=`<ol class="compact-audio-flow" aria-label="Translation flow"><li>${icon('Mic')}<span>Speak</span></li><li aria-hidden="true">${icon('ArrowRight')}</li><li>${icon('Cloud')}<span>Translate</span></li><li aria-hidden="true">${icon('ArrowRight')}</li><li>${icon('AudioLines')}<span>Listen</span></li></ol>`;
  const expectations=sections.slice(2).map((s,i)=>`<section class="product-detail-card ${i===0?'mint-card':'white-card'}" id="${e(s.id)}">${i===0?`<span class="icon-tile">${icon('ShieldCheck')}</span><p class="detail-label">AI with clear limits</p>`:audioFlow}<h3>${e(s.title)}</h3><div class="story-copy">${s.html}</div></section>`).join('');
  return `<div class="visual-page product-page">${hero(page,crumbs,app,'product-hero')}<div class="feature-strip">${features}</div><section class="section-story"><div class="section-story-heading"><p class="eyebrow">A little preparation. A natural conversation.</p><h2>Make space for<br>both voices.</h2></div><ol class="workflow-cards">${steps}</ol></section><div class="product-story-grid">${photo(p.image_caption,'Illustrative conversation between a receptionist and a visitor at a clinic front desk')}<div>${sections.slice(0,2).map(s=>section(s)).join('')}</div></div><section class="product-moments"><div class="section-story-heading"><p class="eyebrow">Designed for routine communication</p><h2>For the everyday moments.</h2></div><ul class="moment-cards">${moments}</ul></section><section class="product-expectations"><div class="section-story-heading"><p class="eyebrow">A thoughtful place in your workflow</p><h2>Know what to expect.</h2></div><div class="two-card-grid">${expectations}</div><p class="product-evaluation-note">During release testing, use non-patient examples. Confirm applicable provider arrangements and language evaluation before patient use. ${link('/privacy-and-security/','Review evaluation details')}</p></section>${ctaBand('Live voice translation for your clinic team.','FluentCare translates spoken conversations both ways, with optional captions and shared minutes for your staff.','/get-started/','Get started with FluentCare','Meet FluentCare')}</div>`;

}
function onboarding(page,crumbs){
 const p=page.meta.presentation,{sections}=sectionContent(page);
 const choices=(p.choices||[]).map((c,i)=>`<article class="choice-card ${i===0?'choice-owner':'choice-staff'}"><div class="card-top"><span class="icon-tile">${icon(c.icon||'Users',i===0)}</span><span class="label-pill">${i===0?'For clinic owners':'For your team'}</span></div><h2>${e(c.title)}</h2><p>${e(c.text)}</p><div class="choice-content">${sections[i]?.html||''}</div>${link(c.href,c.cta||'Contact us','button'+(i===0?'':' secondary'),c.route)}</article>`).join('');
 return `<div class="visual-page onboarding-page">${hero(page,crumbs,'','centered-hero')}<div class="two-card-grid role-choices">${choices}</div>${sections.slice(2).map(s=>section(s,'release-card')).join('')}</div>`;
}
function pricing(page,crumbs){
 const p=page.meta.presentation,{sections}=sectionContent(page),plan=p.plan,money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
 const card=`<article class="plan-card"><div class="card-top"><span class="label-pill">One subscription per clinic</span>${icon('Users',true)}</div><h2>For your whole team.</h2><p class="plan-price"><span>${e(money(plan.monthly).replace('.00',''))}</span><span>/ month</span></p><div class="plan-inclusion"><strong>${e(plan.included_minutes)}</strong><span>shared translation minutes<br>per billing period</span></div><ul class="plan-list"><li>${icon('Check',true)}Individual staff accounts</li><li>${icon('Check',true)}One shared clinic allowance</li><li>${icon('Check',true)}${e(plan.trial)} shared trial minutes for eligible new clinics</li></ul>${link('/get-started/','Ask about availability','button')}<p class="small-note">App-store downloads coming soon. Eligibility applies.</p></article>`;
 const calc=`<section class="usage-example" data-usage-example data-monthly="${plan.monthly}" data-included="${plan.included_minutes}" data-overage="${plan.overage}"><span class="icon-tile">${icon('CreditCard')}</span><p class="eyebrow">A simple usage example</p><h2>You set the pace.</h2><p>Included minutes first. Additional usage at ${e(money(plan.overage))} per minute, measured by the second.</p><label for="example-minutes">Example monthly usage <output id="minutes-label" for="example-minutes">${plan.included_minutes} minutes</output></label><input id="example-minutes" type="range" min="0" max="${Math.max(200,plan.included_minutes*2)}" value="${plan.included_minutes}" step="1"><div class="range-labels"><span>0 min</span><span>${Math.max(200,plan.included_minutes*2)} min</span></div><dl class="estimate-rows"><div><dt>Monthly plan</dt><dd>${e(money(plan.monthly))}</dd></div><div><dt>Additional usage</dt><dd id="extra-estimate">${e(money(0))}</dd></div><div class="estimate-total"><dt>Illustrative total</dt><dd><output id="total-estimate" aria-live="polite">${e(money(plan.monthly))}</output></dd></div></dl><p class="small-note">Illustrative estimate before taxes. Additional usage is disabled until your clinic owner enables it and sets a limit. This control does not change your account.</p></section>`;
 return `<div class="visual-page pricing-page">${hero(page,crumbs,'','centered-hero')}<div class="pricing-grid">${card}${calc}</div><div class="two-card-grid pricing-details">${sections.map(s=>section(s,'white-card')).join('')}</div></div>`;
}
function privacy(page,crumbs){
 const {sections}=sectionContent(page);
 const flow=`<div class="data-journey" aria-label="Audio processing overview"><div>${icon('Mic')}<span>01</span><strong>Speech in</strong><p>Audio from the conversation</p></div><span class="journey-arrow">${icon('ArrowRight')}</span><div>${icon('Cloud')}<span>02</span><strong>OpenAI processes</strong><p>Translation processing</p></div><span class="journey-arrow">${icon('ArrowRight')}</span><div>${icon('AudioLines')}<span>03</span><strong>Speech out</strong><p>The translated response</p></div></div>`;
 const cards=sections.slice(0,2).map((s,i)=>`<section class="information-card" id="${s.id}"><span class="icon-tile">${icon(i===0?'MessagesSquare':'Users')}</span><h2>${e(s.title)}</h2>${s.html}</section>`).join('');
 return `<div class="visual-page privacy-page">${hero(page,crumbs,'','centered-hero')}<section class="process-panel"><div class="section-story-heading"><p class="eyebrow">Follow the conversation</p><h2>Processing and storage<br>are separate questions.</h2></div>${flow}<p class="process-note">FluentCare’s application does not save conversation recordings or transcripts in its own storage. Provider processing and retention depend on applicable agreements and settings.</p></section><div class="two-card-grid">${cards}</div>${sections.slice(2).map((s,i)=>i===1?`<details class="disclosure-card" id="${s.id}"><summary>${icon('Settings')}<span>${e(s.title)}</span></summary><div class="story-copy">${s.html}</div></details>`:section(s,i===0?'release-card':'privacy-next')).join('')}</div>`;
}
function resources(page,crumbs,guides){
 const feature=guides[0];
 const featureHTML=feature?`<a class="featured-resource" href="${e(feature.meta.slug)}"><div class="featured-image">${image('/assets/clinic-front-desk.jpg','Illustrative front-desk conversation in a welcoming clinic',1586,992,true)}<span class="label-pill">Clinic workflows</span></div><div class="featured-copy"><p class="eyebrow">Start with the workflow</p><h2>${e(feature.meta.presentation?.card_title||feature.meta.heading.replace(/\n/g,' '))}</h2><p>${e(feature.meta.description)}</p><span class="resource-meta">${Math.max(1,Math.ceil(feature.body.split(/\s+/).length/200))} min read <span>Read the guide ${icon('ArrowUpRight')}</span></span></div></a>`:'';
 const supporting=[['MessagesSquare','Meet the product','How FluentCare is designed around routine clinic communication.','/medical-translation-app/'],['CreditCard','Understand the pricing','One clinic subscription, a shared allowance and owner-controlled extra usage.','/pricing/'],['ShieldCheck','Review privacy','Understand audio processing, application storage and current release requirements.','/privacy-and-security/']].map(([i,t,d,h])=>`<a class="resource-card" href="${h}"><span class="icon-tile">${icon(i)}</span><h3>${t}</h3><p>${d}</p><span class="card-link">Explore ${icon('ArrowUpRight')}</span></a>`).join('');
 const additional=guides.slice(1).map(g=>`<a class="resource-card" href="${e(g.meta.slug)}"><span class="icon-tile">${icon('BookOpen')}</span><h3>${e(g.meta.presentation?.card_title||g.meta.heading)}</h3><p>${e(g.meta.description)}</p><span class="card-link">Read guide ${icon('ArrowUpRight')}</span></a>`).join('');
 return `<div class="visual-page resource-page">${hero(page,crumbs,'','resource-hero')}${featureHTML}<section class="section-story"><div class="section-story-heading"><p class="eyebrow">Explore FluentCare</p><h2>A clearer picture,<br>before your next step.</h2></div><div class="three-card-grid">${supporting}${additional}</div></section>${ctaBand('Let’s start with your clinic.','Questions about release availability or evaluation requirements? We’re here to help.','/get-started/','Find your next step')}</div>`;
}
function guide(page,crumbs){
 const {introHTML,sections}=sectionContent(page);const p=page.meta.presentation;
 const toc=sections.map((s,i)=>`<a href="#${e(s.id)}"><span>0${i+1}</span>${e(s.title)}</a>`).join('');
 const content=sections.map((s,i)=>section(s,i===0?'scenario-card':'')).join('');
 return `<article class="visual-page guide-page"><header class="guide-heading">${crumbs}<p class="eyebrow">${e(p.eyebrow||'Clinic workflow guide')}</p><h1>${e(page.meta.heading)}</h1><div class="guide-meta"><span>FluentCare resources</span><span>${Math.max(1,Math.ceil(page.body.split(/\s+/).length/200))} min read</span><span>Practical clinic workflows</span></div></header>${photo()}<div class="guide-grid"><aside class="guide-sidebar"><p class="eyebrow">In this guide</p><nav aria-label="Article sections">${toc}</nav><div class="sidebar-note">${icon('BookOpen')}<p>An illustrative workflow.<br>Follow your clinic’s approved policies.</p></div></aside><div class="guide-content"><div class="guide-intro">${introHTML}</div>${content}</div></div><div class="guide-end">${link('/resources/','Explore more resources')}${link('/medical-translation-app/','Meet the FluentCare product')}</div></article>`;
}
export function renderVisualPage(page,crumbs,guides=[]) {
 validatePresentation(page.meta);const layout=page.meta.presentation?.layout||'reading';
 const renderers={product,onboarding,pricing,privacy,resources,guide};
 if(renderers[layout])return renderers[layout](page,crumbs,guides);
 return `<article class="content-page">${crumbs}<p class="eyebrow">For independent clinic teams</p><h1>${e(page.meta.heading)}</h1><div class="article-body">${page.html}</div></article>`;
}
