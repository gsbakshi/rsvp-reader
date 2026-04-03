# Spec (Complete)

Lock the extension specification: commands, configuration, architecture, and UI design.

## Inputs

| Source | File/Location | Section/Scope | Why |
|--------|--------------|---------------|-----|
| VS Code API | [Extension API docs](https://code.visualstudio.com/api) | Commands, Webview, Configuration | API surface for spec feasibility |

## Process

1. Define the two commands (readFile, readSelection) and their activation contexts
2. Define configuration properties (wpm, chunkSize, skipCodeBlocks) with defaults
3. Map the architecture: extension.ts, mdParser.ts, rsvpEngine.ts, rsvpPanel.ts, rsvp.html
4. Specify webview UI: focus box with ORP highlighting, progress bar, controls, keyboard shortcuts
5. Save the spec to output/

## Outputs

| Artifact | Location | Format |
|----------|----------|--------|
| Extension spec | `stages/01-spec/output/rsvp-reader-spec.md` | Markdown with tables for commands, config, architecture, UI |

**Status: COMPLETE** -- Spec written and used to drive Stage 02.
