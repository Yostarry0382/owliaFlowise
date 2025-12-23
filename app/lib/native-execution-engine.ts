/**
 * OwliaFabrica Native Execution Engine
 * Flowise不要でフローを実行するネイティブエンジン
 */

import { FlowNode, FlowEdge, ExecutionResult } from '@/app/types/flowise';

// 実行コンテキスト
export interface ExecutionContext {
  sessionId: string;
  input: any;
  nodeOutputs: Map<string, any>;
  logs: string[];
  memory: Map<string, any>;
  pendingReview?: {
    nodeId: string;
    output: any;
    message: string;
    allowEdit: boolean;
  };
}

// ノード実行結果
interface NodeExecutionResult {
  success: boolean;
  output: any;
  error?: string;
  pendingReview?: boolean;
}

// ノードエグゼキューターのインターフェース
interface NodeExecutor {
  execute(node: FlowNode, inputs: Record<string, any>, context: ExecutionContext): Promise<NodeExecutionResult>;
}

// トポロジカルソートでノードの実行順序を決定
function topologicalSort(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // 初期化
  nodes.forEach(n => {
    inDegree.set(n.id, 0);
    adjacency.set(n.id, []);
  });

  // エッジから入次数と隣接リストを構築
  edges.forEach(e => {
    const targets = adjacency.get(e.source) || [];
    targets.push(e.target);
    adjacency.set(e.source, targets);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  // 入次数0のノードをキューに追加
  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId);
  });

  const sorted: FlowNode[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeMap.get(nodeId);
    if (node) sorted.push(node);

    const neighbors = adjacency.get(nodeId) || [];
    neighbors.forEach(neighbor => {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    });
  }

  return sorted;
}

// ノードへの入力を収集
function collectNodeInputs(
  node: FlowNode,
  edges: FlowEdge[],
  nodeOutputs: Map<string, any>
): Record<string, any> {
  const inputs: Record<string, any> = {};

  edges
    .filter(e => e.target === node.id)
    .forEach(e => {
      const sourceOutput = nodeOutputs.get(e.source);
      const handleId = e.targetHandle || 'input';
      inputs[handleId] = sourceOutput;
    });

  return inputs;
}

// ============================================
// ノードエグゼキューター実装
// ============================================

// Start ノード
const startExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    context.logs.push(`[Start] ${node.data.label}: 入力受付`);
    return {
      success: true,
      output: context.input,
    };
  },
};

// End ノード
const endExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const output = inputs.input || inputs;
    context.logs.push(`[End] ${node.data.label}: 出力完了`);
    return {
      success: true,
      output,
    };
  },
};

// Prompt Template ノード
const promptTemplateExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    let template = config.template || config.systemMessage || '';

    // 変数置換
    Object.entries(inputs).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      template = template.replace(regex, String(value));
    });

    // コンテキスト変数の置換
    template = template.replace(/\{input\}/g, String(context.input));

    context.logs.push(`[PromptTemplate] ${node.data.label}: テンプレート適用`);
    return {
      success: true,
      output: template,
    };
  },
};

// LLM ノード (Azure Chat OpenAI / ChatOpenAI)
const llmExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const systemMessage = config.systemMessage || '';
    const temperature = config.temperature || 0.7;
    const userMessage = inputs.input || inputs.prompt || context.input;

    context.logs.push(`[LLM] ${node.data.label}: API呼び出し開始`);

    // Azure OpenAI設定
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

    // 通常のOpenAI設定
    const openaiApiKey = process.env.OPENAI_API_KEY;

    // Azure OpenAIを優先
    if (azureApiKey && azureEndpoint && azureDeployment) {
      try {
        const url = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureApiVersion}`;
        context.logs.push(`[LLM] Azure OpenAI使用: ${azureDeployment}`);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': azureApiKey,
          },
          body: JSON.stringify({
            messages: [
              ...(systemMessage ? [{ role: 'system', content: systemMessage }] : []),
              { role: 'user', content: String(userMessage) },
            ],
            temperature,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const output = data.choices?.[0]?.message?.content || '';

        context.logs.push(`[LLM] ${node.data.label}: Azure OpenAI応答取得成功`);
        return { success: true, output };
      } catch (error) {
        context.logs.push(`[LLM] ${node.data.label}: Azure OpenAI呼び出し失敗 - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 通常のOpenAI API
    if (openaiApiKey && openaiApiKey.startsWith('sk-')) {
      try {
        context.logs.push(`[LLM] 通常のOpenAI API使用`);
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: config.modelName || 'gpt-3.5-turbo',
            messages: [
              ...(systemMessage ? [{ role: 'system', content: systemMessage }] : []),
              { role: 'user', content: String(userMessage) },
            ],
            temperature,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const output = data.choices?.[0]?.message?.content || '';

        context.logs.push(`[LLM] ${node.data.label}: OpenAI応答取得成功`);
        return { success: true, output };
      } catch (error) {
        context.logs.push(`[LLM] ${node.data.label}: OpenAI呼び出し失敗 - モック応答を返します`);
      }
    }

    // APIキーが設定されていない場合の案内
    if (!azureApiKey && !openaiApiKey) {
      context.logs.push(`[LLM] 警告: APIキーが設定されていません。.env.localを確認してください。`);
    } else if (openaiApiKey && !openaiApiKey.startsWith('sk-')) {
      context.logs.push(`[LLM] 警告: Azure OpenAIをご利用の場合は、AZURE_OPENAI_ENDPOINT と AZURE_OPENAI_DEPLOYMENT_NAME も設定してください。`);
    }

    // モック応答（APIキーがない場合）
    const mockOutput = `[モック応答] システム: "${systemMessage.slice(0, 50)}..." への応答です。入力: "${String(userMessage).slice(0, 50)}..."`;
    context.logs.push(`[LLM] ${node.data.label}: モック応答`);
    return {
      success: true,
      output: mockOutput,
    };
  },
};

