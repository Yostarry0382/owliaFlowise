/**
 * OwliaFabrica Native Execution Engine
 * Flowise不要でフローを実行するネイティブエンジン
 */

import { FlowNode, FlowEdge, ExecutionResult, NodeExecutionLog } from '@/app/types/flowise';

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
  // ノード実行ログ
  nodeExecutionLogs: NodeExecutionLog[];
  // OwlAgent循環参照検出用のスタック
  owlAgentStack?: Set<string>;
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

/**
 * ノードへの入力を収集
 *
 * 複数入力の処理方法:
 * 1. 単一接続: そのまま値を渡す
 * 2. 複数接続（同じハンドル）: 配列として渡す
 * 3. 複数接続（異なるハンドル）: 各ハンドル名をキーとしたオブジェクトで渡す
 * 4. toolsハンドル: 特別扱い（ソースノード情報を含む配列）
 *
 * ノードのconfig.inputMergeMode で複数入力のマージ方法を指定可能:
 * - 'array': 配列として渡す（デフォルト）
 * - 'concat': 文字列として連結
 * - 'first': 最初の入力のみ使用
 * - 'last': 最後の入力のみ使用
 * - 'merge': オブジェクトをマージ
 * - 'sum': 数値を合計
 */
function collectNodeInputs(
  node: FlowNode,
  edges: FlowEdge[],
  nodeOutputs: Map<string, any>,
  allNodes: FlowNode[]
): Record<string, any> {
  const inputs: Record<string, any> = {};
  const config = node.data.config || {};
  const inputMergeMode = config.inputMergeMode || 'array';

  // 同じハンドルへの複数接続を追跡（順序を保持）
  const handleConnections: Record<string, { output: any; sourceNode: FlowNode; order: number }[]> = {};

  // エッジを順序付きで処理
  const incomingEdges = edges.filter(e => e.target === node.id);
  incomingEdges.forEach((e, index) => {
    const sourceOutput = nodeOutputs.get(e.source);
    const sourceNode = allNodes.find(n => n.id === e.source);
    const handleId = e.targetHandle || 'input';

    if (!handleConnections[handleId]) {
      handleConnections[handleId] = [];
    }
    handleConnections[handleId].push({
      output: sourceOutput,
      sourceNode: sourceNode!,
      order: index
    });
  });

  // 各ハンドルの接続を処理
  Object.entries(handleConnections).forEach(([handleId, connections]) => {
    // 順序でソート
    connections.sort((a, b) => a.order - b.order);

    if (handleId === 'tools' && connections.length > 0) {
      // toolsハンドルの場合は配列として、ソースノード情報も含める
      inputs[handleId] = connections.map(c => ({
        value: c.output,
        sourceNode: c.sourceNode,
      }));
    } else if (connections.length === 1) {
      // 単一接続の場合は値のみ
      inputs[handleId] = connections[0].output;
    } else {
      // 複数接続の場合: マージモードに応じて処理
      const values = connections.map(c => c.output);

      switch (inputMergeMode) {
        case 'concat':
          // 文字列として連結（区切り文字はconfigで指定可能）
          const separator = config.inputSeparator || '\n';
          inputs[handleId] = values.map(v => String(v ?? '')).join(separator);
          break;

        case 'first':
          // 最初の入力のみ使用
          inputs[handleId] = values[0];
          break;

        case 'last':
          // 最後の入力のみ使用
          inputs[handleId] = values[values.length - 1];
          break;

        case 'merge':
          // オブジェクトをマージ（浅いマージ）
          inputs[handleId] = values.reduce((merged, val) => {
            if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
              return { ...merged, ...val };
            }
            return merged;
          }, {});
          break;

        case 'sum':
          // 数値を合計
          inputs[handleId] = values.reduce((sum, val) => {
            const num = Number(val);
            return sum + (isNaN(num) ? 0 : num);
          }, 0);
          break;

        case 'array':
        default:
          // 配列として渡す（デフォルト）
          inputs[handleId] = values;
          break;
      }
    }
  });

  // 複数入力のメタ情報を追加
  inputs._multiInputInfo = {
    handleCount: Object.keys(handleConnections).length,
    totalConnections: incomingEdges.length,
    handles: Object.fromEntries(
      Object.entries(handleConnections).map(([handle, conns]) => [
        handle,
        { count: conns.length, sources: conns.map(c => c.sourceNode?.data.label || 'unknown') }
      ])
    ),
    mergeMode: inputMergeMode,
  };

  return inputs;
}

// forEachノードのループボディ（後続ノード）を特定する
function getLoopBodyNodes(
  forEachNode: FlowNode,
  allNodes: FlowNode[],
  edges: FlowEdge[]
): { bodyNodes: FlowNode[]; exitNodeId: string | null } {
  // forEachノードから直接接続されているノードを取得
  const directTargets = edges
    .filter(e => e.source === forEachNode.id)
    .map(e => e.target);

  if (directTargets.length === 0) {
    return { bodyNodes: [], exitNodeId: null };
  }

  // ループボディのノードを収集（forEachから到達可能なノード）
  const bodyNodeIds = new Set<string>();
  const exitNodeId: string | null = null;

  // BFSでループボディのノードを収集
  const queue = [...directTargets];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (bodyNodeIds.has(nodeId)) continue;

    const node = allNodes.find(n => n.id === nodeId);
    if (!node) continue;

    // ループ終了ノード（loopEnd タイプ）の場合はループボディに含めない
    if (node.data.type === 'loopEnd' || node.data.type === 'forEachEnd') {
      continue;
    }

    bodyNodeIds.add(nodeId);

    // このノードからの後続ノードをキューに追加
    const nextTargets = edges
      .filter(e => e.source === nodeId)
      .map(e => e.target);
    queue.push(...nextTargets);
  }

  // bodyNodeIdsに含まれるノードを取得
  const bodyNodes = allNodes.filter(n => bodyNodeIds.has(n.id));

  return { bodyNodes, exitNodeId };
}

