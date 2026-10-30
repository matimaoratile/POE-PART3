# Church Square Stationers

A small business website for a stationery, printing and binding shop in Pretoria Central.

- **Live site:** `https://church-square-stationers.netlify.app` *(replace with your deployed URL)*
- **Repository:** `https://github.com/YOUR-USERNAME/YOUR-REPO` *(replace with your repository link)*

---

## 1. Project structure

```
.
├── index2.html          Home page (tabs, gallery + lightbox, FAQ accordion, reveal animations)
├── products.html        Product catalogue (dynamic loading, search, filter, sort, quick-view modal)
├── enquiry.html         Print & binding enquiry form with AJAX quote
├── contact.html         Contact form (compiled into an email) + interactive Leaflet map
├── 404.html             Custom "page not found" page
├── service.html         (from Parts 1 and 2)
├── about.html           (from Parts 1 and 2)
├── robots.txt           Crawler instructions
├── sitemap.xml          Site structure for search engines
├── _headers             Security + caching headers (Netlify)
├── _redirects           Serves index2.html at the bare domain (Netlify)
├── assets/
│   ├── css/styles.css   Compiled Tailwind CSS + custom styles (generated, do not edit by hand)
│   ├── js/main.js       Menu, animations, accordion, tabs, modal, lightbox, map, share button
│   ├── js/products.js   Product loading, search, filter, sort
│   ├── js/forms.js      Validation, AJAX quote, email compilation
│   ├── images/          Gallery images (SVG), favicon, social share image
│   └── vendor/leaflet/  Leaflet 1.9.4 (map library, hosted locally)
├── data/
│   ├── products.json    Product catalogue (loaded with fetch)
│   ├── pricing.json     Printing and binding rates (loaded with fetch)
│   └── fallback-data.js Copy of both JSON files, used only if fetch is blocked
├── src/input.css        Source for the compiled stylesheet
├── tailwind.config.js   Tailwind colours and fonts
└── package.json         `npm run build:css` rebuilds assets/css/styles.css
```

## 2. Running the site locally

`fetch()` needs a web server, so do not double-click the HTML files. Use either:

- **VS Code:** install the *Live Server* extension, right-click `index2.html` and choose *Open with Live Server*, or
- **Terminal:** run `python -m http.server 8000` in this folder and open `http://localhost:8000/index2.html`.

If a page is opened straight from the file system anyway, the products and quote tool still work because they fall back to `data/fallback-data.js`.

**Changing styles:** if you add new Tailwind classes to any `.html` or `.js` file, run `npm install` once and then `npm run build:css` to regenerate `assets/css/styles.css`.

## 3. Part 3 features

### 3.1 JavaScript enhancements

| Requirement | Where | How it works |
|---|---|---|
| Accordion | `index2.html` (FAQ) | Buttons toggle `aria-expanded` and a `data-open` attribute; CSS animates the panel height. Only one answer is open at a time. |
| Tabs | `index2.html` (Services at a glance) | `role="tablist"` pattern with click and arrow-key navigation (`main.js`). |
| Modal | `products.html` (Quick view) | A shared overlay engine opens and closes dialogs, traps focus inside, closes on Esc or backdrop click, and returns focus to the button that opened it. |
| Interactive map | `contact.html` | Leaflet with OpenStreetMap tiles, a marker and popup, a "How far am I?" button (Geolocation API + haversine distance) and a directions link. |
| Animations and transitions | All pages | Scroll-reveal using `IntersectionObserver`, accordion/tab/modal transitions, card hover lift, loading spinner. All are switched off for visitors who prefer reduced motion. |
| Advanced DOM manipulation | `main.js`, `products.js`, `forms.js` | Elements are built with a small `el()` helper using `createElement` and `textContent` (never `innerHTML`), event delegation on the category chips, `replaceChildren`, and `URLSearchParams` + `history.replaceState` to keep filters in the URL. |
| Gallery with lightbox | `index2.html` | Six images open in a lightbox with previous/next buttons, arrow keys, captions and a counter. Without JavaScript the links still open the full image. |

### 3.2 Dynamic content

- **Dynamic loading:** `products.js` loads `data/products.json` with `fetch()` and renders every product card with JavaScript.
- **Search, filter and sort:** the search box matches names, descriptions, categories and tags (all words must match); category chips filter; the sort menu orders by price or name. The result count updates and a friendly "no results" state offers to clear filters.

### 3.3 Forms