// Vector Store ノード
const vectorStoreExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const query = inputs.input || context.input;

    context.logs.push(`[VectorStore] ${node.data.label}: 検索実行 (provider: ${config.provider}, index: ${config.indexName})`);

    // モック検索結果
    const mockResults = [
      { content: `関連ドキュメント1: ${String(query).slice(0, 30)}...に関する情報`, score: 0.95 },
      { content: `関連ドキュメント2: 補足情報`, score: 0.87 },
      { content: `関連ドキュメント3: 追加コンテキスト`, score: 0.82 },
    ].slice(0, config.topK || 3);

    return {
      success: true,
      output: mockResults,
    };
  },
};

// Memory ノード
const memoryExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const sessionId = config.sessionId || context.sessionId;
    const memoryKey = `memory_${sessionId}`;

    // メモリから履歴を取得
    const history = context.memory.get(memoryKey) || [];

    // 新しい入力を追加
    if (inputs.input) {
      history.push({ role: 'user', content: inputs.input, timestamp: new Date().toISOString() });

      // ウィンドウサイズで制限
      const windowSize = config.windowSize || 10;
      while (history.length > windowSize * 2) {
        history.shift();
      }

      context.memory.set(memoryKey, history);
    }

    context.logs.push(`[Memory] ${node.data.label}: 履歴 ${history.length} 件`);
    return {
      success: true,
      output: { history, input: inputs.input },
    };
  },
};

// Human Review ノード
const humanReviewExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const humanReview = node.data.humanReview || {};

    if (config.enabled !== false && humanReview.enabled !== false) {
      context.logs.push(`[HumanReview] ${node.data.label}: 確認待機中`);
      context.pendingReview = {
        nodeId: node.id,
        output: inputs.input,
        message: config.message || humanReview.approvalMessage || '確認してください',
        allowEdit: config.allowEdit ?? humanReview.allowEdit ?? true,
      };

      return {
        success: true,
        output: inputs.input,
        pendingReview: true,
      };
    }

    // 確認無効の場合はそのまま通過
    return {
      success: true,
      output: inputs.input,
    };
  },
};

// Condition ノード
const conditionExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const input = inputs.input;
    const condition = config.condition || 'true';

    let result = false;
    try {
      // 安全な条件評価（単純な比較のみ）
      if (condition.includes('==')) {
        const [left, right] = condition.split('==').map((s: string) => s.trim());
        result = String(input) === right.replace(/['"]/g, '');
      } else if (condition.includes('includes')) {
        const match = condition.match(/includes\(['"](.+)['"]\)/);
        if (match) {
          result = String(input).includes(match[1]);
        }
      } else {
        result = Boolean(input);
      }
    } catch {
      result = Boolean(input);
    }

    context.logs.push(`[Condition] ${node.data.label}: ${result ? 'true' : 'false'}`);
    return {
      success: true,
      output: { result, value: input },
    };
  },
};

// Tool ノード
const toolExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const toolType = config.toolType || 'api';

    context.logs.push(`[Tool] ${node.data.label}: ${toolType} 実行`);

    if (toolType === 'api' && config.apiEndpoint) {
      try {
        const response = await fetch(config.apiEndpoint, {
          method: config.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inputs.input),
        });
        const data = await response.json();
        return { success: true, output: data };
      } catch (error) {
        context.logs.push(`[Tool] ${node.data.label}: API呼び出し失敗`);
        return {
          success: false,
          output: null,
          error: error instanceof Error ? error.message : 'API call failed'
        };
      }
    }

    // モック応答
    return {
      success: true,
      output: { message: 'Tool executed (mock)', input: inputs.input },
    };
  },
};

