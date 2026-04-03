# RSVP Reader -- Scaffold (Complete)

All source files written to workspace root.

## Files Produced

| File | Lines | Status |
|------|-------|--------|
| package.json | 62 | Written |
| tsconfig.json | 9 | Written |
| src/extension.ts | 28 | Written |
| src/mdParser.ts | 48 | Written |
| src/rsvpEngine.ts | 96 | Written |
| src/rsvpPanel.ts | 124 | Written |
| media/rsvp.html | 229 | Written |

## Design Decisions

- Regex markdown parser instead of remark/strip-markdown (ESM-only packages break CommonJS VS Code extensions without a bundler)
- Recursive setTimeout instead of setInterval (per-token delay multipliers for punctuation pauses)
- Single webview panel pattern (createOrShow reuses existing panel)
- CSP nonce injected at runtime via template replacement