**`enquiry.html` (purpose: get a cost and availability estimate)**
- Fields: name, email, phone, service, paper size, sides, pages, copies, binding, student discount, turnaround, needed-by date, notes, consent.
- After validation the form loads `data/pricing.json` with AJAX, calculates the price (including A3 multiplier, double-sided discount, student discount, express surcharge) and shows the **estimated cost and ready date**. Working days skip weekends, express jobs close at 14:00, and the page warns if the job cannot meet the requested date.

**`contact.html` (purpose: send a general message)**
- Fields: name, email, optional phone, message type, subject, message (20 to 1 000 characters with live counter), consent, and a hidden honeypot field to catch spam bots.
- After validation the details are **compiled into an email** for the recipient set in `assets/js/forms.js` (`CONFIG.RECIPIENT_EMAIL`). The visitor sees a preview and can open it in their email app, copy it, or go back and edit. The form's `action` attribute is also a `mailto:` link so it still works without JavaScript.
- Optional AJAX sending: paste a form-service URL (for example Formspree) into `CONFIG.CONTACT_ENDPOINT` and the message is sent with `fetch()` instead.

**Validation (both forms)**
- HTML5 attributes (`required`, `type`, `min`, `max`, `maxlength`, `pattern`) describe each field, and JavaScript performs the actual checks (`novalidate` is set so the messages are consistent).
- Rules: required fields, name characters, email format, South African phone numbers (`082 123 4567` or `+27 82 123 4567`), whole-number ranges, character lengths, dates (not in the past, within 12 months) and required checkboxes.
- Errors appear beside each field (`aria-invalid` + linked message), an error summary appears at the top, focus moves to the first invalid field, and errors clear as soon as the value is fixed.

## 4. Search Engine Optimisation

### 4.1 Keyword research

| Page | Primary keyword | Supporting keywords |
|---|---|---|
| Home | stationery Pretoria Central | printing Pretoria CBD, document binding Pretoria, student printing, colour printing |
| Products | stationery and office supplies Pretoria | notebooks, pens, lever arch files, student stationery |
| Enquiry | printing quote Pretoria | binding prices, colour printing cost, express printing, student discount |
| Contact | stationery shop Pretoria Central | Paul Kruger Street, directions, contact printing shop |

Keywords were chosen from what a local customer would type (service + place) and are used naturally in titles, headings, intro text, alt text and link text. They were not verified with a keyword tool, so test them in Google Search Console after launch.

### 4.2 On-page SEO

- **Title tags** (47 to 57 characters) and **meta descriptions** (135 to 143 characters) are unique on every page.
- **Headings:** one `<h1>` per page, with `<h2>` and `<h3>` forming a clear outline.
- **Images:** descriptive file names (`spiral-document-binding.svg`) and meaningful `alt` text, plus `width`/`height` and `loading="lazy"`.
- **URLs:** short, lowercase and descriptive (`products.html`, `enquiry.html`). The old `print order.html` (which contained a space, encoded as `%20`) is replaced by `enquiry.html`.
- **Internal linking:** the main menu, footer, breadcrumbs, call-to-action buttons, FAQ answers and product quick-view all link between pages with descriptive link text.
- **Mobile-friendliness:** responsive layouts, a viewport tag, a mobile menu with `aria-expanded`, and touch-sized controls.
- **Extras:** canonical links, Open Graph/Twitter tags with a 1200 x 630 share image, `lang="en-ZA"`, `schema.org` structured data (`Store` on the home page, `CollectionPage` on products) and a skip link and landmarks for accessibility.

### 4.3 Off-page SEO (plan)

These activities happen outside the code and are planned rather than completed:

- **Backlinks:** ask the Pretoria Central business forum, nearby offices and university student bodies to link to the site; list the shop in reputable local directories; offer a student-discount partnership page to campus societies.
- **Social media:** share the site on a business Facebook and Instagram page (the footer "Share this page" button uses the Web Share API, with a copy-link fallback).
- **Local SEO:** claim a Google Business Profile with the Paul Kruger Street address, opening hours and photos; keep the name, address and phone number identical everywhere; ask happy customers for reviews.

### 4.4 `robots.txt` and `sitemap.xml`

- `robots.txt` allows crawling, blocks `/src/`, `/node_modules/` and the 404 page, and points to the sitemap.
- `sitemap.xml` lists every public page with `lastmod`, `changefreq` and `priority`. Submit it in Google Search Console after deploying.
- Replace `https://church-square-stationers.netlify.app` with the real URL in `sitemap.xml`, `robots.txt` and the `<link rel="canonical">`/Open Graph tags (a find-and-replace across the project does it).

