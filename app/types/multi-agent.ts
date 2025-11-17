// マルチエージェントフローの型定義

import { Node, Edge } from 'reactflow';

// OwlAgentへの参照を持つノード
export interface OwlAgentRefNode {
  id: string;
  agentId: string; // OwlAgent.id
  agentName?: string;
  agentDescription?: string;
  position: { x: number; y: number };
  data?: {
    label: string;
    agentId: string;
    icon?: string;
  };
}

// エージェント間のデータフロー
export interface OwlAgentEdge {
  id: string;
  sourceAgentNodeId: string;
  targetAgentNodeId: string;
  type?: string;
  animated?: boolean;
  style?: React.CSSProperties;
  data?: {
    label?: string;
    dataType?: string;
  };
}

// マルチエージェントフロー
export interface MultiAgentFlow {
  id: string;
  name: string;
  description: string;
  agents: OwlAgentRefNode[];
  edges: OwlAgentEdge[];
  createdAt?: Date;
  updatedAt?: Date;
}

// React Flow用のノードデータ
export interface OwlAgentNodeData {
  agentId: string;
  agentName: string;
  agentDescription?: string;
  icon?: string;
  status?: 'idle' | 'running' | 'success' | 'error';
  isSelected?: boolean;
}

// React Flow用のエッジデータ
export interface OwlAgentEdgeData {
  label?: string;
  dataType?: string;
  description?: string;
}

// エージェント間のメッセージ
export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  content: any;
  timestamp: Date;
  type: 'text' | 'data' | 'command' | 'status';
}

// マルチエージェント実行コンテキスト
export interface MultiAgentExecutionContext {
  flowId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  agents: {
    [agentId: string]: {
      status: 'idle' | 'running' | 'success' | 'error';
      input?: any;
      output?: any;
      error?: string;
      logs?: string[];
    };
  };
  messages: AgentMessage[];
}