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