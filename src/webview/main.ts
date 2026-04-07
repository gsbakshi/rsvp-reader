// SPDX-License-Identifier: GPL-3.0-only
// Copyright (c) 2026 Gurmehar Singh Bakshi
//
// Webview-side script for the RSVP reader panel. Runs inside a VS Code
// webview (sandboxed iframe), targets the DOM, and communicates with the
// extension host (rsvpPanel.ts) via a typed message protocol.
//
// Built by esbuild → media/rsvp.js. Loaded by media/rsvp.html with a CSP
// nonce. Do not import anything that needs Node built-ins.

import type {
  ExtensionToWebview,
  WebviewToExtension,
} from '../webview-protocol'

interface VsCodeApi {
  postMessage(message: WebviewToExtension): void
}

declare function acquireVsCodeApi(): VsCodeApi

const vscode = acquireVsCodeApi()

// ── Element refs ─────────────────────────────────────────────────────────
// Every required element must exist in media/rsvp.html. We assert non-null
// at startup so the rest of the code can stay terse and type-safe.

function $(id: string): HTMLElement {
  const el = document.getElementById(id)
  if (!el) throw new Error(`rsvp webview: missing #${id}`)
  return el
}

const bandBottom  = $('band-bottom')
const wordDisp    = $('word-display')
const wordCount   = $('word-count')
const wpmCorner   = $('wpm-corner')
const btnPlay     = $('btn-play')     as HTMLButtonElement
const btnBack     = $('btn-back')     as HTMLButtonElement
const btnBackSent = $('btn-back-sentence') as HTMLButtonElement
const btnForward  = $('btn-forward')  as HTMLButtonElement
const btn250      = $('btn-250')      as HTMLButtonElement
const btn400      = $('btn-400')      as HTMLButtonElement
const btn600      = $('btn-600')      as HTMLButtonElement
const btnFontDn   = $('btn-font-down') as HTMLButtonElement
const btnFontUp   = $('btn-font-up')   as HTMLButtonElement
const btnMode     = $('btn-mode')      as HTMLButtonElement
const slider      = $('wpm-slider')   as HTMLInputElement

let playing    = false
let loaded     = false
let tokenTotal = 0
let fontSize   = 3.0   // rem
let baseWpm    = 250
let skimMode   = false

// Hold-to-freeze: tap Space = toggle play/pause; hold 200ms+ = freeze while held
let spaceTimer: ReturnType<typeof setTimeout> | null = null
let freezeHeld = false

// ─── ORP (Optimal Recognition Point) ────────────────────────────────────
// Spritz-style table: n chars → highlight index (0-based), capped at 4
// n:  1  2  3  4  5  6  7  8  9 10 11 12 13+
const orpTable = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3]
function orpIndex(word: string): number {
  const n = word.length
  return n < orpTable.length ? orpTable[n] : 4
}
// ────────────────────────────────────────────────────────────────────────

function showOnboarding(): void {
  wordDisp.style.transform = ''
  const hint = document.createElement('span')
  hint.className = 'w-hint'
  hint.setAttribute('aria-label', 'Open a markdown file and right-click to RSVP Read File')
  hint.textContent = 'open a .md file → right-click → RSVP: Read File'
  wordDisp.replaceChildren(hint)
}

function showIdleCursor(): void {
  wordDisp.style.transform = ''  // clear translateX from previous word
  const cursor = document.createElement('span')
  cursor.id = 'idle-cursor'
  cursor.setAttribute('aria-hidden', 'true')
  wordDisp.replaceChildren(cursor)
}

// Shift word-display so the ORP character's center sits at the zone's
// horizontal center. Uses real pixel measurements — ch-unit CSS math
// varies by font and is unreliable across VS Code themes.
function alignOrp(): void {
  const orp = wordDisp.querySelector<HTMLElement>('.w-orp')
  if (!orp) { wordDisp.style.transform = ''; return }
  const shift = wordDisp.offsetWidth / 2 - (orp.offsetLeft + orp.offsetWidth / 2)
  wordDisp.style.transform = `translateX(${shift}px)`
}

function showWord(word: string): void {
  if (!word) { showIdleCursor(); return }
  const i    = orpIndex(word)
  const pre  = document.createElement('span')
  const orp  = document.createElement('span')
  const post = document.createElement('span')
  orp.className    = 'w-orp'
  pre.textContent  = word.slice(0, i)
  orp.textContent  = word[i] ?? ''
  post.textContent = word.slice(i + 1)
  wordDisp.replaceChildren(pre, orp, post)
  alignOrp()  // pixel-perfect: measure after DOM update, before paint
  wordDisp.classList.remove('flash')
  void wordDisp.offsetWidth
  wordDisp.classList.add('flash')
}

function syncPresetButtons(wpm: number): void {
  btn250.classList.toggle('active', wpm === 250)
  btn400.classList.toggle('active', wpm === 400)
  btn600.classList.toggle('active', wpm === 600)
}

function setWpm(val: number): void {
  const v = Math.max(100, Math.min(800, val))
  slider.value = String(v)
  wpmCorner.textContent = v + ' wpm'
  syncPresetButtons(v)
  vscode.postMessage({ type: 'wpm', value: v })
}

function setFontSize(size: number): void {
  fontSize = Math.max(1.5, Math.min(5.0, Math.round(size * 10) / 10))
  document.documentElement.style.setProperty('--word-font-size', fontSize + 'rem')
  vscode.postMessage({ type: 'fontSize', value: fontSize })
}