// ForEach ノード
const forEachExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const array = inputs.array || inputs.input || [];

    if (!Array.isArray(array)) {
      context.logs.push(`[ForEach] ${node.data.label}: 配列ではありません`);
      return { success: true, output: { items: [array], complete: true } };
    }

    context.logs.push(`[ForEach] ${node.data.label}: ${array.length} 件処理`);
    return {
      success: true,
      output: { items: array, complete: true },
    };
  },
};

// デフォルトエグゼキューター（未知のノードタイプ用）
const defaultExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    context.logs.push(`[${node.data.type}] ${node.data.label}: パススルー`);
    return {
      success: true,
      output: inputs.input || inputs,
    };
  },
};

// ノードタイプとエグゼキューターのマッピング
const executorMap: Record<string, NodeExecutor> = {
  start: startExecutor,
  end: endExecutor,
  promptTemplate: promptTemplateExecutor,
  azureChatOpenAI: llmExecutor,
  chatOpenAI: llmExecutor,
  openAI: llmExecutor,
  vectorstore: vectorStoreExecutor,
  memory: memoryExecutor,
  humanReview: humanReviewExecutor,
  condition: conditionExecutor,
  tool: toolExecutor,
  forEach: forEachExecutor,
};

// メインの実行エンジン
export async function executeFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  input: any,
  sessionId?: string
): Promise<ExecutionResult> {
  const startTime = Date.now();

  const context: ExecutionContext = {
    sessionId: sessionId || `session_${Date.now()}`,
    input,
    nodeOutputs: new Map(),
    logs: [],
    memory: new Map(),
  };

  context.logs.push(`=== OwliaFabrica Native Engine ===`);
  context.logs.push(`セッションID: ${context.sessionId}`);
  context.logs.push(`ノード数: ${nodes.length}, エッジ数: ${edges.length}`);

  try {
    // トポロジカルソート
    const sortedNodes = topologicalSort(nodes, edges);
    context.logs.push(`実行順序: ${sortedNodes.map(n => n.data.label).join(' → ')}`);

    let finalOutput: any = null;

    // 各ノードを順番に実行
    for (const node of sortedNodes) {
      const nodeType = node.data.type || node.type;
      const executor = executorMap[nodeType] || defaultExecutor;

      // 入力を収集
      const inputs = collectNodeInputs(node, edges, context.nodeOutputs);

      // ノードを実行
      const result = await executor.execute(node, inputs, context);

      if (!result.success) {
        context.logs.push(`[ERROR] ${node.data.label}: ${result.error}`);
        return {
          success: false,
          output: null,
          executionTime: Date.now() - startTime,
          logs: context.logs,
          error: result.error,
        };
      }

      // 出力を保存
      context.nodeOutputs.set(node.id, result.output);
      finalOutput = result.output;

      // Human Review で待機が必要な場合
      if (result.pendingReview && context.pendingReview) {
        context.logs.push(`=== 実行一時停止: 確認待ち ===`);
        return {
          success: true,
          output: finalOutput,
          executionTime: Date.now() - startTime,
          logs: context.logs,
          pendingReview: context.pendingReview,
        };
      }
    }

    context.logs.push(`=== 実行完了 ===`);

    return {
      success: true,
      output: finalOutput,
      executionTime: Date.now() - startTime,
      logs: context.logs,
    };
  } catch (error) {
    context.logs.push(`[FATAL ERROR] ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      output: null,
      executionTime: Date.now() - startTime,
      logs: context.logs,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Human Review の承認を処理
export async function processReviewDecision(
  nodes: FlowNode[],
  edges: FlowEdge[],
  reviewNodeId: string,
  decision: 'approve' | 'reject' | 'edit',
  editedOutput?: any,
  previousOutputs?: Map<string, any>
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const logs: string[] = [`=== Review Decision: ${decision} ===`];

  if (decision === 'reject') {
    logs.push('実行が却下されました');
    return {
      success: false,
      output: null,
      executionTime: Date.now() - startTime,
      logs,
      error: 'Review rejected by user',
    };
  }

  // 承認または編集の場合、後続のノードを実行
  const nodeOutputs = previousOutputs || new Map<string, any>();

  if (decision === 'edit' && editedOutput !== undefined) {
    nodeOutputs.set(reviewNodeId, editedOutput);
    logs.push(`編集された出力を使用: ${JSON.stringify(editedOutput).slice(0, 100)}...`);
  }

  logs.push('後続のノード実行を継続します（未実装）');

  return {
    success: true,
    output: nodeOutputs.get(reviewNodeId),
    executionTime: Date.now() - startTime,
    logs,
  };
}
