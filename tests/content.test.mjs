import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePage,renderPage,sitemap,validatePageLinks} from '../scripts/build-content.mjs';
const meta={slug:'/medical-translation-app/',title:'A useful app',description:'A concise description',heading:'Routine conversations',status:'draft',page_type:'product'};
const source=(changes={},body='## How it works\n\nRead the [walkthrough](/#how-it-works).')=>'---\n'+JSON.stringify({...meta,...changes})+'\n---\n'+body;
test('draft publication needs actual evidence',()=>assert.throws(()=>parsePage(source({status:'published'}),'draft.md'),/publication evidence/));
test('unsafe markup and links are rejected',()=>{
  for(const body of ['<script>alert(1)</script>','[Click](javascript:alert%281%29)','[Click](//other.example/)','# Second H1','![image](/photo.jpg)'])assert.throws(()=>parsePage(source({},body),'unsafe.md'));
});
test('routes cannot escape the generated output',()=>{for(const slug of ['/../','//evil/','/a/../../','/a?b/'])assert.throws(()=>parsePage(source({slug}),'route.md'),/invalid route/);});
test('metadata is escaped and preview is excluded from search',()=>{
  const page=parsePage(source({title:'A "title" <tag>'}),'safe.md');
  const result=renderPage(page,'<title>{{TITLE}}</title><meta name="robots" content="{{ROBOTS}}">{{BODY}}',true);
  assert.match(result,/&quot;title&quot; &lt;tag&gt;/);assert.match(result,/noindex,nofollow/);assert.match(result,/<h2>How it works<\/h2>/);
});
test('sitemap uses canonical origin with only supplied routes',()=>{
  const xml=sitemap(['/']);assert.match(xml,/<loc>https:\/\/www.fluentcare.io\/<\/loc>/);assert.doesNotMatch(xml,/medical-translation-app/);
});
test('internal navigation rejects unpublished routes and missing fragments',()=>{
  assert.throws(()=>validatePageLinks(new Map([['/','<a href="/draft/">Draft</a>']])),/broken internal route/);
  assert.throws(()=>validatePageLinks(new Map([['/','<a href="/#missing">Section</a>']])),/missing fragment/);
  validatePageLinks(new Map([['/','<section id="demo"></section><a href="/#demo">Demo</a>']]));
});
test('published Markdown cannot contain draft placeholders',()=>{
  assert.throws(()=>parsePage(source({status:'published',claims_verified:true,cta_verified:true,reviewed_by:'test-fixture',reviewed_at:'2026-10-04',sources:['fixture']},'TODO: Confirm this'),'placeholder.md'),/draft placeholder/);
});
