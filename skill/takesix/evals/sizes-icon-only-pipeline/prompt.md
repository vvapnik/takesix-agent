---
tags: [sizes, icons]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

I want our CI/CD pipeline at a glance — it gets embedded in our team chat, so keep it compact and mostly pictures, details one click away. On every push: checkout, lint (ESLint), unit tests (Vitest, must keep 80 % coverage), build a Docker image, scan it (Trivy, fails on critical CVEs) and push it to our registry. On merge to main it deploys to staging, runs smoke tests (Playwright, 12 checks) and then waits for a manual approval before deploying to production with a canary at 5 % for 30 minutes. A failure anywhere posts to the #releases channel. Save it in the current folder as `pipeline.takesix.json`.
