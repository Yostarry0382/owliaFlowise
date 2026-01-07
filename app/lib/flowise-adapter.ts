/**
 * Flowise Adapter
 * React Flow形式とFlowise形式の間でフローデータを変換するアダプター
 *
 * 設計方針:
 * - ノードタイプはFlowiseの既存ノードをそのまま使用
 * - data.configにFlowiseのdataをそのまま保持
 * - React Flowは見せ方（キャンバスUI）だけを担当
 */

import type { Node, Edge } from 'reactflow';
import type {
  FlowiseNode,
  FlowiseEdge,
  FlowiseFlowData,
  FlowiseInputParam,
  FlowiseInputAnchor,
  FlowiseOutputAnchor,
} from '@/app/types/flowise';

// ============================================
// React Flow用の型定義
// ============================================

/**
 * React Flow用のノードデータ
 * Flowiseのノード設定をconfigとして保持
 */
export interface ReactFlowNodeData {
  label: string;
  name: string;
  type: string;
  category: string;
  description?: string;
  baseClasses: string[];
  // Flowiseノードの設定をそのまま保持
  config: {
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
    inputParams?: FlowiseInputParam[];
    inputAnchors?: FlowiseInputAnchor[];
    outputAnchors?: FlowiseOutputAnchor[];
    [key: string]: any;
  };
}

/**
 * React Flow用のノード型
 */
export type ReactFlowNode = Node<ReactFlowNodeData>;

/**
 * React Flow用のエッジ型
 */
export type ReactFlowEdge = Edge<{ label?: string }>;

// ============================================
// Flowise → React Flow 変換
// ============================================

/**
 * FlowiseのflowDataをReact Flow形式に変換
 */
export function fromFlowiseFlowData(flowData: FlowiseFlowData | string): {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  viewport?: { x: number; y: number; zoom: number };
} {
  // JSON文字列の場合はパース
  const parsed = typeof flowData === 'string' ? JSON.parse(flowData) : flowData;

  const nodes: ReactFlowNode[] = (parsed.nodes || []).map((node: FlowiseNode) =>
    convertFlowiseNodeToReactFlow(node)
  );

  const edges: ReactFlowEdge[] = (parsed.edges || []).map((edge: FlowiseEdge) =>
    convertFlowiseEdgeToReactFlow(edge)
  );

  return {
    nodes,
    edges,
    viewport: parsed.viewport,
  };
}

/**
 * 単一のFlowiseノードをReact Flowノードに変換
 */
export function convertFlowiseNodeToReactFlow(node: FlowiseNode): ReactFlowNode {
  const { data } = node;

  return {
    id: node.id,
    type: node.type, // Flowiseのノードタイプをそのまま使用
    position: node.position,
    data: {
      label: data.label || data.name || node.type,
      name: data.name || node.type,
      type: data.type || node.type,
      category: data.category || 'unknown',
      description: data.description,
      baseClasses: data.baseClasses || [],
      config: {
        inputs: data.inputs || {},
        outputs: data.outputs || {},
        inputParams: data.inputParams || [],
        inputAnchors: data.inputAnchors || [],
        outputAnchors: data.outputAnchors || [],
        // その他の設定もすべて保持
        ...Object.fromEntries(
          Object.entries(data).filter(
            ([key]) =>
              ![
                'id',
                'label',
                'name',
                'type',
                'category',
                'description',
                'baseClasses',
                'inputs',
                'outputs',
                'inputParams',
                'inputAnchors',
                'outputAnchors',
              ].includes(key)
          )
        ),
      },
    },
    width: node.width,
    height: node.height,
    selected: node.selected,
    dragging: node.dragging,
  };
}

/**
 * 単一のFlowiseエッジをReact Flowエッジに変換
 */
export function convertFlowiseEdgeToReactFlow(edge: FlowiseEdge): ReactFlowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: edge.type || 'default',
    data: edge.data,
  };
}

// ============================================
// React Flow → Flowise 変換
// ============================================

/**
 * React Flow形式をFlowiseのflowDataに変換
 */
export function toFlowiseFlowData(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[],
  viewport?: { x: number; y: number; zoom: number }
): FlowiseFlowData {
  return {
    nodes: nodes.map(convertReactFlowNodeToFlowise),
    edges: edges.map(convertReactFlowEdgeToFlowise),
    viewport: viewport || { x: 0, y: 0, zoom: 1 },
  };
}

/**
 * 単一のReact FlowノードをFlowiseノードに変換
 */
