/**
 * 統一的な通知・エラーハンドリングシステム
 *
 * すべてのコンポーネントで一貫したエラー表示とユーザーフィードバックを提供します。
 */

// 通知の種類
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// 通知データ
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // ミリ秒、0で自動非表示なし
}

// エラーの種類
export type ErrorType =
  | 'network'      // ネットワークエラー
  | 'validation'   // 検証エラー
  | 'timeout'      // タイムアウト
  | 'auth'         // 認証エラー
  | 'notFound'     // リソースが見つからない
  | 'server'       // サーバーエラー
  | 'unknown';     // 不明なエラー

// 構造化されたエラー
export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: unknown;
  details?: Record<string, unknown>;
}

// エラーメッセージの日本語マッピング
const ERROR_MESSAGES: Record<ErrorType, string> = {
  network: 'ネットワーク接続に問題があります。インターネット接続を確認してください。',
  validation: '入力内容に問題があります。',
  timeout: '処理がタイムアウトしました。もう一度お試しください。',
  auth: '認証に失敗しました。再度ログインしてください。',
  notFound: 'リソースが見つかりませんでした。',
  server: 'サーバーエラーが発生しました。しばらくしてからお試しください。',
  unknown: '予期しないエラーが発生しました。',
};

/**
 * エラーを解析してAppError形式に変換
 */
export function parseError(error: unknown): AppError {
  // fetch エラー
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      message: ERROR_MESSAGES.network,
      originalError: error,
    };
  }

  // Response オブジェクト
  if (error instanceof Response) {
    if (error.status === 401 || error.status === 403) {
      return {
        type: 'auth',
        message: ERROR_MESSAGES.auth,
        originalError: error,
      };
    }
    if (error.status === 404) {
      return {
        type: 'notFound',
        message: ERROR_MESSAGES.notFound,
        originalError: error,
      };
    }
    if (error.status >= 500) {
      return {
        type: 'server',
        message: ERROR_MESSAGES.server,
        originalError: error,
      };
    }
  }

  // AbortError (タイムアウト)
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      type: 'timeout',
      message: ERROR_MESSAGES.timeout,
      originalError: error,
    };
  }

  // Error オブジェクト
  if (error instanceof Error) {
    // タイムアウト関連のメッセージ
    if (error.message.toLowerCase().includes('timeout')) {
      return {
        type: 'timeout',
        message: ERROR_MESSAGES.timeout,
        originalError: error,
      };
    }

    // ネットワーク関連のメッセージ
    if (
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('failed to fetch')
    ) {
      return {
        type: 'network',
        message: ERROR_MESSAGES.network,
        originalError: error,
      };
    }

    return {
      type: 'unknown',
      message: error.message || ERROR_MESSAGES.unknown,
      originalError: error,
    };
  }

  // 文字列エラー
  if (typeof error === 'string') {
    return {
      type: 'unknown',
      message: error,
      originalError: error,
    };
  }

  // その他
  return {
    type: 'unknown',
    message: ERROR_MESSAGES.unknown,
    originalError: error,
  };
}

/**
 * APIレスポンスからエラーを抽出
 */
export async function extractApiError(response: Response): Promise<AppError> {
  try {
    const data = await response.json();
    const message = data.error || data.message || ERROR_MESSAGES.server;

    let type: ErrorType = 'unknown';
    if (response.status === 401 || response.status === 403) {
      type = 'auth';
    } else if (response.status === 404) {
      type = 'notFound';
    } else if (response.status === 400 || response.status === 422) {
      type = 'validation';
    } else if (response.status >= 500) {
      type = 'server';
    }

    return {
      type,
      message,
      details: data,
    };
  } catch {
    return parseError(response);
  }
}

/**
 * ユーザー向けのエラーメッセージを生成
 */
export function getUserFriendlyMessage(error: AppError, context?: string): string {
  let message = error.message;

  // コンテキストがあれば追加
  if (context) {
    message = `${context}: ${message}`;
  }

  return message;
}

/**
 * 通知IDを生成
 */
export function generateNotificationId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 成功通知を作成
 */
export function createSuccessNotification(message: string, duration = 4000): Notification {
  return {
    id: generateNotificationId(),
    type: 'success',
    message,
    duration,
  };
}

/**
 * エラー通知を作成
 */
export function createErrorNotification(
  error: unknown,
  context?: string,
  duration = 6000
): Notification {
  const appError = parseError(error);
  return {
    id: generateNotificationId(),
    type: 'error',
    message: getUserFriendlyMessage(appError, context),
    duration,
  };
}

/**
 * 警告通知を作成
 */
export function createWarningNotification(message: string, duration = 5000): Notification {
  return {
    id: generateNotificationId(),
    type: 'warning',
    message,
    duration,
  };
}

/**
 * 情報通知を作成
 */
export function createInfoNotification(message: string, duration = 4000): Notification {
  return {
    id: generateNotificationId(),
    type: 'info',
    message,
    duration,
  };
}

// 標準的な成功メッセージ
export const SUCCESS_MESSAGES = {
  saved: (name: string) => `「${name}」を保存しました`,
  deleted: (name: string) => `「${name}」を削除しました`,
  loaded: (name: string) => `「${name}」を読み込みました`,
  updated: (name: string) => `「${name}」を更新しました`,
  copied: '内容をコピーしました',
  exported: 'エクスポートが完了しました',
} as const;

// 標準的なエラーメッセージ
export const ERROR_CONTEXTS = {
  save: '保存に失敗しました',
  delete: '削除に失敗しました',
  load: '読み込みに失敗しました',
  update: '更新に失敗しました',
  fetch: 'データの取得に失敗しました',
  execute: '実行に失敗しました',
} as const;
