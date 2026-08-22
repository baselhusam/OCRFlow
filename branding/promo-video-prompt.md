# OCRFlow — Promo Video Brief (prompt for Claude Design)

You have access to the GitHub repo **`baselhusam/OCRFlow`**. Read it before you design anything. Everything below is grounded in that repo — when a detail here conflicts with the code, the code wins.

---

## 0. The ask, in one line

Produce a **~65-second immersive product film** for OCRFlow that feels like a funded SaaS launch video — fast, cinematic, confident, built from *real UI*, not stock mockups — while staying honest that OCRFlow is an open-source, self-hosted, in-development project.

The centerpiece is not a feature list. It is **watching a document get taken apart by a pipeline you built yourself.**

---

## 1. Read this first (grounding pass)

Before storyboarding, pull the real material from the repo:

| Path | What to take from it |
|---|---|
| `README.md` | Positioning, principles, architecture diagram, tech stack |
| `branding/OCRFlow Brand Guidelines.dc.html` | Logomark meaning, lockups, clear space, misuse rules |
| `branding/OCRFlow Design System.dc.html` | Color tokens, type scale, spacing/radius, elevation, node anatomy, status colors |
| `branding/logo-svg/*.svg` | The 10 official logo variants — **use these files, do not redraw the mark** |
| `frontend/src/app/globals.css` | Live CSS custom properties / theme tokens |
| `frontend/src/components/brand/segment-mark.tsx` | The animated-capable mark component |
| `frontend/src/components/canvas/` | Real canvas shell, node palette, node anatomy, edges |
| `frontend/src/components/canvas/nodes/pipeline-node.tsx` | Node header/params/preview structure — match it exactly |
| `frontend/src/components/landing/` | Existing hero, feature grid, pipeline preview — the film should feel continuous with these |
| `backend/docs/MODEL_CATALOG.md` | **Real model ids, task categories, and wire types.** Use these strings verbatim on screen |

**Non-negotiable:** every node, label, wire type, and model id shown on screen must be a real one from the catalog. No invented model names.

---

## 2. What OCRFlow actually is

A **self-hostable platform for composable document-understanding pipelines on a visual canvas.** You drag OCR, layout-detection, table-extraction, and structuring models onto a node graph, wire their typed inputs and outputs together, and run the whole flow — interactively on the canvas or headless through the API.

Core principles worth dramatizing:

- **Canvas ↔ API parity** — what you prototype visually is what ships headless. *(This is the strongest story beat. Give it a moment.)*
- **Typed wires** — nodes connect only when the output type satisfies the input type. Invalid pipelines are impossible to draw. *(Great visual: a rejected connection.)*
- **Atomic tasks** — one HTTP endpoint = one task, even when a library bundles many.
- **Adapter, don't fork** — wraps Docling, Surya, Paddle rather than reimplementing them.
- **Self-host first** — the default catalog is Apache/MIT and runs fully on-prem or air-gapped.

Tagline (use verbatim): **"Composable OCR pipelines, fully under your control."**

Positioning line from the landing page: *"Wire stages on a canvas, run the whole flow with one click."*

---

## 3. Brand system — obey it exactly

**The mark ("Segment"):** an *O* built from three rounded arcs with gaps, plus one violet dot on the ring. It is not decoration — it encodes the product: the three arcs are the pipeline stages (detect · recognize · extract), the gaps are where stages wire together, and the violet dot is **the currently running stage**. Any animation of the mark must respect this meaning. The dot is allowed to travel the ring as a "running" signal. The arcs may assemble from three separate pieces. The mark must always resolve into a single readable ring.

**Color — one accent does the talking.**

| Token | Hex | Use |
|---|---|---|
| Pulse Violet | `#5B2EEF` | **Reserved.** Active/running node, primary action, links, the accent dot. Nothing else. |
| Soft Violet | `#EDE9FE` | Accent tint / glow falloff |
| Graphite | `#141225` | Ink / text |
| Night | `#15131F` | Primary dark surface — the film's base |
| Carbon | `#211D30` | Elevated dark surface, node bodies |
| Slate | `#6F6C84` | Muted text, secondary labels |
| Mist | `#EDEBF2` | Light surface |
| Paper | `#FFFFFF` | Base light |