// ループボディのノードをトポロジカルソートして実行順序を決定
function sortLoopBodyNodes(bodyNodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  // bodyNodesのIDセットを作成
  const bodyNodeIds = new Set(bodyNodes.map(n => n.id));

  // bodyNodes間のエッジのみを使用
  const bodyEdges = edges.filter(e =>
    bodyNodeIds.has(e.source) && bodyNodeIds.has(e.target)
  );

  // トポロジカルソート
  const nodeMap = new Map(bodyNodes.map(n => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  bodyNodes.forEach(n => {
    inDegree.set(n.id, 0);
    adjacency.set(n.id, []);
  });

  bodyEdges.forEach(e => {
    const targets = adjacency.get(e.source) || [];
    targets.push(e.target);
    adjacency.set(e.source, targets);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

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

// LLM ノード (Azure Chat OpenAI / ChatOpenAI) - Function Calling対応
const llmExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const systemMessage = config.systemMessage || '';
    const temperature = config.temperature || 0.7;
    const maxIterations = config.maxIterations || 5; // ツール呼び出しの最大回数
    const builtinToolIds: string[] = config.builtinTools || []; // 選択された組み込みツールのID配列
    const toolAgentIds: string[] = config.toolAgents || []; // 選択されたOwlAgentのID配列
    const toolChoice = config.toolChoice || 'auto'; // ツール利用の判断方法: auto, required
    const toolSettings: Record<string, Record<string, any>> = config.toolSettings || {}; // ツールごとの詳細設定

    // ツール機能の有効/無効を判定
    // 1. 明示的に設定されている場合はその値を使用
    // 2. toolsハンドルに接続されたノードがある場合は自動的に有効化
    // 3. 組み込みツールまたはOwlAgentツールが選択されている場合も自動的に有効化
    const hasToolConnections = inputs.tools && Array.isArray(inputs.tools) && inputs.tools.length > 0;
    const hasBuiltinTools = builtinToolIds.length > 0;
    const hasAgentTools = toolAgentIds.length > 0;
    const enableTools = config.enableTools !== undefined
      ? config.enableTools
      : (hasToolConnections || hasBuiltinTools || hasAgentTools);

    // ドキュメント入力の処理
    const documentInputs = inputs.document || [];
    let documentContext = '';
    if (documentInputs && (Array.isArray(documentInputs) ? documentInputs.length > 0 : documentInputs)) {
      const docs = Array.isArray(documentInputs) ? documentInputs : [documentInputs];
      context.logs.push(`[LLM] ${node.data.label}: ${docs.length}個のドキュメントを読み込み中...`);

      for (const doc of docs) {
        if (doc && doc.content) {
          const fileName = doc.fileName || doc.filePath || 'unknown';
          documentContext += `\n\n--- ドキュメント: ${fileName} ---\n${doc.content}`;
          context.logs.push(`[LLM] ドキュメント読み込み: ${fileName}`);
        } else if (typeof doc === 'string') {
          documentContext += `\n\n--- ドキュメント ---\n${doc}`;
        }
      }
    }

    const userMessage = inputs.input || inputs.prompt || context.input;

    // ツール設定を取得するヘルパー関数
    const getToolSetting = (toolId: string, key: string, defaultValue: any) => {
      return toolSettings[toolId]?.[key] ?? defaultValue;
    };

    // ツール配列
    const tools: any[] = [];

    // ツールの有効化状態をログ出力
    if (enableTools) {
      const reasons: string[] = [];
      if (config.enableTools === true) reasons.push('明示的に有効化');
      if (hasToolConnections) reasons.push(`ノード接続ツール${inputs.tools.length}個`);
      if (hasBuiltinTools) reasons.push(`組み込みツール${builtinToolIds.length}個`);
      if (hasAgentTools) reasons.push(`OwlAgentツール${toolAgentIds.length}個`);
      context.logs.push(`[LLM] ${node.data.label}: ツール機能有効 (${reasons.join(', ')})`);
    }

    // 組み込みツールをロード
    if (enableTools && builtinToolIds.length > 0) {
      context.logs.push(`[LLM] 組み込みツール: ${builtinToolIds.length}個をロード中...`);

      // 組み込みツールの定義
      const builtinToolDefinitions: Record<string, any> = {
        writeFile: {
          name: 'write_file',
          description: 'ファイルにテキストを書き込みます。basePath（デフォルト: ./data/output）を基準としたファイルパスを指定してください。',
          schema: {
            type: 'function',
            function: {
              name: 'write_file',
              description: 'ファイルにテキストを書き込みます',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'ファイルパス（例: output.txt, reports/summary.md）' },
                  content: { type: 'string', description: '書き込む内容' },
                },
                required: ['filePath', 'content'],
              },
            },
          },
          execute: async (args: { filePath: string; content: string }) => {
            try {
              const fs = await import('fs').then(m => m.promises);
              const path = await import('path');
              const basePath = getToolSetting('writeFile', 'basePath', './data/output');
              const fileFormat = getToolSetting('writeFile', 'fileFormat', 'txt');
              const writeMode = getToolSetting('writeFile', 'writeMode', 'overwrite');

              // 相対パスを絶対パスに変換
              const resolvedBasePath = path.isAbsolute(basePath) ? basePath : path.resolve(process.cwd(), basePath);

              // ファイルパスに拡張子がない場合、設定された形式を追加
              let finalFilePath = args.filePath;
              const hasExtension = /\.[a-zA-Z0-9]+$/.test(args.filePath);
              if (!hasExtension) {
                finalFilePath = `${args.filePath}.${fileFormat}`;
              }

              const fullPath = path.join(resolvedBasePath, finalFilePath);

              context.logs.push(`[Tool] ファイル書き込み開始: ${fullPath} (モード: ${writeMode === 'append' ? '追記' : '上書き'})`);

              // ディレクトリを作成
              await fs.mkdir(path.dirname(fullPath), { recursive: true });

              // 書き込みモードに応じて処理
              if (writeMode === 'append') {
                await fs.appendFile(fullPath, args.content, 'utf-8');
                context.logs.push(`[Tool] ファイル追記完了: ${fullPath}`);
                return `ファイルに追記しました: ${fullPath}`;
              } else {
                await fs.writeFile(fullPath, args.content, 'utf-8');
                context.logs.push(`[Tool] ファイル書き込み完了: ${fullPath}`);
                return `ファイルを書き込みました: ${fullPath}`;
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              context.logs.push(`[Tool] ファイル書き込みエラー: ${errorMsg}`);
              return `ファイル書き込みエラー: ${errorMsg}`;
            }
          },
        },
        readFile: {
          name: 'read_file',
          description: 'ファイルの内容を読み込みます',
          schema: {
            type: 'function',
            function: {
              name: 'read_file',
              description: 'ファイルの内容を読み込みます',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'ファイルパス' },
                },
                required: ['filePath'],
              },
            },
          },
          execute: async (args: { filePath: string }) => {
            try {
              const fs = await import('fs').then(m => m.promises);
              const path = await import('path');
              const basePath = getToolSetting('readFile', 'basePath', './data');
              // 相対パスを絶対パスに変換
              const resolvedBasePath = path.isAbsolute(basePath) ? basePath : path.resolve(process.cwd(), basePath);
              const fullPath = path.join(resolvedBasePath, args.filePath);

              context.logs.push(`[Tool] ファイル読み込み開始: ${fullPath}`);

              const content = await fs.readFile(fullPath, 'utf-8');
              context.logs.push(`[Tool] ファイル読み込み完了: ${fullPath} (${content.length}文字)`);
              return content;
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              context.logs.push(`[Tool] ファイル読み込みエラー: ${errorMsg}`);
              return `ファイル読み込みエラー: ${errorMsg}`;
            }
          },
        },
        calculator: {
          name: 'calculator',
          description: '数式を計算します。加減乗除、べき乗、括弧などが使えます',
          schema: {
            type: 'function',
            function: {
              name: 'calculator',
              description: '数式を計算します',
              parameters: {
                type: 'object',
                properties: {
                  expression: { type: 'string', description: '計算式（例: 2 + 3 * 4, (10 + 5) / 3）' },
                },
                required: ['expression'],
              },
            },
          },
          execute: async (args: { expression: string }) => {
            try {
              // 安全な数式評価（基本的な演算のみ許可）
              const sanitized = args.expression.replace(/[^0-9+\-*/().%\s]/g, '');
              const result = Function('"use strict"; return (' + sanitized + ')')();
              context.logs.push(`[Tool] 計算: ${args.expression} = ${result}`);
              return String(result);
            } catch (error) {
              return `計算エラー: ${args.expression}`;
            }
          },
        },
        dateTime: {
          name: 'get_datetime',
          description: '現在の日時を取得します',
          schema: {
            type: 'function',
            function: {
              name: 'get_datetime',
              description: '現在の日時を取得します',
              parameters: {
                type: 'object',
                properties: {
                  format: { type: 'string', description: 'フォーマット（iso, date, time, full）', enum: ['iso', 'date', 'time', 'full'] },
                },
                required: [],
              },
            },
          },
          execute: async (args: { format?: string }) => {
            const now = new Date();
            const format = args.format || 'full';
            const timezone = getToolSetting('dateTime', 'timezone', 'Asia/Tokyo');
            let result: string;

            try {
              switch (format) {
                case 'iso':
                  result = now.toISOString();
                  break;
                case 'date':
                  result = now.toLocaleDateString('ja-JP', { timeZone: timezone });
                  break;
                case 'time':
                  result = now.toLocaleTimeString('ja-JP', { timeZone: timezone });
                  break;
                default:
                  result = now.toLocaleString('ja-JP', { timeZone: timezone });
              }
            } catch (e) {
              // タイムゾーンが無効な場合はデフォルトを使用
              result = now.toLocaleString('ja-JP');
            }
            context.logs.push(`[Tool] 日時取得: ${result} (TZ: ${timezone})`);
            return result;
          },
        },
        webSearch: {
          name: 'web_search',
          description: 'Web検索を実行します（シミュレーション）',
          schema: {
            type: 'function',
            function: {
              name: 'web_search',
              description: 'Web検索を実行します',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: '検索クエリ' },
                },
                required: ['query'],
              },
            },
          },
          execute: async (args: { query: string }) => {
            const maxResults = getToolSetting('webSearch', 'maxResults', 5);
            context.logs.push(`[Tool] Web検索: ${args.query} (最大${maxResults}件)`);
            // 実際のWeb検索APIを統合する場合はここを実装
            return `「${args.query}」の検索結果（シミュレーション）: この機能は実装予定です。最大${maxResults}件取得設定。`;
          },
        },
        webScraper: {
          name: 'web_scraper',
          description: 'Webページの内容を取得します',
          schema: {
            type: 'function',
            function: {
              name: 'web_scraper',
              description: 'Webページの内容を取得します',
              parameters: {
                type: 'object',
                properties: {
                  url: { type: 'string', description: '取得するWebページのURL' },
                },
                required: ['url'],
              },
            },
          },
          execute: async (args: { url: string }) => {
            try {
              const maxLength = getToolSetting('webScraper', 'maxLength', 5000);
              const removeScripts = getToolSetting('webScraper', 'removeScripts', true);
              context.logs.push(`[Tool] Webスクレイピング: ${args.url}`);
              const response = await fetch(args.url);
              let html = await response.text();
              // HTMLからテキストを抽出
              if (removeScripts) {
                html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
              }
              const textContent = html
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, maxLength);
              return textContent;
            } catch (error) {
              return `Webページ取得エラー: ${error instanceof Error ? error.message : 'Unknown'}`;
            }
          },
        },
        pdfLoader: {
          name: 'pdf_loader',
          description: 'PDFファイルを読み込み、テキストを抽出します',
          schema: {
            type: 'function',
            function: {
              name: 'pdf_loader',
              description: 'PDFファイルを読み込み、テキストを抽出します',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'PDFファイルのパス' },
                },
                required: ['filePath'],
              },
            },
          },
          execute: async (args: { filePath: string }) => {
            const fs = await import('fs').then(m => m.promises);
            const path = await import('path');
            const basePath = getToolSetting('pdfLoader', 'basePath', './data');
            // 相対パスを絶対パスに変換
            const resolvedBasePath = path.isAbsolute(basePath) ? basePath : path.resolve(process.cwd(), basePath);
            const fullPath = path.join(resolvedBasePath, args.filePath);
            try {
              context.logs.push(`[Tool] PDF読み込み開始: ${fullPath}`);
              type PdfParseResult = { text: string; numpages: number; info: unknown };
              type PdfParseFunc = (buffer: Buffer) => Promise<PdfParseResult>;
              const pdfParseModule = await import('pdf-parse');
              const pdfParse: PdfParseFunc = (pdfParseModule as { default?: PdfParseFunc }).default || (pdfParseModule as unknown as PdfParseFunc);
              const dataBuffer = await fs.readFile(fullPath);
              const pdfData = await pdfParse(dataBuffer);
              context.logs.push(`[Tool] PDF読み込み完了: ${fullPath} (${pdfData.numpages}ページ, ${pdfData.text.length}文字)`);
              return JSON.stringify({
                text: pdfData.text.slice(0, 10000), // 最大10000文字
                numPages: pdfData.numpages,
                info: pdfData.info,
              });
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              context.logs.push(`[Tool] PDFエラー: ${errorMsg}`);
              return `PDFファイル読み込みエラー: ${errorMsg}`;
            }
          },
        },
        csvLoader: {
          name: 'csv_loader',
          description: 'CSVファイルを読み込みます',
          schema: {
            type: 'function',
            function: {
              name: 'csv_loader',
              description: 'CSVファイルを読み込みます',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'CSVファイルのパス' },
                },
                required: ['filePath'],
              },
            },
          },
          execute: async (args: { filePath: string }) => {
            const fs = await import('fs').then(m => m.promises);
            const path = await import('path');
            const basePath = getToolSetting('csvLoader', 'basePath', './data');
            const delimiter = getToolSetting('csvLoader', 'delimiter', ',');
            // 相対パスを絶対パスに変換
            const resolvedBasePath = path.isAbsolute(basePath) ? basePath : path.resolve(process.cwd(), basePath);
            const fullPath = path.join(resolvedBasePath, args.filePath);
            try {
              context.logs.push(`[Tool] CSV読み込み開始: ${fullPath}`);
              const content = await fs.readFile(fullPath, 'utf-8');
              const lines = content.split('\n');
              const headers = lines[0]?.split(delimiter) || [];
              const rows = lines.slice(1).filter(l => l.trim());
              context.logs.push(`[Tool] CSV読み込み完了: ${fullPath} (${rows.length}行, 区切り: "${delimiter}")`);
              return JSON.stringify({ headers, rowCount: rows.length, preview: lines.slice(0, 5).join('\n') });
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              context.logs.push(`[Tool] CSVエラー: ${errorMsg}`);
              return `CSVファイル読み込みエラー: ${errorMsg}`;
            }
          },
        },
        jsonLoader: {
          name: 'json_loader',
          description: 'JSONファイルを読み込みます',
          schema: {
            type: 'function',
            function: {
              name: 'json_loader',
              description: 'JSONファイルを読み込みます',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'JSONファイルのパス' },
                },
                required: ['filePath'],
              },
            },
          },
          execute: async (args: { filePath: string }) => {
            const fs = await import('fs').then(m => m.promises);
            const path = await import('path');
            const basePath = getToolSetting('jsonLoader', 'basePath', './data');
            // 相対パスを絶対パスに変換
            const resolvedBasePath = path.isAbsolute(basePath) ? basePath : path.resolve(process.cwd(), basePath);
            const fullPath = path.join(resolvedBasePath, args.filePath);
            try {
              context.logs.push(`[Tool] JSON読み込み開始: ${fullPath}`);
              const content = await fs.readFile(fullPath, 'utf-8');
              const parsed = JSON.parse(content);
              context.logs.push(`[Tool] JSON読み込み完了: ${fullPath}`);
              return JSON.stringify(parsed, null, 2).slice(0, 5000);
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              context.logs.push(`[Tool] JSONエラー: ${errorMsg}`);
              return `JSONファイル読み込みエラー: ${errorMsg}`;
            }
          },
        },
        textLoader: {
          name: 'text_loader',
          description: 'テキストファイルを読み込みます',
          schema: {
            type: 'function',
            function: {
              name: 'text_loader',
              description: 'テキストファイルを読み込みます',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'テキストファイルのパス' },
                },
                required: ['filePath'],
              },
            },
          },
          execute: async (args: { filePath: string }) => {
            const fs = await import('fs').then(m => m.promises);
            const path = await import('path');
            const basePath = getToolSetting('textLoader', 'basePath', './data');
            const maxLength = getToolSetting('textLoader', 'maxLength', 10000);
            // 相対パスを絶対パスに変換
            const resolvedBasePath = path.isAbsolute(basePath) ? basePath : path.resolve(process.cwd(), basePath);
            const fullPath = path.join(resolvedBasePath, args.filePath);
            try {
              context.logs.push(`[Tool] テキスト読み込み開始: ${fullPath}`);
              const content = await fs.readFile(fullPath, 'utf-8');
              context.logs.push(`[Tool] テキスト読み込み完了: ${fullPath} (${content.length}文字)`);
              return content.slice(0, maxLength);
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              context.logs.push(`[Tool] テキストエラー: ${errorMsg}`);
              return `テキストファイル読み込みエラー: ${errorMsg}`;
            }
          },
        },
        docxLoader: {
          name: 'docx_loader',
          description: 'Wordファイル（.docx）を読み込み、テキストを抽出します',
          schema: {
            type: 'function',
            function: {
              name: 'docx_loader',
              description: 'Wordファイルを読み込み、テキストを抽出します',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'DOCXファイルのパス' },
                },
                required: ['filePath'],
              },
            },
          },
          execute: async (args: { filePath: string }) => {
            const fs = await import('fs').then(m => m.promises);
            const path = await import('path');
            const basePath = getToolSetting('docxLoader', 'basePath', './data');
            // 相対パスを絶対パスに変換
            const resolvedBasePath = path.isAbsolute(basePath) ? basePath : path.resolve(process.cwd(), basePath);
            const fullPath = path.join(resolvedBasePath, args.filePath);
            try {
              context.logs.push(`[Tool] DOCX読み込み開始: ${fullPath}`);
              const mammoth = await import('mammoth');
              const dataBuffer = await fs.readFile(fullPath);
              const result = await mammoth.extractRawText({ buffer: dataBuffer });
              const text = result.value;
              context.logs.push(`[Tool] DOCX読み込み完了: ${fullPath} (${text.length}文字)`);
              return JSON.stringify({
                text: text.slice(0, 10000), // 最大10000文字
                charCount: text.length,
                messages: result.messages,
              });
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              context.logs.push(`[Tool] DOCXエラー: ${errorMsg}`);
              return `DOCXファイル読み込みエラー: ${errorMsg}`;
            }
          },
        },
        excelLoader: {
          name: 'excel_loader',
          description: 'Excelファイル（.xlsx）を読み込み、データを抽出します',
          schema: {
            type: 'function',
            function: {
              name: 'excel_loader',
              description: 'Excelファイルを読み込み、データを抽出します',
              parameters: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', description: 'Excelファイルのパス' },
                  sheetName: { type: 'string', description: '読み込むシート名（省略時は最初のシート）' },
                },
                required: ['filePath'],
              },
            },
          },
          execute: async (args: { filePath: string; sheetName?: string }) => {
            const fs = await import('fs').then(m => m.promises);
            const path = await import('path');
            const basePath = getToolSetting('excelLoader', 'basePath', './data');
            const defaultSheet = getToolSetting('excelLoader', 'sheetName', '');
            const sheetName = args.sheetName || defaultSheet;
            // 相対パスを絶対パスに変換
            const resolvedBasePath = path.isAbsolute(basePath) ? basePath : path.resolve(process.cwd(), basePath);
            const fullPath = path.join(resolvedBasePath, args.filePath);
            try {
              context.logs.push(`[Tool] Excel読み込み開始: ${fullPath}`);
              const XLSX = await import('xlsx');
              const dataBuffer = await fs.readFile(fullPath);
              const workbook = XLSX.read(dataBuffer, { type: 'buffer' });

              // シート名を決定（指定がなければ最初のシート）
              const targetSheet = sheetName || workbook.SheetNames[0];
              const worksheet = workbook.Sheets[targetSheet];

              if (!worksheet) {
                return `シートが見つかりません: ${targetSheet} (利用可能: ${workbook.SheetNames.join(', ')})`;
              }

              // JSONに変換
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              const headers = (jsonData[0] as any[]) || [];
              const rows = jsonData.slice(1);

              context.logs.push(`[Tool] Excel読み込み完了: ${fullPath} (シート: ${targetSheet}, ${rows.length}行)`);
              return JSON.stringify({
                sheetName: targetSheet,
                allSheets: workbook.SheetNames,
                headers,
                rowCount: rows.length,
                preview: jsonData.slice(0, 10), // 最初の10行をプレビュー
              });
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              context.logs.push(`[Tool] Excelエラー: ${errorMsg}`);
              return `Excelファイル読み込みエラー: ${errorMsg}`;
            }
          },
        },
        jsonParser: {
          name: 'json_parser',
          description: 'JSONを解析・変換します',
          schema: {
            type: 'function',
            function: {
              name: 'json_parser',
              description: 'JSONを解析・変換します',
              parameters: {
                type: 'object',
                properties: {
                  jsonString: { type: 'string', description: '解析するJSON文字列' },
                  path: { type: 'string', description: '抽出するパス（例: data.items[0].name）' },
                },
                required: ['jsonString'],
              },
            },
          },
          execute: async (args: { jsonString: string; path?: string }) => {
            try {
              const parsed = JSON.parse(args.jsonString);
              if (args.path) {
                // パスを使って値を抽出
                const value = args.path.split('.').reduce((obj, key) => {
                  const match = key.match(/^(\w+)\[(\d+)\]$/);
                  if (match) {
                    return obj?.[match[1]]?.[parseInt(match[2])];
                  }
                  return obj?.[key];
                }, parsed);
                context.logs.push(`[Tool] JSON解析: パス ${args.path}`);
                return JSON.stringify(value, null, 2);
              }
              context.logs.push(`[Tool] JSON解析完了`);
              return JSON.stringify(parsed, null, 2);
            } catch (error) {
              return `JSON解析エラー: ${error instanceof Error ? error.message : 'Invalid JSON'}`;
            }
          },
        },
      };

      for (const toolId of builtinToolIds) {
        const toolDef = builtinToolDefinitions[toolId];
        if (toolDef) {
          tools.push(toolDef);
          context.logs.push(`[LLM] 組み込みツール登録: ${toolDef.name}`);
        }
      }
    }

    // OwlAgentをツールとしてロード
    if (enableTools && toolAgentIds.length > 0) {
      context.logs.push(`[LLM] OwlAgentツール: ${toolAgentIds.length}個をロード中...`);

      for (const agentId of toolAgentIds) {
        try {
          // OwlAgentをAPIから取得
          const agentResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/owlagents/${agentId}`);
          if (!agentResponse.ok) {
            context.logs.push(`[LLM] 警告: OwlAgent ${agentId} のロードに失敗`);
            continue;
          }

          const agent = await agentResponse.json();

          // ツール名を生成（英数字とアンダースコアのみ）
          const toolName = agent.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

          // ツール定義を作成
          const tool = {
            type: 'owlAgentTool',
            name: toolName,
            agentId: agent.id,
            agentName: agent.name,
            description: agent.description || `${agent.name}を実行します`,
            schema: {
              type: 'function',
              function: {
                name: toolName,
                description: agent.description || `${agent.name}を実行します`,
                parameters: {
                  type: 'object',
                  properties: {
                    input: {
                      type: 'string',
                      description: 'ツールへの入力テキスト',
                    },
                  },
                  required: ['input'],
                },
              },
            },
            // ツール実行関数
            execute: async (input: string) => {
              context.logs.push(`[LLM] OwlAgent実行: ${agent.name} (${agentId})`);
              try {
                const executeResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/owlagents/${agentId}/execute`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ input }),
                });

                if (!executeResponse.ok) {
                  throw new Error(`OwlAgent実行エラー: ${executeResponse.status}`);
                }

                const result = await executeResponse.json();
                context.logs.push(`[LLM] OwlAgent結果: ${String(result.output).slice(0, 100)}...`);
                return result.output || result;
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                context.logs.push(`[LLM] OwlAgentエラー: ${errorMsg}`);
                return { error: errorMsg };
              }
            },
          };

          tools.push(tool);
          context.logs.push(`[LLM] ツール登録: ${toolName} (${agent.name})`);
        } catch (error) {
          context.logs.push(`[LLM] OwlAgent ${agentId} のロードエラー: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
    }

    // ノード接続からツールをロード（toolsハンドルに接続されたノード）
    if (enableTools && inputs.tools && Array.isArray(inputs.tools)) {
      context.logs.push(`[LLM] ノード接続ツール: ${inputs.tools.length}個をロード中...`);

      for (const toolConnection of inputs.tools) {
        const sourceNode = toolConnection.sourceNode as FlowNode;
        if (!sourceNode) continue;

        const nodeType = sourceNode.data.type;
        const nodeConfig = sourceNode.data.config || {};

        // ノードタイプに基づいてツール定義を生成
        let toolDef: any = null;

        switch (nodeType) {
          case 'calculator':
            toolDef = {
              type: 'nodeBasedTool',
              name: 'calculator',
              description: '数式を計算します。加減乗除、べき乗、括弧などが使えます',
              schema: {
                type: 'function',
                function: {
                  name: 'calculator',
                  description: '数式を計算します',
                  parameters: {
                    type: 'object',
                    properties: {
                      expression: { type: 'string', description: '計算式（例: 2 + 3 * 4, (10 + 5) / 3）' },
                    },
                    required: ['expression'],
                  },
                },
              },
              execute: async (args: { expression: string }) => {
                try {
                  const sanitized = args.expression.replace(/[^0-9+\-*/().%\s]/g, '');
                  const result = Function('"use strict"; return (' + sanitized + ')')();
                  context.logs.push(`[Tool] 計算: ${args.expression} = ${result}`);
                  return String(result);
                } catch (error) {
                  return `計算エラー: ${args.expression}`;
                }
              },
            };
            break;

          case 'readFile':
            toolDef = {
              type: 'nodeBasedTool',
              name: 'read_file',
              description: 'ファイルの内容を読み込みます',
              schema: {
                type: 'function',
                function: {
                  name: 'read_file',
                  description: 'ファイルの内容を読み込みます',
                  parameters: {
                    type: 'object',
                    properties: {
                      filePath: { type: 'string', description: 'ファイルパス' },
                    },
                    required: ['filePath'],
                  },
                },
              },
              execute: async (args: { filePath: string }) => {
                const fs = await import('fs').then(m => m.promises);
                const path = await import('path');
                const basePath = nodeConfig.basePath || './data';
                const fullPath = path.join(basePath, args.filePath);
                try {
                  const content = await fs.readFile(fullPath, 'utf-8');
                  context.logs.push(`[Tool] ファイル読み込み完了: ${fullPath}`);
                  return content;
                } catch (error) {
                  return `ファイルが見つかりません: ${fullPath}`;
                }
              },
            };
            break;

          case 'writeFile':
            toolDef = {
              type: 'nodeBasedTool',
              name: 'write_file',
              description: 'ファイルにテキストを書き込みます',
              schema: {
                type: 'function',
                function: {
                  name: 'write_file',
                  description: 'ファイルにテキストを書き込みます',
                  parameters: {
                    type: 'object',
                    properties: {
                      filePath: { type: 'string', description: 'ファイルパス' },
                      content: { type: 'string', description: '書き込む内容' },
                    },
                    required: ['filePath', 'content'],
                  },
                },
              },
              execute: async (args: { filePath: string; content: string }) => {
                const fs = await import('fs').then(m => m.promises);
                const path = await import('path');
                const basePath = nodeConfig.basePath || './data/output';
                const fileFormat = nodeConfig.fileFormat || 'txt';
                const writeMode = nodeConfig.writeMode || 'overwrite';

                // ファイルパスに拡張子がない場合、設定された形式を追加
                let finalFilePath = args.filePath;
                const hasExtension = /\.[a-zA-Z0-9]+$/.test(args.filePath);
                if (!hasExtension) {
                  finalFilePath = `${args.filePath}.${fileFormat}`;
                }

                const fullPath = path.join(basePath, finalFilePath);
                await fs.mkdir(path.dirname(fullPath), { recursive: true });

                // 書き込みモードに応じて処理
                if (writeMode === 'append') {
                  await fs.appendFile(fullPath, args.content, 'utf-8');
                  context.logs.push(`[Tool] ファイル追記完了: ${fullPath}`);
                  return `ファイルに追記しました: ${fullPath}`;
                } else {
                  await fs.writeFile(fullPath, args.content, 'utf-8');
                  context.logs.push(`[Tool] ファイル書き込み完了: ${fullPath}`);
                  return `ファイルを書き込みました: ${fullPath}`;
                }
              },
            };
            break;

          case 'customTool':
            const toolName = (nodeConfig.toolName || 'custom_tool').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
            const toolDescription = nodeConfig.toolDescription || 'カスタムツール';
            const jsCode = nodeConfig.jsCode || 'return input;';
            toolDef = {
              type: 'nodeBasedTool',
              name: toolName,
              description: toolDescription,
              schema: {
                type: 'function',
                function: {
                  name: toolName,
                  description: toolDescription,
                  parameters: {
                    type: 'object',
                    properties: {
                      input: { type: 'string', description: '入力テキスト' },
                    },
                    required: ['input'],
                  },
                },
              },
              execute: async (args: { input: string }) => {
                try {
                  const fn = new Function('input', jsCode);
                  const result = fn(args.input);
                  context.logs.push(`[Tool] カスタムツール実行: ${toolName}`);
                  return typeof result === 'string' ? result : JSON.stringify(result);
                } catch (error) {
                  return `カスタムツールエラー: ${error instanceof Error ? error.message : 'Unknown'}`;
                }
              },
            };
            break;

          case 'tool':
            // 汎用ツールノード
            const genericToolType = nodeConfig.toolType || 'api';
            if (genericToolType === 'api' && nodeConfig.apiEndpoint) {
              const apiToolName = 'api_call_' + sourceNode.id.slice(-6);
              toolDef = {
                type: 'nodeBasedTool',
                name: apiToolName,
                description: `API呼び出し: ${nodeConfig.apiEndpoint}`,
                schema: {
                  type: 'function',
                  function: {
                    name: apiToolName,
                    description: `API呼び出し: ${nodeConfig.apiEndpoint}`,
                    parameters: {
                      type: 'object',
                      properties: {
                        body: { type: 'string', description: 'リクエストボディ（JSON文字列）' },
                      },
                      required: [],
                    },
                  },
                },
                execute: async (args: { body?: string }) => {
                  try {
                    const headers = nodeConfig.headers ? JSON.parse(nodeConfig.headers) : {};
                    const method = nodeConfig.method || 'POST';
                    const requestBody = args.body || nodeConfig.body || '';
                    const response = await fetch(nodeConfig.apiEndpoint, {
                      method,
                      headers: { 'Content-Type': 'application/json', ...headers },
                      ...(method !== 'GET' && requestBody ? { body: requestBody } : {}),
                    });
                    const result = await response.text();
                    context.logs.push(`[Tool] API呼び出し完了: ${nodeConfig.apiEndpoint}`);
                    return result;
                  } catch (error) {
                    return `APIエラー: ${error instanceof Error ? error.message : 'Unknown'}`;
                  }
                },
              };
            }
            break;

          default:
            context.logs.push(`[LLM] 警告: ノードタイプ "${nodeType}" はツールとして未対応`);
        }

        if (toolDef) {
          // 同じ名前のツールが既に存在する場合はスキップ
          if (!tools.find(t => t.name === toolDef.name)) {
            tools.push(toolDef);
            context.logs.push(`[LLM] ノードツール登録: ${toolDef.name} (${sourceNode.data.label})`);
          }
        }
      }
    }

    context.logs.push(`[LLM] ${node.data.label}: API呼び出し開始 (ツール数: ${tools.length})`);

    // Azure OpenAI設定
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

    // 通常のOpenAI設定
    const openaiApiKey = process.env.OPENAI_API_KEY;

    // Function Calling用のツールスキーマを作成
    const toolSchemas = tools.map(t => t.schema);

    // メッセージ履歴（ツール呼び出しループ用）
    // ドキュメントコンテキストをシステムメッセージに追加
    const fullSystemMessage = documentContext
      ? `${systemMessage}\n\n以下のドキュメントを参照してください:${documentContext}`
      : systemMessage;

    const messages: Array<{ role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string; name?: string }> = [
      ...(fullSystemMessage ? [{ role: 'system', content: fullSystemMessage }] : []),
      { role: 'user', content: String(userMessage) },
    ];

    // Azure OpenAIを優先
    if (azureApiKey && azureEndpoint && azureDeployment) {
      try {
        const url = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureApiVersion}`;
        context.logs.push(`[LLM] Azure OpenAI使用: ${azureDeployment}`);

        let iteration = 0;
        let finalOutput = '';

        // ツール呼び出しループ
        while (iteration < maxIterations) {
          iteration++;

          const requestBody: any = {
            messages,
            temperature,
          };

          // ツールがある場合は追加（enableToolsで制御）
          if (enableTools && tools.length > 0) {
            requestBody.tools = toolSchemas;
            requestBody.tool_choice = toolChoice; // auto, required
            context.logs.push(`[LLM] ツール設定: tool_choice=${toolChoice}`);
          }

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': azureApiKey,
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          const choice = data.choices?.[0];
          const message = choice?.message;

          if (!message) {
            throw new Error('No message in response');
          }

          // ツール呼び出しがあるかチェック
          if (message.tool_calls && message.tool_calls.length > 0) {
            context.logs.push(`[LLM] ツール呼び出し検出: ${message.tool_calls.length}件`);

            // アシスタントメッセージを追加
            messages.push({
              role: 'assistant',
              content: message.content || null,
              tool_calls: message.tool_calls,
            });

            // 各ツールを実行
            for (const toolCall of message.tool_calls) {
              const toolName = toolCall.function.name;
              const toolArgs = JSON.parse(toolCall.function.arguments || '{}');

              context.logs.push(`[LLM] ツール実行: ${toolName}(${JSON.stringify(toolArgs).slice(0, 50)}...)`);

              // 対応するツールを探す
              const tool = tools.find(t => t.name === toolName);
              let toolResult: any;

              if (tool && tool.execute) {
                try {
                  // 組み込みツールにはオブジェクト、OwlAgentには文字列を渡す
                  const executeArg = tool.type === 'owlAgentTool'
                    ? (toolArgs.input || JSON.stringify(toolArgs))
                    : toolArgs;
                  toolResult = await tool.execute(executeArg);
                  context.logs.push(`[LLM] ツール結果: ${String(toolResult).slice(0, 100)}...`);

                  // returnDirectの場合は即座に結果を返す
                  if (tool.returnDirect) {
                    context.logs.push(`[LLM] ${node.data.label}: Return Direct - ツール結果を直接返します`);
                    return { success: true, output: toolResult };
                  }
                } catch (error) {
                  toolResult = { error: error instanceof Error ? error.message : 'ツール実行エラー' };
                  context.logs.push(`[LLM] ツールエラー: ${toolResult.error}`);
                }
              } else {
                toolResult = { error: `ツール "${toolName}" が見つかりません` };
                context.logs.push(`[LLM] 警告: ${toolResult.error}`);
              }

              // ツール結果をメッセージに追加
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: toolName,
                content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
              });
            }
          } else {
            // ツール呼び出しなし = 最終応答
            finalOutput = message.content || '';
            context.logs.push(`[LLM] ${node.data.label}: Azure OpenAI応答取得成功 (イテレーション: ${iteration})`);
            return { success: true, output: finalOutput };
          }
        }

        // 最大イテレーション到達
        context.logs.push(`[LLM] 警告: 最大イテレーション(${maxIterations})に到達しました`);
        return { success: true, output: finalOutput || '[最大イテレーション到達]' };

      } catch (error) {
        context.logs.push(`[LLM] ${node.data.label}: Azure OpenAI呼び出し失敗 - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 通常のOpenAI API
    if (openaiApiKey && openaiApiKey.startsWith('sk-')) {
      try {
        context.logs.push(`[LLM] 通常のOpenAI API使用`);

        let iteration = 0;
        let finalOutput = '';

        while (iteration < maxIterations) {
          iteration++;

          const requestBody: any = {
            model: config.modelName || 'gpt-4o',
            messages,
            temperature,
          };

          // ツールがある場合は追加（enableToolsで制御）
          if (enableTools && tools.length > 0) {
            requestBody.tools = toolSchemas;
            requestBody.tool_choice = toolChoice; // auto, required
          }

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
          }

          const data = await response.json();
          const choice = data.choices?.[0];
          const message = choice?.message;

          if (!message) {
            throw new Error('No message in response');
          }

          if (message.tool_calls && message.tool_calls.length > 0) {
            messages.push({
              role: 'assistant',
              content: message.content || null,
              tool_calls: message.tool_calls,
            });

            for (const toolCall of message.tool_calls) {
              const toolName = toolCall.function.name;
              const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
              const tool = tools.find(t => t.name === toolName);
              let toolResult: any;

              if (tool && tool.execute) {
                try {
                  // 組み込みツールにはオブジェクト、OwlAgentには文字列を渡す
                  const executeArg = tool.type === 'owlAgentTool'
                    ? (toolArgs.input || JSON.stringify(toolArgs))
                    : toolArgs;
                  toolResult = await tool.execute(executeArg);
                  if (tool.returnDirect) {
                    return { success: true, output: toolResult };
                  }
                } catch (error) {
                  toolResult = { error: error instanceof Error ? error.message : 'ツール実行エラー' };
                }
              } else {
                toolResult = { error: `ツール "${toolName}" が見つかりません` };
              }

              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: toolName,
                content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
              });
            }
          } else {
            finalOutput = message.content || '';
            context.logs.push(`[LLM] ${node.data.label}: OpenAI応答取得成功`);
            return { success: true, output: finalOutput };
          }
        }

        return { success: true, output: finalOutput || '[最大イテレーション到達]' };
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

// Memory ノード（永続化対応）
const memoryExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const sessionId = config.sessionId || context.sessionId;
    const memoryKey = `memory_${sessionId}`;
    const persistMemory = config.persistMemory !== false; // デフォルトで永続化
    const memoryType = config.memoryType || 'buffer'; // buffer, window, summary
    const windowSize = config.windowSize || 10;

    // メモリ保存用のディレクトリパス
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    const memoryDir = path.resolve(process.cwd(), 'data', 'memory');
    const memoryFilePath = path.join(memoryDir, `${sessionId}.json`);

    // メモリから履歴を取得（コンテキストまたはファイルから）
    let history: Array<{ role: string; content: string; timestamp: string }> = context.memory.get(memoryKey) || [];

    // 永続化が有効な場合、ファイルから読み込み
    if (persistMemory && history.length === 0) {
      try {
        const fileContent = await fs.readFile(memoryFilePath, 'utf-8');
        const savedData = JSON.parse(fileContent);
        history = savedData.history || [];
        context.logs.push(`[Memory] ${node.data.label}: ファイルから${history.length}件の履歴を読み込み`);
      } catch {
        // ファイルが存在しない場合は空の履歴
        history = [];
      }
    }

    // 新しい入力を追加
    if (inputs.input) {
      history.push({
        role: 'user',
        content: String(inputs.input),
        timestamp: new Date().toISOString()
      });

      // AI応答も記録（入力にaiResponseがある場合）
      if (inputs.aiResponse) {
        history.push({
          role: 'assistant',
          content: String(inputs.aiResponse),
          timestamp: new Date().toISOString()
        });
      }
    }

    // メモリタイプに応じた処理
    switch (memoryType) {
      case 'window':
        // ウィンドウサイズで制限（最新のN会話を保持）
        while (history.length > windowSize * 2) {
          history.shift();
        }
        break;
      case 'summary':
        // TODO: 要約機能（LLMを使用して古い会話を要約）
        // 現時点ではwindowと同じ動作
        while (history.length > windowSize * 2) {
          history.shift();
        }
        break;
      case 'buffer':
      default:
        // バッファ: 全履歴を保持（最大制限あり）
        const maxHistory = config.maxHistory || 100;
        while (history.length > maxHistory) {
          history.shift();
        }
        break;
    }

    // コンテキストに保存
    context.memory.set(memoryKey, history);

    // 永続化が有効な場合、ファイルに保存
    if (persistMemory && inputs.input) {
      try {
        await fs.mkdir(memoryDir, { recursive: true });
        await fs.writeFile(memoryFilePath, JSON.stringify({
          sessionId,
          history,
          updatedAt: new Date().toISOString()
        }, null, 2), 'utf-8');
        context.logs.push(`[Memory] ${node.data.label}: 履歴をファイルに保存`);
      } catch (error) {
        context.logs.push(`[Memory] ${node.data.label}: ファイル保存エラー - ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    context.logs.push(`[Memory] ${node.data.label}: 履歴 ${history.length} 件 (タイプ: ${memoryType})`);
    return {
      success: true,
      output: {
        history,
        input: inputs.input,
        historyText: history.map(h => `${h.role}: ${h.content}`).join('\n'),
        messageCount: history.length
      },
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

// Condition ノード（拡張条件サポート）
const conditionExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const input = inputs.input;
    const condition = config.condition || 'true';
    const conditionType = config.conditionType || 'expression'; // expression, comparison, regex, custom

    let result = false;
    let evaluationLog = '';

    try {
      // 入力値を適切な型に変換
      const getValue = (value: any): any => {
        if (value === undefined || value === null) return value;
        if (typeof value === 'object') return value;
        const str = String(value).trim();
        // 数値変換
        if (!isNaN(Number(str)) && str !== '') return Number(str);
        // 真偽値変換
        if (str.toLowerCase() === 'true') return true;
        if (str.toLowerCase() === 'false') return false;
        return str;
      };

      const inputValue = getValue(input);

      switch (conditionType) {
        case 'comparison':
          // 比較演算子を使用した条件（左辺、演算子、右辺を設定）
          const leftField = config.leftField || 'input';
          const operator = config.operator || '==';
          const rightValue = config.rightValue;
          const rightParsed = getValue(rightValue);

          // 左辺の値を取得（inputまたはinputのプロパティ）
          let leftValue = inputValue;
          if (leftField !== 'input' && typeof inputValue === 'object') {
            leftValue = inputValue[leftField];
          }

          switch (operator) {
            case '==':
            case '===':
              result = leftValue == rightParsed;
              break;
            case '!=':
            case '!==':
              result = leftValue != rightParsed;
              break;
            case '>':
              result = Number(leftValue) > Number(rightParsed);
              break;
            case '>=':
              result = Number(leftValue) >= Number(rightParsed);
              break;
            case '<':
              result = Number(leftValue) < Number(rightParsed);
              break;
            case '<=':
              result = Number(leftValue) <= Number(rightParsed);
              break;
            case 'contains':
              result = String(leftValue).includes(String(rightParsed));
              break;
            case 'startsWith':
              result = String(leftValue).startsWith(String(rightParsed));
              break;
            case 'endsWith':
              result = String(leftValue).endsWith(String(rightParsed));
              break;
            case 'isEmpty':
              result = !leftValue || (typeof leftValue === 'string' && leftValue.trim() === '');
              break;
            case 'isNotEmpty':
              result = !!leftValue && (typeof leftValue !== 'string' || leftValue.trim() !== '');
              break;
            case 'isNull':
              result = leftValue === null || leftValue === undefined;
              break;
            case 'isNotNull':
              result = leftValue !== null && leftValue !== undefined;
              break;
            case 'isNumber':
              result = !isNaN(Number(leftValue));
              break;
            case 'isArray':
              result = Array.isArray(leftValue);
              break;
            default:
              result = !!leftValue;
          }
          evaluationLog = `${leftField}(${JSON.stringify(leftValue)}) ${operator} ${JSON.stringify(rightParsed)} = ${result}`;
          break;

        case 'regex':
          // 正規表現マッチ
          const pattern = config.pattern || '';
          const flags = config.regexFlags || 'i';
          try {
            const regex = new RegExp(pattern, flags);
            result = regex.test(String(inputValue));
            evaluationLog = `/${pattern}/${flags}.test("${String(inputValue).slice(0, 50)}...") = ${result}`;
          } catch (e) {
            result = false;
            evaluationLog = `正規表現エラー: ${e instanceof Error ? e.message : 'Unknown'}`;
          }
          break;

        case 'expression':
        default:
          // 従来の式ベースの条件（互換性維持 + 拡張）
          const expr = condition.trim();

          // true/false リテラル
          if (expr === 'true') {
            result = true;
          } else if (expr === 'false') {
            result = false;
          }
          // 等価比較 (== または ===)
          else if (expr.includes('===')) {
            const [left, right] = expr.split('===').map((s: string) => s.trim());
            const rightVal = right.replace(/['"]/g, '');
            result = String(inputValue) === rightVal;
            evaluationLog = `"${inputValue}" === "${rightVal}"`;
          } else if (expr.includes('==')) {
            const [left, right] = expr.split('==').map((s: string) => s.trim());
            const rightVal = right.replace(/['"]/g, '');
            result = String(inputValue) == rightVal;
            evaluationLog = `"${inputValue}" == "${rightVal}"`;
          }
          // 不等価比較
          else if (expr.includes('!==')) {
            const [left, right] = expr.split('!==').map((s: string) => s.trim());
            const rightVal = right.replace(/['"]/g, '');
            result = String(inputValue) !== rightVal;
            evaluationLog = `"${inputValue}" !== "${rightVal}"`;
          } else if (expr.includes('!=')) {
            const [left, right] = expr.split('!=').map((s: string) => s.trim());
            const rightVal = right.replace(/['"]/g, '');
            result = String(inputValue) != rightVal;
            evaluationLog = `"${inputValue}" != "${rightVal}"`;
          }
          // 大小比較
          else if (expr.includes('>=')) {
            const [left, right] = expr.split('>=').map((s: string) => s.trim());
            result = Number(inputValue) >= Number(right.replace(/['"]/g, ''));
            evaluationLog = `${inputValue} >= ${right}`;
          } else if (expr.includes('<=')) {
            const [left, right] = expr.split('<=').map((s: string) => s.trim());
            result = Number(inputValue) <= Number(right.replace(/['"]/g, ''));
            evaluationLog = `${inputValue} <= ${right}`;
          } else if (expr.includes('>')) {
            const [left, right] = expr.split('>').map((s: string) => s.trim());
            result = Number(inputValue) > Number(right.replace(/['"]/g, ''));
            evaluationLog = `${inputValue} > ${right}`;
          } else if (expr.includes('<')) {
            const [left, right] = expr.split('<').map((s: string) => s.trim());
            result = Number(inputValue) < Number(right.replace(/['"]/g, ''));
            evaluationLog = `${inputValue} < ${right}`;
          }
          // includes メソッド
          else if (expr.includes('includes(')) {
            const match = expr.match(/includes\(['"](.+)['"]\)/);
            if (match) {
              result = String(inputValue).includes(match[1]);
              evaluationLog = `"${String(inputValue).slice(0, 30)}...".includes("${match[1]}")`;
            }
          }
          // startsWith / endsWith
          else if (expr.includes('startsWith(')) {
            const match = expr.match(/startsWith\(['"](.+)['"]\)/);
            if (match) {
              result = String(inputValue).startsWith(match[1]);
              evaluationLog = `startsWith("${match[1]}")`;
            }
          } else if (expr.includes('endsWith(')) {
            const match = expr.match(/endsWith\(['"](.+)['"]\)/);
            if (match) {
              result = String(inputValue).endsWith(match[1]);
              evaluationLog = `endsWith("${match[1]}")`;
            }
          }
          // length チェック
          else if (expr.includes('length')) {
            const match = expr.match(/length\s*(>|>=|<|<=|==|===)\s*(\d+)/);
            if (match) {
              const len = typeof inputValue === 'string' ? inputValue.length :
                          Array.isArray(inputValue) ? inputValue.length : 0;
              const op = match[1];
              const num = Number(match[2]);
              switch (op) {
                case '>': result = len > num; break;
                case '>=': result = len >= num; break;
                case '<': result = len < num; break;
                case '<=': result = len <= num; break;
                case '==': case '===': result = len === num; break;
              }
              evaluationLog = `length(${len}) ${op} ${num}`;
            }
          }
          // デフォルト: truthy チェック
          else {
            result = Boolean(inputValue);
            evaluationLog = `Boolean(${JSON.stringify(inputValue)})`;
          }
          break;
      }
    } catch (error) {
      result = Boolean(input);
      evaluationLog = `エラー: ${error instanceof Error ? error.message : 'Unknown'}`;
    }

    context.logs.push(`[Condition] ${node.data.label}: ${result ? 'true' : 'false'} (${evaluationLog || condition})`);
    return {
      success: true,
      output: {
        result,
        value: input,
        condition,
        conditionType,
        // 条件分岐用の出力ハンドル
        true: result ? input : undefined,
        false: !result ? input : undefined,
      },
    };
  },
};

// Tool ノード（汎用ツール）
const toolExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const toolType = config.toolType || 'api';
    const input = inputs.input;

    context.logs.push(`[Tool] ${node.data.label}: ${toolType} モードで実行`);

    // API Call モード
    if (toolType === 'api') {
      const apiEndpoint = config.apiEndpoint;
      const method = config.method || 'POST';

      if (!apiEndpoint) {
        context.logs.push(`[Tool] ${node.data.label}: APIエンドポイントが未設定です`);
        return { success: false, output: null, error: 'APIエンドポイントが指定されていません' };
      }

      context.logs.push(`[Tool] ${node.data.label}: ${method} ${apiEndpoint}`);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // カスタムヘッダーがあれば追加
        if (config.headers) {
          try {
            const customHeaders = typeof config.headers === 'string'
              ? JSON.parse(config.headers)
              : config.headers;
            Object.assign(headers, customHeaders);
          } catch {
            context.logs.push(`[Tool] ${node.data.label}: ヘッダーのパースに失敗`);
          }
        }

        const fetchOptions: RequestInit = {
          method,
          headers,
        };

        // GET以外はボディを設定
        if (method !== 'GET') {
          const body = config.body
            ? (typeof config.body === 'string' ? JSON.parse(config.body) : config.body)
            : input;
          fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(apiEndpoint, fetchOptions);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // レスポンスの Content-Type をチェック
        const contentType = response.headers.get('content-type') || '';
        let data;

        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        context.logs.push(`[Tool] ${node.data.label}: API呼び出し成功`);
        return { success: true, output: data };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'API呼び出し失敗';
        context.logs.push(`[Tool] ${node.data.label}: エラー - ${errorMessage}`);
        return { success: false, output: null, error: `API Error: ${errorMessage}` };
      }
    }

    // Custom Function モード
    if (toolType === 'custom') {
      const customCode = config.customCode || config.jsCode || '';

      if (!customCode.trim()) {
        context.logs.push(`[Tool] ${node.data.label}: カスタムコードが未設定です`);
        return { success: false, output: null, error: 'カスタムコードが指定されていません' };
      }

      context.logs.push(`[Tool] ${node.data.label}: カスタム関数を実行`);

      try {
        // 安全な実行環境
        const safeContext = {
          input,
          inputs,
          JSON,
          Math,
          String,
          Number,
          Array,
          Object,
          Date,
          Boolean,
          parseInt,
          parseFloat,
          isNaN,
          isFinite,
          encodeURIComponent,
          decodeURIComponent,
          console: {
            log: (...args: any[]) => context.logs.push(`[Tool] ${node.data.label}: ${args.join(' ')}`),
          },
        };

        // セキュリティチェック
        const dangerousPatterns = [
          /\beval\b/, /\bFunction\b/, /\bprocess\b/, /\brequire\b/,
          /\bimport\b/, /\bexport\b/, /\b__proto__\b/, /\bconstructor\b/,
          /\bprototype\b/, /\bwindow\b/, /\bdocument\b/, /\bglobalThis\b/,
          /\bfetch\b/, /\bXMLHttpRequest\b/,
        ];

        for (const pattern of dangerousPatterns) {
          if (pattern.test(customCode)) {
            throw new Error('セキュリティ: 禁止されたキーワードが含まれています');
          }
        }

        const contextKeys = Object.keys(safeContext);
        const contextValues = Object.values(safeContext);

        const wrappedCode = `
          'use strict';
          return (async function() {
            ${customCode}
          })();
        `;

        const fn = new Function(...contextKeys, wrappedCode);
        const result = await fn(...contextValues);

        context.logs.push(`[Tool] ${node.data.label}: カスタム関数完了`);
        return { success: true, output: result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '実行エラー';
        context.logs.push(`[Tool] ${node.data.label}: エラー - ${errorMessage}`);
        return { success: false, output: null, error: `Custom Function Error: ${errorMessage}` };
      }
    }

    // Database Query モード
    if (toolType === 'database') {
      context.logs.push(`[Tool] ${node.data.label}: データベースクエリモード`);

      // データベース接続は環境に依存するため、基本的なシミュレーションを提供
      // 実際のDB接続は将来の拡張で対応
      const query = config.query || '';

      if (!query.trim()) {
        return { success: false, output: null, error: 'SQLクエリが指定されていません' };
      }

      // セキュリティ: 危険なSQLコマンドをブロック
      const dangerousSql = [
        /\bDROP\b/i, /\bDELETE\s+FROM\b/i, /\bTRUNCATE\b/i,
        /\bALTER\b/i, /\bCREATE\b/i, /\bEXEC\b/i, /\bEXECUTE\b/i,
      ];

      for (const pattern of dangerousSql) {
        if (pattern.test(query)) {
          context.logs.push(`[Tool] ${node.data.label}: 危険なSQLコマンドが検出されました`);
          return { success: false, output: null, error: 'セキュリティ: 危険なSQLコマンドは実行できません' };
        }
      }

      // モック応答（実際のDB接続は将来実装）
      context.logs.push(`[Tool] ${node.data.label}: DB Query (モック): ${query.substring(0, 50)}...`);
      return {
        success: true,
        output: {
          message: 'Database query executed (mock)',
          query: query,
          input: input,
          note: '実際のデータベース接続は将来のバージョンで実装予定です',
        },
      };
    }

    // 未知のツールタイプ
    context.logs.push(`[Tool] ${node.data.label}: 未対応のツールタイプ: ${toolType}`);
    return {
      success: true,
      output: { message: `Tool type '${toolType}' executed (passthrough)`, input },
    };
  },
};

// Calculator ノード
const calculatorExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const expression = (inputs.input?.toString() || '').trim();

    if (!expression) {
      context.logs.push(`[Calculator] ${node.data.label}: 数式が空です`);
      return { success: false, output: null, error: '数式が指定されていません' };
    }

    context.logs.push(`[Calculator] ${node.data.label}: 計算中 - ${expression}`);

    try {
      // 安全な数式評価: 数字、演算子、括弧、小数点、スペースのみ許可
      const sanitized = expression.replace(/\s+/g, '');

      // 許可されない文字が含まれていないかチェック
      if (!/^[\d+\-*/.()%^]+$/.test(sanitized)) {
        throw new Error('無効な文字が含まれています');
      }

      // 空の括弧や連続する演算子をチェック
      if (/\(\)/.test(sanitized) || /[+\-*/.%^]{2,}/.test(sanitized.replace(/\*\*/g, '^'))) {
        throw new Error('無効な数式形式です');
      }

      // ^を**に変換（べき乗対応）
      const withPower = sanitized.replace(/\^/g, '**');

      // 安全に評価
      const result = Function(`'use strict'; return (${withPower})`)();

      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('計算結果が無効です');
      }

      context.logs.push(`[Calculator] ${node.data.label}: 結果 = ${result}`);
      return { success: true, output: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '計算エラー';
      context.logs.push(`[Calculator] ${node.data.label}: エラー - ${errorMessage}`);
      return { success: false, output: null, error: `計算エラー: ${errorMessage}` };
    }
  },
};

// Custom Tool ノード
const customToolExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const toolName = config.toolName || node.data.label || 'CustomTool';
    const jsCode = config.jsCode || '';

    if (!jsCode.trim()) {
      context.logs.push(`[CustomTool] ${toolName}: コードが空です`);
      return { success: false, output: null, error: 'JavaScriptコードが指定されていません' };
    }

    context.logs.push(`[CustomTool] ${toolName}: 実行中`);

    try {
      // 入力値を取得
      const input = inputs.input;

      // 安全な実行環境を作成（制限された関数のみ提供）
      const safeContext = {
        input,
        inputs,
        JSON,
        Math,
        String,
        Number,
        Array,
        Object,
        Date,
        Boolean,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        encodeURIComponent,
        decodeURIComponent,
        // コンソールログ（デバッグ用）
        console: {
          log: (...args: any[]) => context.logs.push(`[CustomTool] ${toolName}: ${args.join(' ')}`),
        },
      };

      // コードを関数として実行
      // セキュリティ: 危険なキーワードをブロック
      const dangerousPatterns = [
        /\beval\b/,
        /\bFunction\b/,
        /\bprocess\b/,
        /\brequire\b/,
        /\bimport\b/,
        /\bexport\b/,
        /\b__proto__\b/,
        /\bconstructor\b/,
        /\bprototype\b/,
        /\bwindow\b/,
        /\bdocument\b/,
        /\bglobalThis\b/,
        /\bfetch\b/,
        /\bXMLHttpRequest\b/,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(jsCode)) {
          throw new Error(`セキュリティ: 禁止されたキーワードが含まれています`);
        }
      }

      // 関数を作成して実行
      const contextKeys = Object.keys(safeContext);
      const contextValues = Object.values(safeContext);

      // コードを非同期関数としてラップ
      const wrappedCode = `
        'use strict';
        return (async function() {
          ${jsCode}
        })();
      `;

      const fn = new Function(...contextKeys, wrappedCode);
      const result = await fn(...contextValues);

      context.logs.push(`[CustomTool] ${toolName}: 完了`);
      return { success: true, output: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '実行エラー';
      context.logs.push(`[CustomTool] ${toolName}: エラー - ${errorMessage}`);
      return { success: false, output: null, error: `CustomTool エラー: ${errorMessage}` };
    }
  },
};

// Retriever Tool ノード（ベクトル検索をツール化）
const retrieverToolExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const toolName = config.toolName || 'Retriever Tool';
    const toolDescription = config.toolDescription || 'ベクトル検索を実行';
    const query = inputs.input || context.input;

    context.logs.push(`[RetrieverTool] ${toolName}: 検索実行 - "${String(query).substring(0, 50)}..."`);

    // retrieverハンドルから接続されたVector Storeの情報を取得
    const retrieverInput = inputs.retriever;

    // Vector Store設定を取得（接続されたノードから、またはconfig直接指定）
    const vectorStoreConfig = retrieverInput || {
      provider: config.provider || 'mock',
      indexName: config.indexName || 'default',
      topK: config.topK || 4,
    };

    const topK = vectorStoreConfig.topK || config.topK || 4;

    try {
      // 実際のベクトル検索（Weaviate等が設定されている場合）
      if (vectorStoreConfig.provider === 'weaviate' && vectorStoreConfig.host) {
        context.logs.push(`[RetrieverTool] ${toolName}: Weaviate検索 (host: ${vectorStoreConfig.host})`);

        // Weaviate GraphQL検索
        const weaviateUrl = `${vectorStoreConfig.scheme || 'http'}://${vectorStoreConfig.host}/v1/graphql`;
        const graphqlQuery = {
          query: `{
            Get {
              ${vectorStoreConfig.indexName}(
                nearText: { concepts: ["${String(query).replace(/"/g, '\\"')}"] }
                limit: ${topK}
              ) {
                ${vectorStoreConfig.textKey || 'text'}
                _additional { certainty distance }
              }
            }
          }`
        };

        try {
          const response = await fetch(weaviateUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(vectorStoreConfig.apiKey ? { 'Authorization': `Bearer ${vectorStoreConfig.apiKey}` } : {}),
            },
            body: JSON.stringify(graphqlQuery),
          });

          if (response.ok) {
            const data = await response.json();
            const results = data?.data?.Get?.[vectorStoreConfig.indexName] || [];

            const formattedResults = results.map((doc: any, index: number) => ({
              content: doc[vectorStoreConfig.textKey || 'text'] || '',
              score: doc._additional?.certainty || 1 - (doc._additional?.distance || 0),
              index,
            }));

            context.logs.push(`[RetrieverTool] ${toolName}: ${formattedResults.length}件取得`);
            return {
              success: true,
              output: {
                tool: toolName,
                description: toolDescription,
                query,
                results: formattedResults,
                resultCount: formattedResults.length,
              },
            };
          }
        } catch (weaviateError) {
          context.logs.push(`[RetrieverTool] ${toolName}: Weaviate接続失敗、モックにフォールバック`);
        }
      }

      // モック検索結果（Vector Storeが接続されていない場合やフォールバック）
      const mockResults = [
        { content: `関連ドキュメント1: 「${String(query).slice(0, 30)}」に関する情報です。`, score: 0.95, index: 0 },
        { content: `関連ドキュメント2: 補足的な情報が含まれています。`, score: 0.87, index: 1 },
        { content: `関連ドキュメント3: 追加のコンテキスト情報です。`, score: 0.82, index: 2 },
        { content: `関連ドキュメント4: 参考になる関連情報です。`, score: 0.78, index: 3 },
      ].slice(0, topK);

      context.logs.push(`[RetrieverTool] ${toolName}: モック検索 ${mockResults.length}件`);

      return {
        success: true,
        output: {
          tool: toolName,
          description: toolDescription,
          query,
          results: mockResults,
          resultCount: mockResults.length,
          note: 'モック結果です。実際のVector Storeを接続してください。',
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '検索エラー';
      context.logs.push(`[RetrieverTool] ${toolName}: エラー - ${errorMessage}`);
      return { success: false, output: null, error: `RetrieverTool エラー: ${errorMessage}` };
    }
  },
};

// Read File ノード（ファイル読み取りツール）
const readFileExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const basePath = config.basePath || './data';
    const filePath = inputs.input || config.filePath || '';

    if (!filePath) {
      context.logs.push(`[ReadFile] ${node.data.label}: ファイルパスが指定されていません`);
      return { success: false, output: null, error: 'ファイルパスが指定されていません' };
    }

    context.logs.push(`[ReadFile] ${node.data.label}: ${filePath} を読み込み中`);

    // セキュリティチェック: パストラバーサル攻撃を防止
    const normalizedPath = String(filePath).replace(/\\/g, '/');
    if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
      context.logs.push(`[ReadFile] ${node.data.label}: 不正なパス`);
      return { success: false, output: null, error: 'セキュリティ: 不正なパスが指定されました' };
    }

    // 危険な拡張子をブロック
    const dangerousExtensions = ['.exe', '.dll', '.bat', '.cmd', '.sh', '.ps1'];
    const ext = normalizedPath.toLowerCase().slice(normalizedPath.lastIndexOf('.'));
    if (dangerousExtensions.includes(ext)) {
      context.logs.push(`[ReadFile] ${node.data.label}: 危険なファイルタイプ`);
      return { success: false, output: null, error: 'セキュリティ: このファイルタイプは読み込めません' };
    }

    try {
      // サーバーサイドでのファイル読み込み
      if (typeof window === 'undefined') {
        const fs = await import('fs/promises');
        const path = await import('path');

        const fullPath = path.join(process.cwd(), basePath, normalizedPath);

        // basePathの外に出ていないか確認
        const resolvedBase = path.resolve(process.cwd(), basePath);
        const resolvedFull = path.resolve(fullPath);
        if (!resolvedFull.startsWith(resolvedBase)) {
          return { success: false, output: null, error: 'セキュリティ: ベースパス外へのアクセスは許可されていません' };
        }

        const content = await fs.readFile(fullPath, 'utf-8');
        const stats = await fs.stat(fullPath);

        context.logs.push(`[ReadFile] ${node.data.label}: 読み込み成功 (${content.length} 文字)`);
        return {
          success: true,
          output: {
            content,
            filePath: normalizedPath,
            size: stats.size,
            encoding: 'utf-8',
          },
        };
      }

      // クライアントサイドではモック
      context.logs.push(`[ReadFile] ${node.data.label}: クライアントサイドではモック`);
      return {
        success: true,
        output: {
          content: `// Mock content for: ${normalizedPath}\n// This is a placeholder when running on client side.`,
          filePath: normalizedPath,
          size: 0,
          note: 'クライアントサイドではファイル読み込みは制限されています',
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ファイル読み込みエラー';
      context.logs.push(`[ReadFile] ${node.data.label}: エラー - ${errorMessage}`);
      return { success: false, output: null, error: `ReadFile エラー: ${errorMessage}` };
    }
  },
};

// Write File ノード（ファイル書き込みツール）
const writeFileExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const basePath = config.basePath || './data/output';
    const fileFormat = config.fileFormat || 'txt';
    const writeMode = config.writeMode || 'overwrite';
    let filePath = config.filePath || inputs.filePath || '';
    const content = inputs.input || inputs.content || '';
    const overwrite = writeMode !== 'append' && config.overwrite !== false;

    if (!filePath) {
      context.logs.push(`[WriteFile] ${node.data.label}: ファイルパスが指定されていません`);
      return { success: false, output: null, error: 'ファイルパスが指定されていません' };
    }

    // ファイルパスに拡張子がない場合、設定された形式を追加
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(filePath);
    if (!hasExtension) {
      filePath = `${filePath}.${fileFormat}`;
    }

    if (!content && content !== '') {
      context.logs.push(`[WriteFile] ${node.data.label}: 書き込む内容がありません`);
      return { success: false, output: null, error: '書き込む内容がありません' };
    }

    const modeLabel = writeMode === 'append' ? '追記' : '上書き';
    context.logs.push(`[WriteFile] ${node.data.label}: ${filePath} に${modeLabel}中`);

    // セキュリティチェック: パストラバーサル攻撃を防止
    const normalizedPath = String(filePath).replace(/\\/g, '/');
    if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
      context.logs.push(`[WriteFile] ${node.data.label}: 不正なパス`);
      return { success: false, output: null, error: 'セキュリティ: 不正なパスが指定されました' };
    }

    // 危険な拡張子をブロック（実行可能ファイルのみ）
    const dangerousExtensions = ['.exe', '.dll', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.com', '.msi', '.scr'];
    const ext = normalizedPath.toLowerCase().slice(normalizedPath.lastIndexOf('.'));
    if (dangerousExtensions.includes(ext)) {
      context.logs.push(`[WriteFile] ${node.data.label}: 危険なファイルタイプ`);
      return { success: false, output: null, error: 'セキュリティ: このファイルタイプへの書き込みは許可されていません' };
    }

    try {
      // サーバーサイドでのファイル書き込み
      if (typeof window === 'undefined') {
        const fs = await import('fs/promises');
        const path = await import('path');

        const fullPath = path.join(process.cwd(), basePath, normalizedPath);

        // basePathの外に出ていないか確認
        const resolvedBase = path.resolve(process.cwd(), basePath);
        const resolvedFull = path.resolve(fullPath);
        if (!resolvedFull.startsWith(resolvedBase)) {
          return { success: false, output: null, error: 'セキュリティ: ベースパス外へのアクセスは許可されていません' };
        }

        // ディレクトリが存在しない場合は作成
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });

        // 既存ファイルの確認
        let fileExists = false;
        try {
          await fs.access(fullPath);
          fileExists = true;
        } catch {
          fileExists = false;
        }

        if (fileExists && !overwrite && writeMode !== 'append') {
          return { success: false, output: null, error: 'ファイルが既に存在します（上書き不可設定）' };
        }

        // 書き込む内容を文字列に変換
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

        // 書き込みモードに応じて処理
        if (writeMode === 'append') {
          await fs.appendFile(fullPath, contentStr, 'utf-8');
          context.logs.push(`[WriteFile] ${node.data.label}: 追記成功 (${contentStr.length} 文字)`);
          return {
            success: true,
            output: {
              filePath: normalizedPath,
              fullPath: resolvedFull,
              size: contentStr.length,
              appended: true,
              message: `ファイル ${normalizedPath} に追記しました`,
            },
          };
        } else {
          await fs.writeFile(fullPath, contentStr, 'utf-8');
          context.logs.push(`[WriteFile] ${node.data.label}: 書き込み成功 (${contentStr.length} 文字)`);
          return {
            success: true,
            output: {
              filePath: normalizedPath,
              fullPath: resolvedFull,
              size: contentStr.length,
              overwritten: fileExists,
              message: `ファイル ${normalizedPath} に書き込みました`,
            },
          };
        }
      }

      // クライアントサイドではモック
      context.logs.push(`[WriteFile] ${node.data.label}: クライアントサイドではモック`);
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      return {
        success: true,
        output: {
          filePath: normalizedPath,
          size: contentStr.length,
          note: 'クライアントサイドではファイル書き込みは制限されています（モック）',
          previewContent: contentStr.substring(0, 200) + (contentStr.length > 200 ? '...' : ''),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ファイル書き込みエラー';
      context.logs.push(`[WriteFile] ${node.data.label}: エラー - ${errorMessage}`);
      return { success: false, output: null, error: `WriteFile エラー: ${errorMessage}` };
    }
  },
};

// ForEach ノード
// forEachExecutorは特殊なエグゼキューターで、executeFlow内で特別処理される
// このエグゼキューターはフラグを返すのみで、実際のループ処理はexecuteFlow内で行われる
const forEachExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const array = inputs.array || inputs.input || [];
    const variableName = config.variableName || 'item';
    const indexName = config.indexName || 'index';

    // 配列でない場合は単一要素の配列として扱う
    const items = Array.isArray(array) ? array : [array];

    if (items.length === 0) {
      context.logs.push(`[ForEach] ${node.data.label}: 空の配列、スキップ`);
      return {
        success: true,
        output: {
          items: [],
          results: [],
          isForEachNode: true,
          variableName,
          indexName,
          complete: true,
        },
      };
    }

    context.logs.push(`[ForEach] ${node.data.label}: ${items.length} 件のループ処理を開始`);

    // forEachノードの出力として配列情報を返す
    // 実際のループ処理はexecuteFlow内で行われる
    return {
      success: true,
      output: {
        items,
        results: [], // ループ結果はexecuteFlowで設定される
        isForEachNode: true,
        variableName,
        indexName,
        currentIndex: 0,
        complete: false, // ループ処理がまだ完了していないことを示す
      },
    };
  },
};

// ループボディを実行するヘルパー関数
async function executeLoopBody(
  forEachNode: FlowNode,
  items: any[],
  variableName: string,
  indexName: string,
  allNodes: FlowNode[],
  edges: FlowEdge[],
  context: ExecutionContext,
  executorMapRef: Record<string, NodeExecutor>
): Promise<{ success: boolean; results: any[]; error?: string }> {
  const { bodyNodes } = getLoopBodyNodes(forEachNode, allNodes, edges);

  if (bodyNodes.length === 0) {
    context.logs.push(`[ForEach] ループボディにノードがありません`);
    return { success: true, results: items };
  }

  const sortedBodyNodes = sortLoopBodyNodes(bodyNodes, edges);
  context.logs.push(`[ForEach] ループボディノード: ${sortedBodyNodes.map(n => n.data.label).join(' → ')}`);

  const results: any[] = [];

  // 各要素に対してループボディを実行
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    context.logs.push(`[ForEach] --- イテレーション ${i + 1}/${items.length} ---`);

    // ループ変数をコンテキストに設定
    context.memory.set(variableName, item);
    context.memory.set(indexName, i);
    context.memory.set('loopItem', item);
    context.memory.set('loopIndex', i);

    // forEachノードの出力を現在のアイテムに設定
    context.nodeOutputs.set(forEachNode.id, item);

    let iterationOutput: any = item;

    // ループボディの各ノードを実行
    for (const bodyNode of sortedBodyNodes) {
      const typeVariants = [
        bodyNode.data.type,
        bodyNode.type,
        bodyNode.data.category,
      ].filter(Boolean);

      let executor: NodeExecutor = defaultExecutor;

      for (const t of typeVariants) {
        if (executorMapRef[t]) {
          executor = executorMapRef[t];
          break;
        }
      }

      // 入力を収集
      const nodeInputs = collectNodeInputs(bodyNode, edges, context.nodeOutputs, allNodes);

      // ノード実行開始時刻を記録
      const nodeStartTime = Date.now();

      // ノードを実行
      const result = await executor.execute(bodyNode, nodeInputs, context);

      // ノード実行時間
      const nodeExecutionTime = Date.now() - nodeStartTime;

      if (!result.success) {
        context.logs.push(`[ForEach] [ERROR] イテレーション ${i + 1} でエラー: ${result.error}`);
        context.nodeExecutionLogs.push({
          nodeId: bodyNode.id,
          nodeName: `${bodyNode.data.label} (iter ${i + 1})`,
          nodeType: bodyNode.data.type || bodyNode.type || 'unknown',
          inputs: nodeInputs,
          output: null,
          executionTime: nodeExecutionTime,
          status: 'error',
          error: result.error,
          timestamp: Date.now(),
        });
        return {
          success: false,
          results,
          error: `Loop iteration ${i + 1} failed: ${result.error}`,
        };
      }

      // 出力を保存
      context.nodeOutputs.set(bodyNode.id, result.output);
      iterationOutput = result.output;

      // 成功ログを記録
      context.nodeExecutionLogs.push({
        nodeId: bodyNode.id,
        nodeName: `${bodyNode.data.label} (iter ${i + 1})`,
        nodeType: bodyNode.data.type || bodyNode.type || 'unknown',
        inputs: nodeInputs,
        output: result.output,
        executionTime: nodeExecutionTime,
        status: 'success',
        timestamp: Date.now(),
      });
    }

    // このイテレーションの最終出力を結果に追加
    results.push(iterationOutput);
  }

  context.logs.push(`[ForEach] ループ完了: ${results.length} 件の結果`);
  return { success: true, results };
}

// ============================================
// Document Loader ノードエグゼキューター
// ============================================

// PDF Loader ノード
const pdfLoaderExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const filePath = config.file || config.filePath || inputs.file || '';
    const fileData = config.file_file || inputs.file_file; // アップロードされたファイルデータ
    const splitPages = config.splitPages !== false; // デフォルトでページ分割

    context.logs.push(`[PDFLoader] ${node.data.label}: PDF読み込み開始`);

    if (!filePath && !fileData) {
      context.logs.push(`[PDFLoader] ${node.data.label}: ファイルが指定されていません`);
      return { success: false, output: null, error: 'PDFファイルが指定されていません' };
    }

    try {
      // サーバーサイドでのPDF処理
      if (typeof window === 'undefined') {
        const fs = await import('fs/promises');
        const path = await import('path');

        let pdfBuffer: Buffer;
        let fileName: string;

        if (fileData && typeof fileData === 'object' && fileData.data) {
          // Base64エンコードされたファイルデータの場合
          pdfBuffer = Buffer.from(fileData.data, 'base64');
          fileName = fileData.name || 'uploaded.pdf';
          context.logs.push(`[PDFLoader] アップロードされたファイルを処理: ${fileName}`);
        } else if (filePath) {
          // ファイルパスからの読み込み
          const fullPath = path.isAbsolute(filePath)
            ? filePath
            : path.join(process.cwd(), 'data', 'uploads', filePath);

          // ファイル存在チェック
          try {
            await fs.access(fullPath);
          } catch {
            context.logs.push(`[PDFLoader] ${node.data.label}: ファイルが見つかりません: ${fullPath}`);
            return { success: false, output: null, error: `ファイルが見つかりません: ${filePath}` };
          }

          pdfBuffer = await fs.readFile(fullPath);
          fileName = path.basename(filePath);
          context.logs.push(`[PDFLoader] ファイルを読み込み: ${fullPath}`);
        } else {
          return { success: false, output: null, error: 'PDFデータがありません' };
        }

        // pdf-parseでPDFを解析
        try {
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(pdfBuffer);

          const textContent = pdfData.text || '';
          const pageCount = pdfData.numpages || 1;
          const metadata = pdfData.info || {};

          context.logs.push(`[PDFLoader] ${node.data.label}: PDF解析成功 - ${pageCount}ページ, ${textContent.length}文字`);

          return {
            success: true,
            output: {
              type: 'pdf',
              filePath: filePath || fileName,
              fileName: fileName,
              size: pdfBuffer.length,
              content: textContent,
              pageCount: pageCount,
              metadata: {
                source: filePath || fileName,
                type: 'application/pdf',
                title: metadata.Title || '',
                author: metadata.Author || '',
                subject: metadata.Subject || '',
                creator: metadata.Creator || '',
                producer: metadata.Producer || '',
                creationDate: metadata.CreationDate || '',
                modDate: metadata.ModDate || '',
              },
            },
          };
        } catch (parseError) {
          const errorMsg = parseError instanceof Error ? parseError.message : 'PDF解析エラー';
          context.logs.push(`[PDFLoader] ${node.data.label}: PDF解析エラー - ${errorMsg}`);
          return { success: false, output: null, error: `PDF解析エラー: ${errorMsg}` };
        }
      }

      // クライアントサイドの場合（ファイル名のみ返す）
      context.logs.push(`[PDFLoader] ${node.data.label}: クライアントサイド - ファイル名: ${filePath}`);
      return {
        success: true,
        output: {
          type: 'pdf',
          filePath: filePath,
          fileName: filePath,
          content: `[PDF Content: ${filePath}]\n\nPDFファイルの内容がここに読み込まれます。`,
          metadata: {
            source: filePath,
            type: 'application/pdf',
          },
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PDF読み込みエラー';
      context.logs.push(`[PDFLoader] ${node.data.label}: エラー - ${errorMessage}`);
      return { success: false, output: null, error: `PDF読み込みエラー: ${errorMessage}` };
    }
  },
};

// Text Loader ノード
const textLoaderExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const filePath = config.file || config.filePath || inputs.file || '';

    context.logs.push(`[TextLoader] ${node.data.label}: テキスト読み込み開始`);

    if (!filePath) {
      context.logs.push(`[TextLoader] ${node.data.label}: ファイルが指定されていません`);
      return { success: false, output: null, error: 'テキストファイルが指定されていません' };
    }

    try {
      if (typeof window === 'undefined') {
        const fs = await import('fs/promises');
        const path = await import('path');

        const fullPath = path.isAbsolute(filePath)
          ? filePath
          : path.join(process.cwd(), 'data', 'uploads', filePath);

        try {
          await fs.access(fullPath);
        } catch {
          context.logs.push(`[TextLoader] ${node.data.label}: ファイルが見つかりません: ${fullPath}`);
          return { success: false, output: null, error: `ファイルが見つかりません: ${filePath}` };
        }

        const content = await fs.readFile(fullPath, 'utf-8');
        const stats = await fs.stat(fullPath);

        context.logs.push(`[TextLoader] ${node.data.label}: 読み込み成功 (${content.length} 文字)`);

        return {
          success: true,
          output: {
            type: 'text',
            filePath: filePath,
            fileName: path.basename(filePath),
            size: stats.size,
            content: content,
            metadata: {
              source: filePath,
              type: 'text/plain',
              encoding: 'utf-8',
            },
          },
        };
      }

      return {
        success: true,
        output: {
          type: 'text',
          filePath: filePath,
          fileName: filePath,
          content: `[Text Content: ${filePath}]`,
          metadata: { source: filePath },
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'テキスト読み込みエラー';
      context.logs.push(`[TextLoader] ${node.data.label}: エラー - ${errorMessage}`);
      return { success: false, output: null, error: `テキスト読み込みエラー: ${errorMessage}` };
    }
  },
};

// CSV Loader ノード
const csvLoaderExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const filePath = config.file || config.filePath || inputs.file || '';
    const separator = config.separator || ',';

    context.logs.push(`[CSVLoader] ${node.data.label}: CSV読み込み開始`);

    if (!filePath) {
      return { success: false, output: null, error: 'CSVファイルが指定されていません' };
    }

    try {
      if (typeof window === 'undefined') {
        const fs = await import('fs/promises');
        const path = await import('path');

        const fullPath = path.isAbsolute(filePath)
          ? filePath
          : path.join(process.cwd(), 'data', 'uploads', filePath);

        try {
          await fs.access(fullPath);
        } catch {
          return { success: false, output: null, error: `ファイルが見つかりません: ${filePath}` };
        }

        const content = await fs.readFile(fullPath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());

        // CSVをパース
        const headers = lines[0]?.split(separator).map(h => h.trim()) || [];
        const rows = lines.slice(1).map(line => {
          const values = line.split(separator).map(v => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

        context.logs.push(`[CSVLoader] ${node.data.label}: ${rows.length} 行読み込み成功`);

        return {
          success: true,
          output: {
            type: 'csv',
            filePath: filePath,
            fileName: path.basename(filePath),
            content: content,
            headers: headers,
            rows: rows,
            rowCount: rows.length,
            metadata: {
              source: filePath,
              type: 'text/csv',
              separator: separator,
            },
          },
        };
      }

      return {
        success: true,
        output: {
          type: 'csv',
          filePath: filePath,
          content: `[CSV Content: ${filePath}]`,
          metadata: { source: filePath },
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'CSV読み込みエラー';
      context.logs.push(`[CSVLoader] ${node.data.label}: エラー - ${errorMessage}`);
      return { success: false, output: null, error: `CSV読み込みエラー: ${errorMessage}` };
    }
  },
};

// JSON Loader ノード
const jsonLoaderExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const filePath = config.file || config.filePath || inputs.file || '';

    context.logs.push(`[JSONLoader] ${node.data.label}: JSON読み込み開始`);

    if (!filePath) {
      return { success: false, output: null, error: 'JSONファイルが指定されていません' };
    }

    try {
      if (typeof window === 'undefined') {
        const fs = await import('fs/promises');
        const path = await import('path');

        const fullPath = path.isAbsolute(filePath)
          ? filePath
          : path.join(process.cwd(), 'data', 'uploads', filePath);

        try {
          await fs.access(fullPath);
        } catch {
          return { success: false, output: null, error: `ファイルが見つかりません: ${filePath}` };
        }

        const content = await fs.readFile(fullPath, 'utf-8');
        const jsonData = JSON.parse(content);

        context.logs.push(`[JSONLoader] ${node.data.label}: JSON読み込み成功`);

        return {
          success: true,
          output: {
            type: 'json',
            filePath: filePath,
            fileName: path.basename(filePath),
            content: content,
            data: jsonData,
            metadata: {
              source: filePath,
              type: 'application/json',
            },
          },
        };
      }

      return {
        success: true,
        output: {
          type: 'json',
          filePath: filePath,
          content: `[JSON Content: ${filePath}]`,
          metadata: { source: filePath },
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'JSON読み込みエラー';
      context.logs.push(`[JSONLoader] ${node.data.label}: エラー - ${errorMessage}`);
      return { success: false, output: null, error: `JSON読み込みエラー: ${errorMessage}` };
    }
  },
};

// DOCX Loader ノード
const docxLoaderExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const filePath = config.file || config.filePath || inputs.file || '';

    context.logs.push(`[DOCXLoader] ${node.data.label}: DOCX読み込み開始`);

    if (!filePath) {
      return { success: false, output: null, error: 'DOCXファイルが指定されていません' };
    }

    try {
      if (typeof window === 'undefined') {
        const fs = await import('fs/promises');
        const path = await import('path');

        const fullPath = path.isAbsolute(filePath)
          ? filePath
          : path.join(process.cwd(), 'data', 'uploads', filePath);

        try {
          await fs.access(fullPath);
        } catch {
          return { success: false, output: null, error: `ファイルが見つかりません: ${filePath}` };
        }

        const stats = await fs.stat(fullPath);

        context.logs.push(`[DOCXLoader] ${node.data.label}: DOCX読み込み成功 (${stats.size} bytes)`);

        // モック: 実際のDOCX解析は mammoth などのライブラリが必要
        return {
          success: true,
          output: {
            type: 'docx',
            filePath: filePath,
            fileName: path.basename(filePath),
            size: stats.size,
            content: `[DOCX Content from: ${path.basename(filePath)}]\n\nこのWord文書の内容がここに展開されます。\n実際のDOCX解析には mammoth ライブラリが必要です。`,
            metadata: {
              source: filePath,
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            },
          },
        };
      }

      return {
        success: true,
        output: {
          type: 'docx',
          filePath: filePath,
          content: `[DOCX Content: ${filePath}]`,
          metadata: { source: filePath },
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'DOCX読み込みエラー';
      context.logs.push(`[DOCXLoader] ${node.data.label}: エラー - ${errorMessage}`);
      return { success: false, output: null, error: `DOCX読み込みエラー: ${errorMessage}` };
    }
  },
};

// Excel Loader ノード
const excelLoaderExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const filePath = config.file || config.filePath || inputs.file || '';

    context.logs.push(`[ExcelLoader] ${node.data.label}: Excel読み込み開始`);

    if (!filePath) {
      return { success: false, output: null, error: 'Excelファイルが指定されていません' };
    }

    try {
      if (typeof window === 'undefined') {
        const fs = await import('fs/promises');
        const path = await import('path');

        const fullPath = path.isAbsolute(filePath)
          ? filePath
          : path.join(process.cwd(), 'data', 'uploads', filePath);

        try {
          await fs.access(fullPath);
        } catch {
          return { success: false, output: null, error: `ファイルが見つかりません: ${filePath}` };
        }

        const stats = await fs.stat(fullPath);

        context.logs.push(`[ExcelLoader] ${node.data.label}: Excel読み込み成功 (${stats.size} bytes)`);

        // モック: 実際のExcel解析は xlsx などのライブラリが必要
        return {
          success: true,
          output: {
            type: 'excel',
            filePath: filePath,
            fileName: path.basename(filePath),
            size: stats.size,
            content: `[Excel Content from: ${path.basename(filePath)}]\n\nこのExcelファイルの内容がここに展開されます。\n実際のExcel解析には xlsx ライブラリが必要です。`,
            sheets: ['Sheet1'],
            metadata: {
              source: filePath,
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
          },
        };
      }

      return {
        success: true,
        output: {
          type: 'excel',
          filePath: filePath,
          content: `[Excel Content: ${filePath}]`,
          metadata: { source: filePath },
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Excel読み込みエラー';
      context.logs.push(`[ExcelLoader] ${node.data.label}: エラー - ${errorMessage}`);
      return { success: false, output: null, error: `Excel読み込みエラー: ${errorMessage}` };
    }
  },
};

// 汎用 Document Loader ノード（ファイル拡張子で自動判別）
const documentLoaderExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const filePath = config.file || config.filePath || inputs.file || inputs.input || '';

    context.logs.push(`[DocumentLoader] ${node.data.label}: ドキュメント読み込み開始`);

    if (!filePath) {
      context.logs.push(`[DocumentLoader] ${node.data.label}: ファイルが指定されていません`);
      return { success: false, output: null, error: 'ファイルが指定されていません' };
    }

    // ファイル拡張子を取得
    const ext = String(filePath).toLowerCase().split('.').pop() || '';
    context.logs.push(`[DocumentLoader] ${node.data.label}: ファイル拡張子: .${ext}`);

    // 拡張子に応じて適切なローダーに委譲
    switch (ext) {
      case 'pdf':
        return pdfLoaderExecutor.execute(node, inputs, context);
      case 'txt':
      case 'md':
      case 'markdown':
        return textLoaderExecutor.execute(node, inputs, context);
      case 'csv':
        return csvLoaderExecutor.execute(node, inputs, context);
      case 'json':
        return jsonLoaderExecutor.execute(node, inputs, context);
      case 'doc':
      case 'docx':
        return docxLoaderExecutor.execute(node, inputs, context);
      case 'xls':
      case 'xlsx':
        return excelLoaderExecutor.execute(node, inputs, context);
      default:
        // 不明な拡張子はテキストとして読み込みを試行
        context.logs.push(`[DocumentLoader] ${node.data.label}: 不明な拡張子、テキストとして読み込み試行`);
        return textLoaderExecutor.execute(node, inputs, context);
    }
  },
};

// モック検索結果を生成するヘルパー関数
function generateMockSearchResults(query: string, topK: number): Array<{ content: string; score: number; metadata?: Record<string, any> }> {
  const querySnippet = String(query).slice(0, 50);
  const results = [
    {
      content: `「${querySnippet}」に関連する情報: この文書は指定されたクエリに最も関連性の高い内容を含んでいます。詳細な説明と具体的な事例が記載されています。`,
      score: 0.95,
      metadata: { source: 'document_1.pdf', page: 1 },
    },
    {
      content: `補足情報: ${querySnippet}についての追加コンテキスト。背景知識や関連する概念についての説明が含まれています。`,
      score: 0.88,
      metadata: { source: 'document_2.pdf', page: 3 },
    },
    {
      content: `参考資料: このドキュメントには${querySnippet}に関する実践的なガイドラインと推奨事項が記載されています。`,
      score: 0.82,
      metadata: { source: 'guide.md', page: 1 },
    },
    {
      content: `関連トピック: ${querySnippet}と密接に関連する概念やトピックについての概要説明。`,
      score: 0.75,
      metadata: { source: 'overview.txt', page: 1 },
    },
    {
      content: `事例紹介: ${querySnippet}の実際の適用例と結果についてのケーススタディ。`,
      score: 0.70,
      metadata: { source: 'case_study.pdf', page: 5 },
    },
  ];

  return results.slice(0, topK);
}

// ============================================
// Agent系ノードエグゼキューター
// ============================================

// OwlAgent参照を読み込むヘルパー関数
async function loadOwlAgent(agentId: string): Promise<any | null> {
  try {
    // サーバーサイドでのファイル読み込み
    if (typeof window === 'undefined') {
      const fs = await import('fs/promises');
      const path = await import('path');
      const agentPath = path.join(process.cwd(), 'data', 'owlagents', `${agentId}.json`);
      const content = await fs.readFile(agentPath, 'utf-8');
      return JSON.parse(content);
    }
    // クライアントサイドでのAPI呼び出し
    const response = await fetch(`/api/owlagents/${agentId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// Agent ノード（基本的なエージェント）
const agentExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || node.data.inputs || {};
    const systemMessage = config.systemMessage || 'あなたは親切なAIアシスタントです。';
    const userMessage = inputs.input || context.input;
    const maxIterations = config.maxIterations || 10;
    const tools = config.tools || [];

    context.logs.push(`[Agent] ${node.data.label}: エージェント実行開始`);
    context.logs.push(`[Agent] システムメッセージ: ${systemMessage.slice(0, 50)}...`);
    context.logs.push(`[Agent] ツール数: ${tools.length}, 最大イテレーション: ${maxIterations}`);

    // Azure OpenAI / OpenAI APIを使用
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
    const openaiApiKey = process.env.OPENAI_API_KEY;

    // Azure OpenAIを優先
    if (azureApiKey && azureEndpoint && azureDeployment) {
      try {
        const url = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureApiVersion}`;
        context.logs.push(`[Agent] Azure OpenAI使用: ${azureDeployment}`);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': azureApiKey,
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: String(userMessage) },
            ],
            temperature: config.temperature || 0.7,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const output = data.choices?.[0]?.message?.content || '';

        context.logs.push(`[Agent] ${node.data.label}: エージェント応答取得成功`);
        return { success: true, output };
      } catch (error) {
        context.logs.push(`[Agent] ${node.data.label}: Azure OpenAI呼び出し失敗 - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 通常のOpenAI API
    if (openaiApiKey && openaiApiKey.startsWith('sk-')) {
      try {
        context.logs.push(`[Agent] 通常のOpenAI API使用`);
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: config.modelName || 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: String(userMessage) },
            ],
            temperature: config.temperature || 0.7,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const output = data.choices?.[0]?.message?.content || '';

        context.logs.push(`[Agent] ${node.data.label}: OpenAI応答取得成功`);
        return { success: true, output };
      } catch (error) {
        context.logs.push(`[Agent] ${node.data.label}: OpenAI呼び出し失敗 - モック応答を返します`);
      }
    }

    // モック応答
    const mockOutput = `[Agent Mock] エージェント "${node.data.label}" が実行されました。入力: "${String(userMessage).slice(0, 50)}..."`;
    context.logs.push(`[Agent] ${node.data.label}: モック応答`);
    return { success: true, output: mockOutput };
  },
};

// Supervisor ノード（他のワーカーを管理するエージェント）
const supervisorExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || node.data.inputs || {};
    const systemMessage = config.systemMessage || 'あなたはワーカーを管理するスーパーバイザーです。タスクを適切なワーカーに振り分けてください。';
    const userMessage = inputs.input || context.input;
    const workers = config.workers || [];
    const recursionLimit = config.recursionLimit || 25;

    context.logs.push(`[Supervisor] ${node.data.label}: スーパーバイザー実行開始`);
    context.logs.push(`[Supervisor] ワーカー数: ${workers.length}, 再帰制限: ${recursionLimit}`);

    // ワーカー情報を収集
    const workerDescriptions = workers.map((w: any, i: number) =>
      `${i + 1}. ${w.name || w.label || `Worker ${i + 1}`}: ${w.description || 'No description'}`
    ).join('\n');

    const supervisorPrompt = `${systemMessage}

利用可能なワーカー:
${workerDescriptions || '(ワーカーが設定されていません)'}

ユーザーからのリクエストを分析し、適切なワーカーにタスクを割り当ててください。
各ワーカーへの指示を明確に記述してください。`;

    // Azure OpenAI / OpenAI APIを使用
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (azureApiKey && azureEndpoint && azureDeployment) {
      try {
        const url = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureApiVersion}`;
        context.logs.push(`[Supervisor] Azure OpenAI使用`);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': azureApiKey,
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: supervisorPrompt },
              { role: 'user', content: String(userMessage) },
            ],
            temperature: config.temperature || 0.7,
          }),
        });

        if (!response.ok) {
          throw new Error(`Azure OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const output = data.choices?.[0]?.message?.content || '';

        context.logs.push(`[Supervisor] ${node.data.label}: タスク振り分け完了`);
        return {
          success: true,
          output: {
            decision: output,
            workers: workers.map((w: any) => w.id || w.name),
            originalInput: userMessage,
          }
        };
      } catch (error) {
        context.logs.push(`[Supervisor] ${node.data.label}: API呼び出し失敗 - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (openaiApiKey && openaiApiKey.startsWith('sk-')) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: config.modelName || 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: supervisorPrompt },
              { role: 'user', content: String(userMessage) },
            ],
            temperature: config.temperature || 0.7,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const output = data.choices?.[0]?.message?.content || '';

        context.logs.push(`[Supervisor] ${node.data.label}: タスク振り分け完了`);
        return {
          success: true,
          output: {
            decision: output,
            workers: workers.map((w: any) => w.id || w.name),
            originalInput: userMessage,
          }
        };
      } catch (error) {
        context.logs.push(`[Supervisor] ${node.data.label}: OpenAI呼び出し失敗`);
      }
    }

    // モック応答
    const mockDecision = `[Supervisor Mock] タスクを分析しました。利用可能なワーカー: ${workers.length}個。入力: "${String(userMessage).slice(0, 50)}..."`;
    context.logs.push(`[Supervisor] ${node.data.label}: モック応答`);
    return {
      success: true,
      output: {
        decision: mockDecision,
        workers: workers.map((w: any) => w.id || w.name),
        originalInput: userMessage,
      }
    };
  },
};

// Worker ノード（特定のタスクを実行するエージェント）
const workerExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || node.data.inputs || {};
    const systemMessage = config.systemMessage || config.workerPrompt || 'あなたは専門的なタスクを実行するワーカーです。';
    const userMessage = inputs.input || context.input;
    const tools = config.tools || [];

    context.logs.push(`[Worker] ${node.data.label}: ワーカー実行開始`);
    context.logs.push(`[Worker] システムメッセージ: ${systemMessage.slice(0, 50)}...`);
    context.logs.push(`[Worker] ツール数: ${tools.length}`);

    // Azure OpenAI / OpenAI APIを使用
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (azureApiKey && azureEndpoint && azureDeployment) {
      try {
        const url = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureApiVersion}`;
        context.logs.push(`[Worker] Azure OpenAI使用`);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': azureApiKey,
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: String(userMessage) },
            ],
            temperature: config.temperature || 0.7,
          }),
        });

        if (!response.ok) {
          throw new Error(`Azure OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const output = data.choices?.[0]?.message?.content || '';

        context.logs.push(`[Worker] ${node.data.label}: タスク完了`);
        return { success: true, output };
      } catch (error) {
        context.logs.push(`[Worker] ${node.data.label}: API呼び出し失敗 - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (openaiApiKey && openaiApiKey.startsWith('sk-')) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: config.modelName || 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: String(userMessage) },
            ],
            temperature: config.temperature || 0.7,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const output = data.choices?.[0]?.message?.content || '';

        context.logs.push(`[Worker] ${node.data.label}: タスク完了`);
        return { success: true, output };
      } catch (error) {
        context.logs.push(`[Worker] ${node.data.label}: OpenAI呼び出し失敗`);
      }
    }

    // モック応答
    const mockOutput = `[Worker Mock] ワーカー "${node.data.label}" がタスクを実行しました。入力: "${String(userMessage).slice(0, 50)}..."`;
    context.logs.push(`[Worker] ${node.data.label}: モック応答`);
    return { success: true, output: mockOutput };
  },
};

// OwlAgent ノード（他のOwlAgentを参照・実行するノード）
const owlAgentExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const data = node.data;
    const agentId = data.agentId || data.config?.agentId;
    const inputMapping = data.inputMapping || data.config?.inputMapping || {};
    const outputMapping = data.outputMapping || data.config?.outputMapping || {};
    const userMessage = inputs.input || context.input;

    if (!agentId) {
      context.logs.push(`[OwlAgent] ${node.data.label}: エラー - agentIdが指定されていません`);
      return {
        success: false,
        output: null,
        error: 'OwlAgentノードにagentIdが設定されていません',
      };
    }

    // 循環参照検出: owlAgentStackを初期化または取得
    if (!context.owlAgentStack) {
      context.owlAgentStack = new Set<string>();
    }

    // 循環参照チェック
    if (context.owlAgentStack.has(agentId)) {
      const stackPath = Array.from(context.owlAgentStack).join(' → ') + ' → ' + agentId;
      context.logs.push(`[OwlAgent] ${node.data.label}: 循環参照を検出！ (${stackPath})`);
      return {
        success: false,
        output: null,
        error: `OwlAgent "${agentId}" の循環参照を検出しました: ${stackPath}`,
      };
    }

    // スタックに追加
    context.owlAgentStack.add(agentId);
    context.logs.push(`[OwlAgent] ${node.data.label}: OwlAgent "${agentId}" を実行開始 (スタック深度: ${context.owlAgentStack.size})`);

    try {
      // OwlAgentを読み込み
      const owlAgent = await loadOwlAgent(agentId);
      if (!owlAgent) {
        context.logs.push(`[OwlAgent] ${node.data.label}: エラー - エージェント "${agentId}" が見つかりません`);
        return {
          success: false,
          output: null,
          error: `OwlAgent "${agentId}" が見つかりません`,
        };
      }

      context.logs.push(`[OwlAgent] エージェント "${owlAgent.name}" をロードしました`);

      // 入力マッピングを適用
      let mappedInput = userMessage;
      if (Object.keys(inputMapping).length > 0) {
        mappedInput = {};
        for (const [targetKey, sourceKey] of Object.entries(inputMapping)) {
          const source = sourceKey as string;
          if (source.startsWith('context.')) {
            const key = source.replace('context.', '');
            (mappedInput as Record<string, any>)[targetKey] = (context as Record<string, any>)[key];
          } else if (source.startsWith('inputs.')) {
            const key = source.replace('inputs.', '');
            (mappedInput as Record<string, any>)[targetKey] = (inputs as Record<string, any>)[key];
          } else {
            (mappedInput as Record<string, any>)[targetKey] = inputs[source] || source;
          }
        }
      }

      // 再帰的にサブフローを実行
      const subFlow = owlAgent.flow;
      if (!subFlow || !subFlow.nodes || subFlow.nodes.length === 0) {
        context.logs.push(`[OwlAgent] ${node.data.label}: 警告 - エージェントにフローが定義されていません`);
        return {
          success: true,
          output: { message: `OwlAgent "${owlAgent.name}" にはフローが定義されていません`, input: mappedInput },
        };
      }

      context.logs.push(`[OwlAgent] サブフロー実行開始 (ノード数: ${subFlow.nodes.length})`);

      // サブフローを実行（循環参照スタックを引き継ぐ）
      const subResult = await executeFlowWithContext(
        subFlow.nodes,
        subFlow.edges,
        mappedInput,
        context.sessionId,
        context.owlAgentStack
      );

      // 実行ログをマージ
      subResult.logs.forEach((log: string) => {
        context.logs.push(`  [Sub] ${log}`);
      });

      if (!subResult.success) {
        context.logs.push(`[OwlAgent] ${node.data.label}: サブフロー実行失敗`);
        return {
          success: false,
          output: null,
          error: subResult.error || 'サブフロー実行に失敗しました',
        };
      }

      // 出力マッピングを適用
      let finalOutput = subResult.output;
      if (Object.keys(outputMapping).length > 0 && typeof subResult.output === 'object') {
        finalOutput = {};
        for (const [targetKey, sourceKey] of Object.entries(outputMapping)) {
          const source = sourceKey as string;
          (finalOutput as Record<string, any>)[targetKey] = subResult.output[source] || subResult.output;
        }
      }

      context.logs.push(`[OwlAgent] ${node.data.label}: OwlAgent "${owlAgent.name}" 実行完了`);
      return {
        success: true,
        output: finalOutput,
      };
    } finally {
      // スタックから削除（必ず実行）
      context.owlAgentStack.delete(agentId);
    }
  },
};

// Conversational Agent ノード（会話型エージェント）
const conversationalAgentExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || node.data.inputs || {};
    const systemMessage = config.systemMessage || 'あなたは親切で有能なAIアシスタントです。';
    const userMessage = inputs.input || context.input;
    const maxIterations = config.maxIterations || 10;
    const tools = inputs.tools || config.tools || [];
    const memory = inputs.memory || context.memory;

    context.logs.push(`[ConversationalAgent] ${node.data.label}: 会話型エージェント実行開始`);
    context.logs.push(`[ConversationalAgent] ツール数: ${Array.isArray(tools) ? tools.length : 0}`);

    // メモリから会話履歴を取得
    let conversationHistory: Array<{ role: string; content: string }> = [];
    if (memory && memory instanceof Map) {
      const historyKey = `memory_${context.sessionId}`;
      const history = memory.get(historyKey);
      if (Array.isArray(history)) {
        conversationHistory = history.map((h: any) => ({
          role: h.role || 'user',
          content: h.content || String(h),
        }));
      }
    }

    // Azure OpenAI / OpenAI APIを使用
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
    const openaiApiKey = process.env.OPENAI_API_KEY;

    const messages = [
      { role: 'system', content: systemMessage },
      ...conversationHistory.slice(-20), // 直近20件の履歴
      { role: 'user', content: String(userMessage) },
    ];

    if (azureApiKey && azureEndpoint && azureDeployment) {
      try {
        const url = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureApiVersion}`;
        context.logs.push(`[ConversationalAgent] Azure OpenAI使用`);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': azureApiKey,
          },
          body: JSON.stringify({
            messages,
            temperature: config.temperature || 0.7,
          }),
        });

        if (!response.ok) {
          throw new Error(`Azure OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const output = data.choices?.[0]?.message?.content || '';

        // 会話履歴を更新
        if (memory && memory instanceof Map) {
          const historyKey = `memory_${context.sessionId}`;
          const currentHistory = memory.get(historyKey) || [];
          currentHistory.push({ role: 'user', content: String(userMessage), timestamp: new Date().toISOString() });
          currentHistory.push({ role: 'assistant', content: output, timestamp: new Date().toISOString() });
          memory.set(historyKey, currentHistory);
        }

        context.logs.push(`[ConversationalAgent] ${node.data.label}: 応答生成完了`);
        return { success: true, output };
      } catch (error) {
        context.logs.push(`[ConversationalAgent] ${node.data.label}: API呼び出し失敗 - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (openaiApiKey && openaiApiKey.startsWith('sk-')) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: config.modelName || 'gpt-3.5-turbo',
            messages,
            temperature: config.temperature || 0.7,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const output = data.choices?.[0]?.message?.content || '';

        context.logs.push(`[ConversationalAgent] ${node.data.label}: 応答生成完了`);
        return { success: true, output };
      } catch (error) {
        context.logs.push(`[ConversationalAgent] ${node.data.label}: OpenAI呼び出し失敗`);
      }
    }

    // モック応答
    const mockOutput = `[ConversationalAgent Mock] 会話型エージェント "${node.data.label}" が応答しました。履歴: ${conversationHistory.length}件、入力: "${String(userMessage).slice(0, 50)}..."`;
    context.logs.push(`[ConversationalAgent] ${node.data.label}: モック応答`);
    return { success: true, output: mockOutput };
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
  // Flow Control
  start: startExecutor,
  end: endExecutor,
  condition: conditionExecutor,
  forEach: forEachExecutor,
  humanReview: humanReviewExecutor,

  // LLM / Chat Models - すべてのバリエーションをサポート
  llm: llmExecutor,
  azureChatOpenAI: llmExecutor,
  chatOpenAI: llmExecutor,
  openAI: llmExecutor,
  openai: llmExecutor,
  chatModel: llmExecutor,
  chatmodel: llmExecutor,
  gpt: llmExecutor,
  claude: llmExecutor,
  gemini: llmExecutor,

  // Prompt
  promptTemplate: promptTemplateExecutor,
  prompt: promptTemplateExecutor,
  prompttemplate: promptTemplateExecutor,

  // Vector Store
  vectorstore: vectorStoreExecutor,
  vectorStore: vectorStoreExecutor,

  // Memory
  memory: memoryExecutor,

  // Tools
  tool: toolExecutor,
  calculator: calculatorExecutor,
  Calculator: calculatorExecutor,
  customTool: customToolExecutor,
  CustomTool: customToolExecutor,
  retrieverTool: retrieverToolExecutor,
  RetrieverTool: retrieverToolExecutor,
  readFile: readFileExecutor,
  ReadFile: readFileExecutor,
  writeFile: writeFileExecutor,
  WriteFile: writeFileExecutor,

  // Document Loaders
  documentLoader: documentLoaderExecutor,
  DocumentLoader: documentLoaderExecutor,
  pdfLoader: pdfLoaderExecutor,
  PdfLoader: pdfLoaderExecutor,
  PDFLoader: pdfLoaderExecutor,
  textLoader: textLoaderExecutor,
  TextLoader: textLoaderExecutor,
  csvLoader: csvLoaderExecutor,
  CsvLoader: csvLoaderExecutor,
  CSVLoader: csvLoaderExecutor,
  jsonLoader: jsonLoaderExecutor,
  JsonLoader: jsonLoaderExecutor,
  JSONLoader: jsonLoaderExecutor,
  docxLoader: docxLoaderExecutor,
  DocxLoader: docxLoaderExecutor,
  DOCXLoader: docxLoaderExecutor,
  excelLoader: excelLoaderExecutor,
  ExcelLoader: excelLoaderExecutor,

  // Agent系ノード
  agent: agentExecutor,
  Agent: agentExecutor,
  agentExecutor: agentExecutor,
  AgentExecutor: agentExecutor,

  // Supervisor ノード
  supervisor: supervisorExecutor,
  Supervisor: supervisorExecutor,
  supervisorAgent: supervisorExecutor,

  // Worker ノード
  worker: workerExecutor,
  Worker: workerExecutor,
  workerAgent: workerExecutor,

  // OwlAgent ノード（他のOwlAgentを参照）
  owlAgent: owlAgentExecutor,
  OwlAgent: owlAgentExecutor,
  owlagent: owlAgentExecutor,
  owlAgentReference: owlAgentExecutor,
  OwlAgentReference: owlAgentExecutor,

  // Conversational Agent ノード
  conversationalAgent: conversationalAgentExecutor,
  ConversationalAgent: conversationalAgentExecutor,

  // Category-based fallbacks
  chatModels: llmExecutor,
  flowControl: defaultExecutor,
  agents: agentExecutor,
  Agents: agentExecutor,
};

// OwlAgentスタックを引き継いでサブフローを実行する関数
async function executeFlowWithContext(
  nodes: FlowNode[],
  edges: FlowEdge[],
  input: any,
  sessionId?: string,
  owlAgentStack?: Set<string>
): Promise<ExecutionResult> {
  // owlAgentStackを直接executeFlowに渡す
  return await executeFlow(nodes, edges, input, sessionId, owlAgentStack);
}

// メインの実行エンジン
export async function executeFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  input: any,
  sessionId?: string,
  _owlAgentStack?: Set<string>
): Promise<ExecutionResult> {
  const startTime = Date.now();

  const context: ExecutionContext = {
    sessionId: sessionId || `session_${Date.now()}`,
    input,
    nodeOutputs: new Map(),
    logs: [],
    memory: new Map(),
    nodeExecutionLogs: [],
    owlAgentStack: _owlAgentStack,
  };

  context.logs.push(`=== OwliaFabrica Native Engine ===`);
  context.logs.push(`セッションID: ${context.sessionId}`);
  context.logs.push(`ノード数: ${nodes.length}, エッジ数: ${edges.length}`);

  try {
    // toolsハンドルを通じてのみLLMに接続されているノードを特定（これらはフロー実行から除外）
    const toolOnlyNodes = new Set<string>();
    edges.forEach(e => {
      if (e.targetHandle === 'tools') {
        // このノードはtoolsハンドルに接続されている
        // 他の出力接続があるかチェック
        const sourceNode = nodes.find(n => n.id === e.source);
        if (sourceNode) {
          const otherOutputEdges = edges.filter(
            oe => oe.source === e.source && oe.targetHandle !== 'tools'
          );
          if (otherOutputEdges.length === 0) {
            // toolsハンドルへの接続のみなので、フロー実行から除外
            toolOnlyNodes.add(e.source);
          }
        }
      }
    });

    if (toolOnlyNodes.size > 0) {
      context.logs.push(`ツールノード (フロー実行から除外): ${Array.from(toolOnlyNodes).join(', ')}`);
      // ツールノードとして除外されたノードのログを記録（ステータス: skipped）
      toolOnlyNodes.forEach(nodeId => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          context.nodeExecutionLogs.push({
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: node.data.type || node.type || 'unknown',
            inputs: {},
            output: '(LLMのツールとして使用されるため、直接実行はスキップ)',
            executionTime: 0,
            status: 'skipped',
            timestamp: Date.now(),
          });
        }
      });
    }

    // トポロジカルソート
    const sortedNodes = topologicalSort(nodes, edges);

    // ツールノードを実行順序から除外
    const executableNodes = sortedNodes.filter(n => !toolOnlyNodes.has(n.id));
    context.logs.push(`実行順序: ${executableNodes.map(n => n.data.label).join(' → ')}`);

    let finalOutput: any = null;

    // forEachノードのループボディに含まれるノードIDを収集（重複実行を防ぐ）
    const loopBodyNodeIds = new Set<string>();

    // 各ノードを順番に実行
    for (const node of executableNodes) {
      // ループボディとして既に実行されたノードはスキップ
      if (loopBodyNodeIds.has(node.id)) {
        context.logs.push(`[Skip] ${node.data.label}: ループボディとして既に実行済み`);
        continue;
      }

      // 複数のタイプ候補をチェック（data.type, type, category順）
      const typeVariants = [
        node.data.type,
        node.type,
        node.data.category,
      ].filter(Boolean);

      let executor: NodeExecutor = defaultExecutor;
      let matchedType = 'default';

      for (const t of typeVariants) {
        if (executorMap[t]) {
          executor = executorMap[t];
          matchedType = t;
          break;
        }
      }

      // デバッグ用: どのタイプでマッチしたかログ出力
      if (matchedType === 'default') {
        context.logs.push(`[DEBUG] ${node.data.label}: タイプ ${typeVariants.join('/')} はマッピングなし、パススルー`);
      }

      // 入力を収集
      const inputs = collectNodeInputs(node, edges, context.nodeOutputs, nodes);

      // ノード実行開始時刻を記録
      const nodeStartTime = Date.now();

      // ノードを実行
      const result = await executor.execute(node, inputs, context);

      // ノード実行時間
      const nodeExecutionTime = Date.now() - nodeStartTime;

      if (!result.success) {
        context.logs.push(`[ERROR] ${node.data.label}: ${result.error}`);
        // エラーログを記録
        context.nodeExecutionLogs.push({
          nodeId: node.id,
          nodeName: node.data.label,
          nodeType: node.data.type || node.type || 'unknown',
          inputs,
          output: null,
          executionTime: nodeExecutionTime,
          status: 'error',
          error: result.error,
          timestamp: Date.now(),
        });
        return {
          success: false,
          output: null,
          executionTime: Date.now() - startTime,
          logs: context.logs,
          error: result.error,
          nodeExecutionLogs: context.nodeExecutionLogs,
        };
      }

      // 出力を保存
      context.nodeOutputs.set(node.id, result.output);
      finalOutput = result.output;

      // forEachノードの場合、ループ処理を実行
      if (result.output && result.output.isForEachNode && !result.output.complete) {
        const { items, variableName, indexName } = result.output;

        // ループボディのノードを特定
        const { bodyNodes } = getLoopBodyNodes(node, nodes, edges);

        if (bodyNodes.length > 0) {
          // ループボディを実行
          const loopResult = await executeLoopBody(
            node,
            items,
            variableName,
            indexName,
            nodes,
            edges,
            context,
            executorMap
          );

          if (!loopResult.success) {
            context.logs.push(`[ForEach] ${node.data.label}: ループ処理でエラー`);
            return {
              success: false,
              output: null,
              executionTime: Date.now() - startTime,
              logs: context.logs,
              error: loopResult.error,
              nodeExecutionLogs: context.nodeExecutionLogs,
            };
          }

          // ループ結果を出力に設定
          const loopOutput = {
            items,
            results: loopResult.results,
            isForEachNode: true,
            complete: true,
          };
          context.nodeOutputs.set(node.id, loopOutput);
          finalOutput = loopOutput;

          // ループボディのノードを実行済みとしてマーク（後続の通常実行でスキップするため）
          bodyNodes.forEach(bodyNode => {
            loopBodyNodeIds.add(bodyNode.id);
            if (!context.nodeOutputs.has(bodyNode.id)) {
              // 最後のイテレーションの出力を設定
              context.nodeOutputs.set(bodyNode.id, loopResult.results[loopResult.results.length - 1]);
            }
          });

          // forEachノードの成功ログを記録
          context.nodeExecutionLogs.push({
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: 'forEach',
            inputs,
            output: loopOutput,
            executionTime: Date.now() - nodeStartTime,
            status: 'success',
            timestamp: Date.now(),
          });

          // ループボディのノードはスキップ（既に実行済み）
          continue;
        }
      }

      // Human Review で待機が必要な場合
      if (result.pendingReview && context.pendingReview) {
        context.logs.push(`=== 実行一時停止: 確認待ち ===`);
        // ノードの humanReview 設定から timeoutSeconds を取得
        const nodeHumanReview = node.data.humanReview;
        // 確認待ちログを記録
        context.nodeExecutionLogs.push({
          nodeId: node.id,
          nodeName: node.data.label,
          nodeType: node.data.type || node.type || 'unknown',
          inputs,
          output: result.output,
          executionTime: nodeExecutionTime,
          status: 'pending_review',
          timestamp: Date.now(),
        });
        return {
          success: true,
          output: finalOutput,
          executionTime: Date.now() - startTime,
          logs: context.logs,
          pendingReview: {
            ...context.pendingReview,
            timeoutSeconds: nodeHumanReview?.timeoutSeconds,
          },
          nodeOutputs: Object.fromEntries(context.nodeOutputs),
          nodeExecutionLogs: context.nodeExecutionLogs,
        };
      }

      // 成功ログを記録
      context.nodeExecutionLogs.push({
        nodeId: node.id,
        nodeName: node.data.label,
        nodeType: node.data.type || node.type || 'unknown',
        inputs,
        output: result.output,
        executionTime: nodeExecutionTime,
        status: 'success',
        timestamp: Date.now(),
      });
    }

    context.logs.push(`=== 実行完了 ===`);

    return {
      success: true,
      output: finalOutput,
      executionTime: Date.now() - startTime,
      logs: context.logs,
      nodeExecutionLogs: context.nodeExecutionLogs,
    };
  } catch (error) {
    context.logs.push(`[FATAL ERROR] ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      output: null,
      executionTime: Date.now() - startTime,
      logs: context.logs,
      error: error instanceof Error ? error.message : 'Unknown error',
      nodeExecutionLogs: context.nodeExecutionLogs,
    };
  }
}

// 特定のノードからフロー実行を継続（Human Review後の継続用）
export async function executeFlowFromNode(
  nodes: FlowNode[],
  edges: FlowEdge[],
  startNodeId: string,
  startNodeOutput: any,
  previousOutputs: Record<string, any>,
  sessionId?: string,
  previousNodeExecutionLogs: NodeExecutionLog[] = []
): Promise<ExecutionResult> {
  const startTime = Date.now();

  const context: ExecutionContext = {
    sessionId: sessionId || `session_${Date.now()}`,
    input: startNodeOutput,
    nodeOutputs: new Map(Object.entries(previousOutputs)),
    logs: [],
    memory: new Map(),
    nodeExecutionLogs: [...previousNodeExecutionLogs], // 以前のログを引き継ぐ
  };

  // 開始ノードの出力を設定
  context.nodeOutputs.set(startNodeId, startNodeOutput);

  context.logs.push(`=== Human Review後の継続実行 ===`);
  context.logs.push(`開始ノード: ${startNodeId}`);
  if (previousNodeExecutionLogs.length > 0) {
    context.logs.push(`引き継いだ実行ログ: ${previousNodeExecutionLogs.length}件`);
  }

  try {
    // トポロジカルソート
    const sortedNodes = topologicalSort(nodes, edges);

    // 開始ノードの位置を見つける
    const startIndex = sortedNodes.findIndex(n => n.id === startNodeId);
    if (startIndex === -1) {
      return {
        success: false,
        output: null,
        executionTime: Date.now() - startTime,
        logs: [...context.logs, `[ERROR] 開始ノード ${startNodeId} が見つかりません`],
        error: `Start node ${startNodeId} not found`,
      };
    }

    // 開始ノードの次から実行
    const remainingNodes = sortedNodes.slice(startIndex + 1);
    context.logs.push(`残りノード数: ${remainingNodes.length}`);

    let finalOutput: any = startNodeOutput;

    for (const node of remainingNodes) {
      const typeVariants = [
        node.data.type,
        node.type,
        node.data.category,
      ].filter(Boolean);

      let executor: NodeExecutor = defaultExecutor;

      for (const t of typeVariants) {
        if (executorMap[t]) {
          executor = executorMap[t];
          break;
        }
      }

      // 入力を収集
      const inputs = collectNodeInputs(node, edges, context.nodeOutputs, nodes);

      // ノード実行開始時刻を記録
      const nodeStartTime = Date.now();

      // ノードを実行
      const result = await executor.execute(node, inputs, context);

      // ノード実行時間
      const nodeExecutionTime = Date.now() - nodeStartTime;

      if (!result.success) {
        context.logs.push(`[ERROR] ${node.data.label}: ${result.error}`);
        // エラーログを記録
        context.nodeExecutionLogs.push({
          nodeId: node.id,
          nodeName: node.data.label,
          nodeType: node.data.type || node.type || 'unknown',
          inputs,
          output: null,
          executionTime: nodeExecutionTime,
          status: 'error',
          error: result.error,
          timestamp: Date.now(),
        });
        return {
          success: false,
          output: null,
          executionTime: Date.now() - startTime,
          logs: context.logs,
          error: result.error,
          nodeExecutionLogs: context.nodeExecutionLogs,
        };
      }

      // 出力を保存
      context.nodeOutputs.set(node.id, result.output);
      finalOutput = result.output;

      // Human Review で待機が必要な場合
      if (result.pendingReview && context.pendingReview) {
        context.logs.push(`=== 実行一時停止: 確認待ち ===`);
        // 確認待ちログを記録
        context.nodeExecutionLogs.push({
          nodeId: node.id,
          nodeName: node.data.label,
          nodeType: node.data.type || node.type || 'unknown',
          inputs,
          output: result.output,
          executionTime: nodeExecutionTime,
          status: 'pending_review',
          timestamp: Date.now(),
        });
        return {
          success: true,
          output: finalOutput,
          executionTime: Date.now() - startTime,
          logs: context.logs,
          pendingReview: context.pendingReview,
          nodeOutputs: Object.fromEntries(context.nodeOutputs),
          nodeExecutionLogs: context.nodeExecutionLogs,
        };
      }

      // 成功ログを記録
      context.nodeExecutionLogs.push({
        nodeId: node.id,
        nodeName: node.data.label,
        nodeType: node.data.type || node.type || 'unknown',
        inputs,
        output: result.output,
        executionTime: nodeExecutionTime,
        status: 'success',
        timestamp: Date.now(),
      });
    }

    context.logs.push(`=== 継続実行完了 ===`);

    return {
      success: true,
      output: finalOutput,
      executionTime: Date.now() - startTime,
      logs: context.logs,
      nodeExecutionLogs: context.nodeExecutionLogs,
    };
  } catch (error) {
    context.logs.push(`[FATAL ERROR] ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      output: null,
      executionTime: Date.now() - startTime,
      logs: context.logs,
      error: error instanceof Error ? error.message : 'Unknown error',
      nodeExecutionLogs: context.nodeExecutionLogs,
    };
  }
}

