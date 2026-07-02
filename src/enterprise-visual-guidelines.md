# ACKO Enterprise — visual generation guidelines

Canonical rules for **AI hero images** (OpenAI Images API) and **carousel visual planning** in the Enterprise Socials studio.

- Poster **layout** (columns, padding, export sizes): `.cursor/rules/acko-social-poster-layout.mdc`
- Poster **copy**: `src/enterprise-content-guidelines.md`
- **Runtime:** `openaiHeroImage.ts` and `openaiStudioContent.ts` import this file and append it to image and carousel-plan prompts.

---

## 1. Scope

- **In scope:** Right-column hero artwork for LinkedIn B2B posters and carousel slides; optional Freepik path (`freepikHeroImage.ts`).
- **Out of scope:** In-app studio chrome, poster typography, headline line-breaking, logo assets (`acko-poster-logo-strict.mdc`).
- **Product rule:** One main visual per export; copy and logo are composited separately—heroes are **pure artwork**, not full poster mocks.

---

## 2. Global rules (every generated image)

### 2.1 Role of the hero

- Single hero artwork for the **right column** of a LinkedIn B2B poster (carousel: same column logic on a square slide).
- **No** poster layout, mock UI frame, second column, or typography block in the image.
- One clear focal cluster; minimal clutter; insurance-grade polish.
- Leave generous **side margin** (empty or transparent) for the text column beside the hero.

### 2.2 Compliance and brand (India B2B insurance / fintech)

- No exaggerated guarantees, fear-mongering, or invented statistics.
- No impersonation of regulators or government marks.
- No misleading “before/after” savings claims.
- ACKO for Business tone: trustworthy, inclusive, modern India enterprise context where relevant; **premium and restrained**.

### 2.3 No typography in the image (critical)

Do not render: letters, digits, words, slogans, logos, watermarks, captions, speech bubbles, charts with labels, app UI with strings, road signs, packaging with type, or infographic copy.

Headlines, subheads, CTA, and hashtags are added by the product overlay. Express ideas through **metaphor, objects, light, and composition only**.

### 2.4 Production quality

- Polished paid-social asset: sharp coherent forms, clean edges, stable lighting.
- No muddy noise, compression smear, melted geometry, duplicated limbs.
- No random glyph streaks, QR codes, or watermarks.
- One intentional hero cluster—avoid generic stock collage.
- Use **one visual language end-to-end**—do not collage mismatched styles (e.g. flat icons on photoreal scraps).

### 2.7 Illustration quality bar (when output is illustrative)

Whenever the hero uses **editorial / stylized 2D illustration** (§4.3, `stylizedIllustration`, or carousel illustration family in §6.2), the model must deliver a **very high quality illustration**—not a rough sketch, not clip-art, not a low-fidelity placeholder.

**Required craft:**

- **Resolution of intent:** Deliberate composition, clear focal hierarchy, controlled negative space—reads as commissioned brand illustration, not auto-generated filler.
- **Finish:** Clean confident linework or shape edges; intentional colour (layered flat fills, subtle gradients, or refined digital paint)—no muddy blending, no unfinished patches, no visible compression artifacts.
- **Depth and polish:** Thoughtful lighting on forms (even in flat styles), consistent perspective within the scene, harmonious palette anchored to ACKO enterprise mood (purple / teal accents on foreground only per §2.6).
- **Character of style:** Premium B2B editorial—closer to top-tier fintech/insurance campaign art than generic “AI illustration” tropes (over-simplified icons, random blobs, incoherent metaphors).
- **Export readiness:** Crisp at LinkedIn poster sizes; no softness that collapses when scaled beside sharp type.

**Avoid:** childish flat mascots, stick figures, meme aesthetics, noisy grain used to hide weak drawing, duplicate elements, or “good enough” draft quality.

### 2.5 Background and compositing

**When the image model supports API transparency** (`gpt-image-1`, `gpt-image-1-mini`, `gpt-image-1.5`):

- Fully transparent background behind the subject.
- Soft edge feather into transparency; no checkerboard, frame, vignette, or painted “card” behind the subject.
- One isolated focal cluster centred with breathing room; edges may softly fade to transparent.