Status colors (only where the UI genuinely uses them): Running `#12A65B`, Queued `#E8A317`, Failed `#E0245E`, Info `#2F6BFF`.

**Discipline rule:** if violet is on more than ~10% of any frame, you have overused it. Its power comes from scarcity against graphite and night. Glow is permitted around the accent — bloom, light trails on edges — but the frame stays dark and restrained.

**Type:** Hanken Grotesk (400–800) for everything spoken to humans — headings, wordmark, VO cards. IBM Plex Mono (400–600) for everything the machine says — node labels, model ids, wire types, terminal, JSON. **Never mix these roles.** Display headings run ExtraBold at tight tracking (−3.5%); mono runs at wide tracking for eyebrow labels (`0.22em`).

**Motion feel:** the app already uses `cubic-bezier(0.22, 1, 0.36, 1)` — a decisive ease-out. Make that the film's signature curve. Elements arrive fast and settle; nothing floats or bounces. Shadows are soft and violet-tinted.

---

## 4. Tone

Think **Linear / Vercel / Raycast launch film**, not enterprise explainer. Specifically:

- **Fast.** Average shot length under 2 seconds in the build sequence. Cut on motion, not on pauses.
- **Confident and quiet.** No exclamation marks, no "revolutionary", no smiling stock people, no hand-drawn doodles.
- **Dark, dimensional, deep.** Night-based surfaces, real depth of field, parallax, subtle grain. The canvas should feel like an infinite dark space with things built in it.
- **Machine-legible.** Mono text, real ids, real JSON. The audience is engineers; realism *is* the aesthetic.
- **The document is the hero prop.** A dense, real-looking invoice/report page — multi-column, with a table, a figure, a formula — gets analyzed on screen. Its dissection is the emotional payload.

---

## 5. Storyline — shot-by-shot

Total ~65s. Timings are targets, not law; keep the pace.

### Act I — The black box (0:00 – 0:08)

- **0:00** Pure `#15131F`. Silence except a low sub-bass swell.
- **0:01** A document page falls into frame in near-darkness — a dense scanned invoice, slightly skewed, faintly grainy. Then another behind it, then a stack, then a wall of them receding into the dark. Cold, colorless, unreadable.
- **0:05** Mono eyebrow types on, letter by letter, tight and small: `EVERY DOCUMENT IS A BLACK BOX.`
- **0:07** Hard cut to black.

### Act II — The mark ignites (0:08 – 0:14)

- **0:08** Three graphite arcs streak in from three directions, decelerating on the signature curve, and lock into the ring.
- **0:11** The Pulse Violet node snaps onto the ring with a single sharp bloom — the first color in the film. A faint violet light-trail traces the ring once.
- **0:12** Wordmark **OCRFlow** resolves beside it (horizontal lockup from `branding/logo-svg/horizontal-reversed.svg`).
- **0:13** Mono subline: `DETECT · RECOGNIZE · EXTRACT`

> The three arcs = three stages. Sell that connection visually here, because everything after depends on it.

### Act III — Into the canvas (0:14 – 0:28)

- **0:14** The ring's negative space **becomes the viewport**. Push through it into the real OCRFlow canvas — dark, infinite, faint dot-grid, gentle parallax.
- **0:16** The app chrome assembles fast: top bar with the mark, project name `invoice-pipeline.flow` in mono, node palette sliding in from the left. Use the true component structure from `frontend/src/components/canvas/`.
- **0:19** A cursor drags **`loader/pdf`** from the palette onto the canvas. The node lands with a soft violet-tinted shadow. Its output port is labeled in mono: `→ PageArtifact[]`.
- **0:22** **The typed-wire beat.** The cursor drags a wire from `loader/pdf` toward a node whose input doesn't match. The wire goes `#E0245E`, the target port dims, the connection **refuses to land** and snaps back. Beat. Then the cursor pulls to the correct port — the wire turns Pulse Violet and **snaps in with a click**.
  - On-screen mono caption: `TYPED WIRES · INVALID PIPELINES DON'T DRAW`