export function convertReactFlowNodeToFlowise(node: ReactFlowNode): FlowiseNode {
  const { data } = node;

  return {
    id: node.id,
    type: node.type || 'customNode',
    position: node.position,
    data: {
      id: node.id,
      label: data.label,
      name: data.name,
      type: data.type,
      category: data.category,
      description: data.description,
      baseClasses: data.baseClasses,
      inputs: data.config.inputs,
      outputs: data.config.outputs,
      inputParams: data.config.inputParams,
      inputAnchors: data.config.inputAnchors,
      outputAnchors: data.config.outputAnchors,
      // configから追加のプロパティを展開
      ...Object.fromEntries(
        Object.entries(data.config).filter(
          ([key]) =>
            ![
              'inputs',
              'outputs',
              'inputParams',
              'inputAnchors',
              'outputAnchors',
            ].includes(key)
        )
      ),
    },
    width: node.width === null ? undefined : node.width,
    height: node.height === null ? undefined : node.height,
  };
}

/**
 * 単一のReact FlowエッジをFlowiseエッジに変換
 */
export function convertReactFlowEdgeToFlowise(edge: ReactFlowEdge): FlowiseEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || '',
    targetHandle: edge.targetHandle || '',
    type: edge.type,
    data: edge.data,
  };
}

// ============================================
// シリアライズ / デシリアライズ
// ============================================

/**
 * フローをFlowiseに保存できるJSON文字列にシリアライズ
 */
export function serializeFlowForFlowise(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[],
  viewport?: { x: number; y: number; zoom: number }
): string {
  const flowData = toFlowiseFlowData(nodes, edges, viewport);
  return JSON.stringify(flowData);
}

/**
 * FlowiseのflowData文字列をパースしてReact Flow形式に変換
 */
export function parseFlowFromFlowise(flowDataString: string): {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  viewport?: { x: number; y: number; zoom: number };
} {
  return fromFlowiseFlowData(flowDataString);
}

// ============================================
// バリデーション
// ============================================

/**
 * フローがFlowiseで実行可能かどうかを検証
 */
