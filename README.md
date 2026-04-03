# RSVP Reader

Speed-read markdown files, selections, and AI responses using Rapid Serial Visual Presentation (RSVP). Works as a VS Code extension and a standalone CLI tool, with native cmux integration for auto-playing Claude Code and Codex CLI responses.

---

## Features

- **VS Code extension** — read any `.md` file or selected text in a focused webview panel
- **CLI tool** — pipe any text directly into the RSVP reader from your terminal
- **cmux auto-play** — Claude Code and Codex CLI responses >30 words automatically play in a split pane
- **ORP highlighting** — Optimal Recognition Point character highlighted in each word to anchor the eye
- **Scroll sync** — RSVP panel stays in sync with the active text editor and MdAIO preview
- **Configurable WPM** — default 250, adjustable per-session or via VS Code settings

---

## Installation

### VS Code Extension

```bash
cd rsvp-reader
npm install
npm run compile
```

Then install the extension from the VS Code Extensions panel or press `F5` to launch a development host.

### CLI

```bash
npm run compile
npm link   # puts `rsvp` on your PATH
```

---

## Usage

### VS Code

| Action | How |
|--------|-----|
| Read current `.md` file | `cmd+shift+r` (no selection) |
| Read selected text | Select text → `cmd+shift+r` |
| Play / pause | `cmd+shift+space` |
| Read from file explorer | Right-click `.md` → RSVP: Read File |
| Read with MdAIO preview | Editor title bar → eye icon |

### CLI

```bash
rsvp file.md              # read a file
echo "some text" | rsvp   # pipe any text
rsvp --wpm=350 file.md    # custom speed
```

**Keyboard controls while playing:**

| Key | Action |
|-----|--------|
| `space` | Play / pause |
| `←` / `→` | Skip 5 words back / forward |
| `q` | Quit |

### cmux Auto-play

When running inside [cmux](https://cmux.app), Claude Code and Codex CLI responses are automatically played after each turn (if >30 words). The RSVP panel opens as a right split within your current workspace pane and closes automatically when the next response arrives.

**Requirements:**
- `rsvp` on PATH (`npm link`)
- `cmux` installed and active
- Claude Code hook registered in `~/.claude/settings.json`
- `[features] codex_hooks = true` in `~/.codex/config.toml`

The canonical hook scripts live in [`agent-config`](https://github.com/gsbakshi/agent-config) and are deployed via `sync.sh`:

```
agent-config/canonical/cmux-notify.sh    → ~/.claude/hooks/cmux-notify.sh
agent-config/canonical/codex-hooks.json  → ~/.codex/hooks.json
```

---

## Configuration (VS Code)

| Setting | Default | Description |
|---------|---------|-------------|
| `rsvp.wpm` | `250` | Words per minute |
| `rsvp.fontSize` | `3.0` | Word display size in rem |
| `rsvp.backStepWords` | `5` | Words to skip with ← button |
| `rsvp.skipCodeBlocks` | `true` | Skip code blocks in markdown |

---

## Project Structure

```
rsvp-reader/
├── src/
│   ├── extension.ts      command registration
│   ├── rsvpPanel.ts      webview panel lifecycle + scroll sync
│   ├── rsvpEngine.ts     playback engine (shared by extension + CLI)
│   ├── mdParser.ts       markdown → word token pipeline
│   └── cli.ts            standalone CLI entry point
├── media/
│   └── rsvp.html         webview UI
├── hooks/
│   └── stop-hook.sh      reference hook script for cmux integration
├── out/                  compiled output (gitignored)
└── package.json
```

---

## Development

```bash
npm run compile   # one-shot build
npm run watch     # watch mode
```

The CLI entry point (`src/cli.ts`) compiles to `out/cli.js` with a `#!/usr/bin/env node` shebang. The `compile` script runs `chmod +x` automatically.

---

## License

MIT — see [LICENSE](LICENSE)
