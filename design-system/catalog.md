# Design System Catalog -- RSVP Reader

> Single source of truth for the RSVP Reader webview UI.
> Design Forge reads this before generating or modifying `media/rsvp.html`.

## Platform

- **Surface**: VS Code WebviewPanel (side panel, ~400-700px wide, full height)
- **Rendering**: Vanilla HTML/CSS/JS -- no framework, no build step
- **Theme**: Adapts to VS Code light/dark via runtime-injected `--vscode-*` CSS custom properties
- **CSP**: `default-src 'none'; style-src 'nonce-{{nonce}}'; script-src 'nonce-{{nonce}}'`
- **Nonce**: Generated per session in `src/rsvpPanel.ts`, injected via `{{nonce}}` template replacement

## Aesthetic Direction

**Tags**: `terminal`, `monospace`, `code-native`, `minimal`, `dark-mode`, `data-focused`, `functional`, `quiet`

**One-sentence direction for Design Forge**: A focused developer instrument that inherits VS Code's personality entirely -- monospace typography, theme-native colors, zero decorative elements, every pixel serves the reading task.

---

## 1. Design Token Map

All colors come from VS Code's injected CSS custom properties. Never hardcode hex values.
The fallback values below are for preview/development only -- VS Code always provides the real values at runtime.

### Semantic Aliases

Use these aliases in all styles. They map intent to the VS Code variable, making the stylesheet readable and refactorable.

```css
/* -- Surface & Layout -- */
--color-surface:          var(--vscode-editor-background);
--color-surface-input:    var(--vscode-input-background);
--color-surface-panel:    var(--vscode-panel-background);

/* -- Text -- */
--color-text-primary:     var(--vscode-editor-foreground);
--color-text-secondary:   var(--vscode-descriptionForeground);
--color-text-input:       var(--vscode-input-foreground);

/* -- Interactive -- */
--color-button-bg:        var(--vscode-button-background);
--color-button-fg:        var(--vscode-button-foreground);
--color-button-hover:     var(--vscode-button-hoverBackground);
--color-focus-ring:       var(--vscode-focusBorder);

/* -- Borders -- */
--color-border:           var(--vscode-editorWidget-border);
--color-border-input:     var(--vscode-input-border);
--color-border-panel:     var(--vscode-panel-border);

/* -- Data / Feedback -- */
--color-accent:           var(--vscode-terminal-ansiRed);       /* ORP highlight */
--color-progress:         var(--vscode-progressBar-background);
--color-track:            var(--vscode-scrollbarSlider-background);
```

### Usage Rules

