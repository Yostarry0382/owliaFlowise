// ============================================
// Flowise API Types
// ============================================

export interface FlowiseMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  id?: string;
}

export interface FlowisePredictionResponse {
  text?: string;
  json?: Record<string, any>;
  question?: string;
  chatId?: string;
  chatMessageId?: string;
  sessionId?: string;
  memoryType?: string;
  sourceDocuments?: FlowiseSourceDocument[];
  usedTools?: FlowiseUsedTool[];
  fileAnnotations?: any[];
  agentReasoning?: FlowiseAgentReasoning[];
}

export interface FlowiseSourceDocument {
  pageContent: string;
  metadata: Record<string, any>;
}

export interface FlowiseUsedTool {
  tool: string;
  toolInput: Record<string, any>;
  toolOutput: string;
}

export interface FlowiseAgentReasoning {
  agentName?: string;
  messages?: string[];
  next?: string;
  instructions?: string;
  usedTools?: FlowiseUsedTool[];
  sourceDocuments?: FlowiseSourceDocument[];
}

export interface FlowiseConfig {
  apiUrl: string;
  chatflowId: string;
  apiKey?: string;
}

export interface FlowiseExecutionOptions {
  sessionId?: string;
  overrideConfig?: FlowiseOverrideConfig;
  history?: FlowiseMessage[];
  uploads?: FlowiseUpload[];
  humanInput?: FlowiseHumanInput;
}

export interface FlowiseOverrideConfig {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  modelName?: string;
  systemMessage?: string;
  [key: string]: any;
}

export interface FlowiseUpload {
  data: string;  // base64 encoded
  type: string;  // MIME type
  name: string;
  mime: string;
}

export interface FlowiseHumanInput {
  action: 'approve' | 'reject' | 'edit';
  editedOutput?: string;
  feedback?: string;
}

// ============================================
// Flowise Chatflow Types
// ============================================

export interface FlowiseChatflow {
  id: string;
  name: string;
  flowData: string;  // JSON stringified flow data
  deployed?: boolean;
  isPublic?: boolean;
  apikeyid?: string;
  chatbotConfig?: string;
  apiConfig?: string;
  analytic?: string;
  speechToText?: string;
  category?: string;
  type?: 'CHATFLOW' | 'MULTIAGENT';
  createdDate: string;
  updatedDate: string;
}

export interface FlowiseChatflowCreate {
  name: string;
  flowData: string;
  deployed?: boolean;
  isPublic?: boolean;
  apikeyid?: string;
  chatbotConfig?: string;
  category?: string;
  type?: 'CHATFLOW' | 'MULTIAGENT';
}

export interface FlowiseNode {
  id: string;
  position: { x: number; y: number };
  type: string;
  data: {
    id: string;
    label: string;
    name: string;
    type: string;
    baseClasses: string[];
    category: string;
    description?: string;
    inputParams?: FlowiseInputParam[];
    inputAnchors?: FlowiseInputAnchor[];
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
    outputAnchors?: FlowiseOutputAnchor[];
  };
  width?: number;
  height?: number;
  selected?: boolean;
  positionAbsolute?: { x: number; y: number };
  dragging?: boolean;
}

export interface FlowiseInputParam {
  label: string;
  name: string;
  type: string;
  default?: any;
  optional?: boolean;
  placeholder?: string;
  description?: string;
  options?: { label: string; name: string }[];
}

export interface FlowiseInputAnchor {
  label: string;
  name: string;
  type: string;
  optional?: boolean;
  list?: boolean;
}

export interface FlowiseOutputAnchor {
  label: string;
  name: string;
  type: string;
}

export interface FlowiseEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  type?: string;
  data?: {
    label?: string;
  };
}

export interface FlowiseFlowData {
  nodes: FlowiseNode[];
  edges: FlowiseEdge[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

// ============================================
// Chat Session Types
// ============================================

export interface ChatSession {
  id: string;
  messages: FlowiseMessage[];
  chatflowId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Human Review Configuration (OwliaFabrica specific)
// ============================================

export interface HumanReviewConfig {
  enabled: boolean;
  requiresApproval: boolean;
  approvalMessage?: string;
  timeoutSeconds?: number;
  allowEdit?: boolean;
}

export interface NodeConfig {
  id: string;
  type: string;
  data: any;
  humanReview?: HumanReviewConfig;
}

export interface ReviewStatus {
  nodeId: string;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  reviewedAt?: Date;
  reviewedBy?: string;
  originalOutput?: any;
  editedOutput?: any;
  comments?: string;
}

// ============================================
// OwliaFabrica Flow Definition
// ============================================

/**
 * OwlAgentノード - フロー内で他のOwlAgentを参照するノード
 * 単一エージェントも複数エージェントの組み合わせも、最終的には1つのOwlAgentとして扱う
 */
export interface OwlAgentNode {
  id: string;
  type: 'owlAgent';
  position: { x: number; y: number };
  data: {
    label: string;
    agentId: string;  // 参照するOwlAgentのID
    agentName?: string;
    agentDescription?: string;
    icon?: string;
    // 実行時の設定
    inputMapping?: Record<string, string>;  // 入力のマッピング
    outputMapping?: Record<string, string>; // 出力のマッピング
  };
}

/**
 * フロー内のノード - 通常のノードまたはOwlAgentノード
 */
export type FlowNode = OwlAgentNode | {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
};

/**
 * フロー内のエッジ
 */
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: {
    label?: string;
  };
}

export interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

// ============================================
// OwlAgent Types
// ============================================

export interface OwlAgent {
  id: string;
  name: string;
  description: string;
  iconStyle: 'default' | 'red' | 'blue' | 'green' | 'purple' | 'orange';
  inputSchema?: any;
  outputSchema?: any;
  version: string;
  flow: FlowDefinition;
  // Flowise連携用
  flowiseChatflowId?: string;  // 連携しているFlowiseのchatflow ID
  createdAt?: Date;
  updatedAt?: Date;
  author?: string;
  tags?: string[];
}

// ============================================
// OwlAgent with Flowise Integration
// ============================================

export interface OwlAgentWithFlowise extends OwlAgent {
  flowiseChatflowId: string;
  flowiseDeployed: boolean;
  lastSyncedAt?: Date;
}

// ============================================
// Execution Types
// ============================================

// ノード実行ログ（入出力を記録）
export interface NodeExecutionLog {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  inputs: Record<string, any>;
  output: any;
  executionTime: number;
  status: 'success' | 'error' | 'pending_review' | 'skipped';
  error?: string;
  timestamp: number;
}

export interface ExecutionResult {
  success: boolean;
  output: any;
  executionTime: number;
  logs: string[];
  error?: string;
  flowiseResponse?: FlowisePredictionResponse;
  pendingReview?: {
    nodeId: string;
    output: any;
    message: string;
    allowEdit: boolean;
    timeoutSeconds?: number;
  };
  // Human Review継続用：実行途中のノード出力を保持
  nodeOutputs?: Record<string, any>;
  // ノード実行ログ（入出力の可視化用）
  nodeExecutionLogs?: NodeExecutionLog[];
}

export interface ExecutionContext {
  flowId: string;
  executionId: string;
  sessionId: string;
  input: any;
  chatflowId?: string;
  startTime: number;
}
