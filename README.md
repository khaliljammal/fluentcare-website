# FluentCare website

The FluentCare marketing website for independent clinics and healthcare providers. Built with static HTML, CSS, and JavaScript, using FluentCare’s deep teal, warm white, mint, and yellow design system.

Includes responsive layouts, visual product cards, an animated illustrative conversation, an interactive app walkthrough, privacy information, expandable FAQs, and explicit current-release next steps.

## Preview locally

From the repository root, run:

```sh
python3 -m http.server 4173 --directory dist
```

Open http://localhost:4173. No installation or build step is needed.

## Files

- `dist/index.html` — page content and accessible structure
- `dist/styles.css` — brand styling, responsive layouts, and motion
- `dist/app.js` — conversation previews and app walkthrough
- `dist/clinic-conversation.jpg` — generated illustrative clinic photograph

## SEO and AI-authored content

The public site stays prebuilt in `dist/`, so the existing Vercel configuration does not need a new runtime or build service. The homepage has a www canonical URL, social metadata and factual Organization data. `robots.txt` references the generated sitemap.

For content development, use Node 20 or newer:

```sh
npm ci --ignore-scripts
npm run check:content
npm run build:content
npm run preview:content
```

`build:content` includes only pages whose front matter says `published`, with claim/CTA verification and a dated review record. Commit the generated `dist/` output with its source. The GitHub content check detects stale output on a pull request.

`preview:content` writes an ignored `.preview/` directory. It includes draft pages with `noindex,nofollow`, a draft banner and restrictive crawler rules. Do not deploy `.preview/` as the public output directory. Drafts are absent from the production sitemap and `dist/` routes.

Write pages in `content/pages/*.md`, using JSON front matter between `---` lines. Shared navigation and page metadata come from `templates/page.html`; article styling is in `dist/content.css`. Markdown supports headings, paragraphs, lists, tables and safe links. Raw HTML, images and duplicate H1s are rejected until their templates are reviewed.

Read `content/COPY.md` before an AI writing run. Supply verified product evidence and a page brief privately; keep internal plans, analytics configuration and confidential review evidence out of this public repository. Use only an approved public summary in published pages.

Website analytics uses explicit consent-controlled HTTP capture to the existing FluentCare PostHog project. `dist/analytics.mjs` permits fixed page/demo/CTA events on the production hostname only. It does not collect form contents, raw URLs, arbitrary referrers or conversation content; no SDK/autocapture/session replay/person profiles are enabled. App capture settings are unchanged. Read `DESIGN.md` and use the shared template for every new page.

## Add app download links

Add platform links to `/get-started/` only after the actual public listing URLs are verified. Extend the analytics event allowlist and payload tests before tracking store clicks. A store click is not a download.

Once the app is available, update the release notes and availability wording on the homepage and supporting pages.

## Publish

Serve the contents of `dist/` with a static website host. Keep the HTML, stylesheet, script, and image together; the page uses relative asset URLs.

For Vercel, import this repository with the project root set to the repository root. `vercel.json` selects `dist/` as the output directory and skips installation and build commands. Use `main` as the production branch.


## Content notes

The conversation and app walkthrough are illustrative previews. They do not process microphone audio or perform live translation. The clinic photograph is generated imagery, not a patient testimonial.

Review healthcare compliance and privacy wording against final launch documentation before public launch. The page distinguishes FluentCare’s recording/transcript storage from provider processing and account/usage retention, and preserves qualified interpreter guidance.

Reduced-motion preferences are respected. Core content, FAQs, and legal links remain accessible without JavaScript.