export function validateFlowForFlowise(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // ノードが存在するか
  if (nodes.length === 0) {
    errors.push('フローにノードがありません');
  }

  // エッジの接続先が有効か
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`エッジ ${edge.id} のソースノード ${edge.source} が存在しません`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`エッジ ${edge.id} のターゲットノード ${edge.target} が存在しません`);
    }
  }

  // 孤立したノードがないか（警告レベル）
  const connectedNodes = new Set<string>();
  for (const edge of edges) {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  }

  // スタートノードがあるか（AgentflowV2の場合）
  const hasStartNode = nodes.some(
    (n) => n.type === 'start' || n.data.type === 'start'
  );
  const hasAgentflowNodes = nodes.some((n) =>
    [
      'llmNode',
      'agentNode',
      'toolNode',
      'conditionNode',
      'conditionAgentNode',
      'iterationNode',
      'loopNode',
      'humanInputNode',
      'directReplyNode',
      'executeFlowNode',
      'httpNode',
      'customFunctionNode',
      'retrieverNode',
    ].includes(n.type || '')
  );

  if (hasAgentflowNodes && !hasStartNode) {
    errors.push(
      'Agentflow V2ノードを使用する場合、Startノードが必要です'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// ノード情報取得ユーティリティ
// ============================================

/**
 * ノードの入力ハンドル（接続ポイント）を取得
 */
export function getNodeInputHandles(node: ReactFlowNode): FlowiseInputAnchor[] {
  return node.data.config.inputAnchors || [];
}

/**
 * ノードの出力ハンドル（接続ポイント）を取得
 */
export function getNodeOutputHandles(node: ReactFlowNode): FlowiseOutputAnchor[] {
  return node.data.config.outputAnchors || [];
}

/**
 * ノードの入力パラメータ（設定項目）を取得
 */
export function getNodeInputParams(node: ReactFlowNode): FlowiseInputParam[] {
  return node.data.config.inputParams || [];
}

/**
 * ノードの入力値を取得
 */
export function getNodeInputs(node: ReactFlowNode): Record<string, any> {
  return node.data.config.inputs || {};
}

/**
 * ノードの入力値を更新
 */
export function updateNodeInputs(
  node: ReactFlowNode,
  inputs: Record<string, any>
): ReactFlowNode {
  return {
    ...node,
    data: {
      ...node.data,
      config: {
        ...node.data.config,
        inputs: {
          ...node.data.config.inputs,
          ...inputs,
        },
      },
    },
  };
}

// ============================================
// Flowise ノードカテゴリ定義
// ============================================

export const FLOWISE_NODE_CATEGORIES = {
  CHAT_MODELS: 'Chat Models',
  EMBEDDINGS: 'Embeddings',
  VECTOR_STORES: 'Vector Stores',
  DOCUMENT_LOADERS: 'Document Loaders',
  TEXT_SPLITTERS: 'Text Splitters',
  MEMORY: 'Memory',
  AGENTS: 'Agents',
  CHAINS: 'Chains',
  TOOLS: 'Tools',
  RETRIEVERS: 'Retrievers',
  OUTPUT_PARSERS: 'Output Parsers',
  UTILITIES: 'Utilities',
  AGENTFLOW: 'Agentflow',
} as const;

/**
 * 主要なFlowiseノードタイプのマッピング
 */
export const FLOWISE_NODE_TYPES = {
  // Chat Models
  chatOpenAI: { name: 'ChatOpenAI', category: FLOWISE_NODE_CATEGORIES.CHAT_MODELS },
  chatAnthropic: { name: 'ChatAnthropic', category: FLOWISE_NODE_CATEGORIES.CHAT_MODELS },
  chatGoogleGenerativeAI: { name: 'ChatGoogleGenerativeAI', category: FLOWISE_NODE_CATEGORIES.CHAT_MODELS },
  chatMistralAI: { name: 'ChatMistralAI', category: FLOWISE_NODE_CATEGORIES.CHAT_MODELS },
  chatOllama: { name: 'ChatOllama', category: FLOWISE_NODE_CATEGORIES.CHAT_MODELS },
  awsChatBedrock: { name: 'AWS ChatBedrock', category: FLOWISE_NODE_CATEGORIES.CHAT_MODELS },

  // Embeddings
  openAIEmbeddings: { name: 'OpenAI Embeddings', category: FLOWISE_NODE_CATEGORIES.EMBEDDINGS },
  cohereEmbeddings: { name: 'Cohere Embeddings', category: FLOWISE_NODE_CATEGORIES.EMBEDDINGS },
  ollamaEmbeddings: { name: 'Ollama Embeddings', category: FLOWISE_NODE_CATEGORIES.EMBEDDINGS },

  // Vector Stores
  pinecone: { name: 'Pinecone', category: FLOWISE_NODE_CATEGORIES.VECTOR_STORES },
  chroma: { name: 'Chroma', category: FLOWISE_NODE_CATEGORIES.VECTOR_STORES },
  qdrant: { name: 'Qdrant', category: FLOWISE_NODE_CATEGORIES.VECTOR_STORES },
  faiss: { name: 'Faiss', category: FLOWISE_NODE_CATEGORIES.VECTOR_STORES },
  inMemoryVectorStore: { name: 'In-Memory Vector Store', category: FLOWISE_NODE_CATEGORIES.VECTOR_STORES },
  supabase: { name: 'Supabase', category: FLOWISE_NODE_CATEGORIES.VECTOR_STORES },
  postgres: { name: 'Postgres', category: FLOWISE_NODE_CATEGORIES.VECTOR_STORES },

  // Document Loaders
  pdfLoader: { name: 'PDF Loader', category: FLOWISE_NODE_CATEGORIES.DOCUMENT_LOADERS },
  docxLoader: { name: 'DOCX Loader', category: FLOWISE_NODE_CATEGORIES.DOCUMENT_LOADERS },
  csvLoader: { name: 'CSV Loader', category: FLOWISE_NODE_CATEGORIES.DOCUMENT_LOADERS },
  jsonLoader: { name: 'JSON Loader', category: FLOWISE_NODE_CATEGORIES.DOCUMENT_LOADERS },
  cheerioWebScraper: { name: 'Cheerio Web Scraper', category: FLOWISE_NODE_CATEGORIES.DOCUMENT_LOADERS },
  playwrightWebScraper: { name: 'Playwright Web Scraper', category: FLOWISE_NODE_CATEGORIES.DOCUMENT_LOADERS },

  // Text Splitters
  recursiveCharacterTextSplitter: { name: 'Recursive Character Text Splitter', category: FLOWISE_NODE_CATEGORIES.TEXT_SPLITTERS },
  characterTextSplitter: { name: 'Character Text Splitter', category: FLOWISE_NODE_CATEGORIES.TEXT_SPLITTERS },
  tokenTextSplitter: { name: 'Token Text Splitter', category: FLOWISE_NODE_CATEGORIES.TEXT_SPLITTERS },
  markdownTextSplitter: { name: 'Markdown Text Splitter', category: FLOWISE_NODE_CATEGORIES.TEXT_SPLITTERS },

  // Memory
  bufferMemory: { name: 'Buffer Memory', category: FLOWISE_NODE_CATEGORIES.MEMORY },
  bufferWindowMemory: { name: 'Buffer Window Memory', category: FLOWISE_NODE_CATEGORIES.MEMORY },
  conversationSummaryMemory: { name: 'Conversation Summary Memory', category: FLOWISE_NODE_CATEGORIES.MEMORY },
  redisBackedChatMemory: { name: 'Redis-Backed Chat Memory', category: FLOWISE_NODE_CATEGORIES.MEMORY },

  // Agents
  openAIAssistant: { name: 'OpenAI Assistant', category: FLOWISE_NODE_CATEGORIES.AGENTS },
  openAIFunctionAgent: { name: 'OpenAI Function Agent', category: FLOWISE_NODE_CATEGORIES.AGENTS },
  openAIToolAgent: { name: 'OpenAI Tool Agent', category: FLOWISE_NODE_CATEGORIES.AGENTS },
  reactAgentChat: { name: 'ReAct Agent Chat', category: FLOWISE_NODE_CATEGORIES.AGENTS },
  conversationalAgent: { name: 'Conversational Agent', category: FLOWISE_NODE_CATEGORIES.AGENTS },
  toolAgent: { name: 'Tool Agent', category: FLOWISE_NODE_CATEGORIES.AGENTS },

  // Tools
  calculator: { name: 'Calculator', category: FLOWISE_NODE_CATEGORIES.TOOLS },
  customTool: { name: 'Custom Tool', category: FLOWISE_NODE_CATEGORIES.TOOLS },
  chatflowTool: { name: 'Chatflow Tool', category: FLOWISE_NODE_CATEGORIES.TOOLS },

  // Retrievers
  vectorStoreRetriever: { name: 'Vector Store Retriever', category: FLOWISE_NODE_CATEGORIES.RETRIEVERS },
  multiQueryRetriever: { name: 'Multi Query Retriever', category: FLOWISE_NODE_CATEGORIES.RETRIEVERS },
  cohereRerankRetriever: { name: 'Cohere Rerank Retriever', category: FLOWISE_NODE_CATEGORIES.RETRIEVERS },

  // Output Parsers
  structuredOutputParser: { name: 'Structured Output Parser', category: FLOWISE_NODE_CATEGORIES.OUTPUT_PARSERS },
  csvOutputParser: { name: 'CSV Output Parser', category: FLOWISE_NODE_CATEGORIES.OUTPUT_PARSERS },

  // Agentflow V2
  start: { name: 'Start', category: FLOWISE_NODE_CATEGORIES.AGENTFLOW },
  llmNode: { name: 'LLM Node', category: FLOWISE_NODE_CATEGORIES.AGENTFLOW },
  agentNode: { name: 'Agent Node', category: FLOWISE_NODE_CATEGORIES.AGENTFLOW },
  toolNode: { name: 'Tool Node', category: FLOWISE_NODE_CATEGORIES.AGENTFLOW },
  conditionNode: { name: 'Condition Node', category: FLOWISE_NODE_CATEGORIES.AGENTFLOW },
  conditionAgentNode: { name: 'Condition Agent Node', category: FLOWISE_NODE_CATEGORIES.AGENTFLOW },
  iterationNode: { name: 'Iteration Node', category: FLOWISE_NODE_CATEGORIES.AGENTFLOW },
  loopNode: { name: 'Loop Node', category: FLOWISE_NODE_CATEGORIES.AGENTFLOW },
  humanInputNode: { name: 'Human Input Node', category: FLOWISE_NODE_CATEGORIES.AGENTFLOW },
  directReplyNode: { name: 'Direct Reply Node', category: FLOWISE_NODE_CATEGORIES.AGENTFLOW },
  executeFlowNode: { name: 'Execute Flow Node', category: FLOWISE_NODE_CATEGORIES.AGENTFLOW },
  httpNode: { name: 'HTTP Node', category: FLOWISE_NODE_CATEGORIES.AGENTFLOW },
  customFunctionNode: { name: 'Custom Function Node', category: FLOWISE_NODE_CATEGORIES.AGENTFLOW },
  retrieverNode: { name: 'Retriever Node', category: FLOWISE_NODE_CATEGORIES.AGENTFLOW },

  // Utilities
  stickyNote: { name: 'Sticky Note', category: FLOWISE_NODE_CATEGORIES.UTILITIES },
  setVariable: { name: 'Set Variable', category: FLOWISE_NODE_CATEGORIES.UTILITIES },
  getVariable: { name: 'Get Variable', category: FLOWISE_NODE_CATEGORIES.UTILITIES },
  ifElse: { name: 'If Else', category: FLOWISE_NODE_CATEGORIES.UTILITIES },
  customJsFunction: { name: 'Custom JS Function', category: FLOWISE_NODE_CATEGORIES.UTILITIES },
} as const;

/**
 * ノードタイプからカテゴリを取得
 */
export function getNodeCategory(nodeType: string): string {
  const nodeInfo = FLOWISE_NODE_TYPES[nodeType as keyof typeof FLOWISE_NODE_TYPES];
  return nodeInfo?.category || 'Unknown';
}

/**
 * ノードタイプから表示名を取得
 */
export function getNodeDisplayName(nodeType: string): string {
  const nodeInfo = FLOWISE_NODE_TYPES[nodeType as keyof typeof FLOWISE_NODE_TYPES];
  return nodeInfo?.name || nodeType;
}
