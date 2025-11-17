import { NextRequest, NextResponse } from 'next/server';
import { MultiAgentExecutionContext, AgentMessage } from '@/app/types/multi-agent';
import { v4 as uuidv4 } from 'uuid';

// 実行中のコンテキストを管理
const executionContexts: Map<string, MultiAgentExecutionContext> = new Map();

// エージェント間のメッセージキュー
const messageQueues: Map<string, AgentMessage[]> = new Map();

// トポロジカルソートでエージェントの実行順序を決定
function topologicalSort(nodes: any[], edges: any[]): string[] {
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // グラフの初期化
  nodes.forEach(node => {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  // エッジを追加
  edges.forEach(edge => {
    const neighbors = graph.get(edge.source) || [];
    neighbors.push(edge.target);
    graph.set(edge.source, neighbors);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // トポロジカルソート
  const queue: string[] = [];
  const result: string[] = [];

  // 入次数が0のノードをキューに追加
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);

    const neighbors = graph.get(nodeId) || [];
    neighbors.forEach(neighbor => {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    });
  }

  return result;
}

// エージェントの実行（モック）
async function executeAgent(
  agentId: string,
  input: any,
  context: MultiAgentExecutionContext
): Promise<any> {
  // 実際の実装では、対応するOwlAgentを取得して実行
  console.log(`Executing agent ${agentId} with input:`, input);

  // エージェントのステータスを更新
  context.agents[agentId] = {
    ...context.agents[agentId],
    status: 'running',
    input,
  };

  // モック処理（実際にはOwlAgentのフローを実行）
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 結果を生成
  const output = {
    result: `Agent ${agentId} processed input`,
    timestamp: new Date().toISOString(),
    inputReceived: input,
  };

  // エージェントのステータスを更新
  context.agents[agentId] = {
    ...context.agents[agentId],
    status: 'success',
    output,
  };

  return output;
}

// POST: マルチエージェントフローの実行
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flowId, nodes, edges, input } = body;

    // 実行コンテキストを作成
    const executionId = uuidv4();
    const context: MultiAgentExecutionContext = {
      flowId,
      executionId,
      status: 'running',
      startedAt: new Date(),
      agents: {},
      messages: [],
    };

    // 各エージェントの初期状態を設定
    nodes.forEach((node: any) => {
      context.agents[node.id] = {
        status: 'idle',
        logs: [],
      };
    });

    executionContexts.set(executionId, context);

    // エージェントの実行順序を決定
    const executionOrder = topologicalSort(nodes, edges);

    // エージェントを順番に実行
    const results: any[] = [];
    let previousOutput = input;

    for (const nodeId of executionOrder) {
      const node = nodes.find((n: any) => n.id === nodeId);
      if (!node) continue;

      try {
        // エージェントを実行
        const output = await executeAgent(
          node.data.agentId,
          previousOutput,
          context
        );

        results.push({
          nodeId,
          agentId: node.data.agentId,
          output,
        });

        // 次のエージェントへの入力として出力を使用
        previousOutput = output;

        // エージェント間メッセージを記録
        const targetEdges = edges.filter((e: any) => e.source === nodeId);
        targetEdges.forEach((edge: any) => {
          const message: AgentMessage = {
            id: uuidv4(),
            fromAgentId: nodeId,
            toAgentId: edge.target,
            content: output,
            timestamp: new Date(),
            type: 'data',
          };
          context.messages.push(message);
        });
      } catch (error) {
        // エラーハンドリング
        context.agents[nodeId] = {
          ...context.agents[nodeId],
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // 実行完了
    context.status = 'completed';
    context.completedAt = new Date();

    return NextResponse.json({
      success: true,
      executionId,
      results,
      context,
    });
  } catch (error) {
    console.error('Execution error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute multi-agent flow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET: 実行状態の取得
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const executionId = searchParams.get('executionId');

  if (!executionId) {
    return NextResponse.json(
      { error: 'Execution ID is required' },
      { status: 400 }
    );
  }

  const context = executionContexts.get(executionId);
  if (!context) {
    return NextResponse.json(
      { error: 'Execution context not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(context);
}