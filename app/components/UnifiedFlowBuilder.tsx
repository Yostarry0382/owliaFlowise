'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Panel,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Snackbar,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChatIcon from '@mui/icons-material/Chat';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import HomeIcon from '@mui/icons-material/Home';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import CodeIcon from '@mui/icons-material/Code';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import DataObjectIcon from '@mui/icons-material/DataObject';
import LinkIcon from '@mui/icons-material/Link';
import PsychologyIcon from '@mui/icons-material/Psychology';
import DescriptionIcon from '@mui/icons-material/Description';
import BuildIcon from '@mui/icons-material/Build';
import type { FlowiseNode, FlowiseEdge, FlowiseFlowData, FlowiseInputParam, FlowiseInputAnchor, FlowiseOutputAnchor } from '@/app/types/flowise';

// Flowise形式に準拠したノードタイプ定義
interface NodeTypeConfig {
  label: string;
  name: string;
  type: string;
  icon: React.ElementType;
  color: string;
  category: string;
  description: string;
  baseClasses: string[];
  inputParams: FlowiseInputParam[];
  inputAnchors: FlowiseInputAnchor[];
  outputAnchors: FlowiseOutputAnchor[];
}

const nodeTypeConfigs: Record<string, NodeTypeConfig> = {
  chatOpenAI: {
    label: 'ChatOpenAI',
    name: 'chatOpenAI',
    type: 'ChatOpenAI',
    icon: SmartToyIcon,
    color: '#4CAF50',
    category: 'Chat Models',
    description: 'OpenAI Chat Model',
    baseClasses: ['ChatOpenAI', 'BaseChatModel', 'BaseLanguageModel', 'Runnable'],
    inputParams: [
      { label: 'Model Name', name: 'modelName', type: 'string', default: 'gpt-4' },
      { label: 'Temperature', name: 'temperature', type: 'number', default: 0.7 },
    ],
    inputAnchors: [
      { label: 'Cache', name: 'cache', type: 'BaseCache', optional: true },
    ],
    outputAnchors: [
      { label: 'ChatOpenAI', name: 'chatOpenAI', type: 'ChatOpenAI | BaseChatModel | BaseLanguageModel | Runnable' },
    ],
  },
  promptTemplate: {
    label: 'Prompt Template',
    name: 'promptTemplate',
    type: 'PromptTemplate',
    icon: TextFieldsIcon,
    color: '#2196F3',
    category: 'Prompts',
    description: 'Schema to represent a basic prompt for an LLM',
    baseClasses: ['PromptTemplate', 'BaseStringPromptTemplate', 'BasePromptTemplate'],
    inputParams: [
      { label: 'Template', name: 'template', type: 'string', default: '' },
      { label: 'Format Prompt Values', name: 'promptValues', type: 'json', optional: true },
    ],
    inputAnchors: [],
    outputAnchors: [
      { label: 'PromptTemplate', name: 'promptTemplate', type: 'PromptTemplate | BaseStringPromptTemplate | BasePromptTemplate' },
    ],
  },
  bufferMemory: {
    label: 'Buffer Memory',
    name: 'bufferMemory',
    type: 'BufferMemory',
    icon: MemoryIcon,
    color: '#9C27B0',
    category: 'Memory',
    description: 'Retrieve chat messages stored in database',
    baseClasses: ['BufferMemory', 'BaseChatMemory', 'BaseMemory'],
    inputParams: [
      { label: 'Session Id', name: 'sessionId', type: 'string', optional: true },
      { label: 'Memory Key', name: 'memoryKey', type: 'string', default: 'chat_history' },
    ],
    inputAnchors: [],
    outputAnchors: [
      { label: 'BufferMemory', name: 'bufferMemory', type: 'BufferMemory | BaseChatMemory | BaseMemory' },
    ],
  },
  llmChain: {
    label: 'LLM Chain',
    name: 'llmChain',
    type: 'LLMChain',
    icon: LinkIcon,
    color: '#FF9800',
    category: 'Chains',
    description: 'Chain to run queries against LLMs',
    baseClasses: ['LLMChain', 'BaseChain', 'Runnable'],
    inputParams: [
      { label: 'Chain Name', name: 'chainName', type: 'string', optional: true },
    ],
    inputAnchors: [
      { label: 'Language Model', name: 'model', type: 'BaseLanguageModel' },
      { label: 'Prompt', name: 'prompt', type: 'BasePromptTemplate' },
    ],
    outputAnchors: [
      { label: 'LLM Chain', name: 'llmChain', type: 'LLMChain | BaseChain | Runnable' },
    ],
  },
  conversationChain: {
    label: 'Conversation Chain',
    name: 'conversationChain',
    type: 'ConversationChain',
    icon: ChatIcon,
    color: '#00BCD4',
    category: 'Chains',
    description: 'Chat models specific conversational chain with memory',
    baseClasses: ['ConversationChain', 'LLMChain', 'BaseChain', 'Runnable'],
    inputParams: [
      { label: 'System Message', name: 'systemMessagePrompt', type: 'string', optional: true },
    ],
    inputAnchors: [
      { label: 'Chat Model', name: 'model', type: 'BaseChatModel' },
      { label: 'Memory', name: 'memory', type: 'BaseMemory' },
    ],
    outputAnchors: [
      { label: 'ConversationChain', name: 'conversationChain', type: 'ConversationChain | LLMChain | BaseChain | Runnable' },
    ],
  },
  conversationalAgent: {
    label: 'Conversational Agent',
    name: 'conversationalAgent',
    type: 'AgentExecutor',
    icon: PsychologyIcon,
    color: '#E91E63',
    category: 'Agents',
    description: 'Conversational agent for a chat model',
    baseClasses: ['AgentExecutor', 'BaseChain', 'Runnable'],
    inputParams: [
      { label: 'System Message', name: 'systemMessage', type: 'string', optional: true },
      { label: 'Max Iterations', name: 'maxIterations', type: 'number', optional: true },
    ],
    inputAnchors: [
      { label: 'Allowed Tools', name: 'tools', type: 'Tool', list: true },
      { label: 'Chat Model', name: 'model', type: 'BaseChatModel' },
      { label: 'Memory', name: 'memory', type: 'BaseChatMemory' },
    ],
    outputAnchors: [
      { label: 'AgentExecutor', name: 'conversationalAgent', type: 'AgentExecutor | BaseChain | Runnable' },
    ],
  },
  calculator: {
    label: 'Calculator',
    name: 'calculator',
    type: 'Calculator',
    icon: BuildIcon,
    color: '#795548',
    category: 'Tools',
    description: 'Perform calculations on response',
    baseClasses: ['Calculator', 'Tool', 'StructuredTool', 'BaseLangChain'],
    inputParams: [],
    inputAnchors: [],
    outputAnchors: [
      { label: 'Calculator', name: 'calculator', type: 'Calculator | Tool | StructuredTool | BaseLangChain' },
    ],
  },
  vectorStoreRetriever: {
    label: 'Vector Store Retriever',
    name: 'vectorStoreRetriever',
    type: 'VectorStoreRetriever',
    icon: StorageIcon,
    color: '#607D8B',
    category: 'Retrievers',
    description: 'Retrieve documents from vector store',
    baseClasses: ['VectorStoreRetriever', 'BaseRetriever'],
    inputParams: [
      { label: 'Top K', name: 'topK', type: 'number', default: 4 },
    ],
    inputAnchors: [
      { label: 'Vector Store', name: 'vectorStore', type: 'VectorStore' },
    ],
    outputAnchors: [
      { label: 'Retriever', name: 'retriever', type: 'VectorStoreRetriever | BaseRetriever' },
    ],
  },
  pdfLoader: {
    label: 'PDF Loader',
    name: 'pdfLoader',
    type: 'Document',
    icon: DescriptionIcon,
    color: '#F44336',
    category: 'Document Loaders',
    description: 'Load data from PDF files',
    baseClasses: ['Document'],
    inputParams: [
      { label: 'PDF File', name: 'pdfFile', type: 'file' },
    ],
    inputAnchors: [
      { label: 'Text Splitter', name: 'textSplitter', type: 'TextSplitter', optional: true },
    ],
    outputAnchors: [
      { label: 'Document', name: 'document', type: 'Document | json' },
    ],
  },
  customTool: {
    label: 'Custom Tool',
    name: 'customTool',
    type: 'CustomTool',
    icon: CodeIcon,
    color: '#9E9E9E',
    category: 'Tools',
    description: 'Use custom tool you have created',
    baseClasses: ['CustomTool', 'Tool', 'StructuredTool', 'BaseLangChain'],
    inputParams: [
      { label: 'Tool Name', name: 'toolName', type: 'string' },
      { label: 'Tool Description', name: 'toolDescription', type: 'string' },
    ],
    inputAnchors: [],
    outputAnchors: [
      { label: 'CustomTool', name: 'customTool', type: 'CustomTool | Tool | StructuredTool | BaseLangChain' },
    ],
  },
};

