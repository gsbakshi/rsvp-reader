#!/bin/bash
# SPDX-License-Identifier: GPL-3.0-only
# Copyright (c) 2026 Gurmehar Singh Bakshi
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

WORD_COUNT=$(echo "$MSG" | wc -w | tr -d ' ')
if [ "${WORD_COUNT:-0}" -le 30 ]; then
  exit 0
fi

# Find rsvp binary (npm link puts it in PATH; fallback to repo location)
if command -v rsvp &>/dev/null; then
  RSVP="$(command -v rsvp)"
  RSVP_ARGS=()
else
  RSVP="node"
  RSVP_ARGS=("$(dirname "$0")/../out/cli.js")
fi

# Open a new cmux split for the RSVP pane and play the message.
# If cmux is not available, fall back to playing in the current terminal.
if command -v cmux &>/dev/null; then
  SURFACE=$(cmux new-split right 2>/dev/null | grep -oE 'surface:[0-9]+')
  if [ -n "$SURFACE" ]; then
    TMPFILE=$(mktemp /tmp/rsvp-msg.XXXXX)
    chmod 600 "$TMPFILE"
    echo "$MSG" > "$TMPFILE"
    QUOTED_ARGS=$(printf "'%s' " "${RSVP_ARGS[@]}")
    cmux send --surface "$SURFACE" "cat '$TMPFILE' | '$RSVP' ${QUOTED_ARGS}; rm -f '$TMPFILE'"
    cmux send-key --surface "$SURFACE" Enter
    exit 0
  fi
fi

# Fallback: play inline (blocks until done or user quits)
echo "$MSG" | "$RSVP" "${RSVP_ARGS[@]}"