- **Never** use raw hex, rgb, or hsl values in any style rule.
- **Always** use the semantic alias (e.g., `--color-accent`) rather than the raw VS Code variable (e.g., `--vscode-terminal-ansiRed`) in component styles.
- **Fallback values** are acceptable only inside the alias definitions themselves, e.g., `var(--vscode-editorWidget-border, #444)`.
- **New tokens**: If a new UI element needs a color not covered above, find the closest VS Code variable from the [theme color reference](https://code.visualstudio.com/api/references/theme-color) and add an alias here first.

---

## 2. Spacing Scale

Rem-based. Designed for a ~500px panel where the reader needs generous breathing room around the focal word.

| Token         | Value     | Use Case                                      |
|---------------|-----------|-----------------------------------------------|
| `--space-xs`  | `0.25rem` | Inline gaps, icon margins                     |
| `--space-sm`  | `0.5rem`  | Button internal gaps, control spacing         |
| `--space-md`  | `0.75rem` | Control group gaps (between buttons)          |
| `--space-lg`  | `1rem`    | Section separation (controls to status)       |
| `--space-xl`  | `1.75rem` | Major section gaps (focus-box to controls)    |
| `--space-2xl` | `2rem`    | Reader container padding                      |

### Rules

- All spacing in `rem`. Never `px`.
- The current HTML uses `gap: 1.75rem` for the reader column and `gap: 0.75rem` for the controls row. These map to `--space-xl` and `--space-md`.
- `margin-left: 0.5rem` on `#wpm-group` maps to `--space-sm`.
- Padding values (`0.4rem 0.9rem` on buttons) are component-level -- keep them proportional but do not tokenize every padding value.

---

## 3. Typography Spec

### Font Stack

```css
--font-primary: var(--vscode-editor-font-family, 'Courier New', monospace);
```

This is the only font family. The VS Code editor font (typically JetBrains Mono, Cascadia Code, Fira Code, or similar) is a first-class design token. It serves as both display and body text because this is a developer tool that lives inside a code editor.

### Type Scale

| Token           | Size       | Weight | Use Case                              |
|-----------------|------------|--------|---------------------------------------|
| `--text-word`   | `3rem`     | 400    | RSVP word display (the focal word)    |
| `--text-button` | `0.85rem`  | 400    | Button labels                         |
| `--text-label`  | `0.8rem`   | 400    | WPM label, secondary labels           |
| `--text-status` | `0.75rem`  | 400    | Status bar text, instructions         |

### Rules

- **One font family** -- no secondary font, no Google Fonts import.
- The ORP character uses `font-weight: 700` to visually anchor the fixation point. This is the only bold usage.
- `letter-spacing: 0.03em` on the word display improves monospace readability at large sizes.
- `line-height: 1` on the word display keeps the focus box tight.
- `white-space: pre` on the word display preserves character alignment for the ORP system.
- All font sizes in `rem`. Never `px`.

---

## 4. Component Inventory

### Existing Components

| Component       | Element(s)                        | States                          | Notes                                    |
|-----------------|-----------------------------------|---------------------------------|------------------------------------------|
| **Focus Box**   | `#focus-box`, `#word-display`     | empty, displaying               | Has `::before`/`::after` ORP tick marks  |
| **Word Display**| `.w-pre`, `.w-orp`, `.w-post`     | per-character split             | Three spans for ORP highlighting         |
| **Progress Bar**| `#progress-track`, `#progress-fill`| 0-100% width                   | CSS transition on width (80ms linear)    |
| **Button**      | `.btn`                            | default, hover, active          | Missing: focus, disabled                 |
| **WPM Slider**  | `#wpm-slider`, `#wpm-label`       | interactive range input         | Native range input, no custom styling    |
| **Status Text** | `#status`                         | instruction, word count, "Done" | Plain text, no visual state changes      |

### Missing States (Violations)

| Component  | Missing State | Impact                                              |
|------------|---------------|-----------------------------------------------------|
| `.btn`     | `:focus`      | No visible focus ring -- keyboard users lose track  |
| `.btn`     | `:disabled`   | No disabled style -- buttons remain clickable-looking when state is invalid |
| Focus Box  | loading       | No visual feedback while content is being parsed    |
| Status     | error         | No error state if file reading fails                |

### Improvement Opportunities

1. **Button focus state**: Add `outline: 2px solid var(--color-focus-ring); outline-offset: 2px` on `.btn:focus-visible`.
2. **Slider styling**: The native `<input type="range">` does not inherit VS Code theme colors. Consider styling `::-webkit-slider-thumb` and `::-webkit-slider-runnable-track` with token colors.
3. **Keyboard shortcut hints**: The `title` attributes on buttons show shortcuts on hover. Could add visible `<kbd>` badges for discoverability.
4. **Empty state**: When no file is loaded, the focus box is empty. Could show a subtle prompt character or icon.
5. **Done state**: The status text changes to "Done" but nothing else changes visually. Could dim the progress bar or show a completion indicator.

---

## 5. Border Radius

| Token               | Value  | Use Case                           |
|----------------------|--------|------------------------------------|
| `--radius-sm`        | `0.125rem` (2px) | Progress bar track/fill        |
| `--radius-md`        | `0.1875rem` (3px) | Buttons                       |
| `--radius-lg`        | `0.25rem` (4px) | Focus box                       |

### Rules

- Keep radii small. This is a developer tool, not a consumer app.
- The current values (2px, 3px, 4px) are consistent with VS Code's native UI.
- Convert to rem for token definitions. Existing HTML uses `px` for `border-radius` -- these should be migrated to rem.

---

## 6. Shadows & Effects

- **None currently used.** This is correct -- VS Code webviews should not add their own shadows. The panel chrome provides visual separation.
- The `opacity: 0.8` on `.btn:active` is the only visual effect. Consider replacing with `filter: brightness(0.85)` for theme-safe dimming, since `opacity` also affects text contrast.

---

## 7. CSP & External Dependencies

### Current CSP

```
default-src 'none'; style-src 'nonce-{{nonce}}'; script-src 'nonce-{{nonce}}';
```

### Tailwind CDN

**Not recommended.** Reasons:
1. Requires adding `https://cdn.tailwindcss.com` to the CSP `script-src` directive, weakening the security posture.
2. The entire UI is a single HTML file with ~80 lines of CSS. Tailwind's utility classes add complexity without proportional benefit at this scale.
3. The CDN introduces a network dependency -- the extension must work offline.
4. Tailwind's reset would conflict with the targeted reset already in the HTML.

### Google Fonts

**Not recommended.** Reasons:
1. Requires adding `https://fonts.googleapis.com` and `https://fonts.gstatic.com` to `style-src` and adding a `font-src` directive.
2. The VS Code editor font is the correct font for this tool. Importing a separate font contradicts the "code-native" aesthetic.
3. Network dependency -- same offline concern as Tailwind.

### Verdict

Keep the CSP tight. All styling remains inline (nonce-gated). No external dependencies.

---

## 8. Violations Found

| Location                | Issue                                      | Fix                                             |
|-------------------------|--------------------------------------------|-------------------------------------------------|
| `rsvp.html:46`          | `border-radius: 4px` -- pixel value        | Use `0.25rem`                                   |
| `rsvp.html:53`          | `height: 7px` -- pixel value               | Use `0.4375rem`                                 |
| `rsvp.html:72`          | `height: 3px` -- pixel value               | Use `0.1875rem`                                 |
| `rsvp.html:73`          | `border-radius: 2px` -- pixel value        | Use `0.125rem`                                  |
| `rsvp.html:77`          | `border-radius: 2px` -- pixel value        | Use `0.125rem`                                  |
| `rsvp.html:86`          | `border-radius: 3px` -- pixel value        | Use `0.1875rem`                                 |
| `rsvp.html:112`         | `width: 110px` on `#wpm-slider` -- pixel value | Use `6.875rem`                              |
| `rsvp.html:46,54,65,73` | Hex fallback colors (`#444`, `#f14c4c`, `#555`, `#0e70c0`) used inline | Move to semantic token aliases with fallbacks defined once |
| `rsvp.html:10`          | Global `*` reset includes `margin: 0; padding: 0` | Acceptable for isolated webview, but document the choice |
| `.btn`                  | Missing `:focus-visible` state             | Add focus ring using `--color-focus-ring`        |
| `.btn`                  | Missing `:disabled` state                  | Add `opacity: 0.5; cursor: not-allowed`         |
| `#wpm-slider`           | No custom styling -- native range input    | Style with theme tokens for visual consistency  |

---

## 9. Recommended Actions

| Priority | Action                                      | Why                                              | Effort |
|----------|---------------------------------------------|--------------------------------------------------|--------|
| 1        | Define semantic token aliases in `:root`    | Decouples component styles from VS Code variable names; makes the stylesheet self-documenting | Low    |
| 2        | Replace all `px` values with `rem`          | 7 violations -- consistency with design principles | Low    |
| 3        | Add `.btn:focus-visible` style              | Keyboard accessibility -- currently invisible    | Low    |
| 4        | Add `.btn:disabled` style                   | Prevents misleading interactivity cues           | Low    |
| 5        | Style the range slider with theme tokens    | Native slider looks foreign inside VS Code theme | Medium |
| 6        | Consolidate hex fallbacks into token aliases| 4 fallback colors scattered across rules -- centralize in `:root` | Low    |
| 7        | Add empty/done visual states to focus box   | Polish -- helps user understand current state    | Medium |