### 4.5 Page speed

- Compiled, minified Tailwind CSS (about 17 KB) replaces the in-browser Tailwind CDN script on the new pages, which removes a large render-blocking download.
- All scripts use `defer`; Leaflet is loaded only on the contact page; images are lazy-loaded SVGs with fixed dimensions to avoid layout shift.
- Fonts use `preconnect` and `display=swap`; static files are cached through `_headers`.
- To speed up `service.html` and `about.html` as well, replace their Tailwind CDN `<script>` tags with `<link rel="stylesheet" href="assets/css/styles.css">` and run `npm run build:css` (the build scans every `.html` file in the folder).

### 4.6 Security

- **Strict Content-Security-Policy** in `_headers` (scripts only from this site, no inline scripts, no `eval`), plus `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy` and HSTS.
- **No `innerHTML` with user or data input:** text is inserted with `textContent`, which prevents cross-site scripting. Values placed in `mailto:` links are encoded with `encodeURIComponent`.
- **Input validation** on every form field and a **honeypot** against spam bots.
- **External links** that open a new tab use `rel="noopener noreferrer"`.
- Leaflet is served from this project instead of a third-party CDN, so no external script can be swapped in.
- GitHub Pages ignores `_headers`; Netlify applies it automatically. HTTPS is enabled by default on both.

## 5. Deployment

### Netlify (recommended)

1. Push this project to your GitHub repository (see section 6).
2. In Netlify choose **Add new site → Import an existing project**, connect GitHub and select the repository.
3. Leave the build command empty and set the publish directory to `.` (the compiled CSS is already committed), then deploy.
4. Under **Site configuration → Change site name** pick a name, then update the placeholder URL as described in 4.4.
5. Visit `/robots.txt`, `/sitemap.xml` and a missing page (to confirm `404.html` appears), then check security headers at securityheaders.com.

### GitHub Pages (alternative)

1. Repository **Settings → Pages**, deploy from the `main` branch, root folder.
2. GitHub Pages looks for `index.html`, so either rename `index2.html` to `index.html` (and update the links, canonical and sitemap) or copy it and set the canonical tag to the page you want indexed.
3. `_headers` and `_redirects` are ignored there, and `robots.txt` is only honoured at the root of a domain.

## 6. Git workflow used

```
git add .
git commit -m "Add changelog, references and Part 3 documentation to README"
git push origin main
```

Commit in small steps, for example: *Add compiled stylesheet and shared scripts*, *Add products page with dynamic search*, *Add enquiry form with AJAX quote and validation*, *Add contact form and Leaflet map*, *Add SEO files (robots, sitemap, structured data)*, *Add security headers*.

## 7. Settings to review before submitting

These values are sample content or placeholders. Check each one:

| What | Where |
|---|---|
| Deployed site URL | `sitemap.xml`, `robots.txt`, canonical and Open Graph tags in every page |
| Recipient email (`info@churchsquarestationers.co.za`) | `assets/js/forms.js` (`CONFIG`), `contact.html`, footer of every page |
| Printing and binding prices, discount and express rules | `data/pricing.json` (then update `data/fallback-data.js` and the "from" prices on the home page) |
| Product list and prices | `data/products.json` (then update `data/fallback-data.js`) |
| Shop coordinates (currently Church Square) | `assets/js/main.js` (`store`), directions link in `contact.html`, `geo` in the home page structured data |
| FAQ answers and turnaround times | `index2.html` |
| Gallery pictures (illustrated placeholders) | `assets/images/`, replace with real photos and keep descriptive file names and alt text |

---

## 8. Changelog

### Part 3 additions

| Date | File(s) | Change |
|---|---|---|
| 2026-10-30 | `assets/js/main.js` | Added shared interactions: accessible mobile menu, scroll-reveal animation, accordion, tabs, modal/overlay engine with focus trap, gallery lightbox, Leaflet map with geolocation distance, share button. |
| 2026-10-30 | `index2.html` | Added "Our Services at a Glance" tabs, gallery with lightbox, FAQ accordion and reveal animations. Updated all links to the new pages. |
| 2026-10-30 | `products.html`, `assets/js/products.js`, `data/products.json` | New dynamic product catalogue loaded with `fetch()`, with search, category filter, sort, URL-synced filters and a quick-view modal. |
| 2026-10-30 | `enquiry.html`, `assets/js/forms.js`, `data/pricing.json` | New enquiry form with HTML5 + JavaScript validation and an AJAX price and availability estimate. |
| 2026-10-30 | `contact.html`, `assets/js/forms.js` | New contact form with validation, honeypot and email compilation; added Leaflet map, directions link and distance checker. |
| 2026-10-30 | `index2.html`, `products.html`, `enquiry.html`, `contact.html`, `404.html` | Added unique titles and meta descriptions, canonical links, Open Graph/Twitter tags, structured data, breadcrumbs, skip link and semantic landmarks. |
| 2026-10-30 | `robots.txt`, `sitemap.xml` | Added crawler instructions and a sitemap. |
| 2026-10-30 | `_headers`, `_redirects` | Added security and caching headers and a redirect from the bare domain to `index2.html`. |
| 2026-10-30 | `src/input.css`, `tailwind.config.js`, `assets/css/styles.css` | Replaced the runtime Tailwind CDN script with compiled CSS for speed and a stricter security policy. |
| 2026-10-30 | `404.html` | Added a custom not-found page. |