function toggleMode(): void {
  skimMode = !skimMode
  btnMode.textContent = skimMode ? 'skim' : 'read'
  btnMode.classList.toggle('active', skimMode)
  // skim = 1.5× base rate; read = base rate
  setWpm(skimMode ? Math.round(baseWpm * 1.5) : baseWpm)
}

// ── Init ────────────────────────────────────────────────────────────────
showOnboarding()

// ── Message handler ─────────────────────────────────────────────────────
window.addEventListener('message', (e: MessageEvent<ExtensionToWebview>) => {
  const msg = e.data

  if (msg.type === 'token') {
    showWord(msg.word)
    const pct = (msg.progress * 100).toFixed(1)
    bandBottom.style.setProperty('--progress', pct + '%')
    if (tokenTotal > 0) {
      wordCount.textContent = `word ${msg.index + 1} / ${tokenTotal}`
    }

  } else if (msg.type === 'state') {
    playing = msg.state === 'playing'
    btnPlay.textContent = playing ? '⏸ pause' : '▶ play'
    if (msg.state === 'done') {
      showIdleCursor()
      wordCount.textContent = 'done  —  space to restart'
      bandBottom.style.setProperty('--progress', '100%')
    }

  } else if (msg.type === 'loaded') {
    loaded     = true
    playing    = false
    tokenTotal = msg.total

    btnPlay.disabled     = false
    btnBack.disabled     = false
    btnBackSent.disabled = false
    btnForward.disabled  = false
    btn250.disabled      = false
    btn400.disabled      = false
    btn600.disabled      = false

    // Show resume info or word count
    const resumeAt = msg.startIndex ?? 0
    if (resumeAt > 0) {
      wordCount.textContent = `word ${resumeAt + 1} / ${tokenTotal}  (resuming)`
      bandBottom.style.setProperty('--progress', ((resumeAt / tokenTotal) * 100).toFixed(1) + '%')
    } else {
      wordCount.textContent = tokenTotal + ' words'
      bandBottom.style.setProperty('--progress', '0%')
    }
    wordCount.classList.add('visible')

    // Apply config sent by panel
    if (msg.wpm != null) {
      baseWpm = msg.wpm
      slider.value = String(msg.wpm)
      wpmCorner.textContent = msg.wpm + ' wpm'
      syncPresetButtons(msg.wpm)
    }
    if (msg.fontSize != null) {
      fontSize = msg.fontSize
      document.documentElement.style.setProperty('--word-font-size', fontSize + 'rem')
    }
    if (msg.backStepWords != null) {
      btnBack.textContent    = `← ${msg.backStepWords} words`
      btnForward.textContent = `${msg.backStepWords} words →`
    }

    btnPlay.textContent = '▶ play'
    showIdleCursor()
  }
})

// ── Button handlers ─────────────────────────────────────────────────────
btnPlay.addEventListener('click', () => {
  if (!loaded) return
  vscode.postMessage({ type: playing ? 'pause' : 'play' })
})
btnBack.addEventListener('click', () => {
  if (!loaded) return
  vscode.postMessage({ type: 'back' })
})
btnBackSent.addEventListener('click', () => {
  if (!loaded) return
  vscode.postMessage({ type: 'backSentence' })
})
btnForward.addEventListener('click', () => {
  if (!loaded) return
  vscode.postMessage({ type: 'forward' })
})

btn250.addEventListener('click', () => { baseWpm = 250; setWpm(250) })
btn400.addEventListener('click', () => { baseWpm = 400; setWpm(400) })
btn600.addEventListener('click', () => { baseWpm = 600; setWpm(600) })

slider.addEventListener('input', () => {
  const val = +slider.value
  baseWpm = val
  wpmCorner.textContent = val + ' wpm'
  syncPresetButtons(val)
  vscode.postMessage({ type: 'wpm', value: val })
})

btnFontDn.addEventListener('click', () => setFontSize(fontSize - 0.3))
btnFontUp.addEventListener('click', () => setFontSize(fontSize + 0.3))
btnMode.addEventListener('click', toggleMode)

// ── Progress bar seeking ────────────────────────────────────────────────
bandBottom.addEventListener('click', (e: MouseEvent) => {
  if (!loaded) return
  const rect = bandBottom.getBoundingClientRect()
  const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const targetIndex = Math.floor(fraction * tokenTotal)
  vscode.postMessage({ type: 'seek', value: targetIndex })
})

// ── Keyboard ────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    e.preventDefault()
    if (!loaded) return
    if (playing && !e.repeat) {
      // Start hold-to-freeze detection (200 ms threshold)
      spaceTimer = setTimeout(() => {
        freezeHeld = true
        vscode.postMessage({ type: 'pause' })
      }, 200)
    } else if (!playing && !freezeHeld && !e.repeat) {
      vscode.postMessage({ type: 'play' })
    }
    return
  }
  if (!loaded) return
  if (e.code === 'ArrowLeft') {
    e.preventDefault()
    vscode.postMessage({ type: e.shiftKey ? 'backSentence' : 'back' })
  }
  if (e.code === 'ArrowRight') {
    e.preventDefault()
    vscode.postMessage({ type: 'forward' })
  }
})

document.addEventListener('keyup', (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    if (spaceTimer) { clearTimeout(spaceTimer); spaceTimer = null }
    if (freezeHeld) {
      // Release freeze — resume playback
      freezeHeld = false
      vscode.postMessage({ type: 'play' })
    } else if (loaded && playing) {
      // Short tap while playing — pause
      vscode.postMessage({ type: 'pause' })
    }
  }
})
