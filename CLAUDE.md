# RSVP Reader

VS Code extension that enables RSVP speed-reading of markdown files and selected text.

## Folder Map

```
rsvp-reader/
├── CLAUDE.md              (you are here)
├── CONTEXT.md             (start here for task routing)
├── package.json           (extension manifest)
├── tsconfig.json          (TypeScript config)
├── src/                   (extension source code)
│   ├── extension.ts       (command registration)
│   ├── mdParser.ts        (markdown-to-token pipeline)
│   ├── rsvpEngine.ts      (playback engine)
│   └── rsvpPanel.ts       (webview panel lifecycle)
├── media/
│   └── rsvp.html          (webview UI template)
└── stages/
    ├── 01-spec/           (extension specification)
    ├── 02-scaffold/       (TypeScript code generation)
    ├── 03-test/           (manual testing checklist)
    └── 04-publish/        (VSIX packaging and marketplace)
```

## Triggers

| Keyword | Action |
|---------|--------|
| `status` | Show pipeline completion for all stages |

## Routing

| Task | Go To |
|------|-------|
| Review or update the spec | `stages/01-spec/CONTEXT.md` |
| Modify extension source code | `stages/02-scaffold/CONTEXT.md` |
| Test the extension | `stages/03-test/CONTEXT.md` |
| Package or publish | `stages/04-publish/CONTEXT.md` |

## What to Load

| Task | Load These |
|------|-----------|
| Spec review | `stages/01-spec/CONTEXT.md`, `stages/01-spec/output/rsvp-reader-spec.md` |
| Code changes | `stages/02-scaffold/CONTEXT.md`, relevant `src/` files |
| Testing | `stages/03-test/CONTEXT.md`, `src/` files under test |
| Publishing | `stages/04-publish/CONTEXT.md`, `package.json` |

## Don't Load

| Context | Why |
|---------|-----|
| All `src/` files at once | Only one file relevant per change |
| Completed stage outputs | Artifacts, not templates (Pattern 14) |
| `media/rsvp.html` during publish | Only relevant for UI changes |
