// SPDX-License-Identifier: GPL-3.0-only
// Copyright (c) 2026 Gurmehar Singh Bakshi
//
// Typed message protocol shared between rsvpPanel.ts (Node/extension side)
// and src/webview/main.ts (DOM/webview side).
//
// This file is intentionally type-only — it must not import from `vscode`,
// Node built-ins, or DOM globals so it can be consumed by both tsconfigs.

import type { EngineState } from './rsvpEngine'

// ── Extension → Webview ──────────────────────────────────────────────────

export interface TokenMessage {
  type: 'token'
  word: string
  progress: number
  index: number
}

export interface StateMessage {
  type: 'state'
  state: EngineState
}

export interface LoadedMessage {
  type: 'loaded'
  total: number
  startIndex: number
  wpm: number
  fontSize: number
  backStepWords: number
}

export type ExtensionToWebview = TokenMessage | StateMessage | LoadedMessage

// ── Webview → Extension ──────────────────────────────────────────────────

export interface PlayMessage         { type: 'play' }
export interface PauseMessage        { type: 'pause' }
export interface BackMessage         { type: 'back' }
export interface ForwardMessage      { type: 'forward' }
export interface BackSentenceMessage { type: 'backSentence' }
export interface SeekMessage         { type: 'seek';     value: number }
export interface WpmMessage          { type: 'wpm';      value: number }
export interface FontSizeMessage     { type: 'fontSize'; value: number }

export type WebviewToExtension =
  | PlayMessage
  | PauseMessage
  | BackMessage
  | ForwardMessage
  | BackSentenceMessage
  | SeekMessage
  | WpmMessage
  | FontSizeMessage
