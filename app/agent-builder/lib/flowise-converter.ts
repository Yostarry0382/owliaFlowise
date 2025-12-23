/**
 * Agent Builder用 Flowise変換ユーティリティ
 * agent-builderのノードをFlowise形式に変換してLangGraph/Agentflow V2として実行
 */

import { Node, Edge } from 'reactflow';
import { CustomNodeData } from '../components/CustomNode';
import { getNodeDefinition, NodeTypeDefinition } from '../types/node-definitions';

// ============================================
// Flowise ノードタイプマッピング
// ============================================

/**
 * agent-builderのノードタイプからFlowiseのノードタイプへのマッピング
 */
const NODE_TYPE_MAPPING: Record<string, string> = {
  // Chat Models
  azureChatOpenAI: 'azureChatOpenAI',

  // Embeddings
  azureOpenAIEmbeddings: 'azureOpenAIEmbeddings',

  // Vector Stores
  weaviate: 'weaviate',

  // Document Loaders
  pdfLoader: 'pdfFile',
  docxLoader: 'docxFile',
  excelLoader: 'excel',
  pptxLoader: 'pptx',
  csvLoader: 'csvFile',
  jsonLoader: 'jsonFile',
  jsonlLoader: 'jsonlinesFile',
  textLoader: 'textFile',

  // Memory
  redisMemory: 'RedisBackedChatMemory',

  // Agents
  conversationalAgent: 'conversationalAgent',
  conversationalRetrievalAgent: 'conversationalRetrievalAgent',
  openAIAssistant: 'openAIAssistant',
  openAIFunctionAgent: 'openAIFunctionAgent',
  openAIToolAgent: 'openAIToolAgent',
  reactAgentChat: 'mrklAgentChat',
  toolAgent: 'toolAgent',

  // Chains
  llmChain: 'llmChain',
  conversationChain: 'conversationChain',
  retrievalQAChain: 'retrievalQAChain',
  conversationalRetrievalQAChain: 'conversationalRetrievalQAChain',
  apiChainGet: 'apiChain',
  apiChainPost: 'apiChain',
  sqlDatabaseChain: 'sqlDatabaseChain',

  // Tools
  serper: 'serper',
  tavily: 'tavilySearchResults',
  braveSearch: 'braveSearchAPI',
  googleCustomSearch: 'googleCustomSearch',
  webBrowser: 'webBrowser',
  calculator: 'calculator',
  customTool: 'customTool',
  chainTool: 'chainTool',
  retrieverTool: 'retrieverTool',
  requestGet: 'requestsGet',
  requestPost: 'requestsPost',
  readFile: 'readFile',
  writeFile: 'writeFile',

  // OwlAgent Reference
  owlAgentReference: 'chatflowTool',
};

// ============================================
// Flowise ノードデータ構造
// ============================================

interface FlowiseNodeData {
  id: string;
  label: string;
  name: string;
  type: string;
  baseClasses: string[];
  category: string;
  description?: string;
  inputParams?: any[];
  inputAnchors?: any[];
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  outputAnchors?: any[];
}

interface FlowiseNode {
  id: string;
  position: { x: number; y: number };
  type: string;
  data: FlowiseNodeData;
  width?: number;
  height?: number;
}

interface FlowiseEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  type?: string;
}

