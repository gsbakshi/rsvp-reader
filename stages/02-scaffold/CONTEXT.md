# Scaffold (Complete)

Generate all TypeScript extension source files and the webview HTML template.

## Inputs

| Source | File/Location | Section/Scope | Why |
|--------|--------------|---------------|-----|
| Spec | `../01-spec/output/rsvp-reader-spec.md` | Commands, Architecture, UI Features | Contract for what to build |

## Process

1. Read the spec from Stage 01 output
2. Generate package.json with commands, menus, configuration, and scripts
3. Generate tsconfig.json targeting ES2020 with strict mode
4. Generate src/extension.ts with command registration for readFile and readSelection
5. Generate src/mdParser.ts with regex-based markdown stripping and Token[] output
6. Generate src/rsvpEngine.ts with play/pause/back/wpm and recursive setTimeout
7. Generate src/rsvpPanel.ts with webview lifecycle, CSP nonce injection, message handling
8. Generate media/rsvp.html with ORP display, progress bar, controls, keyboard shortcuts
9. Save scaffold manifest to output/

## Outputs

| Artifact | Location | Format |
|----------|----------|--------|
| Scaffold manifest | `stages/02-scaffold/output/rsvp-reader-scaffold.md` | Markdown listing files produced and design decisions |

**Status: COMPLETE** -- All 7 source files written to workspace root.
