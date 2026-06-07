# Local Prototype Build Plan — Story 1 PDF Generator

> **Project:** Pet memorial story PDF — local hobby prototype
> **Scope:** Story 1 only ("Saying Goodbye to [PET_NAME]"), runs entirely on `localhost`
> **Goal:** End-to-end working flow: upload pet photo → customize story → generate PDF → download
> **Last updated:** June 6, 2026

---

## Reframing the project

This is now a craft project, not a business project. The interesting questions are:

1. **How do you get AI image generation to produce a consistent-looking pet across 10-12 different illustrations?** This is genuinely one of the harder problems in current AI image work, and it's where you'll learn the most.
2. **How do you turn HTML/CSS + dynamic data + AI-generated illustrations into a beautiful, print-quality PDF?** This is a deep technical area with its own subtleties (CSS print media, page breaks, font embedding, image DPI).
3. **How do you design the user flow so each step builds toward a satisfying "wow, this is real" moment at preview?**

Everything else — accounts, payments, marketing, scaling, admin panels — is dropped. You're building a single-user local tool that does one thing beautifully.

---

## What success looks like

You can run `npm run dev`, open `localhost:3000`, upload a photo of a pet, walk through 5-6 simple form steps, watch AI generate illustrations of the pet across multiple scenes, preview the assembled story in the browser, and click "Download PDF" to get a print-quality PDF on your local machine.

That's it. No deployment. No login. No payment. Just the craft.

---

## Tech stack — simplified for hobby scope

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 15 (App Router)** | One codebase for UI + API routes; great local dev experience |
| Styling | **Tailwind CSS** | Fast iteration; minimal config |
| Form state | **React useState + localStorage** | No need for Zustand/Jotai at this scope |
| File persistence | **JSON files on disk** (`./sessions/[id].json`) | No database. Simpler and good enough. |
| AI image generation | **OpenAI Images API** (`gpt-image-2-2026-04-21`) | Excellent reference-image support (up to 16 per call), strong character consistency, you already have $10 in credits |
| PDF generation | **Puppeteer** (Node) rendering an HTML template | The gold standard; full CSS control; teaches print CSS |
| Image storage | **Local filesystem** under `./generated/[session-id]/` | No S3 needed locally |
| Language | **TypeScript** | Worth the small overhead for AI/PDF type safety |

**Total monthly cost during development:** $0 out of pocket — your existing $10 in OpenAI credits comfortably covers building and testing this project. Everything else is free.

---

## High-level architecture

```
┌────────────────────────────────────────────────────────┐
│                    Next.js App                          │
│                                                         │
│  Browser (React) ◄──────► API Routes ◄──────► File   │
│   - Wizard UI            - /upload            System  │
│   - Preview              - /generate-images           │
│   - Download trigger     - /render-pdf                │
│                                  │                    │
└──────────────────────────────────┼────────────────────┘
                                   │
                  ┌────────────────┼─────────────────┐
                  │                │                 │
                  ▼                ▼                 ▼
            Replicate API    Puppeteer          ./sessions/
            (image gen)      (PDF render)       ./generated/
                                                ./output/
```

Everything runs on one Node process. No external services except Replicate.

---

## The three technical craft areas, in order of interest

### Craft Area 1 — PDF Rendering Pipeline

**This is where you should start.** Build a script that takes a JSON file of inputs + dummy placeholder images and outputs a polished 12-page PDF. Do this **before** touching the AI image work. Why: PDF rendering is the longest part of the build, has the most subtle craft (typography, page breaks, print CSS), and is the most reusable knowledge.

**Stack within this area:**
- HTML template using React (rendered with `renderToString` or a build-time React-to-HTML step)
- Print-optimized CSS using `@page`, `page-break-*`, print media queries
- Puppeteer launches headless Chrome, loads the HTML, exports PDF
- Custom font loading (use a serif like Lora or Cormorant Garamond via `@font-face`)

**Key things you'll learn:**
- How `@page` rules control PDF page size, margins, headers/footers
- How `break-inside: avoid` and `break-before: page` give you precise page boundaries
- Why image DPI matters and how to size images for 300 DPI print output
- How to embed fonts so the PDF looks identical on any machine that opens it
- The difference between screen CSS and print CSS

**Minimum viable v1:**

