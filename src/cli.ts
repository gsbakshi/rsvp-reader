#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-only
// Copyright (c) 2026 Gurmehar Singh Bakshi
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as tty from 'tty'
import * as readline from 'readline'
import { RsvpEngine } from './rsvpEngine'
import { parseMarkdown } from './mdParser'
import type { Token } from './rsvpEngine'

// ── ANSI helpers ─────────────────────────────────────────────────────────────
const A = {
  hide  : '\x1b[?25l',
  show  : '\x1b[?25h',
  clear : '\x1b[2J\x1b[H',
  dim   : '\x1b[2m',
  bold  : '\x1b[1m',
  red   : '\x1b[91m',   // bright red for ORP
  white : '\x1b[97m',   // bright white for word text
  cyan  : '\x1b[96m',   // bright cyan for progress bar
  gray  : '\x1b[2m',    // dim for rules and hint
  reset : '\x1b[0m',
  pos   : (r: number, c: number) => `\x1b[${r};${c}H`,
}

const cols = () => process.stdout.columns || 80
const rows = () => process.stdout.rows    || 24

// ORP table — identical to VS Code version
const orpTable = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3]
function orpIndex(word: string): number {
  return word.length < orpTable.length ? orpTable[word.length] : 4
}

function renderWord(word: string): string {
  const i    = orpIndex(word)
  const pre  = word.slice(0, i)
  const orp  = word[i] ?? ''
  const post = word.slice(i + 1)
  return `${A.bold}${A.white}${pre}${A.red}${orp}${A.white}${post}${A.reset}`
}

