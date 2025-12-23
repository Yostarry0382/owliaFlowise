import { NextRequest, NextResponse } from 'next/server';
import { executeFlow, processReviewDecision } from '@/app/lib/native-execution-engine';
import { FlowNode, FlowEdge } from '@/app/types/flowise';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nodes,
      edges,
      input,
      sessionId,
      useNative = true,
      // Human Reviewアクション用
      action,
      reviewNodeId,
      decision,
      editedOutput,
    } = body;

    // Human Review決定の処理
    if (action === 'review') {
      if (!reviewNodeId || !decision) {
        return NextResponse.json(
          { error: 'Review node ID and decision are required' },
          { status: 400 }
        );
      }

      const result = await processReviewDecision(
        nodes as FlowNode[],
        edges as FlowEdge[],
        reviewNodeId,
        decision,
        editedOutput
      );

      return NextResponse.json(result);
    }

    // 通常のフロー実行
    if (!nodes || !Array.isArray(nodes)) {
      return NextResponse.json(
        { error: 'Nodes array is required' },
        { status: 400 }
      );
    }

    if (!edges || !Array.isArray(edges)) {
      return NextResponse.json(
        { error: 'Edges array is required' },
        { status: 400 }
      );
    }

    // ネイティブエンジンで実行
    console.log('[API] Executing flow with native engine');
    console.log('[API] Input:', input);
    console.log('[API] Nodes count:', nodes.length);

    const result = await executeFlow(
      nodes as FlowNode[],
      edges as FlowEdge[],
      input,
      sessionId
    );

    console.log('[API] Execution result:', JSON.stringify(result, null, 2));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error executing flow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        logs: [`[ERROR] ${error instanceof Error ? error.message : 'Unknown error'}`],
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