- **0:26** Camera pulls back slightly. Two nodes, one good wire, lots of dark space. Anticipation.

### Act IV — The build (0:28 – 0:42)

Rhythmic, percussive, on-beat. Each node arrives on a downbeat with its wire drawing itself in one fast stroke. Camera drifts and re-frames between arrivals — never static.

| Beat | Node (real ids) | Port label |
|---|---|---|
| 1 | `loader/pdf` — **Load PDF** | `→ PageArtifact[]` |
| 2 | `surya/layout` — **Detect Layout** | `→ regions[]` |
| 3 | `surya/reading-order` — **Reading Order** | `→ reading_order` |
| 4 | `surya/text-recognition` — **Recognize Text** | `→ TextLine[]` |
| 5 | `docling/tableformer-accurate` — **Extract Tables** | `→ TableStructure[]` |
| 6 | `llm/structured-extract` — **Structured Extract** | `→ JSON` |

- **0:40** Final pull-back: the whole six-node graph sits in the dark, wires quiet, everything neutral graphite. One `Run` button, violet, in the corner. Hold for one full beat of near-silence.

### Act V — The run *(the centerpiece — spend your best work here)* (0:42 – 0:55)

- **0:42** Click. The Run button flashes. **Everything happens at once but legibly.**
- **0:43** A pulse of Pulse Violet light travels down the first wire like current through a circuit. Each node it reaches switches to running state: accent ring, mono `● running…`, a live percentage.
- **0:45** **Split the frame or push in on a node's preview:** the actual document page appears and gets dissected in real time —
  - layout boxes **bloom** over the page one region at a time, each labeled in tiny mono (`title`, `paragraph`, `table`, `figure`)
  - reading-order numbers snap onto the regions and a thin violet path threads them in sequence
  - text lines illuminate row by row, glyphs resolving from blur to sharp
  - the table's grid **draws itself** — columns, then rows, then cells filling with values
  - a formula lifts off the page and resolves into LaTeX in mono
- **0:52** All extracted elements **fly off the page** and reassemble on the right as structured JSON, pouring in fast, syntax-highlighted, mono. The last brace lands.
- **0:54** Every node flips to complete. The traveling violet settles. One line of mono: `6 stages · 1 document · 0 vendors`

> This is the shot people will remember. Make it dense enough to rewatch, clean enough to read once.

### Act VI — Parity & ownership (0:55 – 1:02)

- **0:55** The canvas **folds into code** — nodes rotate/dissolve into a serialized pipeline definition in mono. Caption: `CANVAS ↔ API PARITY`, subline `WHAT YOU DRAW IS WHAT SHIPS.`
- **0:58** Snap to a terminal on Night. Typed live:
  ```
  $ make up
  ```
  Containers come up as clean mono log lines — gateway, providers, postgres, redis — each with a green `Running` dot.
- **1:00** Three short lines land in sequence, Hanken ExtraBold, one per beat:
  **Your models. Your machines. Your data.**

### Act VII — Close (1:02 – 1:08)

- **1:02** Everything falls away to Night. The mark returns center, the violet node completes one last orbit and stops at top.
- **1:04** Stacked lockup + tagline: **"Composable OCR pipelines, fully under your control."**
- **1:06** Mono footer row: `OPEN SOURCE · SELF-HOSTED · MIT` — and `github.com/baselhusam/OCRFlow`
- **1:08** Cut to black. The violet dot is the last thing to fade.

---

## 6. Copy — the complete on-screen script

Use exactly these strings. Nothing else appears as prose text.