**When the model does not** (default `gpt-image-2`):

- Uniform flat pure white `#FFFFFF` behind the subject.
- No sky, horizon, room photo, or busy wallpaper.
- Cut-out friendly; soft feather toward white at edges is OK.
- Client may apply white-key transparency after generation (`finalizeHeroDataUrl`).

### 2.6 Theme and accent

- **Creative theme** `light` | `dark` sets overall mood for the poster the hero will sit on (runtime: appended per prompt).
- **Accent** tints foreground subjects/icons only—see `ACCENTS` in `posterTypes.ts` (runtime: appended per prompt).

---

## 3. Static poster — hero style slots

Non-carousel posters use four layout heroes via `buildLayoutAccentStrip`: `default`, `defaultAlt`, `stylizedIllustration`, `photorealHuman`. Type: `PosterHeroVisualStyle`.

| Style | Rule |
|--------|------|
| `default` | Standard non-photoreal; modality inferred from copy (§4). |
| `defaultAlt` | Second abstract hero—**different** focal metaphor, silhouette hierarchy, and framing than `default`; not palette-only tweaks. |
| `stylizedIllustration` | **Very high quality** premium **2D editorial illustration** only (§2.7)—not soft 3D CGI, not photoreal materials, not icon grids alone, not draft or clip-art quality. |
| `photorealHuman` | **Static posters only—never carousels.** See §5. |

### 3.1 Default non-photoreal (`default` / `defaultAlt`)

**Absolute — no real or photoreal humans:** no faces, eyes, skin, hair, hands as portraits, stock-photo people, person-specific silhouettes, mannequins, or dolls. Only non-human graphics: icons, abstract shapes, soft 3D objects, line illustration.

**Concept process:**

1. Read thematic keywords as the **marketing concept only**—not literal objects to spell or paste.
2. Infer one clear abstract idea for a LinkedIn B2B insurance post beside copy.
3. Render as a single cohesive hero cluster—**metaphorical**, not a literal headline illustration.

**Copy → image cueing:** Do not quote full headline/subhead (reduces painted type). Use keyword themes only (“never spell as text”). Empty-copy fallback: trust, momentum, protection, digital convenience, B2B insurance India.

---

## 4. Modality inference (`default` only)

Pick **exactly one** treatment from headline + subhead keyword scoring (`inferHeroVisualModality` in code).

### 4.1 Icons / line (`iconsLine`)

**Cue words (examples):** icon, icons, simple, minimal, line, linear, outline, pictogram, symbol, symbols, checklist, steps, ui, ux, dashboard, tile, tiles.

**Execution:** VISUAL EXECUTION — exactly ONE treatment: large flat or softly shaded icons plus clean line illustration (stroke-led, minimal fills). Icon-forward layout; no photoreal humans or 3D character heads—vector and line language only.

### 4.2 Soft 3D (`soft3d`)

**Cue words (examples):** digital, data, cloud, platform, software, api, tech, technology, automate, automation, scale, scalable, speed, network, connectivity, analytics, algorithm, stack, infrastructure, layer, online, app, apps, secure, shield, layered.

**Execution:** VISUAL EXECUTION — exactly ONE treatment: premium soft 3D / dimensional abstract forms and large symbolic objects (matte plastic, glass, metal). Large iconic volumes allowed. No photoreal humans, no faces, no hands, no dolls—only stylised non-human CGI.

### 4.3 Editorial illustration (`illustration`)

**Cue words (examples):** policy, policies, claims, coverage, premium, paperwork, document, documents, contract, contracts, risk, underwriting, compliance, broker, sme, enterprise, business, paper, process, workflow, b2b, partner, partnership, insurance, insure, friction, teams, team, health, fleet, employee, customer.

**Execution:** VISUAL EXECUTION — exactly ONE treatment: **very high quality** modern editorial illustration. Render as commissioned campaign art: refined flat colour blocks, controlled soft gradients, and/or light painted digital illustration with deliberate finish (see §2.7). Symbolic shapes and metaphors with clear storytelling; confident edges; premium B2B fintech–insurance polish. No photoreal humans, no faces—stylised 2D only. **Never** output rough sketches, clip-art, or low-fidelity “placeholder” illustration.

