# RSVP Reader

VS Code extension for RSVP speed-reading of markdown files and selected text.

## Stage Overview

| Stage | Purpose | Key Output | Depends On |
|-------|---------|------------|------------|
| 01-spec | Lock the extension specification | `stages/01-spec/output/rsvp-reader-spec.md` | None |
| 02-scaffold | Generate TypeScript extension source code | `stages/02-scaffold/output/rsvp-reader-scaffold.md` | Stage 01 |
| 03-test | Verify all commands, UI controls, and CSP work correctly | `stages/03-test/output/rsvp-reader-test-results.md` | Stage 02 |
| 04-publish | Package VSIX and publish to VS Code Marketplace | `stages/04-publish/output/rsvp-reader-release.md` | Stage 03 |

## Task Routing

| Task Type | Go To | Description |
|-----------|-------|-------------|
| Spec review | `stages/01-spec/CONTEXT.md` | Review or amend the extension specification |
| Code changes | `stages/02-scaffold/CONTEXT.md` | Modify extension TypeScript source or webview HTML |
| Testing | `stages/03-test/CONTEXT.md` | Run manual testing checklist against Extension Host |
| Publishing | `stages/04-publish/CONTEXT.md` | Package as VSIX, publish to Marketplace |
