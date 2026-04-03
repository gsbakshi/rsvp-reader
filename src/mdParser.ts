import type { Token } from './rsvpEngine'

// NOTE: The spec calls for remark + strip-markdown, but those packages are
// ESM-only (unified v10+) and break in CommonJS VS Code extensions without a
// bundler (esbuild/webpack). This line-by-line regex pipeline is a direct
// replacement. Processing line-by-line (rather than on the full text at once)
// lets us record which source line each token came from, enabling editor sync.
// To swap in remark: add esbuild, change this file, keep the return type.

function delayMultiplier(word: string): number {
  if (/[.!?]["']?$/.test(word)) return 1.8
  if (/[,;:]$/.test(word))      return 1.3
  return 1.0
}

function stripInline(line: string): string {
  return line
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/___([^_]+)___/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')        // images — drop alt text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')     // links — keep label
    .replace(/`[^`\n]+`/g, ' ')                  // inline code
    .replace(/<[^>]+>/g, '')                     // html tags
}

/**
 * Parse markdown into RSVP tokens, tracking the source line of each token.
 *
 * Returns `tokens` (the playback sequence) and `tokenLines` (parallel array:
 * `tokenLines[i]` is the 0-based line number in `content` that token i came from).
 * The two arrays are always the same length.
 */
export function parseMarkdown(
  content: string,
  skipCodeBlocks = true
): { tokens: Token[], tokenLines: number[] } {
  const lines = content.split('\n')
  const tokens: Token[] = []
  const tokenLines: number[] = []

  let inFencedBlock = false
  let fenceChar = ''

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const raw = lines[lineNum]

    // Fenced code block boundary (``` or ~~~)
    const fenceMatch = raw.match(/^(`{3,}|~{3,})/)
    if (fenceMatch) {
      const ch = fenceMatch[1].charAt(0)
      if (!inFencedBlock) {
        inFencedBlock = true
        fenceChar = ch
      } else if (ch === fenceChar) {
        inFencedBlock = false
        fenceChar = ''
      }
      continue
    }

    if (inFencedBlock) continue
    if (skipCodeBlocks && /^( {4}|\t)/.test(raw)) continue

    // Strip block-level markdown
    let line = raw
      .replace(/^#{1,6}\s+/, '')
      .replace(/^\s*[-*+]\s+/, '')
      .replace(/^\s*\d+\.\s+/, '')
      .replace(/^>\s*/, '')
      .replace(/^\s*[-*_]{3,}\s*$/, '')   // horizontal rules → empty
      .replace(/^\|.*\|$/, '')            // table rows → empty

    // Strip inline markdown
    line = stripInline(line)

    const words = line.split(/\s+/).map(w => w.trim()).filter(w => w.length > 0)
    for (const word of words) {
      tokens.push({ word, delayMultiplier: delayMultiplier(word) })
      tokenLines.push(lineNum)
    }
  }

  // Pre-pause: slow the word before a clause/sentence boundary
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i].delayMultiplier > 1.0) {
      tokens[i - 1].delayMultiplier = Math.max(tokens[i - 1].delayMultiplier, 1.1)
    }
  }

  return { tokens, tokenLines }
}
