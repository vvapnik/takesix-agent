---
tags: [blueprints]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Can you map out how our SaaS backend fits together? Browser and mobile clients call a REST API (Node, behind an nginx gateway that does TLS and rate limiting). The API has auth, billing and projects modules. It stores data in PostgreSQL and puts background jobs on a Redis queue that two worker processes consume (emails, PDF exports). Billing talks to Stripe, exports land in S3. Logs and metrics go to Grafana Cloud. I'd like a diagram I can click into, not an essay. Save it in the current folder as `saas-backend.takesix.json`.
