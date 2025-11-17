export interface FlowiseMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  id?: string;
}

export interface FlowisePredictionResponse {
  text?: string;
  question?: string;
  chatId?: string;
  chatMessageId?: string;
  sessionId?: string;
  memoryType?: string;
  sourceDocuments?: Array<{
    pageContent: string;
    metadata: Record<string, any>;
  }>;
}

export interface FlowiseConfig {
  apiUrl: string;
  chatflowId: string;
  apiKey?: string;
}

export interface ChatSession {
  id: string;
  messages: FlowiseMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// Human Review Configuration
export interface HumanReviewConfig {
  enabled: boolean;
  requiresApproval: boolean;
  approvalMessage?: string;
  timeoutSeconds?: number;
  allowEdit?: boolean;
}

// Node configuration with review settings
export interface NodeConfig {
  id: string;
  type: string;
  data: any;
  humanReview?: HumanReviewConfig;
}

// Review status for execution
export interface ReviewStatus {
  nodeId: string;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  reviewedAt?: Date;
  reviewedBy?: string;
  originalOutput?: any;
  editedOutput?: any;
  comments?: string;
}

// Flow definition for saving
export interface FlowDefinition {
  nodes: any[];
  edges: any[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

// OwlAgent (packaged flow) definition
export interface OwlAgent {
  id: string;
  name: string;
  description: string;
  iconStyle: 'default' | 'red' | 'blue' | 'green' | 'purple' | 'orange';
  inputSchema?: any;  // JSON Schema format (initially any)
  outputSchema?: any; // JSON Schema format (initially any)
  version: string;    // e.g., '1.0.0'
  flow: FlowDefinition;
  createdAt?: Date;
  updatedAt?: Date;
  author?: string;
  tags?: string[];
}