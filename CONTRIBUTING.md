# Contributing

Thanks for helping with takesix! This file covers how to set up the project
and how to write commits.

## Setup

Use Node 24 LTS (`.nvmrc`; with nvm run `nvm use`). `@takesix/core` and
`@takesix/react` come from npm; to work against unreleased changes, `npm link`
them from local checkouts.

```bash
npm install
npm run build   # skill script and viewer, MCP view, MCP server
npm test
```

The skill's built script (`skill/takesix/scripts/takesix.mjs`, with the viewer
from `@takesix/react/standalone` inside) is committed, so the skill folder works
on its own: commit it after a build. CI fails when it is out of date.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/). The
history drives versioning and the changelog, so please follow it.

```
<type>(<scope>): <summary>

<body: why and what, optional>

<footer: BREAKING CHANGE, Refs #12, optional>
```

- English, imperative mood: "add", not "added" or "adds".
- Lower case summary, no trailing period, first line at most 72 characters.
- One logical change per commit.

### Types

| Type | Use for | Release |
|---|---|---|
| `feat` | a new capability | minor |
| `fix` | a bug fix | patch |
| `perf` | faster, same behaviour | patch |
| `refactor` | code change without behaviour change | — |
| `docs` | README, comments | — |
| `test` | tests only | — |
| `build` | build setup, dependencies, package.json | — |
| `ci` | GitHub Actions | — |
| `chore` | anything else (.gitignore, configs) | — |

### Scopes

`skill` (SKILL.md and its rules), `mcp` (the MCP server and its view), `cli`
(the skill's script), `viewer` (the viewer in rendered HTML), `evals`, `deps`,
and `release` for version bumps (`chore(release): 1.2.0`). Leave the scope out
when a change touches the whole repository.

A version bump changes `package.json`, both versions in `server.json` (MCP
Registry) and `.claude-plugin/plugin.json`; `test/manifests.test.ts` fails
when they differ.

CI checks every pushed commit with commitlint (`commitlint.config.js`). To
check yours before pushing: `npx commitlint --from origin/main`.

### Breaking changes

Add `!` after the type and explain in a `BREAKING CHANGE:` footer. This bumps
the major version.

```
feat(editor)!: rename onUpdate prop to onChange

BREAKING CHANGE: TakeSix now takes onChange instead of onUpdate.
```

### Examples

```
feat(arrows): label arrows with link labels
fix(viewer): measure arrows after the zoom animation ends
feat(editor)!: rename onUpdate prop to onChange
build(deps): bump vite to 8.4
```

### No AI co-author trailers

Do not add `Co-Authored-By` trailers (or similar attribution lines) for AI
models or coding assistants. Commits are authored by the person who submits
them, and that person is responsible for the change. `Co-Authored-By` is for
human co-authors only.

## Releases

Releases are automated with
[release-please](https://github.com/googleapis/release-please). Nobody edits
the version or the changelog by hand.

1. Every push to `main` updates a Release PR titled `chore(release): X.Y.Z`.
   The version follows from the commit types since the last release (see
   [Types](#types)); the PR bumps the version in `package.json`, `server.json` and `.claude-plugin/plugin.json` and
   adds the `feat`, `fix` and `perf` commits to `CHANGELOG.md`.
2. To release, squash-merge the Release PR. `publish.yml` then tags
   `vX.Y.Z`, creates the GitHub Release, runs CI and publishes to npm with
   provenance. Versions with a pre-release part (`1.1.0-beta.1`) go to the
   `next` dist-tag.

To force a version, add a `Release-As: 2.0.0` footer to a commit. Settings
are in `release-please-config.json`; `.release-please-manifest.json` holds
the last released version.
