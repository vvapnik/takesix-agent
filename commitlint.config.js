// Conventional Commits, see CONTRIBUTING.md
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', ['skill', 'mcp', 'cli', 'viewer', 'evals', 'deps', 'release']],
  },
}
