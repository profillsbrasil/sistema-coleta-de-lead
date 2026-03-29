# Deferred Items

## 2026-03-29

- `bun run check` fails outside this plan's scope because Biome detects nested root configs in `.claude/worktrees/agent-a5f40826/biome.json`, `.claude/worktrees/agent-a7473e54/biome.json`, and `.claude/worktrees/agent-aba73162/biome.json`. This plan's touched files pass targeted tests, `bun run check-types`, and `bun run test`, so the workspace-level lint blocker remains deferred.
