import { NextResponse } from 'next/server';
import { FlowiseClient } from '@/app/lib/flowise-client';

// Flowise クライアントの初期化
const flowiseClient = new FlowiseClient();

/**
 * GET /api/flowise/status
 * Flowiseサーバーの接続ステータスを確認
 */
export async function GET() {
  try {
    const config = flowiseClient.getConfig();
    const isConnected = await flowiseClient.healthCheck();

    if (isConnected) {
      // 追加情報を取得
      let chatflowCount = 0;
      try {
        const chatflows = await flowiseClient.getChatflows();
        chatflowCount = chatflows.length;
      } catch {
        // chatflow取得に失敗しても接続状態は返す
      }

      return NextResponse.json({
        success: true,
        status: 'connected',
        apiUrl: config.apiUrl,
        chatflowCount,
        defaultChatflowId: config.chatflowId || null,
        hasApiKey: !!config.apiKey,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: false,
      status: 'disconnected',
      apiUrl: config.apiUrl,
      error: 'Unable to connect to Flowise server',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
