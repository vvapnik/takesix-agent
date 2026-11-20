# Blueprint: basic blocks

The default. Use it when the parts of the subject are peers and no order or
flow between them is the point: the parts of a document, the domains of a
data model, the options of a comparison, the subtasks of a milestone. When
something flows (requests, steps, a plan), take another blueprint.

## The level

**Blocks gather around the middle of the grid, with room between them.** The
screen should look composed, not packed into a corner:

- about as much free space to the left as to the right, above as below;
- an empty row between rows of blocks, so the eye separates them;
- blocks two columns wide: one row tall for a name alone, two rows (a
  square: two-line title, about 90 characters of description) when it has
  a description, as in the 2×2 variants below; see the text budget in
  SKILL.md.

Places by number of blocks (`·` is an empty cell):

```
3 blocks: one row in the middle      4 blocks: two by two
   A  B  C  D  E  F                     A  B  C  D  E  F
1  ·  ·  ·  ·  ·  ·                  1  ·  ·  ·  ·  ·  ·
2  ·  ·  ·  ·  ·  ·                  2  ·  a  a  b  b  ·
3  a  a  b  b  c  c                  3  ·  ·  ·  ·  ·  ·
4  ·  ·  ·  ·  ·  ·                  4  ·  c  c  d  d  ·

5 blocks: three over two             6 blocks: three by two
   A  B  C  D  E  F                     A  B  C  D  E  F
1  ·  ·  ·  ·  ·  ·                  1  ·  ·  ·  ·  ·  ·
2  a  a  b  b  c  c                  2  a  a  b  b  c  c
3  ·  ·  ·  ·  ·  ·                  3  ·  ·  ·  ·  ·  ·
4  ·  d  d  e  e  ·                  4  d  d  e  e  f  f
```

With descriptions, make each block two rows tall and keep the empty row:
4 blocks at `B1:C2`, `D1:E2`, `B4:C5`, `D4:E5`; 6 blocks at `A1:B2`,
`C1:D2`, `E1:F2`, `A4:B5`, `C4:D5`, `E4:F5`.

Two blocks: `"B3:C3"` and `"D3:E3"`, or one above the other in `B:E`,
rows 2 and 4. One block alone means the level is not needed: fold it into
its parent.

## Dividing into levels

One principle per level: by kind, by domain, by part. A child level of a
basic block is basic too when it only groups more of the same (see nesting
in SKILL.md). Six is a ceiling, not a target: three blocks that each mean one
thing beat six where some are leftovers.

## Arrows

Few or none: peers are related by being on one screen. Draw an arrow only
when one block really uses or produces another, and then put an empty column
or row between the two blocks so the arrow and its label have room.

## Icons and text

An icon per kind of thing, the same icon for the same kind across levels.
Titles name the part; descriptions say what is in it, since children are not
previewed. Long text goes to `details` at the bottom of a branch.

## Example

```json
{
  "takesix": "1.0",
  "title": "Online shop data",
  "description": "Four domains; open one for its tables",
  "blocks": [
    { "id": "catalog", "at": "B2:C2", "icon": "◫", "title": "Catalog", "description": "Products, prices, stock" },
    { "id": "orders", "at": "D2:E2", "icon": "◫", "title": "Orders", "description": "Carts, orders, payments" },
    { "id": "people", "at": "B4:C4", "icon": "◫", "title": "Customers", "description": "Accounts and addresses" },
    { "id": "ship", "at": "D4:E4", "icon": "◫", "title": "Shipping", "description": "Parcels and carriers" }
  ]
}
```

## Avoid

- Blocks packed into the top-left corner, or one row of blocks in row 1.
- Every block as wide as its row: the screen reads as a list, not as parts.
- Arrows between every pair "because they are related".
- A seventh thing squeezed in as a one-column block: group instead.