### Changes made from Part 2 feedback

> **Complete this table with your lecturer's actual Part 2 feedback.** Use one row per comment, quote or paraphrase the feedback, and describe exactly what you changed and in which file. The lecturer should be able to find each change from this table alone.

| Date | Feedback received (Part 2) | File(s) changed | What I changed and why |
|---|---|---|---|
| | *(paste or summarise feedback point 1)* | | |
| | *(paste or summarise feedback point 2)* | | |
| | *(paste or summarise feedback point 3)* | | |

### Other improvements made while reviewing the Part 2 home page

| Date | File(s) | Improvement |
|---|---|---|
| 2026-10-30 | `index2.html` | The quote page was linked as `print order.html`, a file name containing a space that becomes `print%20order.html` in the address bar. The link now points to `enquiry.html`. |
| 2026-10-30 | `index2.html` | Added `<main>`, `<nav aria-label>`, `<address>` and a skip link, so screen-reader and keyboard users can navigate the page. |
| 2026-10-30 | `index2.html` | Added a meta description, `lang="en-ZA"`, a canonical link and decorative-emoji `aria-hidden` attributes. |
| 2026-10-30 | `index2.html` | Mobile menu button now reports `aria-expanded` and changes its label when opened. |
| 2026-10-30 | `index2.html` | "Products" now links to `products.html` (the new searchable catalogue). |

---

## 9. References

*Convert these to the referencing style required by your institution and add the date you accessed each source.*

- Anthropic (n.d.) Claude [AI assistant]. Used to help generate and test the code in this project. Available at: https://claude.ai
- Agafonkin, V. (n.d.) *Leaflet: an open-source JavaScript library for mobile-friendly interactive maps*. Available at: https://leafletjs.com/
- OpenStreetMap contributors (n.d.) *OpenStreetMap copyright and licence*. Available at: https://www.openstreetmap.org/copyright
- Tailwind Labs (n.d.) *Tailwind CSS documentation*. Available at: https://tailwindcss.com/docs
- Google (n.d.) *Google Fonts: Merriweather and Open Sans*. Available at: https://fonts.google.com/
- Mozilla (n.d.) *Fetch API*. MDN Web Docs. Available at: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- Mozilla (n.d.) *Intersection Observer API*. MDN Web Docs. Available at: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
- Mozilla (n.d.) *Client-side form validation*. MDN Web Docs. Available at: https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation
- Mozilla (n.d.) *Geolocation API*. MDN Web Docs. Available at: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
- Mozilla (n.d.) *Web Share API*. MDN Web Docs. Available at: https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API
- W3C Web Accessibility Initiative (n.d.) *ARIA Authoring Practices Guide: Tabs, Accordion and Dialog (Modal) patterns*. Available at: https://www.w3.org/WAI/ARIA/apg/patterns/
- Google (n.d.) *Search Engine Optimization (SEO) Starter Guide*. Google Search Central. Available at: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google (n.d.) *Introduction to robots.txt*. Google Search Central. Available at: https://developers.google.com/search/docs/crawling-indexing/robots/intro
- Sitemaps.org (n.d.) *Sitemaps XML format*. Available at: https://www.sitemaps.org/protocol.html
- Schema.org (n.d.) *Store*. Available at: https://schema.org/Store
- OWASP Foundation (n.d.) *OWASP Secure Headers Project*. Available at: https://owasp.org/www-project-secure-headers/
- Netlify (n.d.) *Custom headers* and *Redirects and rewrites*. Netlify Docs. Available at: https://docs.netlify.com/
- GitHub (n.d.) *GitHub Pages documentation*. Available at: https://docs.github.com/en/pages
