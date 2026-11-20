# Blueprint: plan, to-do list, presentation

Use it for anything read in order: a plan or roadmap, a to-do list, the
stages of an epic, the outline of a talk or presentation. The order is the
point, so the layout shows it.

## The level

**A staircase: each next block one row down and one column to the right.**
The eye runs down the diagonal and never loses the order. All steps have the
same width; the width follows from the number of steps:

```
4 steps, three columns wide             5 steps, two columns wide
   A  B  C  D  E  F                        A  B  C  D  E  F
1  s1 s1 s1 ·  ·  ·                     1  s1 s1 ·  ·  ·  ·
2  ·  s2 s2 s2 ·  ·                     2  ·  s2 s2 ·  ·  ·
3  ·  ·  s3 s3 s3 ·                     3  ·  ·  s3 s3 ·  ·
4  ·  ·  ·  s4 s4 s4                    4  ·  ·  ·  s4 s4 ·
                                        5  ·  ·  ·  ·  s5 s5
```

Three steps: `"A2:D2"`, `"B3:E3"`, `"C4:F4"` (four columns wide, rows 2–4).
Six steps would be one column wide: too narrow for real titles, so group
finished or minor steps into one block (`"Done: setup"`) instead.

## Dividing into levels

- A step opens into its subtasks. When they are steps again (a sub-plan),
  they take the same staircase; when they are independent pieces of work,
  lay them out as basic tiles.
- A plan longer than six steps is grouped: phases on the top level, steps
  inside each phase, all as staircases going the same way.
- A presentation: one screen, one thought. The top level is the outline in
  the order of the talk; each block opens into what that part says. Keep it
  shallow, two or three levels.

## Arrows

None between steps: the staircase already shows the order. Add an arrow
only for a real dependency that skips the order (step 4 needs the result of
step 1), and then prefer saying it in the description.

## Icons and text

Status as the icon: ✅ done, ⏳ in progress, ○ not started (for a
presentation: none, or one per kind of slide). Titles are the step names
with an action ("Migrate the database"), descriptions say the outcome or the
date. Notes, acceptance criteria and speaker notes go to `details` at the
bottom of the branch.

## Example

```json
{
  "takesix": "1.0",
  "title": "Checkout redesign",
  "description": "Four stages; open one for its tasks",
  "blocks": [
    { "id": "research", "at": "A1:C1", "icon": "✅", "title": "Research", "description": "Interviews and funnel data" },
    { "id": "design", "at": "B2:D2", "icon": "✅", "title": "Design", "description": "Flows and prototype" },
    { "id": "build", "at": "C3:E3", "icon": "⏳", "title": "Build", "description": "Frontend and payment API" },
    { "id": "launch", "at": "D4:F4", "icon": "○", "title": "Launch", "description": "A/B test, then everyone" }
  ]
}
```

## Avoid

- Steps wrapped onto the next row from the left: the order turns back.
- A list of six full-width rows: it reads as a table, not as a plan.
- Arrows 1 → 2 → 3 along the staircase: noise.
- Steps of different widths: the diagonal breaks.
