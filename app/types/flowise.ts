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