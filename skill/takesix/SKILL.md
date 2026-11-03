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
3. **Lay out each level on its 6×6 grid** (see Layout below): sketch where
   every block goes and trace every arrow before writing JSON.
4. **Write the document** to a file named `<topic>.takesix.json` (format below,
   full spec in `references/format.md`).
5. **Validate** and fix until it passes:
   ```bash
   node <this-skill-dir>/scripts/takesix.mjs validate <topic>.takesix.json
   ```
   Errors come with JSON paths (`/blocks/2/children: 7 blocks on one level…`,
   `/blocks/3/at: Blocks "api" and "db" overlap at C2`). On success it prints a
   one-line summary; if it says arrows on the top level are *merged from
   nested links*, check those links are worth showing there (see Links below).
   **Layout hints** (an arrow with a block in its way, arrows that cross) do
   not fail validation, but fix them: move the blocks and validate again.
   To see what you placed, print every level as a text grid:
   ```bash
   node <this-skill-dir>/scripts/takesix.mjs sketch <topic>.takesix.json
   ```
6. **Render** one self-contained HTML page:
   ```bash
   node <this-skill-dir>/scripts/takesix.mjs render <topic>.takesix.json -o <topic>.html
   ```
   The page has the viewer inlined: no network, no install. Where you can show
   files or publish an HTML artifact, show this file; otherwise give its path.
7. **Reply briefly: the diagram is the answer.** At most three sentences, under
   80 words, plus the file path: what the diagram covers in one line, and which
   block to open first and why. No lists, no headings, and do not name the
   blocks or links one by one — not as prose, not as bullets. That would be the
   wall of text the diagram replaces, only shorter. For example:
   > Here is the payments service as a diagram: `payments.html` (source
   > `payments.takesix.json`). Start with "Public API": every charge enters
   > there, and its arrows lead to the rest.

## The format in brief

```json
{
  "takesix": "1.0",
  "title": "Payments service",
  "description": "How a payment flows from checkout to the bank, in four parts",
  "blocks": [
    {
      "id": "api",
      "at": "A2:B2",
      "icon": "⬡",
      "title": "Public API",
      "description": "REST endpoints the shop calls",
      "details": "Versioned by path (`/v1/…`). Errors follow **RFC 9457**.",
      "children": [ { "id": "api-charge", "at": "A3:B3", "title": "POST /charges", "description": "Creates a charge" } ]
    },
    { "id": "worker", "at": "E2:F2", "title": "Settlement worker", "description": "Talks to the bank" }
  ],
  "links": [ { "from": "api-charge", "to": "worker", "label": "queue" } ]
}
```

- **Document:** `takesix: "1.0"`, `title`, `description`, `blocks` (≤6), `links`.
- **Block:** `id` (unique in the whole document), `at`, `title`,
  `description`, and optionally `icon` (one emoji or character), `details`,
  `children` (≤6).
- **Place** (`at`, required): every level is a grid of 6 columns `A`–`F` and
  6 rows `1`–`6`, like a spreadsheet. A block covers one cell (`"B3"`) or a
  rectangle, top-left and bottom-right corners included (`"A1:C2"` is three
  columns wide, two rows tall). Blocks of one level must not overlap. The order
  of the array does not matter; the grid alone decides where a block is.
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

**Layout: use the whole grid, and space is a tool**

The grid always fills the screen: six equal columns, six equal rows. Empty
cells stay empty on screen, so where you leave space is as visible as where
you put a block.
- **Use the whole grid and leave room between blocks.** Spread the blocks over
  all six columns and as many rows as the level needs; do not pack them into
  the top-left corner, and do not try to fill every cell. Free space is part of
  the design, not waste.
- **Keep blocks small.** One or two cells per block is the norm; give more only
  to the block the level is about (a tall or wide block draws the eye first).
  A one-row block holds a title and a short description of one or two lines.
- **Put an empty cell between blocks linked by an arrow.** With a free column
  between them a horizontal arrow has room to read and room for its label; the
  same goes for a free row between blocks linked from top to bottom. Blocks
  that touch get a stub of an arrow and no label.
