---
tags: [blueprints]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Draw me the flowchart of our password reset: the user enters their email; if no account has that email we still show "check your inbox" and stop. Otherwise we create a token valid for 30 minutes and email a link. When the user opens the link, an expired token sends them back to request a new one. A valid token lets them enter a new password; if it is weaker than our rules (12+ chars, not in the breach list) they are asked again. Then we save the hash, revoke all sessions and show "password changed". I want it as a takesix diagram. Save it in the current folder as `password-reset.takesix.json`.
