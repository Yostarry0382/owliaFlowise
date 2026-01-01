import { NextRequest, NextResponse } from 'next/server';
import { executeFlow, executeFlowFromNode } from '@/app/lib/native-execution-engine';
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
      reviewDecision,
      previousOutputs,
      previousNodeExecutionLogs,
    } = body;

    // Human Review後の継続処理
    if (action === 'continue-after-review') {
      if (!reviewNodeId || !reviewDecision) {
        return NextResponse.json(
          { error: 'Review node ID and decision are required' },
          { status: 400 }
        );
      }

      console.log('[API] Continuing after Human Review');
      console.log('[API] Review node:', reviewNodeId);
      console.log('[API] Decision:', reviewDecision);

      // 承認/編集された出力を使用してフローを継続
      const editedOutput = reviewDecision.status === 'edited'
        ? reviewDecision.editedOutput
        : previousOutputs?.[reviewNodeId];

      const result = await executeFlowFromNode(
        nodes as FlowNode[],
        edges as FlowEdge[],
        reviewNodeId,
        editedOutput,
        previousOutputs || {},
        sessionId,
        previousNodeExecutionLogs || []
      );

      console.log('[API] Continue result:', JSON.stringify(result, null, 2));
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
