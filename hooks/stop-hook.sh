#!/bin/bash
# RSVP Stop hook — works with both Claude Code and Codex CLI.
#
# Claude Code  → add to ~/.claude/settings.json:
#   "hooks": { "Stop": [{ "hooks": [{ "type": "command", "command": "/path/to/stop-hook.sh" }] }] }
#
# Codex CLI    → enable hooks in ~/.codex/config.toml:
#   [features]
#   codex_hooks = true
#
#   then add to ~/.codex/hooks.json:
#   { "Stop": [{ "command": "/path/to/stop-hook.sh", "timeout": 60 }] }

INPUT=$(cat)

# Guard against stop-hook recursion (Claude Code sets this)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active // false')" = "true" ]; then
  exit 0
fi

MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // empty')

if [ -z "$MSG" ]; then
  exit 0
fi

# Find rsvp binary (npm link puts it in PATH; fallback to repo location)
RSVP=$(command -v rsvp 2>/dev/null || echo "node $(dirname "$0")/../out/cli.js")

# Open a new cmux split for the RSVP pane and play the message.
# If cmux is not available, fall back to playing in the current terminal.
if command -v cmux &>/dev/null; then
  # Send the message to a new right-hand split
  SURFACE=$(cmux new-split right --json 2>/dev/null | jq -r '.surface_id // empty')
  if [ -n "$SURFACE" ]; then
    echo "$MSG" | cmux send-surface --surface "$SURFACE" "$RSVP"
    exit 0
  fi
fi

# Fallback: play inline (blocks until done or user quits)
echo "$MSG" | $RSVP
