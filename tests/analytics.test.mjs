import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnalytics, sourceCategory} from '../dist/analytics.mjs';
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),values};};
function setup(changes={}) {
 const sent=[], local=storage(), session=storage();
 const dependencies={location:{protocol:'https:',hostname:'www.fluentcare.io',pathname:'/',search:'?patient=PRIVATE&email=PRIVATE'},navigator:{},localStorage:local,sessionStorage:session,crypto:{randomUUID:()=> '11111111-2222-3333-4444-555555555555'},referrer:'https://www.google.com/search?q=PRIVATE',fetch:(url,options)=>{sent.push({url,options,payload:JSON.parse(options.body)});return Promise.resolve({ok:true});},...changes};
 return {analytics:createAnalytics(dependencies),sent,local,session,dependencies};
}
test('no identity or network capture before permission',()=>{const s=setup();assert.equal(s.analytics.capture('marketing_page_viewed'),false);assert.equal(s.sent.length,0);assert.equal(s.session.values.size,0);s.analytics.choose('denied');assert.equal(s.sent.length,0);});
test('only the explicit fixed payload is sent, once per navigation',()=>{
 const s=setup();s.analytics.choose('allowed');s.analytics.capture('marketing_page_viewed');s.analytics.capture('get_started_clicked',{route_choice:'availability',email:'PRIVATE',url:'https://PRIVATE',audio:'PRIVATE',$set:{name:'PRIVATE'}});
 assert.equal(s.sent.length,2);const raw=JSON.stringify(s.sent);assert.doesNotMatch(raw,/PRIVATE|patient|email|\$set|\$current_url|\$referrer/);
 assert.deepEqual(Object.keys(s.sent[1].payload.properties).sort(),['$geoip_disable','$process_person_profile','environment','page_key','page_type','route_choice','schema_version','source_category'].sort());
 assert.equal(s.sent[0].payload.properties.source_category,'organic_search');assert.equal(s.sent[0].payload.properties.$process_person_profile,false);assert.equal(s.sent[0].payload.properties.$geoip_disable,true);
 assert.equal(s.sent[0].options.credentials,'omit');assert.equal(s.sent[0].options.referrerPolicy,'no-referrer');
});
test('GPC and Do Not Track override stored or newly granted permission',()=>{
 for(const navigator of [{globalPrivacyControl:true},{doNotTrack:'1'},{doNotTrack:'yes'}]){const s=setup({navigator});s.analytics.choose('allowed');assert.equal(s.sent.length,0);assert.equal(s.session.values.size,0);}
});
test('previews, development, unknown routes and insecure origins never capture',()=>{
 for(const location of [{protocol:'https:',hostname:'preview.vercel.app',pathname:'/'},{protocol:'http:',hostname:'www.fluentcare.io',pathname:'/'},{protocol:'https:',hostname:'www.fluentcare.io',pathname:'/unexpected/private/'}]){const s=setup({location});s.analytics.choose('allowed');assert.equal(s.sent.length,0);}
});
test('unsupported events and arbitrary enum values are rejected',()=>{
 const s=setup();s.analytics.choose('allowed');
 for(const [name,extra] of [['early_access_submitted',{}],['store_link_clicked',{platform:'ios'}],['get_started_clicked',{route_choice:'PRIVATE'}],['demo_started',{demo_key:'PRIVATE'}],['$pageview',{}]])assert.equal(s.analytics.capture(name,extra),false);
 assert.equal(s.sent.length,1);
});
test('withdrawal immediately stops capture and removes tab identity',()=>{const s=setup();s.analytics.choose('allowed');s.analytics.choose('denied');assert.equal(s.session.values.size,0);assert.equal(s.analytics.capture('get_started_clicked',{route_choice:'availability'}),false);assert.equal(s.sent.length,1);});
test('referrer is classified locally and arbitrary URLs never leave the page',()=>{assert.equal(sourceCategory('https://www.fluentcare.io/pricing/?secret=yes'),'internal');assert.equal(sourceCategory('https://private.example/path?secret=yes'),'referral');assert.equal(sourceCategory('not a url'),'unknown');assert.equal(sourceCategory(''),'direct');});
test('network and unavailable-storage failures never interrupt the site',async()=>{const s=setup({fetch:()=>Promise.reject(new Error('offline'))});assert.doesNotThrow(()=>s.analytics.choose('allowed'));await Promise.resolve();const blocked=setup({sessionStorage:{getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}}});assert.doesNotThrow(()=>blocked.analytics.choose('allowed'));assert.equal(blocked.sent.length,0);});
