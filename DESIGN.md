# FluentCare website design system

Use this with `content/COPY.md` for every AI-authored page. The existing homepage establishes the brand; articles extend its shared styles.

## Shared foundations

`dist/styles.css` is the source of truth. Every page loads it before `dist/content.css`, which adds the reading layout without replacing the brand.

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#123B3A` | Main text, dark surfaces |
| `--deep` | `#092A29` | Strong emphasis |
| `--paper` | `#F8F9F5` | Page background |
| `--muted` | `#526967` | Supporting text |
| `--line` | `#D8E1DC` | Dividers and borders |
| `--mint` | `#E7F0EA` | Quiet support surfaces |
| `--yellow` | `#F2D875` | Primary action and accents |
| `--white` | `#fff` | Cards and contrasting text |
| `--font` | Inter, system sans-serif fallback | All text and controls |

Use tokens rather than adding a page-specific palette or font. Inter uses the existing system fallback when unavailable; do not add a font service solely for an article.

## Components and layouts

- Shared brand mark, `.site-header`, `.nav`, `.site-footer`, `.eyebrow`, `.skip`, `.button`, `.button.small` and `.text-link` come from `styles.css`.
- `templates/page.html` supplies metadata, shared navigation, footer and the single H1 for generated pages. Authors supply Markdown body content only.
- Product and guide pages use `.content-page`: an 850px outer reading layout with a 700px body, 18px desktop text and 17px phone text. Headings scale for the reading layout while preserving the brand font, teal color and tight spacing.
- Use paragraphs, descriptive links, H2/H3, lists and small comparison tables. No inline HTML, page-specific CSS, arbitrary images or a second H1 in Markdown.
- Commercial pages have a real next-step link. Keep the yellow primary button style consistent with the homepage. Do not make unavailable store links look active.
- Breadcrumbs use the same muted text and meaningful linked route names. A guide’s parent is Resources.
- The optional analytics choice uses the existing paper, teal, divider and rounded-control styles. Allow and No thanks have equal readable controls; neither blocks access to content.

## Responsive and accessible behavior

The shared layout uses existing 1100, 800, 500 and 400px responsive breakpoints. On phones, navigation wraps onto its own row and stays visible. Reading pages use 20px side padding. Avoid outer-page horizontal scrolling.

Use semantic navigation, one H1, a working skip link, explicit button labels and visible keyboard focus. Respect reduced-motion preferences. Tables must remain readable at 390px. Test the page at both desktop and phone widths before review.

## AI review checklist

1. Read this file and `content/COPY.md` before drafting.
2. Use the shared template; do not generate a standalone visual design for an article.
3. Confirm both shared stylesheets load, the header/footer match, and color/font tokens are inherited.
4. Check metadata, links, single H1 and mobile overflow.
5. Keep a reviewed preview with the release record. A build marked `published` is eligible for the proposed release; production publication happens only after its change is merged and verified.