// Center a string (with ANSI codes stripped for visual width measurement)
function center(s: string, width: number): string {
  const vis = s.replace(/\x1b\[[^m]*m/g, '').length
  return ' '.repeat(Math.max(0, Math.floor((width - vis) / 2))) + s
}

function draw(
  word: string, idx: number, total: number,
  wpm: number, playing: boolean
): void {
  const W   = cols()
  const H   = rows()
  const mid = Math.floor(H / 2)
  const rule = A.dim + '─'.repeat(W) + A.reset

  let out = A.clear

  // Top rule
  out += A.pos(mid - 2, 1) + rule

  // Word — centered
  if (word) out += A.pos(mid - 1, 1) + center(renderWord(word), W)

  // Bottom rule (drawn first, then overwritten with progress fill)
  out += A.pos(mid, 1) + rule

  // Progress fill over the bottom rule
  const progress = total > 1 ? idx / (total - 1) : 0
  const fillW    = Math.round(progress * Math.max(0, W - 4))
  if (fillW > 0) out += A.pos(mid, 3) + A.cyan + '─'.repeat(fillW) + A.reset

  // Status row
  const left  = `  word ${idx + 1} / ${total}`
  const right = `${playing ? '▶' : '⏸'}  ${wpm} wpm  `
  const gap   = ' '.repeat(Math.max(0, W - left.length - right.length))
  out += A.pos(mid + 1, 1) + left + gap + right

  // Keyboard hint
  const hint = 'space · play/pause    ←/→ · skip    q · quit'
  out += A.pos(H - 1, 1) + A.gray + center(hint, W) + A.reset

  process.stdout.write(out)
}

// ── State file for Claude Code / Codex status bar ────────────────────────────
const STATE_FILE = path.join(os.tmpdir(), `rsvp-state-${process.getuid?.() ?? 'default'}`)
function writeState(s: string): void { try { fs.writeFileSync(STATE_FILE, s, { mode: 0o600 }) } catch {} }
function clearState(): void          { try { fs.unlinkSync(STATE_FILE) } catch {} }

// ── Read all of stdin before starting ────────────────────────────────────────
function readStdin(): Promise<string> {
  return new Promise(resolve => {
    if (process.stdin.isTTY) { resolve(''); return }
    let buf = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', c => { buf += c })
    process.stdin.on('end',  () => resolve(buf))
  })
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const args    = process.argv.slice(2)
  const wpmArg  = args.find(a => a.startsWith('--wpm='))
  const initWpm = wpmArg ? (parseInt(wpmArg.split('=')[1], 10) || 250) : 250
  const fileArg = args.find(a => !a.startsWith('--'))

  // Input: file arg > piped stdin > error
  let text = ''
  if (fileArg)         text = fs.readFileSync(fileArg, 'utf8')
  else                 text = await readStdin()

  if (!text.trim()) {
    process.stderr.write('rsvp: no input — pipe text or pass a file path\n')
    process.exit(1)
  }

  // Auto-detect markdown
  const isMarkdown = /^#{1,6}\s/m.test(text) || /\*\*/.test(text) || /^[-*+]\s/m.test(text)

  let tokens: Token[]
  if (isMarkdown) {
    tokens = parseMarkdown(text, true).tokens
  } else {
    tokens = text.split(/\s+/).filter(Boolean).map(word => ({
      word,
      delayMultiplier: /[.!?]["']?$/.test(word) ? 1.8 : /[,;:]$/.test(word) ? 1.3 : 1.0
    }))
  }

  if (tokens.length === 0) {
    process.stderr.write('rsvp: no words found\n')
    process.exit(1)
  }

  let curWord = ''
  let curIdx  = 0
  let playing = false

  const engine = new RsvpEngine(
    (token, idx, total) => {
      curWord = token.word
      curIdx  = idx
      draw(token.word, idx, total, initWpm, true)
      writeState(`reading · ${idx + 1}/${total} · ${initWpm}wpm`)
    },
    state => {
      const total = tokens.length
      if (state === 'done') {
        draw('✓ done', total - 1, total, initWpm, false)
        writeState('done')
      } else if (state === 'paused') {
        draw(curWord, curIdx, total, initWpm, false)
        writeState(`paused · ${curIdx + 1}/${total} · ${initWpm}wpm`)
      }
    },
    initWpm
  )

  engine.load(tokens)

  function cleanup(): void {
    engine.dispose()
    clearState()
    process.stdout.write(A.show + A.clear)
    process.exit(0)
  }
  process.on('SIGINT',  cleanup)
  process.on('SIGTERM', cleanup)

  // ── Keyboard ───────────────────────────────────────────────────────────────
  // When stdin was a pipe, open /dev/tty for keyboard input.
  // When stdin is a TTY (file arg mode), keyboard is already on stdin.
  function attachKeyboard(stream: NodeJS.ReadStream): void {
    readline.emitKeypressEvents(stream)
    if ((stream as tty.ReadStream).isTTY) {
      (stream as tty.ReadStream).setRawMode(true)
    }
    stream.on('keypress', (_: string, key: { name?: string; ctrl?: boolean }) => {
      if (!key) return
      if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
        cleanup()
      } else if (key.name === 'space') {
        if (playing) { engine.pause(); playing = false }
        else         { engine.play();  playing = true  }
      } else if (key.name === 'left')  {
        engine.back(5)
      } else if (key.name === 'right') {
        engine.forward(5)
      }
    })
  }

  if (!process.stdin.isTTY) {
    // stdin was piped — use /dev/tty for keys
    try {
      const fd  = fs.openSync('/dev/tty', 'r+')
      const ttyStream = new tty.ReadStream(fd)
      attachKeyboard(ttyStream as unknown as NodeJS.ReadStream)
    } catch {
      // No TTY available (e.g. CI) — runs without keyboard, auto-completes
    }
  } else {
    attachKeyboard(process.stdin)
  }

  // Initial draw + auto-play
  process.stdout.write(A.hide)
  draw('', 0, tokens.length, initWpm, false)
  engine.play()
  playing = true
}

main().catch(err => {
  process.stderr.write(`rsvp: ${err.message}\n`)
  process.exit(1)
})