```typescript
// lib/pdf/render.ts
import puppeteer from 'puppeteer';
import { renderStoryHtml } from './template';

export async function renderStoryPdf(input: StoryInput): Promise<Buffer> {
  const html = renderStoryHtml(input); // your React template → HTML string
  
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  const pdf = await page.pdf({
    format: 'Letter',           // 8.5" × 11"
    printBackground: true,      // include background colors/images
    margin: { top: 0, right: 0, bottom: 0, left: 0 },  // template controls margins via CSS
    preferCSSPageSize: true,    // honor @page declarations in CSS
  });
  
  await browser.close();
  return pdf;
}
```

The template itself is where the design work happens. Build it as one HTML document with 12 page sections, each styled to break at a page boundary:

```css
@page {
  size: 8.5in 11in;
  margin: 0.75in;
}

.story-page {
  page-break-after: always;
  height: 9.5in;        /* 11in - 2 * 0.75in margin */
  display: flex;
  flex-direction: column;
}

.story-page:last-child {
  page-break-after: auto;
}
```

### Craft Area 2 — AI Image Generation with Pet Consistency

**This is the most interesting technical challenge** and the one you'll spend the most experimentation time on.

The core problem: you have one or two photos of a real pet. You need 8-10 illustrated scenes (pet doing favorite activity, pet sleeping, pet running in a meadow, etc.) where the pet *looks like the same animal* across every illustration. AI image models default to drifting — give them "golden retriever" 10 times and you'll get 10 different golden retrievers.

**Three approaches, in increasing sophistication. All adapted to `gpt-image-2`'s native support for up to 16 reference images per call:**

**Approach A — Single character sheet, then scene generation (recommended starting point)**

1. From the uploaded pet photo, generate a stylized portrait of the pet in your chosen illustration style (e.g., soft watercolor children's book style). Call this the "reference illustration."
2. For each scene page, call `gpt-image-2` with **both** the original pet photo AND the reference illustration as reference images, plus a scene prompt: "Same pet as in the references, now [doing favorite activity] in [scene], in the watercolor children's book style of the second reference image."
3. The model uses the photo to anchor the pet's actual appearance and the reference illustration to anchor the style.

**Approach B — Accumulating reference set**

1. Same start as A: photo → reference illustration.
2. Generate Page 1's scene. Take that scene as an additional reference.
3. Generate Page 2 using the photo + reference illustration + Page 1's image as references.
4. Each new page adds to the reference set, up to the 16-image limit.
5. This drift-compensates: by the time you're generating page 8, you have 8 examples of "what the pet looks like in this style," and the model stays anchored.

**Approach C — Prompt + photo only, no reference illustration**

1. Skip the reference illustration step entirely.
2. For each page, call `gpt-image-2` with the pet photo as reference + a scene prompt that explicitly describes the style: "Soft watercolor children's book illustration of the pet shown in the reference photo, now [scene]."
3. Simpler pipeline, fewer API calls per book, but consistency may drift more across pages.

For a hobby project, **start with Approach A**, see how it performs, and graduate to **Approach B** if you notice the pet drifting across pages. Approach C is the cheapest to test and worth trying first as a baseline — sometimes the simpler approach is enough.

**How to use `gpt-image-2` for this project:**

- **Model string:** `gpt-image-2-2026-04-21`
- **SDK:** Official `openai` npm package (`npm install openai`)
- **Auth:** `OPENAI_API_KEY` in `.env.local`
- **Quality tiers to use:**
  - **Low** (~$0.006/image) — use this while iterating on prompts. Generate dozens of test images for under a dollar.
  - **Medium** (~$0.053/image) — use this for "real" book generations during development. ~$0.60 per full book.
  - **High** (~$0.21/image) — save for final renders or cover illustrations only.
- **Resolution:** 1024×1024 is the sweet spot for cost and quality. Higher resolutions are available if you want them for print fidelity, but storybook illustrations don't need 4K.
- **Reference images:** Pass them as base64-encoded data URLs or as URLs the API can fetch. Each reference can be up to 100 MB; for our use case (a phone photo of a pet), they'll be much smaller.

**Code sketch for the generation pipeline:**

```typescript
// lib/ai/generate-illustrations.ts
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

const openai = new OpenAI();

// Helper: convert a local image file to a base64 data URL for the API
async function imageToDataUrl(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).slice(1); // 'jpg', 'png', etc.
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  return `data:image/${mime};base64,${buffer.toString('base64')}`;
}

export async function generateReferenceIllustration(
  petPhotoPath: string,
  petDescription: string,
  style: 'watercolor' | 'storybook' | 'pencil',
  quality: 'low' | 'medium' | 'high' = 'low'  // start low while testing prompts
): Promise<Buffer> {
  const photoDataUrl = await imageToDataUrl(petPhotoPath);
  
  const result = await openai.images.generate({
    model: 'gpt-image-2-2026-04-21',
    prompt: `Soft ${style} children's book illustration of the pet shown in the reference photo. ${petDescription}. Neutral pose, simple warm background, gentle lighting, suitable for a children's storybook. Maintain the pet's exact appearance — color, markings, breed characteristics — from the reference.`,
    reference_images: [photoDataUrl],
    size: '1024x1024',
    quality,
    n: 1,
  });
  
  // API returns base64-encoded image; decode to buffer for saving
  const b64 = result.data[0].b64_json;
  return Buffer.from(b64!, 'base64');
}

