import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { RsvpEngine } from './rsvpEngine'
import { parseMarkdown } from './mdParser'
import type { Token, EngineState } from './rsvpEngine'

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export class RsvpPanel {
  public static currentPanel: RsvpPanel | undefined
  public static context: vscode.ExtensionContext | undefined
  public static statusBar: vscode.StatusBarItem | undefined

  private readonly panel: vscode.WebviewPanel
  private readonly extensionUri: vscode.Uri
  private readonly engine: RsvpEngine
  private readonly disposables: vscode.Disposable[] = []

  // Bidirectional sync state
  private fileUri: vscode.Uri | undefined
  private tokenLines: number[] = []          // tokenLines[i] = source line of token i
  private rsvpRevealLine: number | null = null
  private revealClearTimer: ReturnType<typeof setTimeout> | null = null
  private seekingFromScroll = false          // true while a scroll-triggered seek is executing
  private scrollDebounce: ReturnType<typeof setTimeout> | null = null

  // Playback state mirrored here for status bar + togglePlayPause
  private engineState: EngineState = 'idle'
  private tokenTotal = 0

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel
    this.extensionUri = extensionUri

    const wpm = vscode.workspace.getConfiguration('rsvp').get<number>('wpm', 250)

    this.engine = new RsvpEngine(
      (token, index, total) => {
        // RSVP → Editor: scroll the source file to keep up with the reading position.
        // Skipped when the seek itself came from an editor scroll (prevents loops).
        if (!this.seekingFromScroll) {
          this.revealEditorLine(index)
        }
        RsvpPanel.updateStatusBar('playing', index + 1, total)
        void this.panel.webview.postMessage({
          type: 'token',
          word: token.word,
          progress: index / total,
          index
        })
      },
      (state) => {
        this.engineState = state
        if (state === 'paused' || state === 'done') {
          this.savePosition()
          RsvpPanel.updateStatusBar(state, this.engine.getIndex(), this.tokenTotal)
        }
        if (state === 'done' && RsvpPanel.context && this.fileUri) {
          void RsvpPanel.context.workspaceState.update(`rsvp.pos.${this.fileUri.fsPath}`, 0)
        }
        void this.panel.webview.postMessage({ type: 'state', state })
      },
      wpm
    )

    this.panel.webview.html = this.buildHtml()
    this.panel.webview.onDidReceiveMessage(
      (msg: { type: string; value?: number }) => this.handleMessage(msg),
      null,
      this.disposables
    )
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables)

    // Editor → RSVP: seek when the user scrolls the source file.
    // Debounced 80 ms so rapid scroll events don't thrash the engine.
    this.disposables.push(
      vscode.window.onDidChangeTextEditorVisibleRanges(event => {
        if (!this.fileUri) return
        if (event.textEditor.document.uri.fsPath !== this.fileUri.fsPath) return
        if (this.tokenLines.length === 0) return

        const ranges = event.visibleRanges

        // Suppress if this is the echo of our own revealRange call.
        // We track the exact line we revealed; if that line is now inside the
        // visible viewport, this event is ours. If the user scrolled somewhere
        // different, rsvpRevealLine will not be in their new ranges.
        if (this.rsvpRevealLine !== null) {
          const rl = this.rsvpRevealLine
          this.rsvpRevealLine = null
          if (ranges.some(r => r.start.line <= rl && rl <= r.end.line)) return
          // Falls through: user scrolled to a different position — process it
        }

        const firstLine = ranges[0]?.start.line ?? 0

        if (this.scrollDebounce) clearTimeout(this.scrollDebounce)
        this.scrollDebounce = setTimeout(() => {
          this.scrollDebounce = null
          const target = this.findTokenAtLine(firstLine)
          this.seekingFromScroll = true
          this.engine.seek(target)
          this.seekingFromScroll = false
        }, 80)
      })
    )
  }

  /** Toggle play/pause — used by the status bar click and rsvp.togglePlayPause command. */
  public togglePlayPause(): void {
    if (this.engineState === 'playing') {
      this.engine.pause()
    } else {
      this.engine.play()
    }
  }

  /** Update the VS Code status bar item with current playback state. */
  private static updateStatusBar(state: EngineState | 'playing', wordNum: number, total: number): void {
    const sb = RsvpPanel.statusBar
    if (!sb) return
    switch (state) {
      case 'playing':
        sb.text = `$(play-circle) RSVP  ${wordNum} / ${total}`
        sb.show()
        break
      case 'paused':
        sb.text = `$(debug-pause) RSVP  ${wordNum} / ${total}`
        sb.show()
        break
      case 'done':
        sb.text = `$(check) RSVP  done`
        sb.show()
        break
      default:
        sb.hide()
    }
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    content: string,
    isMarkdown: boolean,
    fileUri?: vscode.Uri
  ): void {
    if (RsvpPanel.currentPanel) {
      RsvpPanel.currentPanel.panel.reveal()
      RsvpPanel.currentPanel.loadContent(content, isMarkdown, fileUri)
      return
    }

    // Open RSVP in a new column to the right of every currently open column
    // (source editor, markdown preview, etc.) so we don't hide any of them.
    const groups = vscode.window.tabGroups.all
    const maxCol = groups.reduce((m, g) => Math.max(m, g.viewColumn), 0)
    const column: vscode.ViewColumn = maxCol > 0
      ? Math.min(maxCol + 1, vscode.ViewColumn.Nine) as vscode.ViewColumn
      : vscode.ViewColumn.Beside

    const panel = vscode.window.createWebviewPanel(
      'rsvpReader',
      'RSVP Reader',
      column,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
      }
    )

    RsvpPanel.currentPanel = new RsvpPanel(panel, extensionUri)
    RsvpPanel.currentPanel.loadContent(content, isMarkdown, fileUri)
    void vscode.commands.executeCommand('setContext', 'rsvpReaderActive', true)
  }

  private loadContent(content: string, isMarkdown: boolean, fileUri?: vscode.Uri): void {
    this.fileUri = fileUri

    const config = vscode.workspace.getConfiguration('rsvp')
    const skipCodeBlocks = config.get<boolean>('skipCodeBlocks', true)
    const wpm            = config.get<number>('wpm', 250)
    const fontSize       = config.get<number>('fontSize', 3.0)
    const backStepWords  = config.get<number>('backStepWords', 5)

    let tokens: Token[]
    if (isMarkdown) {
      const result = parseMarkdown(content, skipCodeBlocks)
      tokens = result.tokens
      this.tokenLines = result.tokenLines
    } else {
      this.tokenLines = []
      tokens = content
        .split(/\s+/)
        .filter(w => w.length > 0)
        .map(word => ({
          word,
          delayMultiplier: /[.!?]["']?$/.test(word) ? 1.8 : /[,;:]$/.test(word) ? 1.3 : 1.0
        }))
    }

    this.tokenTotal = tokens.length
    this.engine.load(tokens)

    let startIndex = 0
    const fileKey = fileUri?.fsPath
    if (fileKey && RsvpPanel.context) {
      const saved = RsvpPanel.context.workspaceState.get<number>(`rsvp.pos.${fileKey}`, 0)
      startIndex = Math.max(0, Math.min(tokens.length - 1, saved))
      if (startIndex > 0) {
        this.engine.seek(startIndex)
      }
    }

    this.engineState = 'idle'
    RsvpPanel.updateStatusBar('idle', startIndex, tokens.length)

    void this.panel.webview.postMessage({
      type: 'loaded',
      total: tokens.length,
      startIndex,
      wpm,
      fontSize,
      backStepWords
    })
  }

  private handleMessage(msg: { type: string; value?: number }): void {
    const config = vscode.workspace.getConfiguration('rsvp')
    switch (msg.type) {
      case 'play':  this.engine.play();   break
      case 'pause': this.engine.pause();  break
      case 'back':
        this.engine.back(config.get<number>('backStepWords', 5))
        break
      case 'forward':
        this.engine.forward(config.get<number>('backStepWords', 5))
        break
      case 'backSentence':
        this.engine.backToSentence()
        break
      case 'seek':
        if (msg.value !== undefined) {
          this.engine.seek(msg.value)
          this.savePosition()
        }
        break
      case 'wpm':
        if (msg.value !== undefined) {
          this.engine.setWpm(msg.value)
          void config.update('wpm', msg.value, true)
        }
        break
      case 'fontSize':
        if (msg.value !== undefined) {
          void config.update('fontSize', msg.value, true)
        }
        break
    }
  }

  /**
   * RSVP → Editor: reveal the source line for the given token index.
   * Uses InCenterIfOutsideViewport so the editor only scrolls when the
   * target line is already off-screen — no jitter on consecutive words.
   */
  private revealEditorLine(tokenIndex: number): void {
    if (!this.fileUri || this.tokenLines.length === 0) return
    const line = this.tokenLines[tokenIndex]
    if (line === undefined) return

    const editor = vscode.window.visibleTextEditors.find(
      e => e.document.uri.fsPath === this.fileUri!.fsPath
    )
    if (!editor) return

    // Record the line we're about to reveal so the scroll handler can suppress
    // the echo event. If InCenterIfOutsideViewport decides no scroll is needed
    // (line already visible), no event fires and rsvpRevealLine would stay set
    // forever — blocking all user scroll events. The 50ms timer auto-clears it.
    this.rsvpRevealLine = line
    if (this.revealClearTimer) clearTimeout(this.revealClearTimer)
    this.revealClearTimer = setTimeout(() => {
      this.rsvpRevealLine = null
      this.revealClearTimer = null
    }, 50)
    const pos = new vscode.Position(line, 0)
    editor.revealRange(
      new vscode.Range(pos, pos),
      vscode.TextEditorRevealType.InCenterIfOutsideViewport
    )
    // InCenterIfOutsideViewport: if the line is already visible no scroll fires,
    // so rsvpRevealLine may stay set until the next seek. That's fine — the next
    // user scroll to a different line will not include rsvpRevealLine in its ranges.
  }

  /**
   * Binary search: returns the index of the first token whose source line
   * is >= targetLine. O(log n) over the tokenLines array.
   */
  private findTokenAtLine(targetLine: number): number {
    const tl = this.tokenLines
    if (tl.length === 0) return 0
    let lo = 0, hi = tl.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (tl[mid] < targetLine) lo = mid + 1
      else hi = mid
    }
    return lo
  }

  private savePosition(): void {
    if (RsvpPanel.context && this.fileUri) {
      void RsvpPanel.context.workspaceState.update(
        `rsvp.pos.${this.fileUri.fsPath}`,
        this.engine.getIndex()
      )
    }
  }

  // Reads media/rsvp.html and injects a per-session CSP nonce.
  private buildHtml(): string {
    const nonce = getNonce()
    const htmlPath = path.join(this.extensionUri.fsPath, 'media', 'rsvp.html')
    const template = fs.readFileSync(htmlPath, 'utf8')
    return template.replace(/\{\{nonce\}\}/g, nonce)
  }

  private dispose(): void {
    if (this.scrollDebounce) clearTimeout(this.scrollDebounce)
    if (this.revealClearTimer) clearTimeout(this.revealClearTimer)
    RsvpPanel.statusBar?.hide()
    void vscode.commands.executeCommand('setContext', 'rsvpReaderActive', false)
    RsvpPanel.currentPanel = undefined
    this.engine.dispose()
    this.panel.dispose()
    for (const d of this.disposables) d.dispose()
  }
}
