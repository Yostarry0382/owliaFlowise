import { NextRequest, NextResponse } from 'next/server';

/**
 * AI Revision API
 * Human Reviewでユーザーのコメント/フィードバックに基づいてAIが出力を修正する
 */

interface RevisionRequest {
  originalOutput: string;
  userFeedback: string;
  nodeContext?: {
    nodeType?: string;
    nodeName?: string;
    systemMessage?: string;
  };
}

interface RevisionResponse {
  success: boolean;
  revisedOutput?: string;
  error?: string;
  revisionNote?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<RevisionResponse>> {
  try {
    const body: RevisionRequest = await request.json();
    const { originalOutput, userFeedback, nodeContext } = body;

    if (!originalOutput) {
      return NextResponse.json(
        { success: false, error: '元の出力が指定されていません' },
        { status: 400 }
      );
    }

    if (!userFeedback || !userFeedback.trim()) {
      return NextResponse.json(
        { success: false, error: 'フィードバックが指定されていません' },
        { status: 400 }
      );
    }

    console.log('[Revise API] 修正リクエスト受信');
    console.log('[Revise API] フィードバック:', userFeedback.slice(0, 100));

    // Azure OpenAI設定
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

    // 通常のOpenAI設定
    const openaiApiKey = process.env.OPENAI_API_KEY;

    // 修正用のシステムプロンプト
    const revisionSystemPrompt = `あなたはAI出力を修正するアシスタントです。
ユーザーからのフィードバックに基づいて、元の出力を改善してください。

修正の際の注意点:
1. ユーザーのフィードバックを正確に理解し、指摘された問題を解決する
2. 元の出力の良い部分は維持しながら、問題点のみを修正する
3. 修正後の出力は元の形式や文体を可能な限り維持する
4. フィードバックに直接関係ない部分は変更しない

修正された出力のみを返してください。説明や補足は不要です。`;

    const revisionUserPrompt = `## 元の出力
${originalOutput}

## ユーザーからのフィードバック
${userFeedback}

${nodeContext?.nodeName ? `## コンテキスト\nノード名: ${nodeContext.nodeName}` : ''}

上記のフィードバックに基づいて、元の出力を修正してください。修正後の出力のみを返してください。`;

    // Azure OpenAIを優先
    if (azureApiKey && azureEndpoint && azureDeployment) {
      try {
        const url = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureApiVersion}`;
        console.log('[Revise API] Azure OpenAI使用');

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': azureApiKey,
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: revisionSystemPrompt },
              { role: 'user', content: revisionUserPrompt },
            ],
            temperature: 0.3, // 修正は低めの温度で一貫性を重視
            max_tokens: 4000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const revisedOutput = data.choices?.[0]?.message?.content || '';

        console.log('[Revise API] Azure OpenAI修正完了');
        return NextResponse.json({
          success: true,
          revisedOutput,
          revisionNote: 'Azure OpenAIによる修正',
        });
      } catch (error) {
        console.error('[Revise API] Azure OpenAI呼び出し失敗:', error);
        // フォールバックとして通常のOpenAIを試行
      }
    }

    // 通常のOpenAI API
    if (openaiApiKey && openaiApiKey.startsWith('sk-')) {
      try {
        console.log('[Revise API] OpenAI API使用');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: revisionSystemPrompt },
              { role: 'user', content: revisionUserPrompt },
            ],
            temperature: 0.3,
            max_tokens: 4000,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const revisedOutput = data.choices?.[0]?.message?.content || '';

        console.log('[Revise API] OpenAI修正完了');
        return NextResponse.json({
          success: true,
          revisedOutput,
          revisionNote: 'OpenAIによる修正',
        });
      } catch (error) {
        console.error('[Revise API] OpenAI呼び出し失敗:', error);
      }
    }

    // APIキーが設定されていない場合
    return NextResponse.json(
      {
        success: false,
        error: 'AI APIキーが設定されていません。.env.localでAZURE_OPENAI_API_KEYまたはOPENAI_API_KEYを設定してください。',
      },
      { status: 500 }
    );
  } catch (error) {
    console.error('[Revise API] エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '修正処理中にエラーが発生しました',
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
