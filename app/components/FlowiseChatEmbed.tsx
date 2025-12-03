'use client';

import { useEffect, useState } from 'react';
import { BubbleChat } from 'flowise-embed-react';

interface FlowiseChatEmbedProps {
  chatflowId: string;
  apiHost?: string;
  chatflowConfig?: Record<string, unknown>;
  theme?: {
    button?: {
      backgroundColor?: string;
      right?: number;
      bottom?: number;
      size?: number;
      iconColor?: string;
    };
    chatWindow?: {
      welcomeMessage?: string;
      backgroundColor?: string;
      height?: number;
      width?: number;
      fontSize?: number;
      poweredByTextColor?: string;
      botMessage?: {
        backgroundColor?: string;
        textColor?: string;
      };
      userMessage?: {
        backgroundColor?: string;
        textColor?: string;
      };
      textInput?: {
        placeholder?: string;
        backgroundColor?: string;
        textColor?: string;
        sendButtonColor?: string;
      };
    };
  };
}

/**
 * Flowise チャットUI埋め込みコンポーネント
 *
 * 使用方法:
 * <FlowiseChatEmbed
 *   chatflowId="your-chatflow-id"
 *   apiHost="http://localhost:3000"
 * />
 */
export default function FlowiseChatEmbed({
  chatflowId,
  apiHost,
  chatflowConfig,
  theme,
}: FlowiseChatEmbedProps) {
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // クライアントサイドでのみレンダリング
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 環境変数からデフォルト値を取得
  const effectiveApiHost = apiHost || process.env.NEXT_PUBLIC_FLOWISE_API_URL || 'http://localhost:3000';
  const effectiveChatflowId = chatflowId || process.env.NEXT_PUBLIC_FLOWISE_DEFAULT_CHATFLOW_ID;

  if (!effectiveChatflowId) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-100 text-red-800 p-4 rounded-lg shadow-lg max-w-sm">
        <p className="font-bold">Flowise 設定エラー</p>
        <p className="text-sm mt-1">
          chatflowIdが設定されていません。環境変数 NEXT_PUBLIC_FLOWISE_DEFAULT_CHATFLOW_ID を設定するか、
          propsでchatflowIdを渡してください。
        </p>
      </div>
    );
  }

  if (!isClient) {
    return null;
  }

  // デフォルトテーマ設定（OwliaFabricaのデザインに合わせる）
  const defaultTheme = {
    button: {
      backgroundColor: '#6366f1', // Indigo-500
      right: 20,
      bottom: 20,
      size: 56,
      iconColor: 'white',
      ...theme?.button,
    },
    chatWindow: {
      welcomeMessage: 'こんにちは！OwliaFabricaのAIアシスタントです。何かお手伝いできることはありますか？',
      backgroundColor: '#ffffff',
      height: 600,
      width: 400,
      fontSize: 14,
      poweredByTextColor: '#999',
      botMessage: {
        backgroundColor: '#f3f4f6',
        textColor: '#1f2937',
        ...theme?.chatWindow?.botMessage,
      },
      userMessage: {
        backgroundColor: '#6366f1',
        textColor: '#ffffff',
        ...theme?.chatWindow?.userMessage,
      },
      textInput: {
        placeholder: 'メッセージを入力...',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        sendButtonColor: '#6366f1',
        ...theme?.chatWindow?.textInput,
      },
      ...theme?.chatWindow,
    },
  };

  return (
    <>
      {error && (
        <div className="fixed bottom-24 right-4 bg-red-100 text-red-800 p-3 rounded-lg shadow-lg max-w-sm z-50">
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs underline mt-1"
          >
            閉じる
          </button>
        </div>
      )}
      <BubbleChat
        chatflowid={effectiveChatflowId}
        apiHost={effectiveApiHost}
        chatflowConfig={chatflowConfig}
        theme={defaultTheme}
      />
    </>
  );
}