**Tie-break:** Prefer icons/line when tied highest; else soft 3D; else illustration.

---

## 5. Photoreal human (`photorealHuman`)

- **Carousel: forbidden.**
- PHOTOREAL HUMAN (this layout option only): include exactly ONE adult professional in a believable modern **Indian enterprise** setting (office, collaboration table, corridor walk-and-talk).
- Natural editorial lighting; mid-shot or wider; anonymised generic casting—no celebrity likeness, identifiable public figures, or minors.
- Workplace-appropriate attire; calm confident body language; environment supports B2B insurance narrative without clutter.
- Do not add a second person as co-subject; background figures must stay indistinct and not competing for attention.
- Infer mood from copy themes only (never spell as text); one visual treatment end-to-end—no collage of unrelated stock elements.

---

## 6. LinkedIn carousel — plan + images

### 6.1 Carousel plan fields (`visual_direction`, `composition`)

When generating the carousel JSON plan:

- **`visual_direction`:** Concrete scene—subjects, metaphors, setting. **No** typography, logos, UI strings, or letters. **Meaningfully different** every slide: different focal object, metaphor, and environment—not the same scene with palette tweaks.
- **`composition`:** Framing for **this slide only** (e.g. asymmetrical visual weight bottom-left, centred focal object with wide negative space). Must **vary** across slides.
- Full `plan` array is one campaign story; `visual_direction` + `composition` define a unique hero per slide in one premium B2B brand world.

### 6.2 Carousel image generation

Uses **plan row** direction—not headline token cues from `buildHeroImagePrompt`.

**Global style family:** Premium fintech–insurance illustration at **very high quality** (§2.7 when illustrative): either refined editorial 2D illustration **or** polished soft 3D / abstract dimensional forms—never both in one image. Deep purple gradient moods with mint / teal accent highlights; soft lighting; rounded minimal character shapes if any—never photoreal humans, no identifiable faces, no stock-photo people, no hands as portraits. Carousel slides that call for illustration must read as top-tier brand art, not draft AI filler.

**Per-slide uniqueness:** Slide *x* of *y* must differ in focal object, metaphor, setting, framing, and rhythm. No reuse with only colour/background tweaks; no repeated poses or layout structure.

**Neighbour slides:** Do not echo previous/next slide visual summaries when provided.

Apply all §2 global rules. Story beat, primary scene direction, and composition for this slide only are supplied at runtime in the prompt.

---

## 7. API and technical defaults

| Setting | Default |
|---------|---------|
| OpenAI image model | `gpt-image-2` (`VITE_OPENAI_IMAGE_MODEL` to override) |
| Quality | `high` for `gpt-image-2`; `medium` for other GPT Image models; never `low` |
| Landscape (GPT Image) | 1536×1024 |
| Square / carousel | 1024×1024 |
| Vertical | 1024×1536 |
| Prompt max length | 8000 characters |

---

## 8. Freepik (optional provider)

If using `buildFreepikHeroImagePrompt`:

- Lead scene from headline/subhead metaphors; match poster canvas mood (light/dark).
- Keep **top-right** visually quiet (~¼ width, upper third) for logo overlay.
- No readable letters, numbers, logos, or UI chrome.
- Negative prompt: exclude watermarks, typography, generic cluttered stock, white studio cutout clichés.

---

## 9. Export placement (not generation)

- Two-column with hero: **60%** text, **40%** one hero only (`PosterCard`).
- Do not put the main headline in the hero column or add extra illustrations in the hero slot.
- Logo: top-right inside padding per `acko-poster-logo-strict.mdc`.

---

## 10. Checklist

- [ ] No text or logos inside the hero image
- [ ] One main visual cluster, not a full poster mock
- [ ] No photoreal humans on carousel slides
- [ ] Carousel slides visually distinct, not palette tweaks
- [ ] One visual language per image, no style collage
- [ ] Compliance: no fear-mongering, fake stats, regulator impersonation
- [ ] Illustrative heroes: **very high quality** editorial finish per §2.7 (not sketch, clip-art, or low-fidelity)
