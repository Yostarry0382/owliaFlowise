'use client';

import { useEffect, useState } from 'react';
import { FullPageChat } from 'flowise-embed-react';

interface FlowiseFullChatProps {
  chatflowId: string;
  apiHost?: string;
  chatflowConfig?: Record<string, unknown>;
}

/**
 * Flowise フルページチャットコンポーネント
 *
 * ページ全体にチャットUIを表示する場合に使用
 *
 * 使用方法:
 * <FlowiseFullChat
 *   chatflowId="your-chatflow-id"
 *   apiHost="http://localhost:3000"
 * />
 */
export default function FlowiseFullChat({
  chatflowId,
  apiHost,
  chatflowConfig,
}: FlowiseFullChatProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const effectiveApiHost = apiHost || process.env.NEXT_PUBLIC_FLOWISE_API_URL || 'http://localhost:3000';
  const effectiveChatflowId = chatflowId || process.env.NEXT_PUBLIC_FLOWISE_DEFAULT_CHATFLOW_ID;

  if (!effectiveChatflowId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="bg-red-100 text-red-800 p-6 rounded-lg shadow-lg max-w-md text-center">
          <p className="font-bold text-lg">Flowise 設定エラー</p>
          <p className="text-sm mt-2">
            chatflowIdが設定されていません。
          </p>
          <p className="text-xs mt-2 text-red-600">
            環境変数 NEXT_PUBLIC_FLOWISE_DEFAULT_CHATFLOW_ID を設定するか、
            propsでchatflowIdを渡してください。
          </p>
        </div>
      </div>
    );
  }

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="animate-pulse text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <FullPageChat
        chatflowid={effectiveChatflowId}
        apiHost={effectiveApiHost}
        chatflowConfig={chatflowConfig}
      />
    </div>
  );
}
