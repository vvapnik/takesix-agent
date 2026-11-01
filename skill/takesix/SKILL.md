---
name: takesix
description: Answer with a TakeSix diagram instead of a long wall of text — a zoomable diagram with at most six blocks per screen, saved as JSON and rendered to a single self-contained HTML file. Use this whenever the user asks to explain, map, summarize or give an overview of something with structure (a codebase, a system's architecture, a document, a data model, a plan or roadmap, a process, a comparison) and the honest answer would otherwise be many sections of prose; also when they ask for a TakeSix / takesix diagram, a ".takesix.json" file, a "diagram I can click into", or want to "visualize" such structure. Prefer it over long Markdown answers with nested headings and bullet lists.
compatibility: Needs Node.js 18+ to run the bundled scripts/takesix.mjs (no npm install).
---

# TakeSix: answer with a diagram, not a wall of text

A TakeSix diagram shows **at most six blocks on a screen**. Every block can open
into up to six more, as deep as needed. The reader gets the gist on the first
screen and clicks for depth, instead of scrolling through pages of prose. Links
between blocks are drawn on every level; long text hides in a details panel.

Your answer is a JSON document. A bundled script checks it and turns it into one
HTML file that opens anywhere.

## Workflow

1. **Understand the subject first.** Read the code, document or plan you are
   explaining. The diagram is only as good as the understanding behind it.
2. **Design the tree before writing JSON.** Answer the user's question with the
   top level: 3–6 blocks that together say the whole thing. Then, for each block,
   ask "what would the reader want when they click this?" and give it up to six
   children. Two or three levels are usually enough; stop when a block is
   self-explanatory.
3. **Write the document** to a file named `<topic>.takesix.json` (format below,
   full spec in `references/format.md`).
4. **Validate** and fix until it passes:
   ```bash
   node <this-skill-dir>/scripts/takesix.mjs validate <topic>.takesix.json
   ```
   Errors come with JSON paths (`/blocks/2/children: 7 blocks on one level…`).
   On success it prints a one-line summary; if it says arrows on the top level
   are *merged from nested links*, check those links are worth showing there
   (see Links below).
5. **Render** one self-contained HTML page:
   ```bash
   node <this-skill-dir>/scripts/takesix.mjs render <topic>.takesix.json -o <topic>.html
   ```
   The page has the viewer inlined: no network, no install. Where you can show
   files or publish an HTML artifact, show this file; otherwise give its path.
6. **Reply briefly.** Two or three sentences on what the diagram covers and where
   to start, plus the file. Do not repeat the diagram's content as prose — that
   is the wall of text the diagram replaces.

## The format in brief

```json
{
  "takesix": "1.0",
  "title": "Payments service",
  "description": "How a payment flows from checkout to the bank, in four parts",
  "blocks": [
    {
      "id": "api",
      "icon": "⬡",
      "title": "Public API",
      "description": "REST endpoints the shop calls",
      "size": "S",
      "details": "Versioned by path (`/v1/…`). Errors follow **RFC 9457**.",
      "children": [ { "id": "api-charge", "title": "POST /charges", "description": "Creates a charge" } ]
    },
    { "id": "worker", "title": "Settlement worker", "description": "Talks to the bank", "size": "L" }
  ],
  "links": [ { "from": "api-charge", "to": "worker", "label": "queue" } ]
}
```

- **Document:** `takesix: "1.0"`, `title`, `description`, `blocks` (≤6), `links`.
- **Block:** `id` (unique in the whole document), `title`, `description`, and
  optionally `icon` (one emoji or character), `size`, `details`, `children` (≤6).
- **Size** (`size`): `S` a third of the width, `M` a half (default — omit it),
  `L` two thirds, `F` the full width. Blocks flow left to right and wrap.
- **Link:** `from`, `to` (block ids on any levels), optional `label`,
  `direction`: `forward` (default), `both`, `none`.

## How to make it readable

These rules come from reviewing real generated diagrams. They are about what
the reader sees, so keep the viewer in mind while writing.

**Headers and cards**
- The screen header shows the document's `title` + `description` on the top
  level, and the opened block's `title` + `description` below it. Write a real
  description for the document and for every block with children: it is the
  first sentence the reader sees on that screen. Do not add an "Overview" block
  for this.
- A card shows only icon, title, one line of description and "N more inside".
  Children are not previewed, so the title and description must say what is
  inside.
- `description` is one short line. Anything longer — explanations, code,
  lists, caveats — goes into `details`. It is a small Markdown subset:
  headings, paragraphs, `-` and `1.` lists, `code`, **bold**, *italic*, fenced
  code and `https` links. **No tables and no HTML**: they show as raw text.
  Write a table as a list (`- **0x01** Plant container`).

**Sizes**
- Sequences (plans, roadmaps, steps of a process): every block `F`, so each is
  a row and the order reads top to bottom.
- Peers (services, modules, entities): `S` (three per row) or `M` (two per
  row). Make the one block that matters most `L` or `F`.
- Fill rows: sizes in a row should add up to the full width (`S`+`S`+`S`,
  `M`+`M`, `L`+`S`, `F`). A block that does not fit wraps and leaves a hole.

**Placement: related blocks side by side, paths that do not cross**
- Blocks are placed in array order, left to right, wrapping into rows. Order
  them so that linked blocks are neighbours: next to each other in a row, or
  directly above and below.
- An arrow should go from one block to the other without crossing a third
  block. If it would, reorder the blocks or change sizes until the ends touch.
  If no order works, the link is probably not worth drawing (see Links).
- Arrows should not cross each other either. Sketch the level as a grid and
  trace each link before writing JSON; a chain (A → B → C) or a single hub
  with neighbours around it never crosses, a web of links between many
  blocks always does.

**Nesting follows meaning**
- If something is part of something else (a table of a database, an endpoint
  of a service, a step of a stage), it goes into that block's `children`,
  not beside it on the same level. The tree is the "contains / consists of"
  relation; links are for everything else.
- Do not flatten parts and wholes onto one level just because there is room.

**Group by meaning, not to fill the screen**
- Six is a ceiling, not a target. Three blocks that each mean one thing beat
  six where some are leftovers. Do not split a block or pull children up only
  to use the free places.
- Each level should have one principle of division (by layer, by stage, by
  domain). A block that does not fit it belongs in another parent, or in
  `details`.

**Links: few, and only where they matter**
- Every link is drawn on every level where its ends are visible. A link between
  blocks nested in different parents also appears one level up, as an arrow
  between those parents (dashed, merged with others). Ten innocent-looking
  links make a noisy top level.
- Draw a link only when the relationship is the point. Otherwise say it in a
  `description` or `details` ("reads from the orders table").
- In a sequence, link only consecutive top blocks (1 → 2 → 3). A chain reads
  better than a fan; a link that skips a row is drawn across the row between.
- Labels: arrows between rows have room for a couple of words; arrows between
  blocks side by side have room for about five characters ("SQL", "REST").
  Leave those unlabelled rather than overflow onto the cards.

**Structure**
- Six is a hard limit (the validator rejects seven). When you have more, group
  them into a parent block that names what they share — but group by meaning
  even when you are under six (see above).
- Use short, readable, stable ids (`api-charge`, `db-orders`).
- Icons are optional; when used, keep them consistent (one per kind of thing,
  or status marks such as ✅ ⏳ ○ for plans).

## Editing an existing diagram

When asked to change a `.takesix.json`, edit the JSON in place, keep existing
ids (links and readers rely on them), then validate and render again.

## Reference

- `references/format.md` — the full format specification: every field,
  validation rules, how links are shown on each level.
