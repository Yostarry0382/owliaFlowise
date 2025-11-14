import { NextRequest, NextResponse } from 'next/server';

// フロー実行のためのAPIルート
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flowId, nodes, edges, input } = body;

    // フローの実行ロジック（簡略化バージョン）
    const executionResult = await executeFlow(nodes, edges, input);

    return NextResponse.json({
      success: true,
      flowId,
      input,
      output: executionResult.output,
      executionTime: executionResult.executionTime,
      logs: executionResult.logs,
    });
  } catch (error) {
    console.error('Flow execution error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute flow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// フロー実行エンジンの簡略化実装
async function executeFlow(nodes: any[], edges: any[], input: any) {
  const startTime = Date.now();
  const logs: string[] = [];
  let output = input;

  try {
    // ノードの実行順序を決定（トポロジカルソート）
    const sortedNodes = topologicalSort(nodes, edges);
    logs.push(`Executing ${sortedNodes.length} nodes...`);

    // 各ノードを順番に実行
    for (const node of sortedNodes) {
      logs.push(`Executing node: ${node.data.label} (${node.id})`);

      // ノードタイプに応じた処理を実行
      const nodeOutput = await executeNode(node, output);
      output = nodeOutput;

      logs.push(`Node ${node.id} completed successfully`);
    }

    const executionTime = Date.now() - startTime;
    logs.push(`Flow execution completed in ${executionTime}ms`);

    return {
      output,
      executionTime,
      logs,
    };
  } catch (error) {
    logs.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

// ノードの実行
async function executeNode(node: any, input: any) {
  const { type, config } = node.data;

  switch (type) {
    case 'llm':
      return await executeLLMNode(config, input);

    case 'prompt':
      return executePromptNode(config, input);

    case 'transform':
      return executeTransformNode(config, input);

    case 'code':
      return executeCodeNode(config, input);

    default:
      // デフォルトでは入力をそのまま出力
      return input;
  }
}

// LLMノードの実行（モック実装）
async function executeLLMNode(config: any, input: string) {
  // 実際のLLM APIコールをここに実装
  // この例ではモックレスポンスを返す
  await new Promise(resolve => setTimeout(resolve, 1000)); // API呼び出しのシミュレーション

  return `[LLM Response for "${input}" using ${config.model || 'default model'}]`;
}

// プロンプトテンプレートノードの実行
function executePromptNode(config: any, input: any) {
  let template = config.template || '{input}';

  // 変数の置換
  if (typeof input === 'object') {
    Object.keys(input).forEach(key => {
      template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), input[key]);
    });
  } else {
    template = template.replace(/{input}/g, input);
  }

  return template;
}

// データ変換ノードの実行
function executeTransformNode(config: any, input: any) {
  // JSONデータの変換例
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch {
      return input;
    }
  }

  if (typeof input === 'object') {
    return JSON.stringify(input, null, 2);
  }

  return input;
}

// カスタムコードノードの実行（安全性のため制限付き）
function executeCodeNode(config: any, input: any) {
  // 実際の実装では、安全なサンドボックス環境でコードを実行する必要があります
  // ここでは簡単な例として文字列操作のみを許可

  try {
    const code = config.code || 'return input';

    // 非常に簡単な評価（実際の実装ではより安全な方法を使用すべき）
    const func = new Function('input', code);
    return func(input);
  } catch (error) {
    console.error('Code execution error:', error);
    return input;
  }
}

// トポロジカルソート（簡略版）
function topologicalSort(nodes: any[], edges: any[]) {
  // 依存関係マップを作成
  const dependencies = new Map();
  const inDegree = new Map();

  nodes.forEach(node => {
    dependencies.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  edges.forEach(edge => {
    if (dependencies.has(edge.source)) {
      dependencies.get(edge.source).push(edge.target);
    }
    if (inDegree.has(edge.target)) {
      inDegree.set(edge.target, inDegree.get(edge.target) + 1);
    }
  });

  // ソート実行
  const sorted = [];
  const queue = [];

  nodes.forEach(node => {
    if (inDegree.get(node.id) === 0) {
      queue.push(node);
    }
  });

  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);

    dependencies.get(node.id).forEach((targetId: string) => {
      const degree = inDegree.get(targetId) - 1;
      inDegree.set(targetId, degree);

      if (degree === 0) {
        const targetNode = nodes.find(n => n.id === targetId);
        if (targetNode) {
          queue.push(targetNode);
        }
      }
    });
  }

  return sorted;
}