# RSVP Reader

> **Beta** — This project is in active development. Expect rapid releases, breaking changes, and incomplete features. Use it, break it, report it.

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

When running inside [cmux](https://cmux.com), Claude Code and Codex CLI responses are automatically played after each turn (if >30 words). The RSVP panel opens as a right split of your current surface and closes automatically when the next response arrives.

**Requirements:**
- `rsvp` on PATH (`npm link`)
- `cmux` installed and active

**Claude Code** — register the hook in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [{ "hooks": [{ "type": "command", "command": "/path/to/rsvp-reader/hooks/stop-hook.sh" }] }]
  }
}
```

**Codex CLI** — enable hooks in `~/.codex/config.toml` and register in `~/.codex/hooks.json`:

```toml
# ~/.codex/config.toml
[features]
codex_hooks = true
```

```json
// ~/.codex/hooks.json
{
  "Stop": [{ "command": "/path/to/rsvp-reader/hooks/stop-hook.sh", "timeout": 60 }]
}
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
├── stages/               ICM development workflow (spec → scaffold → test → publish)
├── design-system/        component catalog and design tokens
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

## Roadmap

We're moving fast. Here's what's coming:

- **VS Code Marketplace** — official published extension (no manual install)
- **cmux native plugin** — first-class cmux integration, no hook wiring required
- **Claude Code & Codex CLI** — deeper integration beyond stop hooks
- **Rust rewrite** — faster rendering, lower latency, single binary distribution
- **Visualization research** — exploring alternatives to the current ORP/RSVP algorithm, including different reading acceleration techniques

Follow this repo to track progress. Contributions that align with these directions are especially welcome.

---

## Contributing

This project is free and open — free as in freedom, free as in open. We built it in the open because that's the only way it gets better. We'd rather have ten people improve it together than ten people each maintain their own private version.

If you build something useful here, do it in the open so the whole community benefits.

**Ground rules:**

- **Never push directly to `main`.** Branch off, make your changes, open a PR.
- **Open an issue first** for anything non-trivial — discuss the approach before writing code.
- **One concern per PR.** Don't bundle unrelated fixes.
- **PRs are reviewed carefully.** We move fast but we won't merge something we can't stand behind. Be patient — a slower merge is better than a broken release.
- **Be respectful.** No gatekeeping, no dismissiveness. Everyone is here to learn and build.

This project is licensed under GPL v3. Any derivative work you distribute must also be GPL v3. You may not incorporate this into a proprietary product and sell it without releasing your source under the same license.

---

## Agent Setup Prompt

If you're using an AI coding agent (Claude Code, Codex CLI, etc.), paste this prompt to have it set up RSVP Reader automatically:

```
Set up the RSVP Reader project in this directory. Do the following steps in order:

1. Run `npm install` to install dependencies.
2. Run `npm run compile` to build the extension and CLI. Verify that `out/cli.js` exists and is executable.
3. Run `npm link` to put the `rsvp` binary on PATH. Verify with `which rsvp`.
4. Test the CLI: run `echo "this is a quick test of the rsvp command line reader" | rsvp` and confirm it renders words to the terminal.

Then wire up the stop hooks so AI responses auto-play:

5. For Claude Code — add the Stop hook to `~/.claude/settings.json`. The hook command should be the absolute path to `hooks/stop-hook.sh` in this repo. Check if a hooks section already exists before adding.
6. For Codex CLI — add `[features]\ncodex_hooks = true` to `~/.codex/config.toml` if not already present. Then create or update `~/.codex/hooks.json` with a Stop entry pointing to the same `hooks/stop-hook.sh`.
7. Make sure `hooks/stop-hook.sh` is executable (`chmod +x`).

Finally, verify by running the hook manually:
`echo '{"stop_reason":"end_turn","last_assistant_message":"This is a test message that is long enough to trigger the RSVP reader because it has more than thirty words in it and should open automatically."}' | hooks/stop-hook.sh stop`

Report what worked, what was already configured, and anything that needs manual attention.
```

---

## Acknowledgements

The development workflow in `stages/` is based on the **Interpreted Context Methodology (ICM)** by [Jake](https://github.com/RinDig/Interpreted-Context-Methdology), which defines a structured stage-gate pipeline for AI-assisted software development. The spec → scaffold → test → publish workflow used here is directly inspired by that work. If you find the workflow useful, go give his repo a star.

---

## License

GPL v3 — see [LICENSE](LICENSE)

**Free as in freedom.** Use it, study it, change it, share it. That freedom is the point — not just a side effect. The GPL v3 license ensures that freedom is preserved downstream: any derivative work must remain open under the same terms. You cannot take this, close it, and sell it. The community that builds it should be the community that benefits from it.