- **Distance says how things relate.** Blocks that belong together sit close
  (side by side, no gap); separate groups get an empty column or row between
  them. Use it instead of extra boxes or links.
- On phones the viewer drops empty columns and rows on its own, so gaps cost
  nothing there.

**Arrows on the grid**
- Arrows run straight between blocks that share a row or a column, and as a
  smooth curve, side to side, between blocks that share neither. Place linked
  blocks in the same row or column, or as a branch (diagonal) with a free
  column between them.
- An arrow must not have a third block in its way, and arrows should not cross.
  Trace each link on your sketch; `validate` lists both as layout hints.
- Read order is left to right, then top to bottom. Put sources on the left (or
  top) and what they lead to on the right (or below).

**Shapes that work** (`·` is an empty cell)
```
Chain, left to right            Branching tree (fan out)
   A  B  C  D  E  F                A  B  C  D  E  F
1  ·  ·  ·  ·  ·  ·             1  ·  ·  ·  ·  c1 ·
2  a  ·  b  ·  c  ·             2  ·  ·  ·  ·  ·  ·
                                3  r  ·  m  ·  c2 ·
                                4  ·  ·  ·  ·  ·  ·
                                5  ·  ·  ·  ·  c3 ·

Hub in the middle               Steps of a plan, top to bottom
   A  B  C  D  E  F                A  B  C  D  E  F
1  ·  ·  ·  n1 ·  ·             1  s1 s1 s1 s1 ·  ·
2  ·  ·  ·  ·  ·  ·             2  ·  ·  ·  ·  ·  ·
3  n2 ·  ·  h  ·  n3            3  ·  s2 s2 s2 s2 ·
4  ·  ·  ·  ·  ·  ·             4  ·  ·  ·  ·  ·  ·
5  ·  ·  ·  n4 ·  ·             5  ·  ·  s3 s3 s3 s3
```
- **Chain** (a flow, a pipeline): `"A2"`, `"C2"`, `"E2"`; more than three
  steps go on to the next row with a free row between.
- **Tree** (one thing branching into several): the root `r` on the left, each
  next step `m` one free column further right, the branches `c1`–`c3` spread
  over rows 1, 3, 5.
- **Hub** (one central thing and its neighbours): the hub `h` in the middle,
  the neighbours straight above, below and beside it, with free cells between.
- **Steps** (plans, roadmaps): wide blocks on rows 1, 3, 5, optionally shifted
  right step by step so the eye follows them down.
- **Peers without links** (services, entities): tiles with free cells between
  them, e.g. `"A1:B1"`, `"E1:F1"`, `"A3:B3"`, `"E3:F3"`.

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
- Keep the number of arrows on one screen small: about as many as there are
  blocks, fewer is better. Count them per level, including arrows merged from
  nested links. When a level has too many, drop the least important ones or
  regroup the blocks so the related ones end up in one parent.
- Make arrows flow one way where you can: left to right and top to bottom.
  Place sources first and consumers after; avoid arrows pointing back up or
  to the left.
  If two blocks depend on each other, use one `direction: "both"` link
  instead of two opposite arrows.
- In a sequence, link only consecutive blocks (1 → 2 → 3); a link that skips
  a step has the step in its way.
- Labels: an arrow across a free cell has room for a couple of words; an
  arrow between blocks that touch has none. Leave it unlabelled rather than
  overflow onto the cards, or move the blocks apart.

**Structure**
- Six is a hard limit (the validator rejects seven). When you have more, group
  them into a parent block that names what they share — but group by meaning
  even when you are under six (see above).
- Use short, readable, stable ids (`api-charge`, `db-orders`).
- Icons are optional; when used, keep them consistent (one per kind of thing,
  or status marks such as ✅ ⏳ ○ for plans).

## Editing an existing diagram

When asked to change a `.takesix.json`, edit the JSON in place, keep existing
ids (links and readers rely on them), then validate and render again. To make
room for a new block, move others with `at`; do not reuse an id.

## Reference

- `references/format.md` — the full format specification: every field, the
  grid, validation rules, how links are shown on each level.
