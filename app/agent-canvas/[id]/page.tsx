'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import { useRouter, useParams } from 'next/navigation';

import NodePalette from '@/app/agent-builder/components/NodePalette';
import CustomNode, { CustomNodeData } from '@/app/agent-builder/components/CustomNode';
import ButtonEdge from '@/app/agent-builder/components/ButtonEdge';
import NodeConfigPanel from '@/app/agent-builder/components/NodeConfigPanel';
import TestRunModal from '@/app/agent-builder/components/TestRunModal';
import { getNodeDefinition } from '@/app/agent-builder/types/node-definitions';
import { serializeFlowForFlowise } from '@/app/agent-builder/lib/flowise-converter';
import { OwlAgent } from '@/app/types/flowise';

// 拡張されたノードデータ型（コールバック付き）
interface ExtendedNodeData extends CustomNodeData {
  onConfigure?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

// カスタムノードタイプの登録（コンポーネント外で定義してメモ化警告を回避）
const nodeTypes = {
  custom: CustomNode,
};

// カスタムエッジタイプの登録（Flowise互換性のため）
const edgeTypes = {
  buttonedge: ButtonEdge,
};

function AgentEditorContent() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<ExtendedNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<ExtendedNodeData> | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [savedOwlAgents, setSavedOwlAgents] = useState<{ id: string; name: string; description: string }[]>([]);

  // Agent data
  const [agent, setAgent] = useState<OwlAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [agentTags, setAgentTags] = useState('');

  const [syncToFlowise, setSyncToFlowise] = useState(true); // Flowise同期オプション

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Load agent and other saved agents
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load current agent
        const agentResponse = await fetch(`/api/owlagents?id=${agentId}`);
        if (agentResponse.ok) {
          const data = await agentResponse.json();
          setAgent(data);
          setAgentName(data.name);
          setAgentDescription(data.description);
          setAgentTags(data.tags?.join(', ') || '');

          // Convert flow nodes to ReactFlow format with callbacks
          const flowNodes: Node<ExtendedNodeData>[] = data.flow.nodes.map((n: any) => ({
            id: n.id,
            type: 'custom',
            position: n.position,
            data: {
              label: n.data.label,
              type: n.data.type,
              category: n.data.category,
              config: n.data.config || {},
              humanReview: n.data.humanReview,
              agentId: n.data.agentId,
              agentName: n.data.agentName,
              onConfigure: (nodeId: string) => handleConfigureNodeRef.current?.(nodeId),
              onDelete: (nodeId: string) => handleDeleteNodeRef.current?.(nodeId),
            },
          }));
          setNodes(flowNodes);
          setEdges(data.flow.edges || []);
        }

