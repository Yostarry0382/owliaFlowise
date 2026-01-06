import { NextRequest, NextResponse } from 'next/server';
import { FlowiseClient } from '@/app/lib/flowise-client';
import { v4 as uuidv4 } from 'uuid';

// FlowiseのエンドポイントとAPIキーを環境変数から取得
const FLOWISE_API_URL = process.env.FLOWISE_API_URL || 'http://localhost:3000';
const FLOWISE_CHATFLOW_ID = process.env.FLOWISE_DEFAULT_CHATFLOW_ID || '';
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, chatflowId } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const targetChatflowId = chatflowId || FLOWISE_CHATFLOW_ID;

    if (!targetChatflowId) {
      // Chatflow IDが未設定の場合は、モック応答を返す
      return NextResponse.json({
        message: 'Flowise chatflow IDが設定されていません。.env.localでFLOWISE_DEFAULT_CHATFLOW_IDを設定するか、Flowiseでchatflowを作成してください。',
        sessionId: sessionId || uuidv4(),
        isMockResponse: true,
        hint: 'http://localhost:3001 でFlowiseにアクセスし、chatflowを作成してください。'
      });
    }

    const flowiseClient = new FlowiseClient({
      apiUrl: FLOWISE_API_URL,
      chatflowId: targetChatflowId,
      apiKey: FLOWISE_API_KEY
    });

    // セッションIDがない場合は新しく生成
    const currentSessionId = sessionId || uuidv4();

    // 新しいpredict APIを使用
    const response = await flowiseClient.predict(
      targetChatflowId,
      message,
      { sessionId: currentSessionId }
    );

    return NextResponse.json({
      message: response.text || '',
      sessionId: currentSessionId,
      sourceDocuments: response.sourceDocuments || [],
      chatId: response.chatId,
      chatMessageId: response.chatMessageId,
      usedTools: response.usedTools || [],
      agentReasoning: response.agentReasoning || []
    });
  } catch (error) {
    console.error('Error in chat API:', error);

    // より詳細なエラー情報を返す
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError = errorMessage.includes('fetch') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('Network');

    return NextResponse.json(
      {
        error: 'Failed to process chat message',
        details: errorMessage,
        hint: isConnectionError
          ? `Flowise server may not be running. Check if it's available at ${FLOWISE_API_URL}`
          : 'Check Flowise server logs for more details',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
