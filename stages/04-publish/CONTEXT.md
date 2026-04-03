# Publish

Package the extension as a VSIX and publish to the VS Code Marketplace.

## Inputs

| Source | File/Location | Section/Scope | Why |
|--------|--------------|---------------|-----|
| Test results | `../03-test/output/rsvp-reader-test-results.md` | Pass/fail summary | Gate: all checks must pass before packaging |
| Extension manifest | `../../package.json` | publisher, version, repository fields | Required for Marketplace listing |

## Process

1. Read test results from Stage 03 and confirm all checks passed
2. Add missing Marketplace fields to package.json: publisher, repository, license, icon, keywords
3. Add a README.md to workspace root with extension description, install instructions, and screenshots placeholder
4. Install vsce globally if not present (`npm install -g @vscode/vsce`)
5. Package with `vsce package` from workspace root; produces rsvp-reader-[version].vsix
6. Publish with `vsce publish` (requires Personal Access Token with Marketplace scope)
7. Record the published version and Marketplace URL in output/

## Audit

| Check | Pass Condition |
|-------|---------------|
| VSIX produced | .vsix file exists in workspace root, installable via "Install from VSIX" |
| Marketplace fields | package.json has publisher, repository, license, and keywords |
| README present | README.md has description and usage instructions |

## Outputs

| Artifact | Location | Format |
|----------|----------|--------|
| Release record | `stages/04-publish/output/rsvp-reader-release.md` | Markdown with version, VSIX path, Marketplace URL |
