# Blueprint: flowchart of an algorithm

Use it for an algorithm, a procedure, a decision process: steps that run in
order, with conditions and loops. Blocks take the symbols of ISO 5807 with
`shape`, arrows take a line `style` (see "Flowcharts" in
`references/format.md`).

| `shape` | For |
|---|---|
| `terminator` | start and end |
| `process` (default) | a step that does something |
| `decision` | a condition; each exit is a link with a `label` |
| `io` | data in or out: read a file, receive a request, print |
| `subprocess` | a step whose own steps are inside it (`children`) |
| `loop-start`, `loop-end` | the two ends of a loop, the body between them |

## The level

**One main column from top to bottom**, start on top, end at the bottom,
one step per row. Branches of a decision go to the right; a loop goes back
up beside the column, on the side with no blocks. Keep a column free for it.

```
Condition and retry                     Loop over items
   A  B  C  D  E  F                        A  B  C  D  E  F
1  ·  st st ·  ·  ·                     1  ·  ·  st st ·  ·
2  ·  ch ch ·  ·  ·                     2  ·  ·  rd rd ·  ·
3  ·  q? q? ·  ok ok                    3  ·  ·  ls ls ·  ·
4  ·  q? q? ·  ·  ·                     4  ·  ·  bd bd ·  ·
5  ·  wt wt ·  en en                    5  ·  ·  le le ·  ·
                                        6  ·  ·  en en ·  ·
```

- `q?` is a `decision` two rows tall: the diamond needs the height for its
  text. "yes" goes right to `ok`, "no" goes down to `wt`, and `wt` links
  back up to `ch`: the arrow goes around `q?` through column A.
- `ls` and `le` are `loop-start` and `loop-end`; the body `bd` between them
  is usually a `subprocess` that opens into its steps.

At most six blocks a level: start, four steps, end. A longer algorithm is
split into `subprocess` blocks, each opening into its own flowchart (its
own start and end) — not into a long column.

## Dividing into levels

A `subprocess` is the only block that opens into children here, and its
children are a flowchart again: the same column, the same direction. A step
that needs explaining (the formula, the SQL, the code) opens into `details`
with a fenced code block: that is the bottom of the branch.

## Arrows

Every step links to the next one; that is the flowchart. Each exit of a
decision has a `label` ("yes" / "no", or three for a comparison); 2–3 exits.
Use `style: "dashed"` for an optional path or an error path, so the main
path stands out. `validate` warns about a decision without labelled exits
and about more than one start on a level.

## Icons and text

No icons: the shape says what the block is. Titles are short commands or
questions ("Charge the card", "Paid?"); a diamond holds about half the text
of a rectangle of the same size, so keep its title to a few words and leave
out the description.

## Example

```json
{
  "takesix": "1.0",
  "title": "Charge an order",
  "description": "Retry until the card is charged",
  "blocks": [
    { "id": "start", "at": "B1:C1", "shape": "terminator", "title": "Start" },
    { "id": "charge", "at": "B2:C2", "title": "Charge the card" },
    { "id": "paid", "at": "B3:C4", "shape": "decision", "title": "Paid?" },
    { "id": "wait", "at": "B5:C5", "title": "Wait an hour" },
    { "id": "ship", "at": "E3:F3", "title": "Ship the order" },
    { "id": "end", "at": "E5:F5", "shape": "terminator", "title": "End" }
  ],
  "links": [
    { "id": "l1", "from": "start", "to": "charge" },
    { "id": "l2", "from": "charge", "to": "paid" },
    { "id": "l3", "from": "paid", "to": "ship", "label": "yes" },
    { "id": "l4", "from": "paid", "to": "wait", "label": "no" },
    { "id": "l5", "from": "wait", "to": "charge", "label": "retry" },
    { "id": "l6", "from": "ship", "to": "end" }
  ]
}
```

## Avoid

- A flowchart drawn with plain cards: the reader cannot tell a step from a
  condition.
- Links from a step inside a `subprocess` to a step outside it: they are
  never drawn. The flow enters and leaves the `subprocess` block on its own
  level.
- A decision without labels on its exits, or with one exit.
- The way back of a loop squeezed between blocks with no free column.
