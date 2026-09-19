# Nazar Sementsov, Art Director Portfolio

Static site. No build step, no framework, no npm install. Open the `.html`
files in any editor, change the text, save, refresh the browser.

```
index.html      Gallery landing, hero, credibility strip, selected work
work.html       Full archive, filters + grid/index view toggle
about.html      Bio, capabilities, clients, recognition
resume.html     Editorial résumé (Cmd+P prints clean to PDF)
project.html    Case-study template, duplicate once per project
assets/css/style.css   All styling. Design tokens at the top.
assets/css/fonts.css   Self-hosted webfonts
assets/js/main.js      Filters, scroll reveals, hover preview
assets/img/            Placeholder images, replace these
```

## Run it locally

```bash
python3 -m http.server 8000
```
Then open <http://localhost:8000>.

---

## 1. Replace the placeholders

Every placeholder is a literal string you can find-and-replace across all files.

| Find | Replace with |
|---|---|
| `Campaign Title Here` / `Project Title Here` | Real project names |
| `The one-line idea, in plain English.` | **The actual idea. See below.** |
| `Client Name` | Real client |
| `yourhandle` | Your LinkedIn and Instagram handles |

Your name, email and phone are already filled in from your résumé.

**One command to rename everything** (run from the project folder):

```bash
# macOS
sed -i '' 's/Client Name/Real Client/g' *.html
```

### Images
Drop your files into `assets/img/` and either use the same filenames
(`work-01.jpg` etc.) or update the `src="..."` in the HTML.

- Gallery covers: **1600×1200** (landscape) or **1200×1500** (portrait)
- Case-study hero: **1920×1080**
- Export JPG at ~75% quality. Keep each file under ~400KB.

### Link preview image
Add `assets/img/og-image.jpg` at **1200×630**. This is the card that shows
when someone pastes your URL into Slack or iMessage, for a recruiter
forwarding you to a creative director, it is your first impression.

### Résumé PDF
Drop your PDF at `assets/Nazar-Sementsov-Resume.pdf` and the Download button
on `resume.html` works. Or just print that page to PDF, it has a print
stylesheet that strips the nav and footer.

---

## 2. Writing the idea line

This is the highest-leverage text on the site. It appears on every gallery
tile, and it is what a creative director reads before deciding to click.

> ❌ "Brand identity refresh and campaign rollout"
> ✅ "We turned parking tickets into donation receipts."

Rules: plain English, one sentence, no design vocabulary, and something a
stranger could repeat at a bar. If you can't say it that way, the idea
isn't finished yet.

---

## 3. Adding a project

1. Copy `project.html` → `project-grammys.html`
2. Fill in the brief / insight / idea / execution sections
3. **Fill in the `My role` field honestly**, at agency level they will ask
   what you actually did. "Art Director, social campaign" beats a vague credit.
4. Link to it from `index.html` and `work.html` (`href="project-grammys.html"`)

---

## 4. Restyling

Everything lives in the `:root` block at the top of `assets/css/style.css`.

```css
--paper:  #F2F0EA;   /* background     */
--ink:    #14130F;   /* text           */
--accent: #FF3B14;   /* the one signal colour, change this first */
```

The site is a single light palette by design, one background means every
image you upload only has to be colour-corrected once.

To drop the asymmetric gallery rhythm on the landing page, add
`gallery--uniform` to the `<div class="gallery">`, the same class the
work archive uses.

---

## 5. Deploying

The site is fully self-contained (fonts included), so any static host works.

**Netlify / Vercel**, drag the folder onto their dashboard. Done.

**GitHub Pages**, Settings → Pages → Deploy from branch → select the branch,
root folder. The `.nojekyll` file is already there so `assets/` serves correctly.

**Custom domain**, you already own `nazarsementsov.com`. Point it at whichever
host you pick; all three have one-click custom domain setup.

---

## Notes on craft

- Fonts are self-hosted (`assets/fonts/`), so there is no third-party request
  and no font flash. Don't swap them back to a Google Fonts `<link>`, it's
  slower.
- One typeface, Inter Tight, shipping as a single variable font file covering
  every weight. Hierarchy comes from weight and scale, not a second family.
- Images use `loading="lazy"` below the fold.
- All motion respects `prefers-reduced-motion`.
