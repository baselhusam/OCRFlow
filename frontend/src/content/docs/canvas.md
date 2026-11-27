---
title: Use the canvas
description: Recipes, adding and wiring nodes, quick settings, the inspector, running, and how the project canvas differs from pipelines.
---

The canvas is the product. Keyboard habits from other node editors mostly apply; the OCRFlow-specific pieces are **typed, coloured wires**, **offline engines**, and **Items** nodes that fan a collection out.

## Open a canvas

- **Project:** `/app/projects/{id}/canvas` — free-form, loaders allowed.
- **Pipeline:** `/app/pipelines/{id}/canvas` — bounded I/O, no file loaders. The top bar shows the pipeline's input → output once it is valid.

The page has four parts: the **top bar** (name, save state, run), the **library** on the left, the **board**, and the **inspector** on the right, which opens when you click a node.

## Start fast

An empty canvas offers **recipes**: *Invoice → JSON*, *Scan → text*, *PDF → Markdown*, *Find layout*, *Ask about an image*. A recipe drops a fully wired chain; recipes whose engine is offline are marked *needs an engine*.

You can also **drop a PDF or image anywhere on the board**. OCRFlow adds the right loader, uploads the file, and loads its pages in one go — there is no separate *Load* step any more.

## Add nodes

- **Library** (left): search with <kbd>/</kbd>, filter by engine with the engine chips, and fold sections. *Only online* hides nodes whose engine is not running (the ⓘ on a row shows the `make ocr-…` command that starts it). Click a row or drag it onto the board.
- **Quick add**: double-click empty board, or press <kbd>A</kbd>, and type. With a node selected, <kbd>A</kbd> offers only nodes that can follow it.
- **Drag a wire into empty space**: the quick-add menu opens filtered to nodes that accept that wire, and the new node is connected for you.
- **Inspector → Connections → Can connect next**: one click adds and wires the next step.

Adding a node selects it. If the node has settings, its **quick settings** open right away.

## Wire nodes

Pins and wires are coloured by the data they carry — blue pages, amber regions, green text, orange tables, pink formulas, teal figures, violet documents, yellow JSON. Hover a pin to see its type.

While you drag a wire, pins that can take it glow and say **Accepts …**; the rest dim and say what they need. You can drop on a node's body, not just its pin. Click a wire to select it (its type label and a ✕ appear); <kbd>Delete</kbd> or ✕ removes it.

## Nodes

Every node has the same shape: engine logo with a status dot, name, a one-line purpose, and a footer **status pill** — *No file*, *Waiting* (with what's missing, e.g. *Connect an input* or *Add a document*), *Ready*, *Running* (with elapsed time or page progress), *Done* (with a result count), *Error* (with *Retry*) or *Offline*. The button on the right of the footer is the next useful action: *Choose file*, *Run*, *Preview*, *Retry*.

Hover a node (or select it) for its toolbar: **Run**, **Quick settings**, **Apply to all N pages** (multi-page documents), **Fan out** (layout and Select Page results), **Open details**, **Duplicate**, **Delete**. Deleting shows an **Undo** toast.

## The inspector

Click a node to open the inspector. It always has three tabs:

- **Parameters** — the full settings form (schema builder for structured extraction, language pickers, connection pickers) plus a *Before this can run* list when something is missing.
- **Preview** — the node's output rendered for its kind: pages, layout boxes with labels, text lines with confidence, tables, formulas as crops + LaTeX, figures, documents as Markdown / JSON. Before a run it shows the input the node will receive.
- **Connections** — what feeds the node, what it feeds, and *Can connect next* suggestions.

The footer runs the node (*Run node*, *Run again*, *Retry*) and, for multi-page documents, *All N pages*. <kbd>Enter</kbd> opens the inspector for the selected node; <kbd>Esc</kbd> closes it.

## Run

- **One node:** *Run* on the node or in the inspector executes it and whatever it needs upstream — a test run that does not start a project run.
- **Whole graph:** **Run** in the top bar (<kbd>Ctrl/⌘</kbd>+<kbd>Enter</kbd>) starts a backend `ProjectRun`. Nodes show *Queued → Running → Done* as the run moves through them, the top bar shows the current step, a counter and elapsed time, and a violet hairline tracks progress. **Stop** cancels the run after the current step.
- When **Run** is disabled, the amber *N steps need attention* chip next to it jumps to each blocked node in turn.
- The Run menu (▾) also has *Run selected node* and *Run on many documents…* (batch upload: one run per file).

A failed run shows *Failed at {node}*; click it (or *Show node* in the toast) to jump to the node's error.

## Apply to all pages

A page model runs on the page it is looking at — fast enough to try three layout models on one page and compare. Once you like one, use **Apply to all N pages** on the node's toolbar or in the inspector. The node runs once per page, shows `37 / 100 pages` in its pill with a stop button, and keeps every page's result; the preview gets a page switcher, and downstream nodes wired to a page receive that page's result. Page models upstream that have not been applied yet are applied first, so a whole chain (layout → OCR) goes end to end.

## Items: fan a collection out

Every output is a collection — pages, regions, lines, tables, figures, formulas. After a layout or Select Page node finishes, **Fan out** (node toolbar, or the banner on the Preview tab) spawns an **Items** node: a scrollable, filterable list of every item with **one output pin per item**. Wire page 1 to model A, page 2 to model B and page 9 back to model A. Tick several items and a **group pin** appears that carries them as one input. See [Nodes & wires](/documentation/nodes).

## Save, undo, layout

Graphs save automatically (the top bar shows *Saving… / Saved · 2m ago / Unsaved*). **Undo / redo** (<kbd>Ctrl/⌘</kbd>+<kbd>Z</kbd>, <kbd>Ctrl/⌘</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>) covers adding, moving, wiring, deleting and parameter edits; it never throws away run results.

The floating dock at the bottom holds undo/redo, zoom (click the percentage for 100%), **fit to screen**, **tidy up layout** (<kbd>Shift</kbd>+<kbd>L</kbd>), select / hand tools (<kbd>V</kbd> / <kbd>H</kbd>) and the minimap (<kbd>M</kbd>).

The **⋯** menu has *Tidy up layout*, *Clear all results*, *Save as reusable pipeline…*, *Export graph JSON*, keyboard shortcuts, and the theme switch. Click the project name to rename it.
