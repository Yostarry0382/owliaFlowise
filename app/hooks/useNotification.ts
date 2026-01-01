'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Notification,
  NotificationType,
  createSuccessNotification,
  createErrorNotification,
  createWarningNotification,
  createInfoNotification,
  SUCCESS_MESSAGES,
  ERROR_CONTEXTS,
} from '../lib/notification';

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: NotificationType;
}

/**
 * 通知を管理するカスタムフック
 *
 * 使用例:
 * ```tsx
 * const { snackbar, showSuccess, showError, closeSnackbar } = useNotification();
 *
 * // 成功通知
 * showSuccess('保存しました');
 *
 * // エラー通知（エラーオブジェクトから自動メッセージ生成）
 * try {
 *   await someAsyncOperation();
 * } catch (error) {
 *   showError(error, '保存に失敗しました');
 * }
 *
 * // Snackbarコンポーネントに渡す
 * <Snackbar open={snackbar.open} onClose={closeSnackbar}>
 *   <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
 * </Snackbar>
 * ```
 */
export function useNotification() {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showNotification = useCallback((notification: Notification) => {
    setSnackbar({
      open: true,
      message: notification.message,
      severity: notification.type,
    });
  }, []);

  const showSuccess = useCallback(
    (message: string) => {
      showNotification(createSuccessNotification(message));
    },
    [showNotification]
  );

  const showError = useCallback(
    (error: unknown, context?: string) => {
      showNotification(createErrorNotification(error, context));
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (message: string) => {
      showNotification(createWarningNotification(message));
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (message: string) => {
      showNotification(createInfoNotification(message));
    },
    [showNotification]
  );

  const closeSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  // 便利なヘルパー
  const helpers = useMemo(
    () => ({
      saved: (name: string) => showSuccess(SUCCESS_MESSAGES.saved(name)),
      deleted: (name: string) => showSuccess(SUCCESS_MESSAGES.deleted(name)),
      loaded: (name: string) => showSuccess(SUCCESS_MESSAGES.loaded(name)),
      updated: (name: string) => showSuccess(SUCCESS_MESSAGES.updated(name)),

      saveFailed: (error: unknown) => showError(error, ERROR_CONTEXTS.save),
      deleteFailed: (error: unknown) => showError(error, ERROR_CONTEXTS.delete),
      loadFailed: (error: unknown) => showError(error, ERROR_CONTEXTS.load),
      fetchFailed: (error: unknown) => showError(error, ERROR_CONTEXTS.fetch),
      executeFailed: (error: unknown) => showError(error, ERROR_CONTEXTS.execute),
    }),
    [showSuccess, showError]
  );

  return {
    snackbar,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    closeSnackbar,
    helpers,
  };
}

export default useNotification;
