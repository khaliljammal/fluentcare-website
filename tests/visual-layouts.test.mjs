import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {parsePage,renderPage} from '../scripts/build-content.mjs';
import {validatePresentation} from '../scripts/visual-layouts.mjs';
test('component metadata rejects unknown layouts, unsafe destinations and malformed prices',()=>{
 for(const presentation of [{layout:'unsafe'},{layout:'product',primary_cta:{label:'Go',href:'javascript:alert(1)'}},{layout:'onboarding',choices:[{title:'Owner',text:'Hello',href:'//evil.example',route:'staff'}]},{layout:'pricing',plan:{monthly:-1,included_minutes:80,overage:.3,trial:10}},{layout:'product',features:[{title:'Hi',text:'Text',icon:'Fake'}]}])assert.throws(()=>validatePresentation({presentation}));
});
test('all six page layouts retain a single H1, local breadcrumbs and accessible image descriptions',async()=>{
 const template=await readFile(new URL('../templates/page.html',import.meta.url),'utf8');
 const names=['medical-translation-app','get-started','pricing','privacy-and-security','resources','language-barriers-in-healthcare'];
 const pages=await Promise.all(names.map(async name=>parsePage(await readFile(new URL(`../content/pages/${name}.md`,import.meta.url),'utf8'),name)));
 for(const page of pages){const html=renderPage(page,template,false,pages.filter(p=>p.meta.page_type==='guide'));assert.equal((html.match(/<h1>/g)||[]).length,1);assert.match(html,/href="\/">Home/);assert.match(html,/Product<\/a>/);assert.doesNotMatch(html,/\{\{PAGE_CONTENT\}\}/);}
 const malicious=structuredClone(pages[0]);malicious.meta.presentation.features[0].title='<script>alert(1)</script>';
 assert.match(renderPage(malicious,template,false),/&lt;script&gt;alert/);
});
test('usage example charges only extra minutes and never mutates an account',async()=>{
 const outputs={};const input={value:'80',min:'0',max:'200',style:{setProperty(){}},addEventListener(_,fn){this.update=fn;}};
 const calculator={dataset:{monthly:'20',included:'80',overage:'.3'},querySelector(selector){return selector.startsWith('input')?input:outputs[selector]??= {textContent:''};}};
 const script=await readFile(new URL('../dist/content.js',import.meta.url),'utf8');
 vm.runInNewContext(script,{document:{querySelector:()=>calculator},Intl,Number,Math});
 assert.equal(outputs['#total-estimate'].textContent,'$20.00');input.value='90';input.update();assert.equal(outputs['#extra-estimate'].textContent,'$3.00');assert.equal(outputs['#total-estimate'].textContent,'$23.00');input.value='0';input.update();assert.equal(outputs['#total-estimate'].textContent,'$20.00');
});
