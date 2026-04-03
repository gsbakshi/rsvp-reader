# RSVP Reader -- Extension Spec (Complete)

VS Code extension enabling RSVP speed-reading of markdown files and selected text.

## Commands

| Command | Trigger | Behavior |
|---------|---------|----------|
| rsvp.readFile | Right-click .md in Explorer | Read entire markdown file |
| rsvp.readSelection | Right-click selected text | Read selection (auto-detect markdown) |

## Configuration

| Setting | Type | Default |
|---------|------|---------|
| rsvp.wpm | number | 300 |
| rsvp.chunkSize | number | 1 (reserved v2) |
| rsvp.skipCodeBlocks | boolean | true |

## Architecture

| File | Role |
|------|------|
| src/extension.ts | Command registration, activation |
| src/mdParser.ts | Markdown-to-token pipeline (regex, no remark) |
| src/rsvpEngine.ts | Playback engine (play/pause/back/wpm) |
| src/rsvpPanel.ts | Webview panel lifecycle, CSP nonce injection |
| media/rsvp.html | Webview UI with ORP highlighting |

## UI Features

- Focus box with ORP (Optimal Recognition Point) highlighting
- Progress bar
- Play/Pause, Back 5 words, WPM slider (100-800)
- Keyboard: Space = play/pause, Left arrow = back
- VS Code theme variables for all colors
- CSP nonce on style and script tags
