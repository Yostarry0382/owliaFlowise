'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ChatIcon from '@mui/icons-material/Chat';
import HomeIcon from '@mui/icons-material/Home';
import { useRouter } from 'next/navigation';

import NodePalette from './components/NodePalette';
import CustomNode, { CustomNodeData } from './components/CustomNode';
import ButtonEdge from './components/ButtonEdge';
import NodeConfigPanel from './components/NodeConfigPanel';
import SaveAgentModal from './components/SaveAgentModal';
import TestRunModal from './components/TestRunModal';
import { getNodeDefinition } from './types/node-definitions';
import { serializeFlowForFlowise } from './lib/flowise-converter';

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

// 初期ノード
const initialNodes: Node<ExtendedNodeData>[] = [];
const initialEdges: Edge[] = [];

export default function AgentBuilderPage() {
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<ExtendedNodeData> | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [savedOwlAgents, setSavedOwlAgents] = useState<{ id: string; name: string; description: string }[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // 保存済みOwlAgentを読み込み
  useEffect(() => {
    const loadOwlAgents = async () => {
      try {
        const response = await fetch('/api/owlagents');
        if (response.ok) {
          const agents = await response.json();
          setSavedOwlAgents(agents.map((a: any) => ({
            id: a.id,
            name: a.name,
            description: a.description,
          })));
        }
      } catch (error) {
        console.error('Failed to load OwlAgents:', error);
      }
    };
    loadOwlAgents();
  }, []);

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

  // ノード選択（ダブルクリックで設定パネルを開く）
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node<ExtendedNodeData>) => {
    setSelectedNode(node);
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
      // 選択ノードも更新
      setSelectedNode((prev) =>
        prev?.id === nodeId
          ? { ...prev, data: { ...prev.data, config, humanReview } }
          : prev
      );
    },
    [setNodes]
  );

  // 設定パネルを閉じる
  const handleCloseConfigPanel = useCallback(() => {
    setShowConfigPanel(false);
  }, []);

  // 保存モーダルを開く
  const handleOpenSaveModal = useCallback(() => {
    if (nodes.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please add at least one node before saving.',
        severity: 'error',
      });
      return;
    }
    setShowSaveModal(true);
  }, [nodes]);

  // エージェントを保存
  const handleSaveAgent = useCallback(
    async (agentData: { name: string; description: string; tags: string[]; iconStyle: string; syncToFlowise: boolean }) => {
      try {
        // Flowise同期が有効な場合、Flowise形式のフローデータも生成
        let flowiseFlowData: string | undefined;
        if (agentData.syncToFlowise) {
          flowiseFlowData = serializeFlowForFlowise(nodes, edges);
        }

        const response = await fetch('/api/owlagents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...agentData,
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
            flowiseFlowData, // Flowise形式のフローデータを追加
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save agent');
        }

        const savedAgent = await response.json();

        let message = `Agent "${savedAgent.name}" saved successfully!`;
        if (savedAgent.flowiseChatflowId) {
          message += ` (Flowise Chatflow: ${savedAgent.flowiseChatflowId})`;
        }

        setSnackbar({
          open: true,
          message,
          severity: 'success',
        });
        setShowSaveModal(false);

        // OwlAgentリストを更新
        setSavedOwlAgents((prev) => [
          ...prev,
          { id: savedAgent.id, name: savedAgent.name, description: savedAgent.description },
        ]);
      } catch (error) {
        setSnackbar({
          open: true,
          message: 'Failed to save agent. Please try again.',
          severity: 'error',
        });
      }
    },
    [nodes, edges]
  );

  // テスト実行モーダルを開く
  const handleTestRun = useCallback(() => {
    if (nodes.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please add at least one node before testing.',
        severity: 'error',
      });
      return;
    }
    setShowTestModal(true);
  }, [nodes]);

  // スナックバーを閉じる
  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <ReactFlowProvider>
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
            <Tooltip title="Back to Home">
              <IconButton onClick={() => router.push('/')} sx={{ color: '#888' }}>
                <HomeIcon />
              </IconButton>
            </Tooltip>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>🦉</span>
              Agent Builder
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<PlayArrowIcon />}
              onClick={handleTestRun}
              sx={{
                color: '#4CAF50',
                borderColor: '#4CAF50',
                '&:hover': {
                  borderColor: '#66BB6A',
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                },
              }}
            >
              Test Run
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleOpenSaveModal}
              sx={{
                bgcolor: '#6366f1',
                '&:hover': { bgcolor: '#5558e3' },
              }}
            >
              Save Agent
            </Button>
            <Tooltip title="Go to Chat">
              <IconButton
                onClick={() => router.push('/chat')}
                sx={{ color: '#90CAF9' }}
              >
                <ChatIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>

        {/* メインコンテンツ */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* 左サイドバー: ノードパレット */}
          <NodePalette
            savedOwlAgents={savedOwlAgents}
          />

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
              onNodeClick={onNodeClick}
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
                style={{
                  backgroundColor: '#1e1e2f',
                  border: '1px solid #2d2d44',
                }}
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
                  Drag nodes from the palette to get started
                </Typography>
                <Typography sx={{ color: '#444', fontSize: '0.9rem' }}>
                  Connect nodes to build your AI agent workflow
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
              onClose={handleCloseConfigPanel}
              onSave={handleSaveNodeConfig}
              savedOwlAgents={savedOwlAgents}
            />
          )}
        </Box>

        {/* 保存モーダル */}
        <SaveAgentModal
          open={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={handleSaveAgent}
        />

        {/* テスト実行モーダル */}
        <TestRunModal
          open={showTestModal}
          onClose={() => setShowTestModal(false)}
          nodes={nodes}
          edges={edges}
        />

        {/* スナックバー */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ReactFlowProvider>
  );
}
