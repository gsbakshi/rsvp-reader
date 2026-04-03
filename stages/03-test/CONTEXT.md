# Test

Verify all commands, UI controls, keyboard shortcuts, and CSP render correctly in Extension Development Host.

## Inputs

| Source | File/Location | Section/Scope | Why |
|--------|--------------|---------------|-----|
| Spec | `../01-spec/output/rsvp-reader-spec.md` | Commands, Configuration, UI Features | Expected behavior to verify |
| Extension entry | `../../src/extension.ts` | Command registrations | Verify both commands activate |
| Webview UI | `../../media/rsvp.html` | Controls, keyboard bindings | Verify all UI elements function |

## Process

1. Compile the extension with `npm run compile` from workspace root
2. Launch Extension Development Host via VS Code (F5 or "Run Extension" launch config)
3. Open a markdown file and right-click in Explorer; verify "RSVP: Read File" appears and opens the webview panel
4. Select text in any file and right-click; verify "RSVP: Read Selection" appears and loads selected words
5. Verify Play/Pause button toggles playback and updates button label
6. Verify Back button rewinds 5 words during playback
7. Verify WPM slider adjusts speed and persists the value to rsvp.wpm setting
8. Verify Space key toggles play/pause, Left Arrow key triggers back
9. Verify ORP character renders in red, progress bar advances, theme variables apply
10. Verify CSP nonce is present in rendered HTML (Webview Developer Tools > Elements)
11. Record pass/fail for each check and save results to output/

## Audit

| Check | Pass Condition |
|-------|---------------|
| Both commands registered | Command palette shows "RSVP: Read File" and "RSVP: Read Selection" |
| Webview renders | Focus box, progress bar, and controls visible with VS Code theme colors |
| Playback works | Words appear sequentially, punctuation pauses are perceptible |
| Keyboard shortcuts | Space and Left Arrow function without conflicting with VS Code bindings |
| CSP enforced | No CSP violations in Webview Developer Tools console |

## Outputs

| Artifact | Location | Format |
|----------|----------|--------|
| Test results | `stages/03-test/output/rsvp-reader-test-results.md` | Markdown checklist with pass/fail per check |
