'use client';

import { useEffect, useCallback } from 'react';
import { Node } from 'reactflow';

export interface KeyboardShortcutHandlers {
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSearch?: () => void;
  onExecutionPreview?: () => void;
  onVersionHistory?: () => void;
  onTogglePalette?: () => void;
  onTestRun?: () => void;
  onShowShortcutsHelp?: () => void;
  onEscape?: () => void;
  onDeleteSelected?: (nodeIds: string[]) => void;
}

export interface UseKeyboardShortcutsOptions {
  handlers: KeyboardShortcutHandlers;
  nodes: Node[];
  enabled?: boolean;
}

/**
 * キーボードショートカットを管理するカスタムフック
 *
 * ショートカット一覧:
 * - Ctrl+S: 保存
 * - Ctrl+Z: 元に戻す
 * - Ctrl+Shift+Z / Ctrl+Y: やり直し
 * - Ctrl+F: 検索
 * - Ctrl+E: 実行プレビュー
 * - Ctrl+H: バージョン履歴
 * - Ctrl+P: パレット表示切替
 * - Ctrl+Enter: テスト実行
 * - ?: ショートカットヘルプ
 * - Escape: 閉じる
 * - Delete/Backspace: 選択ノードを削除
 */
export function useKeyboardShortcuts({
  handlers,
  nodes,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ctrl/Cmd + キー
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            handlers.onSave?.();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handlers.onRedo?.();
            } else {
              handlers.onUndo?.();
            }
            break;
          case 'y':
            e.preventDefault();
            handlers.onRedo?.();
            break;
          case 'f':
            e.preventDefault();
            handlers.onSearch?.();
            break;
          case 'e':
            e.preventDefault();
            handlers.onExecutionPreview?.();
            break;
          case 'h':
            e.preventDefault();
            handlers.onVersionHistory?.();
            break;
          case 'p':
            e.preventDefault();
            handlers.onTogglePalette?.();
            break;
          case 'enter':
            e.preventDefault();
            handlers.onTestRun?.();
            break;
        }
      }

      // 修飾キーなし
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key) {
          case '?':
            handlers.onShowShortcutsHelp?.();
            break;
          case 'Escape':
            handlers.onEscape?.();
            break;
          case 'Delete':
          case 'Backspace':
            // 入力フィールド内では無視
            if (
              document.activeElement?.tagName !== 'INPUT' &&
              document.activeElement?.tagName !== 'TEXTAREA'
            ) {
              const selectedNodeIds = nodes.filter((n) => n.selected).map((n) => n.id);
              if (selectedNodeIds.length > 0) {
                handlers.onDeleteSelected?.(selectedNodeIds);
              }
            }
            break;
        }
      }
    },
    [enabled, handlers, nodes]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
