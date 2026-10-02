# FluentCare website

The download-focused FluentCare landing page for independent clinics and healthcare providers. Built with static HTML, CSS, and JavaScript, using FluentCare’s deep teal, warm white, mint, and yellow design system.

Includes responsive layouts, visual product cards, an animated illustrative conversation, an interactive app walkthrough, privacy information, expandable FAQs, and app download options.

## Preview locally

From the repository root, run:

```sh
python3 -m http.server 4173 --directory dist
```

Open http://localhost:4173. No installation or build step is needed.

## Files

- `dist/index.html` — page content and accessible structure
- `dist/styles.css` — brand styling, responsive layouts, and motion
- `dist/app.js` — download options, conversation previews, and app walkthrough
- `dist/clinic-conversation.jpg` — generated illustrative clinic photograph

## Add app download links

Set the verified App Store and Google Play URLs in `DOWNLOAD_LINKS` at the top of `dist/app.js`. The download dialog automatically shows buttons for configured platforms.

Once the app is available, also update the “coming soon” note near the final download button and the availability FAQ in `dist/index.html`.

## Publish

Serve the contents of `dist/` with a static website host. Keep the HTML, stylesheet, script, and image together; the page uses relative asset URLs.

Current private review site: https://fluentcare-clinic-landing.ambula-healt-8265.chatgpt.site/

## Content notes

The conversation and app walkthrough are illustrative previews. They do not process microphone audio or perform live translation. The clinic photograph is generated imagery, not a patient testimonial.

Review healthcare compliance and privacy wording against final launch documentation before public launch. The page distinguishes FluentCare’s recording/transcript storage from provider processing and account/usage retention, and preserves qualified interpreter guidance.

Reduced-motion preferences are respected. Core content, FAQs, and legal links remain accessible without JavaScript.