interface FlowiseFlowData {
  nodes: FlowiseNode[];
  edges: FlowiseEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

// ============================================
// 変換関数
// ============================================

/**
 * agent-builderのノード設定をFlowiseのinputsに変換
 */
function convertConfigToFlowiseInputs(
  nodeType: string,
  config: Record<string, any>
): Record<string, any> {
  const inputs: Record<string, any> = {};

  switch (nodeType) {
    case 'azureChatOpenAI':
      inputs.temperature = config.temperature ?? 0.7;
      inputs.maxTokens = config.maxTokens ?? 2000;
      inputs.topP = config.topP ?? 1;
      inputs.frequencyPenalty = config.frequencyPenalty ?? 0;
      inputs.presencePenalty = config.presencePenalty ?? 0;
      // システムメッセージを含める
      if (config.systemMessage) {
        inputs.systemMessage = config.systemMessage;
      }
      break;

    case 'azureOpenAIEmbeddings':
      inputs.stripNewLines = config.stripNewLines ?? true;
      inputs.batchSize = config.batchSize ?? 512;
      break;

    case 'weaviate':
      inputs.scheme = config.scheme ?? 'http';
      inputs.host = config.host ?? 'localhost:8080';
      inputs.indexName = config.indexName ?? '';
      inputs.textKey = config.textKey ?? 'text';
      inputs.topK = config.topK ?? 4;
      break;

    case 'redisMemory':
      inputs.sessionId = config.sessionId ?? '';
      inputs.memoryKey = config.memoryKey ?? 'chat_history';
      break;

    case 'llmChain':
    case 'conversationChain':
      inputs.prompt = config.promptTemplate ?? '';
      break;

    case 'retrievalQAChain':
    case 'conversationalRetrievalQAChain':
      inputs.returnSourceDocuments = config.returnSourceDocuments ?? true;
      break;

    default:
      // その他のノードはconfigをそのまま使用
      Object.assign(inputs, config);
  }

  return inputs;
}

/**
 * ノードのbaseClassesを取得
 */
function getBaseClasses(nodeType: string): string[] {
  const baseClassesMap: Record<string, string[]> = {
    azureChatOpenAI: ['AzureChatOpenAI', 'BaseChatModel', 'BaseLanguageModel'],
    azureOpenAIEmbeddings: ['AzureOpenAIEmbeddings', 'Embeddings'],
    weaviate: ['Weaviate', 'VectorStore'],
    redisMemory: ['RedisBackedChatMemory', 'BaseChatMemory', 'BaseMemory'],
    conversationalAgent: ['ConversationalAgent', 'Agent'],
    conversationalRetrievalAgent: ['ConversationalRetrievalAgent', 'Agent'],
    openAIAssistant: ['OpenAIAssistant', 'Agent'],
    openAIFunctionAgent: ['OpenAIFunctionAgent', 'Agent'],
    openAIToolAgent: ['OpenAIToolAgent', 'Agent'],
    llmChain: ['LLMChain', 'BaseChain'],
    conversationChain: ['ConversationChain', 'BaseChain'],
    retrievalQAChain: ['RetrievalQAChain', 'BaseChain'],
    conversationalRetrievalQAChain: ['ConversationalRetrievalQAChain', 'BaseChain'],
    serper: ['Serper', 'Tool'],
    tavily: ['TavilySearchResults', 'Tool'],
    calculator: ['Calculator', 'Tool'],
    customTool: ['CustomTool', 'Tool'],
    chainTool: ['ChainTool', 'Tool'],
    retrieverTool: ['RetrieverTool', 'Tool'],
  };

  return baseClassesMap[nodeType] || ['Unknown'];
}

/**
 * agent-builderのノードをFlowiseノードに変換
 */
export function convertNodeToFlowise(node: Node<CustomNodeData>): FlowiseNode {
  const nodeDefinition = getNodeDefinition(node.data.type);
  const flowiseType = NODE_TYPE_MAPPING[node.data.type] || node.data.type;

  const flowiseNode: FlowiseNode = {
    id: node.id,
    position: node.position,
    type: 'customNode',
    data: {
      id: node.id,
      label: node.data.label,
      name: flowiseType,
      type: flowiseType,
      baseClasses: getBaseClasses(node.data.type),
      category: nodeDefinition?.category || 'unknown',
      description: nodeDefinition?.description,
      inputs: convertConfigToFlowiseInputs(node.data.type, node.data.config || {}),
      outputs: {},
      inputAnchors: nodeDefinition?.inputHandles?.map((h) => ({
        label: h.label,
        name: h.id,
        type: h.type,
        optional: !h.multiple,
        list: h.multiple,
      })) || [],
      outputAnchors: nodeDefinition?.outputHandles?.map((h) => ({
        label: h.label,
        name: h.id,
        type: h.type,
      })) || [],
    },
    width: 300,
    height: 150,
  };

  // OwlAgentReference の場合は参照情報を追加
  if (node.data.type === 'owlAgentReference') {
    flowiseNode.data.inputs = flowiseNode.data.inputs || {};
    // 参照先のOwlAgent情報を含める
    if (node.data.agentId) {
      flowiseNode.data.inputs.agentId = node.data.agentId;
    }
    if (node.data.agentName) {
      flowiseNode.data.inputs.agentName = node.data.agentName;
    }
    // configに含まれる追加情報も含める
    if (node.data.config?.agentId) {
      flowiseNode.data.inputs.agentId = node.data.config.agentId;
    }
    if (node.data.config?.agentName) {
      flowiseNode.data.inputs.agentName = node.data.config.agentName;
    }
    if (node.data.config?.inputMapping) {
      flowiseNode.data.inputs.inputMapping = node.data.config.inputMapping;
    }
    if (node.data.config?.outputMapping) {
      flowiseNode.data.inputs.outputMapping = node.data.config.outputMapping;
    }
  }

  // Credential情報を追加（API Keyなど）
  if (node.data.config) {
    const credentials: Record<string, string> = {};

    if (node.data.config.azureApiKey) {
      credentials.azureOpenAIApiKey = node.data.config.azureApiKey;
      flowiseNode.data.inputs = flowiseNode.data.inputs || {};
      flowiseNode.data.inputs.azureOpenAIApiKey = '{{CREDENTIAL}}';
    }

    if (node.data.config.azureEndpoint) {
      flowiseNode.data.inputs = flowiseNode.data.inputs || {};
      flowiseNode.data.inputs.azureOpenAIApiInstanceName = node.data.config.azureEndpoint;
    }

    if (node.data.config.deploymentName) {
      flowiseNode.data.inputs = flowiseNode.data.inputs || {};
      flowiseNode.data.inputs.azureOpenAIApiDeploymentName = node.data.config.deploymentName;
    }

    if (node.data.config.apiVersion) {
      flowiseNode.data.inputs = flowiseNode.data.inputs || {};
      flowiseNode.data.inputs.azureOpenAIApiVersion = node.data.config.apiVersion;
    }

    if (node.data.config.apiKey) {
      credentials.apiKey = node.data.config.apiKey;
    }

    if (node.data.config.redisUrl) {
      flowiseNode.data.inputs = flowiseNode.data.inputs || {};
      flowiseNode.data.inputs.url = node.data.config.redisUrl;
    }
  }

  return flowiseNode;
}

/**
 * agent-builderのエッジをFlowiseエッジに変換
 */
export function convertEdgeToFlowise(edge: Edge): FlowiseEdge {
  return {
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle || 'output',
    target: edge.target,
    targetHandle: edge.targetHandle || 'input',
    type: 'buttonedge',
  };
}

/**
 * OwlAgentの内部フロー情報を展開した形式
 */
interface ExpandedOwlAgentInfo {
  agentId: string;
  agentName: string;
  description?: string;
  flow?: {
    nodes: any[];
    edges: any[];
  };
}

/**
 * agent-builderのフロー全体をFlowise形式に変換
 * @param nodes フローのノード
 * @param edges フローのエッジ
 * @param viewport ビューポート情報
 * @param expandedOwlAgents OwlAgentの展開情報（オプション）
 */
export function convertFlowToFlowise(
  nodes: Node<CustomNodeData>[],
  edges: Edge[],
  viewport?: { x: number; y: number; zoom: number },
  expandedOwlAgents?: Map<string, ExpandedOwlAgentInfo>
): FlowiseFlowData & { expandedOwlAgents?: Record<string, ExpandedOwlAgentInfo> } {
  const flowiseNodes = nodes.map(convertNodeToFlowise);

  // OwlAgentノードに展開情報を追加
  if (expandedOwlAgents && expandedOwlAgents.size > 0) {
    flowiseNodes.forEach((flowiseNode) => {
      if (flowiseNode.data.type === 'chatflowTool' && flowiseNode.data.inputs?.agentId) {
        const agentInfo = expandedOwlAgents.get(flowiseNode.data.inputs.agentId);
        if (agentInfo) {
          flowiseNode.data.inputs.expandedAgent = {
            agentId: agentInfo.agentId,
            agentName: agentInfo.agentName,
            description: agentInfo.description,
            // 内部フローのノード数とエッジ数を表示
            nodeCount: agentInfo.flow?.nodes?.length || 0,
            edgeCount: agentInfo.flow?.edges?.length || 0,
          };
        }
      }
    });
  }

  const result: FlowiseFlowData & { expandedOwlAgents?: Record<string, ExpandedOwlAgentInfo> } = {
    nodes: flowiseNodes,
    edges: edges.map(convertEdgeToFlowise),
    viewport: viewport || { x: 0, y: 0, zoom: 1 },
  };

  // 展開されたOwlAgent情報を別セクションとして追加
  if (expandedOwlAgents && expandedOwlAgents.size > 0) {
    result.expandedOwlAgents = Object.fromEntries(expandedOwlAgents);
  }

  return result;
}

/**
 * フローをJSON文字列としてシリアライズ
 */
export function serializeFlowForFlowise(
  nodes: Node<CustomNodeData>[],
  edges: Edge[],
  viewport?: { x: number; y: number; zoom: number }
): string {
  const flowData = convertFlowToFlowise(nodes, edges, viewport);
  return JSON.stringify(flowData);
}

// ============================================
// バリデーション
// ============================================

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * フローがFlowiseで実行可能かどうかを検証
 */
export function validateFlowForFlowise(
  nodes: Node<CustomNodeData>[],
  edges: Edge[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ノードが存在するか
  if (nodes.length === 0) {
    errors.push('フローにノードがありません');
    return { valid: false, errors, warnings };
  }

  // 必須の接続チェック
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const connectedInputs = new Map<string, Set<string>>();
  const connectedOutputs = new Map<string, Set<string>>();

  for (const edge of edges) {
    // ソースとターゲットが存在するか
    if (!nodeMap.has(edge.source)) {
      errors.push(`エッジのソースノード ${edge.source} が存在しません`);
    }
    if (!nodeMap.has(edge.target)) {
      errors.push(`エッジのターゲットノード ${edge.target} が存在しません`);
    }

    // 接続情報を記録
    if (!connectedInputs.has(edge.target)) {
      connectedInputs.set(edge.target, new Set());
    }
    connectedInputs.get(edge.target)!.add(edge.targetHandle || 'input');

    if (!connectedOutputs.has(edge.source)) {
      connectedOutputs.set(edge.source, new Set());
    }
    connectedOutputs.get(edge.source)!.add(edge.sourceHandle || 'output');
  }

  // 各ノードの必須入力が接続されているかチェック
  for (const node of nodes) {
    const nodeDef = getNodeDefinition(node.data.type);
    if (!nodeDef) continue;

    const nodeInputs = connectedInputs.get(node.id) || new Set();

    for (const inputHandle of nodeDef.inputHandles) {
      if (!inputHandle.multiple && !nodeInputs.has(inputHandle.id)) {
        // Agent/Chainには必須のLLM接続が必要
        if (inputHandle.id === 'chatModel' || inputHandle.id === 'llm') {
          errors.push(`${node.data.label} にはChat Modelの接続が必要です`);
        }
      }
    }

    // 必須設定項目のチェック
    for (const input of nodeDef.inputs) {
      if (input.required && !node.data.config?.[input.name]) {
        warnings.push(`${node.data.label} の ${input.label} が未設定です`);
      }
    }
  }

  // 出力を持つノードが存在するか（最終ノード）
  const hasOutputNode = nodes.some((n) => {
    const outputCount = connectedOutputs.get(n.id)?.size || 0;
    return outputCount === 0 && getNodeDefinition(n.data.type)?.outputHandles?.length === 0;
  });

  if (!hasOutputNode && nodes.length > 1) {
    warnings.push('フローの終端ノードが明確ではありません');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// Flowise API 実行
// ============================================

export interface FlowiseExecutionResult {
  success: boolean;
  output?: any;
  text?: string;
  error?: string;
  sourceDocuments?: any[];
  usedTools?: any[];
  executionTime?: number;
}

/**
 * Flowise APIを使用してフローを実行
 */
export async function executeFlowWithFlowise(
  chatflowId: string,
  question: string,
  sessionId?: string
): Promise<FlowiseExecutionResult> {
  const startTime = Date.now();

  try {
    const response = await fetch('/api/flowise/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatflowId,
        message: question,
        sessionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      output: data,
      text: data.message || data.text || data.answer || JSON.stringify(data),
      sourceDocuments: data.sourceDocuments,
      usedTools: data.usedTools,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * 一時的なChatflowを作成して実行（テスト用）
 */
export async function executeTemporaryFlow(
  nodes: Node<CustomNodeData>[],
  edges: Edge[],
  question: string,
  sessionId?: string
): Promise<FlowiseExecutionResult> {
  const startTime = Date.now();

  try {
    // フローをFlowise形式に変換
    const flowData = serializeFlowForFlowise(nodes, edges);

    // 一時Chatflowを作成
    const createResponse = await fetch('/api/flowise/chatflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `temp-test-${Date.now()}`,
        flowData,
        deployed: true,
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.details || 'Failed to create temporary chatflow');
    }

    const createData = await createResponse.json();
    const chatflowId = createData.chatflow?.id || createData.id;

    if (!chatflowId) {
      throw new Error('Chatflow ID not returned from API');
    }

    try {
      // Chatflowを実行
      const result = await executeFlowWithFlowise(chatflowId, question, sessionId);
      result.executionTime = Date.now() - startTime;
      return result;
    } catch (execError) {
      // Flowise実行エラーを適切に処理
      const errorMessage = execError instanceof Error ? execError.message : 'Unknown error';

      // Flowiseの一般的なエラーを分かりやすいメッセージに変換
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('Ending node must be either a Chain or Agent or Engine')) {
        userFriendlyMessage = 'フローの終端ノードがFlowise形式と互換性がありません。Agent, Chain, または Engine ノードで終了するフローが必要です。現在のフロー構造はOwliaFabrica独自の形式でテスト実行されます。';
      }

      return {
        success: false,
        error: userFriendlyMessage,
        executionTime: Date.now() - startTime,
      };
    } finally {
      // 一時Chatflowを削除
      await fetch(`/api/flowise/chatflows?id=${chatflowId}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: Date.now() - startTime,
    };
  }
}