export async function generateSceneIllustration(
  petPhotoPath: string,
  referenceIllustrationPath: string,
  previousScenes: string[],          // Approach B: accumulate previous scenes
  sceneDescription: string,
  style: 'watercolor' | 'storybook' | 'pencil',
  quality: 'low' | 'medium' | 'high' = 'medium'
): Promise<Buffer> {
  const references = [
    await imageToDataUrl(petPhotoPath),
    await imageToDataUrl(referenceIllustrationPath),
    ...await Promise.all(previousScenes.slice(0, 14).map(imageToDataUrl)), // cap at 16 total
  ];
  
  const result = await openai.images.generate({
    model: 'gpt-image-2-2026-04-21',
    prompt: `Same pet as in the references, now ${sceneDescription}. ${style} children's book illustration style matching the second reference image. Gentle warm lighting, same pet appearance.`,
    reference_images: references,
    size: '1024x1024',
    quality,
    n: 1,
  });
  
  const b64 = result.data[0].b64_json;
  return Buffer.from(b64!, 'base64');
}
```

*Note: the exact parameter names (`reference_images`, `quality`) reflect the model's current API surface. Verify against OpenAI's docs at the time you build, since the Images API has shifted parameter names a few times. The OpenAI SDK will give you TypeScript autocomplete that's authoritative.*

**Key things you'll learn:**
- How prompt structure affects consistency vs. variation
- Why the "same X as reference" phrasing matters
- The trade-off between scene variety and character fidelity
- How seed values affect reproducibility
- Cost-quality trade-offs across model tiers

**Cost per book at this scale (with `gpt-image-2`):**

| Tier | Per image | Per book (~11 illustrations) |
|------|-----------|------------------------------|
| Low | ~$0.006 | ~$0.07 |
| Medium | ~$0.053 | ~$0.58 |
| High | ~$0.211 | ~$2.32 |

With your $10 in OpenAI credits, that means roughly:
- **100+ test generations at Low** while you iterate on prompts (well under $1 total)
- **10-15 full books at Medium** for real-quality generations
- Plus a few **High-tier cover renders** for the finished version

You have substantially more budget than you need for the prototype phase.

### Craft Area 3 — The Customization Wizard UI

This is the least technically deep area but the part that ties the experience together. Keep it minimal — five or six pages, single column, no fancy animations.

**Step structure:**

1. **Upload pet photo** — drag-and-drop or file picker. Show the uploaded photo as preview.
2. **Pet details** — name, species, breed/appearance, pronoun, illustration style choice
3. **Child details** — child's name, age range (drives the tone variant)
4. **Memories** — favorite activity, sleeping spot, a favorite memory (1-3 sentences)
5. **Style choices** — death-type sensitivity option, belief-frame option
6. **Generate** — kick off the AI illustration generation; show progress
7. **Preview** — display the full story in the browser, page by page
8. **Download** — render PDF and serve as download

Each step is its own route under `/create/`. State is held in React Context and synced to `localStorage` so a page refresh doesn't lose progress. After the user clicks "Generate" in Step 6, the session is also written to disk as `./sessions/[id].json` so the rendered images can be tied to inputs.

---

## Project structure

```
pet-memorial-prototype/
├── app/
│   ├── page.tsx                    # Landing — "Begin"
│   ├── create/
│   │   ├── upload/page.tsx         # Step 1
│   │   ├── pet/page.tsx            # Step 2
│   │   ├── child/page.tsx          # Step 3
│   │   ├── memories/page.tsx       # Step 4
│   │   ├── style/page.tsx          # Step 5
│   │   ├── generate/page.tsx       # Step 6 (progress UI)
│   │   ├── preview/page.tsx        # Step 7 (in-browser book preview)
│   │   └── download/page.tsx       # Step 8 (PDF download trigger)
│   ├── api/
│   │   ├── upload/route.ts         # POST photo, save to ./uploads/
│   │   ├── session/route.ts        # GET/POST session JSON
│   │   ├── generate-illustrations/route.ts  # Trigger AI generation
│   │   └── render-pdf/route.ts     # Build PDF and stream as response
│   └── layout.tsx
├── lib/
│   ├── ai/
│   │   ├── client.ts               # OpenAI client setup
│   │   ├── prompts.ts              # Per-scene prompt builders
│   │   └── generate.ts             # Orchestration of reference + scenes
│   ├── pdf/
│   │   ├── template.tsx            # React component for the 12-page story
│   │   ├── styles.css              # Print CSS
│   │   └── render.ts               # Puppeteer renderer
│   ├── story/
│   │   ├── master-text.ts          # The 12-page master text with merge fields
│   │   ├── merge.ts                # Substitute customer inputs into master text
│   │   └── variants.ts             # Age, death-type, belief-frame variants
│   └── session/
│       ├── types.ts                # TypeScript types for session state
│       └── storage.ts              # localStorage + disk persistence helpers
├── components/
│   ├── wizard/
│   │   ├── ProgressBar.tsx
│   │   ├── StepShell.tsx
│   │   └── ImageUploader.tsx
│   └── preview/
│       ├── PageView.tsx
│       └── BookPreview.tsx
├── uploads/                        # User-uploaded photos (gitignored)
├── generated/                      # AI-generated illustrations (gitignored)
├── sessions/                       # Session JSON files (gitignored)
├── output/                         # Final PDFs (gitignored)
├── .env.local                      # OPENAI_API_KEY
├── package.json
└── README.md
```

---

## Build sequence — 6 milestones

These are designed to give you a working artifact at the end of each milestone, so you can stop at any point and have something to show for it.

### Milestone 1 — Static PDF from hardcoded JSON (1-2 evenings)

**Goal:** Run a CLI script that reads a hardcoded JSON file of story inputs + uses dummy placeholder images, and outputs a 12-page PDF to `./output/`.

What to build:
- Set up Next.js + TypeScript + Tailwind
- Write the master-text module with merge fields
- Build the React template component for the 12 story pages
- Write print CSS (`@page`, page breaks, font loading)
- Wire up Puppeteer
- Create a script: `node scripts/render-test.ts test-input.json` → outputs PDF

**Done when:** you have a beautiful 12-page PDF generated from a JSON file, even if all the images are placeholder gray rectangles. This is the foundation.

### Milestone 2 — AI reference illustration (1 evening)

**Goal:** Upload a pet photo via curl/Postman, get back a stylized reference illustration.

What to build:
- OpenAI API key setup in `.env.local`
- `/api/upload` route to receive photo
- `lib/ai/generate.ts` with `generateReferenceIllustration()` using `gpt-image-2-2026-04-21`
- A test page that lets you upload an image and see the AI-generated stylized version
- Use Low quality (~$0.006/image) while testing prompts — you can iterate dozens of times for under a dollar

**Done when:** you can upload a photo of a real pet and get back one stylized illustration that looks like the same animal in the chosen style.

### Milestone 3 — Full scene generation pipeline (1-2 evenings)

**Goal:** From the reference illustration, generate all 10-12 scene illustrations needed for the story.

What to build:
- Scene-prompt builders for each story page (pet running, pet sleeping, pet with child, etc.)
- Orchestration: take inputs → generate reference → generate all scenes in parallel
- Save each generated image to `./generated/[session-id]/`
- Update the PDF template to use the generated images

**Done when:** you can run an end-to-end pipeline from JSON input + pet photo → full PDF with all illustrations of the actual pet. This is the "wow" moment.

### Milestone 4 — The wizard UI (2-3 evenings)

**Goal:** A browser-based multi-step form that captures all inputs and triggers the pipeline.

What to build:
- Six wizard steps (upload, pet, child, memories, style, generate)
- React Context for shared form state
- localStorage persistence
- Image upload component with drag-drop
- Progress bar
- Form validation (only required: pet name, child name, photo)

**Done when:** you can complete the wizard in the browser, click "Generate," and the backend produces a PDF.

### Milestone 5 — In-browser preview (1-2 evenings)

**Goal:** After generation, show the assembled book in the browser before downloading.

What to build:
- Preview page that renders the same React template used for PDF, but for screen display
- Page-by-page navigation (or scrollable view)
- "Download PDF" button that triggers the actual PDF render

**Done when:** you can see all 12 pages in your browser with the actual generated illustrations, navigate between them, and download the final PDF when satisfied.

### Milestone 6 — Polish and iteration (open-ended)

This is where it stops being a checklist and becomes a craft project. Things to explore:

- Try Approach B or C for image consistency — does it improve quality?
- Experiment with different illustration styles
- Add a "regenerate this page" button on preview (only re-runs one image)
- Improve typography — try different fonts, line heights, page layouts
- Add subtle decorative elements (page borders, drop caps, custom illustrations between pages)
- Try outputting at different print sizes (8.5×11, 8×8 square, A4)
- Add a way to load saved sessions so you can revisit a book
- Generate the same book in two illustration styles and compare side by side

---

## Estimated time investment

- Milestones 1-3 (PDF + AI pipeline): **5-7 evenings**
- Milestones 4-5 (UI): **3-5 evenings**
- Milestone 6 (polish, exploration): **as much or as little as you want**

Total to a working end-to-end prototype: **roughly 8-12 evenings** of focused work.

---

## Cost estimate

| Item | Cost |
|------|------|
| OpenAI API credits during dev (using `gpt-image-2`) | $0 — covered by your $10 existing credits |
| Domain / hosting / anything else | $0 (local only) |
| **Total out of pocket** | **$0** |

You'll probably use $4-8 of your $10 OpenAI credit reaching a polished prototype.

---

## Open technical questions to resolve as you build

These don't need answers up front; you'll figure them out as you go. Just being aware of them helps.

- **Will `gpt-image-2` maintain pet consistency well enough with Approach A, or will you need Approach B (accumulating references)?** Test on milestone 3. The model's reference-image support is strong but not perfect across many pages.
- **What's the best illustration-style prompt phrasing?** "Soft watercolor" vs. "children's book watercolor" vs. naming specific illustrators (avoid living-artist names — model may refuse or produce inferior output). Spend an evening on prompt iteration at Low quality before committing to Medium runs.
- **How do you handle the case where the user uploads a low-quality or blurry pet photo?** Probably show a "this might not work well" warning and let them proceed anyway.
- **Should illustrations be cached?** Yes — if a user regenerates one page, only re-call the API for that page. Cache by prompt hash + reference image hash.
- **What happens to the React template when you want to add new variants (e.g., a different ending)?** Variants should live in `lib/story/variants.ts` and be composed into the master text before rendering.
- **How do you preview fonts and print CSS during development?** Chrome's "Print preview" mode in DevTools is invaluable. Also try `puppeteer.pdf()` with `path: './debug.pdf'` to see actual output during dev.

---

## Things explicitly out of scope

So you don't get tempted to build them and lose focus:

- Payments, Stripe, checkout, pricing
- User accounts, authentication, login
- Database (Postgres, Supabase, anything beyond JSON files)
- Deployment to Vercel or anywhere else
- Domain name, branding, logo, marketing site
- Stories 2 and 3 — Story 1 only
- Photo retouching, advanced image editing
- Bulk generation, batch processing
- Admin panel, order management
- Email delivery — PDF is served as an HTTP download, no email needed
- Mobile responsiveness — desktop browser is fine for a local prototype
- Internationalization — English only
- Print-on-demand integration

---

## What's worth building next, only if you fall in love with the project

If you finish milestone 6 and want to keep going, the natural next moves are (in order):

1. **Deploy it somewhere** — Vercel for the Next.js app, Replicate keys as env vars. Now it's accessible to friends and family who want to make a book for their own pet.
2. **Add Story 2 (the letter)** — reuses the entire PDF pipeline, much less new code than you'd think.
3. **Add a payment wrapper** — single Stripe checkout link, fixed price, no accounts. Smallest possible business layer.

But all of that is optional. The point of this project as scoped above is to *build something interesting* — not to be a business.

---

## Want me to start building?

I can do any of the following:

1. **Set up the Next.js project skeleton** with all the directory structure, dependencies, and stub files ready for you to clone.
2. **Build Milestone 1 fully** — a working PDF renderer with the master-text module, template, and Puppeteer pipeline. You can run it and see your first PDF tonight.
3. **Build the AI generation module** (Milestone 2-3) — the Replicate integration, prompt builders, and orchestration code.
4. **Just leave you with the plan** — and help when you have specific questions while building.

Which of these is most useful?
