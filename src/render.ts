import type { TakeSixDocument } from '@takesix/core'

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * One self-contained HTML page: the document as JSON plus the inlined viewer.
 * `<` in the JSON is escaped, so no text in the document can close the
 * <script> element and inject markup.
 */
export function renderHtml(doc: TakeSixDocument, viewerJs: string, viewerCss: string): string {
  const json = JSON.stringify(doc).replace(/</g, '\\u003c')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="takesix">
<title>${escapeHtml(doc.title)}</title>
<style>html, body, #root { height: 100%; margin: 0; }</style>
<style>${viewerCss}</style>
</head>
<body>
<div id="root"></div>
<script type="application/json" id="takesix-data">${json}</script>
<script>${viewerJs}</script>
</body>
</html>
`
}
