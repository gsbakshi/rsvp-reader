// SPDX-License-Identifier: GPL-3.0-only
// Copyright (c) 2026 Gurmehar Singh Bakshi

export interface Token {
  word: string
  delayMultiplier: number // 1.0 normal, 1.1 pre-clause, 1.3 after clause, 1.8 after sentence
}

export type EngineState = 'idle' | 'playing' | 'paused' | 'done'

export class RsvpEngine {
  private tokens: Token[] = []
  private index: number = 0
  private state: EngineState = 'idle'
  private timer: ReturnType<typeof setTimeout> | null = null
  private wpm: number

  // Indices where a new sentence begins (token after a sentence-ending token)
  private sentenceStarts: number[] = []

  private readonly onToken: (token: Token, index: number, total: number) => void
  private readonly onStateChange: (state: EngineState) => void

  constructor(
    onToken: (token: Token, index: number, total: number) => void,
    onStateChange: (state: EngineState) => void,
    wpm = 250
  ) {
    this.onToken = onToken
    this.onStateChange = onStateChange
    this.wpm = wpm
  }

  load(tokens: Token[]): void {
    this.stop()
    this.tokens = tokens
    this.index = 0
    this.state = 'idle'
    this.buildSentenceIndex()
  }

  play(): void {
    if (this.state === 'playing') return
    if (this.state === 'done') this.index = 0
    this.state = 'playing'
    this.onStateChange(this.state)
    this.tick()
  }

  pause(): void {
    if (this.state !== 'playing') return
    this.clearTimer()
    this.state = 'paused'
    this.onStateChange(this.state)
  }

  back(count = 5): void {
    this.index = Math.max(0, this.index - count)
    if (this.state === 'playing') { this.clearTimer(); this.tick() }
  }

  forward(count = 5): void {
    this.index = Math.min(this.tokens.length - 1, this.index + count)
    if (this.state === 'playing') { this.clearTimer(); this.tick() }
  }

  seek(index: number): void {
    this.index = Math.max(0, Math.min(this.tokens.length - 1, index))
    if (this.state === 'playing') { this.clearTimer(); this.tick() }
    else {
      // Preview the token at the new position when paused/idle
      if (this.tokens.length > 0) {
        this.onToken(this.tokens[this.index], this.index, this.tokens.length)
      }
    }
  }

  // Jump back to the start of the current or previous sentence
  backToSentence(): void {
    // Find the largest sentence start that is strictly less than current index - 1
    const target = this.sentenceStarts
      .filter(s => s < Math.max(0, this.index - 1))
      .pop() ?? 0
    this.index = target
    if (this.state === 'playing') { this.clearTimer(); this.tick() }
    else if (this.tokens.length > 0) {
      this.onToken(this.tokens[this.index], this.index, this.tokens.length)
    }
  }

  setWpm(wpm: number): void {
    this.wpm = Math.max(50, Math.min(1500, wpm))
  }

  getIndex(): number { return this.index }

  stop(): void {
    this.clearTimer()
    this.state = 'idle'
    this.index = 0
  }

  dispose(): void { this.stop() }

  private buildSentenceIndex(): void {
    this.sentenceStarts = [0]
    for (let i = 0; i < this.tokens.length - 1; i++) {
      if (this.tokens[i].delayMultiplier >= 1.8) {
        this.sentenceStarts.push(i + 1)
      }
    }
  }

  private tick(): void {
    if (this.index >= this.tokens.length) {
      this.state = 'done'
      this.onStateChange(this.state)
      return
    }
    const token = this.tokens[this.index]
    this.onToken(token, this.index, this.tokens.length)
    this.index++
    const delay = (60_000 / this.wpm) * token.delayMultiplier
    this.timer = setTimeout(() => this.tick(), delay)
  }

  private clearTimer(): void {
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null }
  }
}
