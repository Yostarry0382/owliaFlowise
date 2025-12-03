/**
 * Flowise API Client
 * Flowise サーバーとの通信を管理するクライアント
 */

import {
  FlowiseConfig,
  FlowisePredictionResponse,
  FlowiseChatflow,
  FlowiseChatflowCreate,
  FlowiseExecutionOptions,
  FlowiseHumanInput
} from '@/app/types/flowise';

export class FlowiseClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config?: Partial<FlowiseConfig>) {
    this.baseUrl = config?.apiUrl || process.env.FLOWISE_API_URL || 'http://localhost:3000';
    this.apiKey = config?.apiKey || process.env.FLOWISE_API_KEY || '';
  }

  /**
   * 共通のリクエストヘッダーを取得
   */
  private getHeaders(contentType: string = 'application/json'): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': contentType,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * APIリクエストを実行
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new FlowiseAPIError(
          response.status,
          errorData.message || `API request failed: ${response.statusText}`,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof FlowiseAPIError) {
        throw error;
      }
      throw new FlowiseAPIError(
        0,
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error }
      );
    }
  }

  // ============================================
  // Prediction API
  // ============================================

  /**
   * Chatflowにメッセージを送信して予測結果を取得
   */
  async predict(
    chatflowId: string,
    question: string,
    options: FlowiseExecutionOptions = {}
  ): Promise<FlowisePredictionResponse> {
    const payload: Record<string, any> = {
      question,
    };

    if (options.sessionId) payload.sessionId = options.sessionId;
    if (options.overrideConfig) payload.overrideConfig = options.overrideConfig;
    if (options.history) payload.history = options.history;
    if (options.uploads) payload.uploads = options.uploads;
    if (options.humanInput) payload.humanInput = options.humanInput;

    return this.request<FlowisePredictionResponse>(
      `/api/v1/prediction/${chatflowId}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  /**
   * ストリーミング形式でメッセージを送信
   */
  async predictStream(
    chatflowId: string,
    question: string,
    options: FlowiseExecutionOptions = {},
    onMessage?: (data: string) => void
  ): Promise<FlowisePredictionResponse> {
    const payload: Record<string, any> = {
      question,
      streaming: true,
    };

    if (options.sessionId) payload.sessionId = options.sessionId;
    if (options.overrideConfig) payload.overrideConfig = options.overrideConfig;
    if (options.history) payload.history = options.history;

    const url = `${this.baseUrl}/api/v1/prediction/${chatflowId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new FlowiseAPIError(
        response.status,
        `Stream request failed: ${response.statusText}`
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new FlowiseAPIError(0, 'Response body is not readable');
    }

    const decoder = new TextDecoder();
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        if (onMessage) {
          onMessage(chunk);
        }
      }
    } finally {
      reader.releaseLock();
    }

    return { text: fullText };
  }

  /**
   * 人間による確認レスポンスを送信
   */
  async submitHumanInput(
    chatflowId: string,
    humanInput: FlowiseHumanInput
  ): Promise<FlowisePredictionResponse> {
    return this.request<FlowisePredictionResponse>(
      `/api/v1/prediction/${chatflowId}`,
      {
        method: 'POST',
        body: JSON.stringify({ humanInput }),
      }
    );
  }

  // ============================================
  // Chatflows Management API
  // ============================================

  /**
   * すべてのChatflowを取得
   */
  async getChatflows(): Promise<FlowiseChatflow[]> {
    return this.request<FlowiseChatflow[]>('/api/v1/chatflows', {
      method: 'GET',
    });
  }

  /**
   * 特定のChatflowを取得
   */
  async getChatflow(id: string): Promise<FlowiseChatflow> {
    return this.request<FlowiseChatflow>(`/api/v1/chatflows/${id}`, {
      method: 'GET',
    });
  }

  /**
   * 新しいChatflowを作成
   */
  async createChatflow(data: FlowiseChatflowCreate): Promise<FlowiseChatflow> {
    return this.request<FlowiseChatflow>('/api/v1/chatflows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Chatflowを更新
   */
  async updateChatflow(
    id: string,
    data: Partial<FlowiseChatflowCreate>
  ): Promise<FlowiseChatflow> {
    return this.request<FlowiseChatflow>(`/api/v1/chatflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Chatflowを削除
   */
  async deleteChatflow(id: string): Promise<void> {
    await this.request<void>(`/api/v1/chatflows/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // File Upload API
  // ============================================

  /**
   * ファイルをアップロード
   */
  async uploadFiles(files: File[], chatflowId?: string): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    if (chatflowId) {
      formData.append('chatflowId', chatflowId);
    }

    const url = `${this.baseUrl}/api/v1/get-upload-file`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new FlowiseAPIError(
        response.status,
        `File upload failed: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.data || data;
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Flowise サーバーの接続確認
   */
  async healthCheck(): Promise<boolean> {
    try {
      // 認証不要なルートエンドポイントで確認
      const response = await fetch(`${this.baseUrl}/api/v1/ping`, {
        method: 'GET',
      });
      if (response.ok) return true;

      // pingがない場合はルートを確認
      const rootResponse = await fetch(this.baseUrl, {
        method: 'GET',
      });
      return rootResponse.ok;
    } catch {
      return false;
    }
  }

  /**
   * 設定を取得
   */
  getConfig(): FlowiseConfig {
    return {
      apiUrl: this.baseUrl,
      apiKey: this.apiKey,
      chatflowId: process.env.FLOWISE_DEFAULT_CHATFLOW_ID || '',
    };
  }
}

/**
 * Flowise API エラークラス
 */
export class FlowiseAPIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'FlowiseAPIError';
  }

  isNotFound(): boolean {
    return this.statusCode === 404;
  }

  isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  isValidationError(): boolean {
    return this.statusCode === 422;
  }
}

/**
 * デフォルトのFlowiseクライアントインスタンス
 */
export const flowiseClient = new FlowiseClient();

/**
 * Flowiseクライアントのファクトリ関数
 */
export function createFlowiseClient(config?: Partial<FlowiseConfig>): FlowiseClient {
  return new FlowiseClient(config);
}