const FLOWS_STORAGE_KEY = 'owliafabrica_flows';

interface SavedFlow {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
}

// Flowise形式カスタムノードコンポーネント
function FlowiseCustomNode({ id, data }: { id: string; data: {
  label: string;
  name: string;
  type: string;
  category: string;
  description?: string;
  baseClasses: string[];
  inputs: Record<string, unknown>;
  inputParams: FlowiseInputParam[];
  inputAnchors: FlowiseInputAnchor[];
  outputAnchors: FlowiseOutputAnchor[];
  nodeTypeKey: string;
} }) {
  const nodeTypeKey = data.nodeTypeKey || 'chatOpenAI';
  const config = nodeTypeConfigs[nodeTypeKey] || nodeTypeConfigs.chatOpenAI;
  const IconComponent = config.icon;

  return (
    <Paper
      elevation={3}
      sx={{
        minWidth: 220,
        borderRadius: 2,
        border: `2px solid ${config.color}`,
        bgcolor: '#1e1e2e',
        color: '#fff',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {data.inputAnchors.map((anchor, index) => (
        <Handle
          key={`input-${anchor.name}`}
          type="target"
          position={Position.Left}
          id={`${id}-input-${anchor.name}-${anchor.type}`}
          style={{
            background: config.color,
            width: 12,
            height: 12,
            border: '2px solid #1e1e2e',
            top: 60 + index * 24,
          }}
        />
      ))}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.5,
          borderBottom: `1px solid ${config.color}40`,
          bgcolor: `${config.color}20`,
        }}
      >
        <IconComponent sx={{ color: config.color, fontSize: 20 }} />
        <Typography variant="subtitle2" fontWeight="bold" sx={{ flex: 1 }}>
          {data.label}
        </Typography>
        <Chip
          label={data.category}
          size="small"
          sx={{
            height: 18,
            fontSize: '0.6rem',
            bgcolor: `${config.color}30`,
            color: config.color,
          }}
        />
      </Box>

      <Box sx={{ p: 1.5 }}>
        {data.description && (
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 1 }}>
            {data.description}
          </Typography>
        )}

        {data.inputAnchors.length > 0 && (
          <Box sx={{ mb: 1 }}>
            {data.inputAnchors.map((anchor) => (
              <Typography key={anchor.name} variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>
                ← {anchor.label} {anchor.optional && '(optional)'}
              </Typography>
            ))}
          </Box>
        )}

        {data.outputAnchors.length > 0 && (
          <Box sx={{ textAlign: 'right' }}>
            {data.outputAnchors.map((anchor) => (
              <Typography key={anchor.name} variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>
                {anchor.label} →
              </Typography>
            ))}
          </Box>
        )}
      </Box>

      {data.outputAnchors.map((anchor, index) => (
        <Handle
          key={`output-${anchor.name}`}
          type="source"
          position={Position.Right}
          id={`${id}-output-${anchor.name}-${anchor.type}`}
          style={{
            background: config.color,
            width: 12,
            height: 12,
            border: '2px solid #1e1e2e',
            top: 60 + index * 24,
          }}
        />
      ))}
    </Paper>
  );
}

