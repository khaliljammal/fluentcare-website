import {marked} from 'marked';
import {readFile,writeFile,readdir,mkdir,cp,rm} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const origin='https://www.fluentcare.io';
import {escapeHTML,validateLink} from './render-utils.mjs';
import {renderVisualPage,validatePresentation} from './visual-layouts.mjs';
export {escapeHTML,validateLink};
export function parsePage(text,filename){
  const match=text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if(!match)throw new Error(`${filename}: use JSON front matter between --- lines`);
  const meta=JSON.parse(match[1]),body=match[2];
  for(const key of ['slug','title','description','heading','status','page_type'])if(typeof meta[key]!=='string'||!meta[key].trim())throw new Error(`${filename}: missing ${key}`);
  if(!/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/.test(meta.slug))throw new Error(`${filename}: invalid route`);
  if(!['draft','needs_review','published'].includes(meta.status))throw new Error(`${filename}: invalid status`);
  if(!['product','guide','use_case','utility'].includes(meta.page_type))throw new Error(`${filename}: invalid page type`);
  if(meta.status==='published'&&(meta.claims_verified!==true||meta.cta_verified!==true||!meta.reviewed_by||!meta.reviewed_at||!Array.isArray(meta.sources)||!meta.sources.length))throw new Error(`${filename}: publication evidence is incomplete`);
  if(meta.status==='published'&&/(?:\bTODO\b|\bTBD\b|\{\{[^}]+\}\})/.test(body))throw new Error(`${filename}: unresolved draft placeholder`);
  const tokens=marked.lexer(body);
  marked.walkTokens(tokens,token=>{
    if(token.type==='html')throw new Error(`${filename}: raw HTML is not allowed`);
    if(token.type==='image')throw new Error(`${filename}: images need a reviewed template first`);
    if(token.type==='heading'&&token.depth===1)throw new Error(`${filename}: H1 comes from the template`);
    if(token.type==='link')validateLink(token.href);
  });
  validatePresentation(meta);
  return {meta,body,html:marked.parser(tokens)};
}
export function renderPage(page,template,preview,guides=[]){
  const {meta,html}=page;
  const crumbs=[{name:'Home',url:origin+'/'}];
  if(meta.slug.startsWith('/resources/')&&meta.slug!=='/resources/')crumbs.push({name:'Resources',url:origin+'/resources/'});
  crumbs.push({name:meta.presentation?.breadcrumb||meta.heading,url:origin+meta.slug});
  const breadcrumbs='<nav class="breadcrumbs" aria-label="Breadcrumb">'+crumbs.map((crumb,index)=>index===crumbs.length-1?'<span aria-current="page">'+escapeHTML(crumb.name)+'</span>':'<a href="'+escapeHTML(new URL(crumb.url).pathname)+'">'+escapeHTML(crumb.name)+'</a>').join('<span aria-hidden="true"> / </span>')+'</nav>';
  const schema=[{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:crumbs.map((crumb,index)=>({'@type':'ListItem',position:index+1,name:crumb.name,item:crumb.url}))}];
  if(meta.page_type==='guide')schema.push({
    '@context':'https://schema.org','@type':'Article',
    headline:meta.heading,description:meta.description,
    mainEntityOfPage:origin+meta.slug,inLanguage:'en',
    publisher:{'@type':'Organization',name:'FluentCare',url:origin+'/'},
    ...(meta.presentation?.image?{image:origin+meta.presentation.image.src}:{})
  });
  const structuredData=schema.map(data=>'<script type="application/ld+json">'+JSON.stringify(data).replace(/</g,'\\u003c')+'</script>').join('');
  const values={TITLE:escapeHTML(meta.title),DESCRIPTION:escapeHTML(meta.description),HEADING:escapeHTML(meta.heading),PAGE_TYPE:escapeHTML(meta.page_type),CANONICAL:origin+meta.slug,ROBOTS:preview?'noindex,nofollow':'index,follow',BODY:html,PAGE_CONTENT:renderVisualPage(page,breadcrumbs,guides),BREADCRUMBS:breadcrumbs,STRUCTURED_DATA:structuredData,PREVIEW:preview?'<div class="editorial-preview">Draft preview · publication review pending</div>':''};
  return template.replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>{if(!(key in values))throw new Error(`Unknown template field ${key}`);return values[key];});
}
export function sitemap(slugs){return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+slugs.map(slug=>`  <url><loc>${origin}${slug}</loc></url>`).join('\n')+'\n</urlset>\n';}
export function validatePageLinks(documents){
  for(const [slug,html] of documents){
    for(const match of html.matchAll(/href="([^"]+)"/g)){
      const href=match[1].replace(/&amp;/g,'&');const url=new URL(href,origin+slug);
      if(url.origin!==origin)continue;
      if(!documents.has(url.pathname))throw new Error(`${slug}: unpublished or broken internal route ${url.pathname}`);
      if(url.hash){const id=decodeURIComponent(url.hash.slice(1));if(![...documents.get(url.pathname).matchAll(/id="([^"]+)"/g)].some(m=>m[1]===id))throw new Error(`${slug}: missing fragment ${url.hash}`);}
    }
  }
}
export async function build({includeDrafts=false}={}){
  const dist=join(root,'dist'),output=includeDrafts?join(root,'.preview'):dist;
  const files=(await readdir(join(root,'content','pages'))).filter(x=>x.endsWith('.md')).sort();
  const pages=[];const routes=new Set();
  for(const filename of files){const page=parsePage(await readFile(join(root,'content','pages',filename),'utf8'),filename);if(routes.has(page.meta.slug))throw new Error('Duplicate owning route '+page.meta.slug);routes.add(page.meta.slug);pages.push(page);}
  const template=await readFile(join(root,'templates','page.html'),'utf8');
  let prior=[];try{prior=JSON.parse(await readFile(join(dist,'content-manifest.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!Array.isArray(prior)||prior.some(slug=>!/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/.test(slug)))throw new Error('Invalid generated-page manifest');
  const selected=pages.filter(p=>includeDrafts||p.meta.status==='published');
  const imageOwners=new Map();
  for(const page of selected){
    const asset=page.meta.presentation?.image;if(!asset)continue;
    const digest=createHash('sha256').update(await readFile(join(dist,asset.src.slice(1)))).digest('hex');
    if(imageOwners.has(digest))throw new Error(`Repeated editorial image: ${page.meta.slug} and ${imageOwners.get(digest)}`);
    imageOwners.set(digest,page.meta.slug);
  }
  const guides=selected.filter(p=>p.meta.page_type==='guide'&&p.meta.status==='published');
  const documents=new Map([['/',await readFile(join(dist,'index.html'),'utf8')],...selected.map(page=>[page.meta.slug,renderPage(page,template,includeDrafts,guides)])]);
  // Stylesheets and canonical URLs aren't navigation. Check only actual page links.
  validatePageLinks(new Map([...documents].map(([slug,html])=>[slug,html.replace(/<head>[\s\S]*?<\/head>/,'')])));
  if(includeDrafts){await rm(output,{recursive:true,force:true});await cp(dist,output,{recursive:true});}
  for(const slug of prior)await rm(join(output,slug.slice(1)),{recursive:true,force:true});
  for(const page of selected){const directory=join(output,page.meta.slug.slice(1));await mkdir(directory,{recursive:true});await writeFile(join(directory,'index.html'),renderPage(page,template,includeDrafts,guides));}
  await writeFile(join(output,'content-manifest.json'),JSON.stringify(selected.map(p=>p.meta.slug),null,2)+'\n');
  await writeFile(join(output,'sitemap.xml'),sitemap(['/',...pages.filter(p=>p.meta.status==='published').map(p=>p.meta.slug)]));
  await writeFile(join(output,'robots.txt'),includeDrafts?'User-agent: *\nDisallow: /\n':'User-agent: *\nAllow: /\n\nSitemap: '+origin+'/sitemap.xml\n');
  if(includeDrafts){const home=await readFile(join(output,'index.html'),'utf8');await writeFile(join(output,'index.html'),home.replace('<head>','<head>\n  <meta name="robots" content="noindex,nofollow">'));}
  console.log(`${includeDrafts?'Preview':'Production'} output: ${selected.length} generated page(s); ${pages.filter(p=>p.meta.status!=='published').length} draft(s).`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await build({includeDrafts:process.argv.includes('--include-drafts')});
