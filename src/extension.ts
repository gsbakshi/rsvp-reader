// SPDX-License-Identifier: GPL-3.0-only
// Copyright (c) 2026 Gurmehar Singh Bakshi
import * as vscode from 'vscode'
import { RsvpPanel } from './rsvpPanel'

export function activate(context: vscode.ExtensionContext): void {
  RsvpPanel.context = context

  // Status bar item — shows word progress during playback, click to pause/play
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  statusBar.command = 'rsvp.togglePlayPause'
  statusBar.tooltip = 'RSVP Reader — click to play / pause'
  context.subscriptions.push(statusBar)
  RsvpPanel.statusBar = statusBar

  // Helper: resolve a .md URI from (in priority order):
  //  1. Explicit argument — from explorer/title context menus
  //  2. Active text editor — plain "basic mode" editing
  //  3. Any visible markdown text editor — covers the case where a markdown
  //     preview webview is focused (activeTextEditor is undefined) but the
  //     source .md file is still open in a visible editor column
  function resolveMarkdownUri(uri?: vscode.Uri): vscode.Uri | undefined {
    if (uri?.fsPath.toLowerCase().endsWith('.md')) return uri

    const fromActive = vscode.window.activeTextEditor?.document.uri
    if (fromActive?.fsPath.toLowerCase().endsWith('.md')) return fromActive

    const fromVisible = vscode.window.visibleTextEditors.find(
      e => e.document.uri.fsPath.toLowerCase().endsWith('.md')
    )?.document.uri
    if (fromVisible) return fromVisible

    void vscode.window.showInformationMessage('RSVP: Open a markdown file first')
    return undefined
  }

  context.subscriptions.push(

    // ── Play / Pause (status bar click, keybinding) ──────────────────────
    vscode.commands.registerCommand('rsvp.togglePlayPause', () => {
      RsvpPanel.currentPanel?.togglePlayPause()
    }),

    // ── Read File ────────────────────────────────────────────────────────
    // Works from: explorer context, editor/title button, command palette,
    // keybinding (Cmd/Ctrl+Shift+R when no selection).
    vscode.commands.registerCommand('rsvp.readFile', async (uri?: vscode.Uri) => {
      const target = resolveMarkdownUri(uri)
      if (!target) return
      const bytes = await vscode.workspace.fs.readFile(target)
      RsvpPanel.createOrShow(context.extensionUri, Buffer.from(bytes).toString('utf8'), true, target)
    }),

    // ── Read Selection ───────────────────────────────────────────────────
    // Works from: editor context menu, keybinding (Cmd/Ctrl+Shift+R with selection).
    vscode.commands.registerCommand('rsvp.readSelection', () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) return
      const text = editor.document.getText(editor.selection)
      if (!text.trim()) {
        void vscode.window.showInformationMessage('RSVP: Select some text first')
        return
      }
      RsvpPanel.createOrShow(context.extensionUri, text, editor.document.languageId === 'markdown')
    }),

    // ── Read with Preview ────────────────────────────────────────────────
    // Opens the rendered markdown preview beside the source file, then opens
    // the RSVP reader. All three panels stay in sync automatically:
    //
    //   RSVP reader ──revealRange──▶ text editor ──scrollPreviewWithEditor──▶ preview
    //   preview ──scrollEditorWithPreview──▶ text editor ──visibleRangesChanged──▶ RSVP
    //
    // The text editor is the hub. No custom wiring needed — VS Code's built-in
    // markdown preview sync handles the preview↔editor leg, and our extension
    // handles the editor↔RSVP leg.
    vscode.commands.registerCommand('rsvp.readWithPreview', async (uri?: vscode.Uri) => {
      const target = resolveMarkdownUri(uri)
      if (!target) return

      // Open the rendered preview to the side. vscode-markdown (Markdown All in One)
      // enhances this if installed, but the command is VS Code's built-in.
      await vscode.commands.executeCommand('markdown.showPreviewToSide', target)

      const bytes = await vscode.workspace.fs.readFile(target)
      RsvpPanel.createOrShow(context.extensionUri, Buffer.from(bytes).toString('utf8'), true, target)
    })
  )
}

export function deactivate(): void {}