        // Load all agents for reference
        const allAgentsResponse = await fetch('/api/owlagents');
        if (allAgentsResponse.ok) {
          const agents = await allAgentsResponse.json();
          setSavedOwlAgents(
            agents
              .filter((a: any) => a.id !== agentId) // Exclude current agent
              .map((a: any) => ({
                id: a.id,
                name: a.name,
                description: a.description,
              }))
          );
        }
      } catch (error) {
        console.error('Failed to load agent:', error);
        setSnackbar({
          open: true,
          message: 'エージェントの読み込みに失敗しました',
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    if (agentId) {
      loadData();
    }
  }, [agentId, setNodes, setEdges]);

  // ノード設定を開く（useRefで安定した参照を保持）
  const handleConfigureNodeRef = useRef<(nodeId: string) => void>();
  handleConfigureNodeRef.current = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setShowConfigPanel(true);
    }
  };

  // ノードを削除（useRefで安定した参照を保持）
  const handleDeleteNodeRef = useRef<(nodeId: string) => void>();
  handleDeleteNodeRef.current = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
      setShowConfigPanel(false);
    }
  };

  // 安定したコールバック
  const handleConfigureNode = useCallback((nodeId: string) => {
    handleConfigureNodeRef.current?.(nodeId);
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    handleDeleteNodeRef.current?.(nodeId);
  }, []);

  // エッジ接続
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true }, eds));
    },
    [setEdges]
  );

  // ノードをドロップ
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData('application/reactflow');
      if (!data || !reactFlowInstance || !reactFlowWrapper.current) return;

      const parsed = JSON.parse(data);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node<ExtendedNodeData> = {
        id: `${parsed.type}-${Date.now()}`,
        type: 'custom',
        position,
        data: {
          label: parsed.label,
          type: parsed.type,
          category: parsed.category,
          config: {},
          agentId: parsed.agentId,
          agentName: parsed.agentId ? parsed.label : undefined,
          onConfigure: handleConfigureNode,
          onDelete: handleDeleteNode,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes, handleConfigureNode, handleDeleteNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // ノードダブルクリックで設定パネルを開く
  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node<ExtendedNodeData>) => {
    setSelectedNode(node);
    setShowConfigPanel(true);
  }, []);

  // ノード設定を保存
  const handleSaveNodeConfig = useCallback(
    (nodeId: string, config: Record<string, any>, humanReview?: CustomNodeData['humanReview']) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config, humanReview } }
            : n
        )
      );
      setSelectedNode((prev) =>
        prev?.id === nodeId
          ? { ...prev, data: { ...prev.data, config, humanReview } }
          : prev
      );
    },
    [setNodes]
  );

  // エージェントを保存
  const handleSaveAgent = useCallback(async () => {
    if (!agent) return;

    setSaving(true);
    try {
      // Flowise同期が有効な場合、Flowise形式のフローデータも生成
      let flowiseFlowData: string | undefined;
      if (syncToFlowise) {
        flowiseFlowData = serializeFlowForFlowise(nodes, edges);
      }

      const response = await fetch('/api/owlagents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...agent,
          name: agentName.trim(),
          description: agentDescription.trim(),
          tags: agentTags.split(',').map((t) => t.trim()).filter((t) => t),
          flow: {
            nodes: nodes.map((n) => ({
              id: n.id,
              type: n.data.type,
              position: n.position,
              data: {
                label: n.data.label,
                type: n.data.type,
                category: n.data.category,
                config: n.data.config,
                humanReview: n.data.humanReview,
                agentId: n.data.agentId,
                agentName: n.data.agentName,
              },
            })),
            edges: edges.map((e) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle,
            })),
          },
          syncToFlowise, // Flowise同期フラグ
          flowiseFlowData, // Flowise形式のフローデータ
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setAgent(updated);

        let message = 'エージェントを保存しました';
        if (updated.flowiseChatflowId) {
          message += ` (Flowise: ${updated.flowiseChatflowId})`;
        }

        setSnackbar({
          open: true,
          message,
          severity: 'success',
        });
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: '保存に失敗しました',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  }, [agent, agentName, agentDescription, agentTags, nodes, edges, syncToFlowise]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#0f0f1a' }}>
        <CircularProgress sx={{ color: '#6366f1' }} />
      </Box>
    );
  }

  if (!agent) {
    return (
      <Box sx={{ p: 4, bgcolor: '#0f0f1a', minHeight: '100vh' }}>
        <Alert severity="error">エージェントが見つかりません</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/agent-canvas')}
          sx={{ mt: 2 }}
        >
          戻る
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#0f0f1a' }}>
      {/* ヘッダー */}
      <Paper
        sx={{
          borderRadius: 0,
          bgcolor: '#16213e',
          borderBottom: '2px solid #0f3460',
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => router.push('/agent-canvas')}
            sx={{ color: '#90CAF9' }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: '#e94560',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <span style={{ fontSize: '1.3rem' }}>🦉</span>
            {agentName || 'Untitled Agent'}
          </Typography>
          <Chip label={`v${agent.version}`} size="small" sx={{ bgcolor: '#4CAF50', color: '#fff' }} />
          <Chip label={`${nodes.length} nodes`} size="small" variant="outlined" sx={{ color: '#90CAF9', borderColor: '#90CAF9' }} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Settings">
            <IconButton
              onClick={() => setShowSettingsDialog(true)}
              sx={{ color: '#90CAF9' }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<PlayArrowIcon />}
            onClick={() => setShowTestModal(true)}
            sx={{
              color: '#4CAF50',
              borderColor: '#4CAF50',
              '&:hover': {
                borderColor: '#66BB6A',
                bgcolor: 'rgba(76, 175, 80, 0.1)',
              },
            }}
          >
            Test
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSaveAgent}
            disabled={saving}
            sx={{
              bgcolor: '#6366f1',
              '&:hover': { bgcolor: '#5558e3' },
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Paper>

      {/* メインコンテンツ */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左サイドバー: ノードパレット */}
        <NodePalette savedOwlAgents={savedOwlAgents} />

        {/* 中央: キャンバス */}
        <Box
          ref={reactFlowWrapper}
          sx={{ flex: 1, position: 'relative' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeDoubleClick={onNodeDoubleClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#6366f1', strokeWidth: 2 },
            }}
            style={{ background: '#0f0f1a' }}
          >
            <Controls />
            <MiniMap
              style={{ backgroundColor: '#1e1e2f' }}
              nodeColor={(node) => {
                const def = getNodeDefinition(node.data?.type);
                return def?.color || '#607D8B';
              }}
            />
            <Background color="#2d2d44" gap={20} size={1} />
          </ReactFlow>

          {/* 空の状態の案内 */}
          {nodes.length === 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <Typography sx={{ color: '#666', fontSize: '1.2rem', mb: 1 }}>
                Drag nodes from the palette to build your flow
              </Typography>
            </Box>
          )}
        </Box>

        {/* 右サイドバー: ノード設定パネル */}
        {showConfigPanel && selectedNode && (
          <NodeConfigPanel
            key={`config-${selectedNode.id}-${JSON.stringify(selectedNode.data.config || {})}`}
            nodeId={selectedNode.id}
            nodeData={selectedNode.data}
            onClose={() => setShowConfigPanel(false)}
            onSave={handleSaveNodeConfig}
            savedOwlAgents={savedOwlAgents}
          />
        )}
      </Box>

      {/* Settings Dialog */}
      <Dialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Agent Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Agent Name"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={agentDescription}
              onChange={(e) => setAgentDescription(e.target.value)}
              multiline
              rows={3}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Tags (comma separated)"
              value={agentTags}
              onChange={(e) => setAgentTags(e.target.value)}
              placeholder="e.g., AI, chatbot, support"
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={syncToFlowise}
                  onChange={(e) => setSyncToFlowise(e.target.checked)}
                  color="primary"
                />
              }
              label="Flowiseに同期"
              sx={{ display: 'block' }}
            />
            <Typography variant="caption" color="text.secondary">
              有効にすると、保存時にFlowiseのChatflowとして登録/更新されます
            </Typography>
            {agent?.flowiseChatflowId && (
              <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1 }}>
                現在のChatflow ID: {agent.flowiseChatflowId}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettingsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Test Run Modal */}
      <TestRunModal
        open={showTestModal}
        onClose={() => setShowTestModal(false)}
        nodes={nodes}
        edges={edges}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function AgentEditorPage() {
  return (
    <ReactFlowProvider>
      <AgentEditorContent />
    </ReactFlowProvider>
  );
}
