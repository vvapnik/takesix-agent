# Blueprint: architecture

Use it for a system, a codebase, an infrastructure: what it consists of and
how data moves between the parts. Think of the levels of C4: the top level is
the system in its context (users, the system, the systems it talks to) or
its main layers; each level below opens one container or layer into its
components.

## The level

**Layers top to bottom, along the path of a request.** The thing that starts
the flow (users, clients) on top, then the layers it passes through, storage
at the bottom, with an empty row between layers so each arrow has room for
its label. A cross-cutting concern (operations, security, observability)
stands beside the column, unlinked.

```
Layers with a concern beside            Hub: one centre, its neighbours
   A  B  C  D  E  F                        A  B  C  D  E  F
1  ·  cl cl ·  ·  ·                     1  ·  ·  n1 n1 ·  ·
2  ·  ·  ·  ·  ·  ·                     2  ·  ·  ·  ·  ·  ·
3  ·  pl pl ·  op op                    3  n2 n2 h  h  n3 n3
4  ·  ·  ·  ·  ·  ·                     4  ·  ·  ·  ·  ·  ·
5  ·  db db ·  ·  ·                     5  ·  ·  n4 n4 ·  ·

Main block with helpers                 Tree: one part fans out
   A  B  C  D  E  F                        A  B  C  D  E  F
1  m  m  m  m  ·  h1                    1  ·  ·  ·  ·  c1 c1
2  m  m  m  m  ·  ·                     2  ·  ·  ·  ·  ·  ·
3  m  m  m  m  ·  h2                    3  r  r  ·  ·  c2 c2
4  ·  ·  ·  ·  ·  ·                     4  ·  ·  ·  ·  ·  ·
5  ·  ·  ·  ·  ·  h3                    5  ·  ·  ·  ·  c3 c3
```

- **Layers** suit services and web apps (the request path).
- **Hub** suits one central service or database with its clients around it.
- **Main block with helpers**: a tall or wide block draws the eye first; give
  it to the part the level is about, the helpers stay small beside it.
- **Tree** suits a gateway or a router that dispatches to several parts.

## Dividing into levels

Nesting is "consists of": a service holds its modules, a database its tables,
a layer its services. Parts never sit beside their whole on one level. Inside
a layer the parts are usually peers: lay them out as basic blocks, centred,
with room between. A chain inside a part (a queue between a scheduler and
workers) runs as a staircase, down and to the right.

## Arrows

Arrows are data flows, labelled with what travels or how: `HTTPS`, `SQL`,
`events`, `jobs`. A link joins two blocks of one level only: to show that a
module deep in the API writes to the database, link **API → Database** on the
level where both stand, and name the module in the API's description or
details. Keep about as many arrows as blocks; dependencies everyone knows
("everything logs") stay unlinked.

## Icons and text

One icon per kind of part (⬡ service, ◫ storage, ◉ client, ⚙ job), the same on
every level. Descriptions say the technology and the role ("PostgreSQL:
orders and users"). Configuration, endpoints, schemas and code go to
`details` of the leaf parts.

## Example

```json
{
  "takesix": "1.0",
  "title": "Shop backend",
  "description": "A request goes from top to bottom, operations beside",
  "blocks": [
    { "id": "clients", "at": "B1:C1", "icon": "◉", "title": "Clients", "description": "Web and mobile apps" },
    { "id": "api", "at": "B3:C3", "icon": "⬡", "title": "API", "description": "REST, auth, orders" },
    { "id": "db", "at": "B5:C5", "icon": "◫", "title": "Database", "description": "PostgreSQL" },
    { "id": "ops", "at": "E3:F3", "icon": "⚙", "title": "Operations", "description": "Logs, metrics, deploys" }
  ],
  "links": [
    { "id": "l1", "from": "clients", "to": "api", "label": "HTTPS" },
    { "id": "l2", "from": "api", "to": "db", "label": "SQL" }
  ]
}
```

## Avoid

- A link from a nested module to a block of another level: it is never
  drawn. Link the blocks that contain them.
- One giant level with every service: group by layer or domain.
- Infrastructure details (ports, env vars) on cards: they go to `details`.
- Arrows that point back up for responses: one arrow per flow, in the
  direction of the request.
