import { NextRequest, NextResponse } from 'next/server';
import { FlowiseClient } from '@/app/lib/flowise-client';
import { v4 as uuidv4 } from 'uuid';

// FlowiseのエンドポイントとAPIキーを環境変数から取得
const FLOWISE_API_URL = process.env.FLOWISE_API_URL || 'http://localhost:3000';
const FLOWISE_CHATFLOW_ID = process.env.FLOWISE_CHATFLOW_ID || '';
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!FLOWISE_CHATFLOW_ID) {
      return NextResponse.json(
        { error: 'Flowise chatflow ID is not configured' },
        { status: 500 }
      );
    }

    const flowiseClient = new FlowiseClient({
      apiUrl: FLOWISE_API_URL,
      chatflowId: FLOWISE_CHATFLOW_ID,
      apiKey: FLOWISE_API_KEY
    });

    // セッションIDがない場合は新しく生成
    const currentSessionId = sessionId || uuidv4();

    const response = await flowiseClient.sendMessage(
      message,
      currentSessionId
    );

    return NextResponse.json({
      message: response.text || response.question || '',
      sessionId: currentSessionId,
      sourceDocuments: response.sourceDocuments,
      chatId: response.chatId,
      chatMessageId: response.chatMessageId
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
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