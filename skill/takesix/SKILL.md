---
name: takesix
description: Answer with a TakeSix diagram instead of a long wall of text — a zoomable diagram with at most six blocks per screen, saved as JSON and rendered to a single self-contained HTML file. Use this whenever the user asks to explain, map, summarize or give an overview of something with structure (a codebase, a system's architecture, a document, a data model, a plan or roadmap, a process, a comparison) and the honest answer would otherwise be many sections of prose; also when they ask for a TakeSix / takesix diagram, a ".takesix.json" file, a "diagram I can click into", or want to "visualize" such structure. Prefer it over long Markdown answers with nested headings and bullet lists.
compatibility: Needs Node.js 18+ to run the bundled scripts/takesix.mjs (no npm install).
---

# TakeSix: answer with a diagram, not a wall of text

A TakeSix diagram shows **at most six blocks on a screen**. Every block can open
into up to six more, as deep as needed. The reader gets the gist on the first
screen and clicks for depth, instead of scrolling through pages of prose.
Arrows join the blocks of one screen. A block that needs explaining in prose
opens into that text instead of more blocks.

Your answer is a JSON document. A bundled script checks it and turns it into one
HTML file that opens anywhere.

## Workflow

1. **Understand the subject first.** Read the code, document or plan you are
   explaining. The diagram is only as good as the understanding behind it.
2. **Pick a blueprint** for the top level (see "Pick a blueprint" below) and
   read its file in `references/blueprints/`: it says how to lay out the
   level, where arrows go and how to divide into levels.
3. **Design the tree before writing JSON.** Answer the user's question with the
   top level: 3–6 blocks that together say the whole thing. Then, for each block,
   ask "what would the reader want when they click this?" and give it up to six
   children (see Nesting below: a block may switch to another blueprint). Two
   to four levels are usually enough; stop when a block is self-explanatory.
   Lay out each level on its 6×6 grid as its blueprint says: sketch where
   every block goes and trace every arrow before writing JSON.
4. **Write the document** to a file named `<topic>.takesix.json` (format below,
   full spec in `references/format.md`).
5. **Validate** and fix until it passes:
   ```bash
   node <this-skill-dir>/scripts/takesix.mjs validate <topic>.takesix.json
   ```
   Errors come with JSON paths (`/blocks/2/children: 7 blocks on one level…`,
   `/blocks/3/at: Blocks "api" and "db" overlap at C2`). On success it prints a
   one-line summary; if it says some links join blocks of different levels,
   link the blocks that contain them instead: such links are never drawn.
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
   The page has the viewer inlined: no network, no install. Hand the user this
   file itself, so they can open and share it, not only its path:
   - **In a sandbox with an outputs folder** (claude.ai and other chat apps
     with code execution, where `/mnt/user-data/outputs/` exists): render
     straight into it, `-o /mnt/user-data/outputs/<topic>.html`, and present
     that file (e.g. with `present_files`). A file anywhere else in the
     sandbox is invisible to the user.
   - **Where you can publish an HTML artifact or send files:** do that with
     this file.
   - **Only on the user's own machine** (a CLI or IDE agent): give the path.
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
      "children": [ { "id": "api-charge", "at": "A3:B3", "title": "POST /charges", "description": "Creates a charge" } ]
    },
    {
      "id": "worker", "at": "E2:F2", "title": "Settlement worker", "description": "Talks to the bank",
      "details": "Runs every 5 minutes. Retries a failed transfer **three times**, then flags it."
    }
  ],
  "links": [ { "from": "api", "to": "worker", "label": "queue" } ]
}
```

- **Document:** `takesix: "1.0"`, `title`, `description`, `blocks` (≤6), `links`.
- **Block:** `id` (unique in the whole document), `at`, `title`,
  `description`, and optionally `icon` (one emoji or character, or an
  inline SVG drawing, see "Icons" below), `shape` (a
  flowchart symbol: `terminator`, `decision`, `io`, `subprocess`,
  `loop-start`, `loop-end`; a plain card by default), and either `children`
  (≤6) or `details` (Markdown text) — never both.
- **Place** (`at`, required): every level is a grid of 6 columns `A`–`F` and
  6 rows `1`–`6`, like a spreadsheet. A block covers one cell (`"B3"`) or a
  rectangle, top-left and bottom-right corners included (`"A1:C2"` is three
  columns wide, two rows tall). Blocks of one level must not overlap. The order
  of the array does not matter; the grid alone decides where a block is.
- **Link:** `from`, `to` (ids of two blocks of one level), optional `label`,
  `direction`: `forward` (default), `both`, `none`, and `style`: `solid`
  (default), `dashed`, `dotted`.

## Pick a blueprint

Each kind of diagram has its own layout and its own rules for arrows. Pick
one for the top level and read its file before laying out; a block deeper
down may take another one (see Nesting).

| The subject | Blueprint | File |
|---|---|---|
| Peers with no order: parts, domains, options, subtasks | Basic blocks: centred, room between | `references/blueprints/basic.md` |
| A system, a codebase, infrastructure | Architecture: layers along the request, a hub, a tree | `references/blueprints/architecture.md` |
| A plan, a to-do list, the outline of a talk | Plan: a staircase, each step one column to the right | `references/blueprints/plan.md` |
| An algorithm, a procedure with conditions and loops | Flowchart: ISO 5807 shapes, one main column | `references/blueprints/flowchart.md` |

When unsure, take basic blocks.

## Nesting

A block opens into children for one of two reasons, and they decide how the
children look.

1. **Grouping.** The things did not fit on the level above (more than six),
   or reading them is easier in groups. The children are more of the same,
   so they keep the parent level's blueprint: the same style, the same
   direction (a staircase stays a staircase going the same way, tiles stay
   tiles). Peers on one screen lay out their children alike, so the reader
   knows where they are without reading.
2. **Composition.** The block is a thing of its own, and its inside is
   another kind of content: a milestone holds tasks, a task holds a system,
   a service holds its algorithm. The children then take the blueprint that
   fits them.

**Text is the bottom of a branch.** A TakeSix diagram is read by opening
blocks; text is what is left when the reader has reached the end of a
branch: the code, the numbers, the reasoning. So long text goes to the
`details` of leaf blocks, and a block with children has only its one-line
`description` (see "Blocks or text" below).

Example of composition, an epic (`references/blueprints/epic.takesix.json`):

```
Epic: card payments                    plan: milestones as a staircase, status icons
└─ Build ⏳                            basic: the milestone's tasks as tiles
   └─ Payment API                      architecture: gateway → service → database, Stripe beside
      └─ Charge service                flowchart: request → Stripe → Approved? → save / decline
         └─ Save the charge            details: the SQL snippet and why it is idempotent