const customNodeTypes = {
  customNode: FlowiseCustomNode,
};

function loadFlowsFromStorage(): SavedFlow[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(FLOWS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFlowsToStorage(flows: SavedFlow[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FLOWS_STORAGE_KEY, JSON.stringify(flows));
}

// Flowise形式へのエクスポート関数
function exportToFlowiseFormat(nodes: Node[], edges: Edge[]): FlowiseFlowData {
  const flowiseNodes: FlowiseNode[] = nodes.map((node) => {
    const data = node.data;
    const nodeTypeKey = data.nodeTypeKey || 'chatOpenAI';
    const config = nodeTypeConfigs[nodeTypeKey];

    return {
      id: node.id,
      position: node.position,
      type: 'customNode',
      data: {
        id: node.id,
        label: data.label || config?.label || nodeTypeKey,
        name: data.name || config?.name || nodeTypeKey,
        type: data.type || config?.type || nodeTypeKey,
        baseClasses: data.baseClasses || config?.baseClasses || [],
        category: data.category || config?.category || 'Unknown',
        description: data.description || config?.description,
        inputParams: data.inputParams || config?.inputParams || [],
        inputAnchors: data.inputAnchors || config?.inputAnchors || [],
        inputs: data.inputs || {},
        outputs: {},
        outputAnchors: data.outputAnchors || config?.outputAnchors || [],
      },
      width: node.width || 300,
      height: node.height || 200,
    };
  });

  const flowiseEdges: FlowiseEdge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle || '',
    target: edge.target,
    targetHandle: edge.targetHandle || '',
    type: 'buttonedge',
    data: { label: '' },
  }));

  return {
    nodes: flowiseNodes,
    edges: flowiseEdges,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

function FlowBuilderInner() {
  const [flows, setFlows] = useState<SavedFlow[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [currentFlowName, setCurrentFlowName] = useState('新規フロー');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [exportedJson, setExportedJson] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadedFlows = loadFlowsFromStorage();
    setFlows(loadedFlows);
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds: Edge[]) => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#e94560', strokeWidth: 2 },
    }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 110,
        y: event.clientY - bounds.top - 50,
      };

      const config = nodeTypeConfigs[type];
      if (!config) return;

      const nodeId = `${config.name}_${Date.now()}`;

      const newNode: Node = {
        id: nodeId,
        type: 'customNode',
        position,
        data: {
          label: config.label,
          name: config.name,
          type: config.type,
          category: config.category,
          description: config.description,
          baseClasses: config.baseClasses,
          inputs: {},
          inputParams: config.inputParams,
          inputAnchors: config.inputAnchors,
          outputAnchors: config.outputAnchors,
          nodeTypeKey: type,
        },
      };

      setNodes((nds: Node[]) => nds.concat(newNode));
    },
    [setNodes]
  );

  const createNewFlow = () => {
    setNodes([]);
    setEdges([]);
    setCurrentFlowId(null);
    setCurrentFlowName('新規フロー');
    setEditMode(true);
  };

  const openFlow = (flow: SavedFlow) => {
    setCurrentFlowId(flow.id);
    setCurrentFlowName(flow.name);
    setNodes(flow.nodes || []);
    setEdges(flow.edges || []);
    setEditMode(true);
  };

  const saveFlow = () => {
    const now = new Date().toISOString();

    if (currentFlowId) {
      const updatedFlows = flows.map((f) =>
        f.id === currentFlowId
          ? { ...f, name: currentFlowName, nodes, edges, updatedAt: now }
          : f
      );
      setFlows(updatedFlows);
      saveFlowsToStorage(updatedFlows);
      setSnackbar({ open: true, message: 'フローを更新しました', severity: 'success' });
    } else {
      const newFlow: SavedFlow = {
        id: `flow_${Date.now()}`,
        name: currentFlowName,
        nodes,
        edges,
        createdAt: now,
        updatedAt: now,
      };
      const updatedFlows = [...flows, newFlow];
      setFlows(updatedFlows);
      saveFlowsToStorage(updatedFlows);
      setCurrentFlowId(newFlow.id);
      setSnackbar({ open: true, message: 'フローを作成しました', severity: 'success' });
    }

    setSaveDialogOpen(false);
  };

  const deleteFlow = () => {
    if (!flowToDelete) return;

    const updatedFlows = flows.filter((f) => f.id !== flowToDelete);
    setFlows(updatedFlows);
    saveFlowsToStorage(updatedFlows);
    setDeleteDialogOpen(false);
    setFlowToDelete(null);
    setSnackbar({ open: true, message: 'フローを削除しました', severity: 'info' });
  };

  const closeEditor = () => {
    setEditMode(false);
    setCurrentFlowId(null);
    setNodes([]);
    setEdges([]);
  };

  const exportJson = () => {
    const flowiseData = exportToFlowiseFormat(nodes, edges);
    const jsonString = JSON.stringify(flowiseData, null, 2);
    setExportedJson(jsonString);
    setJsonDialogOpen(true);
  };

  const copyJsonToClipboard = () => {
    navigator.clipboard.writeText(exportedJson);
    setSnackbar({ open: true, message: 'JSONをクリップボードにコピーしました', severity: 'success' });
  };

  const downloadJson = () => {
    const blob = new Blob([exportedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentFlowName.replace(/\s+/g, '_')}_flowise.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: 'JSONファイルをダウンロードしました', severity: 'success' });
  };

  const openChat = (flowId: string) => {
    window.open(`/chat?flowId=${flowId}`, '_blank');
  };

  if (editMode) {
    return (
      <Box sx={{ height: '100%', display: 'flex', bgcolor: '#1a1a2e' }}>
        <Paper
          sx={{
            width: 260,
            borderRadius: 0,
            bgcolor: '#16213e',
            borderRight: '2px solid #0f3460',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid #0f3460' }}>
            <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600 }}>
              ノードパレット
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              ドラッグ&ドロップで追加
            </Typography>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
            {Object.entries(nodeTypeConfigs).map(([key, config]) => {
              const IconComponent = config.icon;
              return (
                <Card
                  key={key}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/reactflow', key);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  sx={{
                    mb: 1,
                    bgcolor: '#0f3460',
                    cursor: 'grab',
                    '&:hover': { bgcolor: '#1a4080', transform: 'scale(1.02)' },
                    '&:active': { cursor: 'grabbing' },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconComponent sx={{ color: config.color, fontSize: 20 }} />
                      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                        {config.label}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mt: 0.5 }}>
                      {config.description}
                    </Typography>
                    <Chip
                      label={config.category}
                      size="small"
                      sx={{
                        mt: 0.5,
                        height: 18,
                        fontSize: '0.65rem',
                        bgcolor: `${config.color}30`,
                        color: config.color,
                      }}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Paper>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1,
              bgcolor: '#16213e',
              borderBottom: '2px solid #0f3460',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Tooltip title="一覧に戻る">
                <IconButton onClick={closeEditor} sx={{ color: '#90CAF9' }}>
                  <ArrowBackIcon />
                </IconButton>
              </Tooltip>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                <AccountTreeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                {currentFlowName}
              </Typography>
              {currentFlowId && (
                <Chip
                  label="保存済み"
                  size="small"
                  sx={{ bgcolor: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50' }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Flowise形式でJSONエクスポート（テスト用）">
                <Button
                  variant="outlined"
                  startIcon={<DataObjectIcon />}
                  onClick={exportJson}
                  sx={{
                    borderColor: '#FF9800',
                    color: '#FF9800',
                    '&:hover': { borderColor: '#FFB74D', bgcolor: 'rgba(255, 152, 0, 0.1)' },
                  }}
                >
                  JSON出力
                </Button>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={() => setSaveDialogOpen(true)}
                sx={{ bgcolor: '#e94560', '&:hover': { bgcolor: '#c73e54' } }}
              >
                保存
              </Button>
            </Box>
          </Box>

          <Box ref={reactFlowWrapper} sx={{ flex: 1 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDragOver={onDragOver}
              onDrop={onDrop}
              nodeTypes={customNodeTypes}
              fitView
              style={{ background: '#1a1a2e' }}
            >
              <Background color="#0f3460" gap={20} />
              <Controls style={{ background: '#16213e', borderRadius: 8 }} />
              <MiniMap
                style={{ background: '#16213e' }}
                nodeColor="#e94560"
                maskColor="rgba(0,0,0,0.8)"
              />
              <Panel position="top-center">
                {nodes.length === 0 && (
                  <Alert
                    severity="info"
                    sx={{
                      bgcolor: 'rgba(33, 150, 243, 0.1)',
                      color: '#90CAF9',
                      border: '1px solid #0f3460',
                    }}
                  >
                    左のパレットからノードをドラッグ&ドロップしてフローを作成してください
                  </Alert>
                )}
              </Panel>
              <Panel position="bottom-center">
                <Box sx={{ display: 'flex', gap: 1, p: 1, bgcolor: 'rgba(22, 33, 62, 0.9)', borderRadius: 1 }}>
                  <Chip
                    label={`${nodes.length} ノード`}
                    size="small"
                    sx={{ bgcolor: 'rgba(144, 202, 249, 0.2)', color: '#90CAF9' }}
                  />
                  <Chip
                    label={`${edges.length} エッジ`}
                    size="small"
                    sx={{ bgcolor: 'rgba(233, 69, 96, 0.2)', color: '#e94560' }}
                  />
                </Box>
              </Panel>
            </ReactFlow>
          </Box>
        </Box>

        <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
          <DialogTitle>フローを保存</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="フロー名"
              fullWidth
              value={currentFlowName}
              onChange={(e) => setCurrentFlowName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSaveDialogOpen(false)}>キャンセル</Button>
            <Button onClick={saveFlow} variant="contained">
              保存
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={jsonDialogOpen}
          onClose={() => setJsonDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DataObjectIcon sx={{ color: '#FF9800' }} />
            Flowise形式 JSON出力（テスト用）
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              このJSONはFlowise形式に準拠しています。Flowiseにインポートして使用できます。
            </Alert>
            <TextField
              multiline
              fullWidth
              rows={20}
              value={exportedJson}
              InputProps={{
                readOnly: true,
                sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setJsonDialogOpen(false)}>閉じる</Button>
            <Button
              onClick={copyJsonToClipboard}
              startIcon={<DataObjectIcon />}
              variant="outlined"
            >
              コピー
            </Button>
            <Button
              onClick={downloadJson}
              startIcon={<DownloadIcon />}
              variant="contained"
            >
              ダウンロード
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', bgcolor: '#1a1a2e' }}>
      <Paper
        sx={{
          width: 320,
          borderRadius: 0,
          bgcolor: '#16213e',
          borderRight: '2px solid #0f3460',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #0f3460' }}>
          <Typography
            variant="subtitle1"
            sx={{ color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <AccountTreeIcon sx={{ color: '#90CAF9' }} />
            フロー一覧
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            Flowise形式対応
          </Typography>
        </Box>

        <Box sx={{ p: 2, borderBottom: '1px solid #0f3460' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            fullWidth
            onClick={createNewFlow}
            sx={{ bgcolor: '#e94560', '&:hover': { bgcolor: '#c73e54' } }}
          >
            新規フロー作成
          </Button>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {flows.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
              <AccountTreeIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)', mb: 1 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                フローがありません
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
                新規作成ボタンからフローを作成してください
              </Typography>
            </Box>
          ) : (
            <List dense disablePadding>
              {flows.map((flow, index) => (
                <React.Fragment key={flow.id}>
                  {index > 0 && <Divider sx={{ borderColor: '#0f3460' }} />}
                  <ListItem
                    disablePadding
                    secondaryAction={
                      <Box>
                        <Tooltip title="チャット">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              openChat(flow.id);
                            }}
                            sx={{ color: '#4CAF50' }}
                          >
                            <ChatIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="削除">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFlowToDelete(flow.id);
                              setDeleteDialogOpen(true);
                            }}
                            sx={{ color: '#f44336' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemButton
                      onClick={() => openFlow(flow)}
                      sx={{ py: 1.5, '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' } }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: '#90CAF9' }}>
                        <AccountTreeIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#fff',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 140,
                            }}
                          >
                            {flow.name}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                            {flow.nodes?.length || 0}ノード・{new Date(flow.updatedAt).toLocaleDateString('ja-JP')}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        <Box sx={{ p: 2, borderTop: '1px solid #0f3460' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            fullWidth
            onClick={() => setFlows(loadFlowsFromStorage())}
            size="small"
            sx={{ borderColor: '#0f3460', color: '#90CAF9' }}
          >
            更新
          </Button>
        </Box>
      </Paper>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
        }}
      >
        <Alert
          severity="success"
          sx={{ mb: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50' }}
        >
          フロービルダー準備完了 - {flows.length}個のフロー（Flowise形式対応）
        </Alert>

        <Box sx={{ textAlign: 'center', maxWidth: 500 }}>
          <HomeIcon sx={{ fontSize: 80, color: 'rgba(255,255,255,0.2)', mb: 2 }} />
          <Typography variant="h5" sx={{ color: '#fff', mb: 2, fontWeight: 600 }}>
            OwlAgent フロービルダー
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
            Flowise形式に準拠したノード・エッジ構造でフローを作成できます。
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 4 }}>
            作成したフローは「JSON出力」ボタンでFlowise形式のJSONとしてエクスポートできます。
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={createNewFlow}
              sx={{ bgcolor: '#e94560', '&:hover': { bgcolor: '#c73e54' } }}
            >
              新規フロー作成
            </Button>
          </Box>
        </Box>
      </Box>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>フローを削除</DialogTitle>
        <DialogContent>
          <Typography>このフローを削除してもよろしいですか？この操作は元に戻せません。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
          <Button onClick={deleteFlow} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}

export default function UnifiedFlowBuilder() {
  return (
    <ReactFlowProvider>
      <FlowBuilderInner />
    </ReactFlowProvider>
  );
}
