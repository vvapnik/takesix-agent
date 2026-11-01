// The rules for writing a good diagram live in the skill (skill/takesix/SKILL.md).
// The MCP server hands the same text to agents, with a preface that maps the
// skill's script commands to the server's tools.

const PREFACE = `# TakeSix over MCP

You have the takesix MCP tools. Where the guide below says to run
\`scripts/takesix.mjs\`, use the tools instead:

- \`validate\` instead of \`takesix.mjs validate\`: pass the document (or a
  \`.takesix.json\` file path) and fix every problem it lists, by its JSON path.
- \`show\` instead of \`takesix.mjs render\`: it validates, writes one
  self-contained HTML file and, in apps that support MCP Apps, shows the
  diagram right in the conversation.

Write the document as JSON, validate it, then show it. Reply briefly: the
diagram is the answer.

---

`

/** The skill's text without its YAML frontmatter, preceded by the MCP preface. */
export function guideText(skillMd: string): string {
  const body = skillMd.replace(/^---\n[\s\S]*?\n---\n/, '').trim()
  return PREFACE + body + '\n'
}