```

## How to make it readable

These rules come from reviewing real generated diagrams. They are about what
the reader sees, so keep the viewer in mind while writing.

**Headers and cards**
- The screen header shows the document's `title` + `description` on the top
  level, and the opened block's `title` + `description` below it. Write a real
  description for the document and for every block with children: it is the
  first sentence the reader sees on that screen. Do not add an "Overview" block
  for this.
- A card shows only icon, title, one line of description and what it opens
  into: "N more inside" for children, "Read" for text. Children are not
  previewed, so the title and description must say what is inside. The
  opened screen shows the block's whole description in its header.
- **Text must fit the block's size.** A card never shrinks its text: a
  description longer than the card holds is cut off with "…", and a long
  title pushes the description out. The budget is set by the narrowest place
  a diagram is shown: **embedded in a chat column, about 720px wide**, where
  the grid's cells are square. A laptop screen stretches the grid (up to
  2:1) and shows more, so text that fits the chat fits everywhere.

  What each width shows (characters on one line, with an icon beside the
  text, Cyrillic; Latin fits about 5% more):

  | Width (columns) | 1 | 2 | 3 | 4 | 5 | 6 |
  |---|---|---|---|---|---|---|
  | Shows | icon only | short title | title + description | ← | ← | ← |
  | Title, chars per line | — | 12 | 23 | 35 | 47 | 44 |
  | Description, chars per line | — | 15 | 30 | 45 | 57 | 57 |

  1. **One column: an icon, no text.** The card shows only its icon, large
     and centred; the title becomes a tooltip and the description is not
     shown. **Prefer it whenever the icon alone names the thing beyond
     doubt**: a reader who sees only the picture would say its title without
     hovering (🔒 for a lock, a phone, a database cylinder, a pump; ✅ ⏳ for
     a status). If the reader would have to guess (🎭 for smoke tests, 🔁
     for CI, 🐤 for a canary), give it two columns and a title instead.
     Always set an icon, and still name the thing in the parent's
     description or a link label.
  2. **Two columns: a short title**, one or two words (up to 12 characters
     on a line). Its description shows one line of about 15 characters:
     keep it to a few words or leave it out.
  3. **Three columns and wider: title and description** to the budget above.

  Lines by height (rows): a one-row card shows the title on one line and one
  line of description. Every extra row adds about five lines of description,
  and the title may then take two lines:

  | Height (rows) | 1 | 2 | 3 | 4 | 5 | 6 |
  |---|---|---|---|---|---|---|
  | Description lines | 1 | 6 | 11 | 16 | 21 | 26 |

  So a 3×1 card holds about 30 characters of description, a 3×2 card about
  180. If a block needs more, make it bigger or move text to `details`, not
  the text smaller. `validate` warns about every title and description over
  its budget, and about a one-column block without an icon.
- `description` is one short line. Anything longer — explanations, code,
  lists, caveats — goes into `details`: the block then opens into that text,
  on a screen of its own, instead of into blocks. It is a small Markdown subset:
  headings, paragraphs, `-` and `1.` lists, `code`, **bold**, *italic*, fenced
  code and `https` links. **No tables and no HTML**: they show as raw text.
  Write a table as a list (`- **0x01** Plant container`).

**Blocks or text: where the parent's text goes**
- A block opens either into child blocks (`children`) or into text
  (`details`), never both; `validate` rejects a block with both. When a block
  with children seems to need text of its own, try these in order:
  1. **Drop** text that only introduces the children ("This section covers…"):
     the screen header and the cards already say it.
  2. **Squeeze** an introductory thought into the block's `description`: it
     shows in full in the header of the opened screen.
  3. **Move** real content (constraints, a rationale, an example) into a child
     block of its own, named for what it says ("Constraints", "Why Postgres"),
     with the text in its `details`; or into the `details` of the children it
     is about.
  4. **Fold**: when the children are small (a title and a few words each),
     remove them and write what they say as this block's `details`.
- A text block is a leaf: it has no children. Give it a title and
  description that tell the reader what they will read.

**Layout: use the whole grid, and space is a tool**

The grid keeps its proportions: square cells when embedded in a chat, up to
twice as wide as tall on a large screen. Empty cells stay empty on screen, so where you leave space is as visible as where
you put a block. Each blueprint gives the shapes for its kind of diagram;
these rules hold for all of them.
- **Balance the screen.** Place the blocks as one composition: do not pack
  them into the top-left corner or leave half the screen empty, and do not
  try to fill every cell.
- **Size a block by what it has to say** (see the widths above): one column
  for an icon, two for a name, three or more for a name and a sentence.
  Give more only to the block the level is about (a tall or wide block draws
  the eye first), or when its text needs it. A block much bigger than its
  text reads as an empty box.
- **Put an empty cell between blocks linked by an arrow.** With a free column
  between them a horizontal arrow has room to read and room for its label; the
  same goes for a free row between blocks linked from top to bottom. Blocks
  that touch get a stub of an arrow and no label, and `validate` warns about
  them. A chain that does not fit one row with gaps (six one-column steps
  need eleven columns) wraps onto the next row with an empty row between,
  or splits into two groups.
- **Distance says how things relate.** Blocks that belong together sit close;
  separate groups get an empty column or row between them. Use it instead of
  extra boxes or links.

**Arrows on the grid**
- Arrows run straight between blocks that share a row or a column, and as a
  smooth curve, side to side, between blocks that share neither. A straight
  arrow with a block in its way goes around it: beside the column (the way
  back of a loop) or below the row, on the side without blocks.
- Arrows should not cross, and a curved arrow must not have a third block in
  its way. Trace each link on your sketch; `validate` lists both as layout
  hints.
- Read order is left to right, then top to bottom. Put sources on the left (or
  top) and what they lead to on the right (or below). Only a loop in a
  flowchart goes back.

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

**Links: only where they matter**
- A link joins two blocks of one level. To connect parts deep inside two
  blocks, link those two blocks on the level they share and name the parts
  in a description; a link between levels is never drawn.
- How many arrows a level carries depends on the blueprint: a flowchart links
  every step, a plan almost none. Everywhere else, draw a link only when the
  relationship is the point, and keep about as many arrows as blocks.
- If two blocks depend on each other, use one `direction: "both"` link
  instead of two opposite arrows. In a sequence, link only consecutive blocks
  (1 → 2 → 3): a link that skips a step has the step in its way.
- Labels: an arrow across a free cell has room for a couple of words; an
  arrow between blocks that touch has none. Leave it unlabelled rather than
  overflow onto the cards, or move the blocks apart.
- `style: "dashed"` sets apart an optional or exceptional path; keep the main
  path solid.

**Icons**
- `icon` is an emoji, a single character, or an inline SVG drawing:
  `"<svg viewBox='0 0 24 24'>…</svg>"` (one `<svg>` element; `xmlns` may
  be left out). Draw what no emoji says: a part of the system, a chart
  trend, a device, a status. The viewer shows it as an image, so scripts,
  links and external files do nothing.
- Keep SVGs small and simple: a 24×24 `viewBox`, a few shapes, strokes
  about 2 wide, and no text inside (it is too small to read). Use colours
  that read on light and dark backgrounds (mid tones such as `#3d6aff`,
  `#e5484d`, `#30a46c`, `#f5a524`, `#8e8e93`); not black or white.
- On a one-column block the icon is the whole card, so make it count.

**Structure**
- Six is a hard limit (the validator rejects seven). When you have more, group
  them into a parent block that names what they share — but group by meaning
  even when you are under six (see above).
- Use short, readable, stable ids (`api-charge`, `db-orders`).
- Icons are optional; when used, keep them consistent (one per kind of thing,
  or status marks such as ✅ ⏳ ○ for plans). Flowchart blocks need none: the
  shape says what they are.

## Editing an existing diagram

When asked to change a `.takesix.json`, edit the JSON in place, keep existing
ids (links and readers rely on them), then validate and render again. To make
room for a new block, move others with `at`; do not reuse an id.

## Reference

- `references/format.md` — the full format specification: every field, the
  grid, validation rules, how links are shown, flowchart symbols.
- `references/blueprints/` — one file per kind of diagram (see "Pick a
  blueprint"), and `epic.takesix.json`, an example of composition.