```
EVERY DOCUMENT IS A BLACK BOX.
OCRFlow
DETECT · RECOGNIZE · EXTRACT
TYPED WIRES · INVALID PIPELINES DON'T DRAW
6 stages · 1 document · 0 vendors
CANVAS ↔ API PARITY
WHAT YOU DRAW IS WHAT SHIPS.
Your models. Your machines. Your data.
Composable OCR pipelines, fully under your control.
OPEN SOURCE · SELF-HOSTED · MIT
github.com/baselhusam/OCRFlow
```

All-caps mono lines are eyebrows/captions (IBM Plex Mono, wide tracking). Sentence-case lines are display (Hanken Grotesk ExtraBold, tight tracking).

**No voice-over.** Sound design and typography carry it. Design for **silent autoplay** — the film must be fully legible with sound off, since most views will be muted on LinkedIn/X/GitHub.

---

## 7. Sound design (if you deliver audio)

Low sub-bass drone under Act I. A single deep impact on the logo lock. A tight, quantized percussive pulse driving the build sequence — one hit per node. Filter sweep rising into the Run. On the run, a wash of high-frequency detail (data-like ticks, soft granular texture) that resolves into a clean sustained pad as the JSON lands. Drop to near-silence for the closing lockup, one last soft accent on the violet dot. No music with vocals. No whooshes on every cut.

---

## 8. Constraints — hard rules

1. **Nothing fabricated as fact.** No invented customer logos, no fake testimonials, no made-up benchmark numbers, latency figures, accuracy percentages, user counts, or "trusted by" strips. The project is pre-1.0 and honest positioning is part of the brand. Every metric shown must be either self-evident from the demo itself (e.g. "6 stages") or verifiable in the repo.
2. **Real ids only** — model ids, task names, and wire types must match `backend/docs/MODEL_CATALOG.md` verbatim.
3. **Don't redraw the logo.** Use `branding/logo-svg/`. Respect clear space (one node-diameter on all sides) and the 16px minimum for the mark.
4. **Violet is reserved** for active/running state, primary action, links, and the accent node. Never for decoration, backgrounds, or body text.
5. **No generic AI-video aesthetic** — no morphing abstract blobs, no glowing brain/neural-network clichés, no floating holographic UI panels in a void, no lens flares, no particle confetti, no "digital rain".
6. **UI must be real.** Reproduce the actual component anatomy from `frontend/src/components/canvas/` — node headers, params, ports, preview area. If a shot needs UI that doesn't exist yet, keep it plausible and consistent with the design system, and flag it in your notes.
7. **Legible at phone size.** Test every frame at 375px wide. If mono text is unreadable there, scale it up or cut it.
8. **Accessibility:** maintain ≥4.5:1 contrast on all text; avoid full-frame strobing or flashes faster than 3Hz.

---

## 9. Deliverables

Produce, in this order:

1. **A storyboard** — one frame per shot with timing, camera move, and on-screen text. Get this right before animating.
2. **The film itself**, built as a **deterministic, code-driven animated scene** (a self-contained HTML/CSS/JS timeline, or React + a frame-based renderer) so it can be captured at high quality and re-edited later. Reuse the repo's real tokens and component structure wherever possible rather than re-styling from scratch.
3. **Format variants:**
   - **16:9 / 1920×1080 @ 60fps** — hero cut, ~65s (GitHub README, YouTube, site)
   - **1:1 / 1080×1080** — ~30s cut-down (LinkedIn feed) — keep Acts II, IV, V, VII
   - **9:16 / 1080×1920** — ~20s vertical (Shorts/Reels) — Act V is the whole video; open on the run
   - **Silent looping GIF/WebM, ~6s** — the Act V run sequence only, for the README hero
4. **A poster frame** for each format (the JSON-landing moment from Act V is the strongest still).
5. **Notes**: any element you invented, any place the repo lacked what you needed, and any timing you'd tune with a second pass.

---

## 10. How to judge your own output

Before you call it done, check:

- Could a staff engineer watch this muted and correctly explain what OCRFlow does?
- Is there one shot they'd rewind to watch again?
- Does the violet appear rarely enough that it still means "running"?
- Is every string on screen true?
- Does it feel like a company shipped it, without claiming to be a company?
