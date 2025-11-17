'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  NodeTypes,
  ReactFlowProvider,
  ReactFlowInstance,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NodeSidebar from '@/app/components/NodeSidebar';
import NodeConfigPanel from '@/app/components/NodeConfigPanel';
import { CustomNode } from '@/app/components/nodes/CustomNode';
import { OwlAgent } from '@/app/types/flowise';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export default function AgentCanvasPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [agent, setAgent] = useState<OwlAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // エージェント情報とフローを取得
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const response = await fetch(`/api/owlagents/${agentId}`);
        if (response.ok) {
          const agentData: OwlAgent = await response.json();
          setAgent(agentData);

          // フロー定義があれば読み込む
          if (agentData.flow) {
            if (agentData.flow.nodes) {
              setNodes(agentData.flow.nodes);
            }
            if (agentData.flow.edges) {
              setEdges(agentData.flow.edges);
            }
          }
        } else {
          console.error('Failed to fetch agent');
          router.push('/multi-agent');
        }
      } catch (error) {
        console.error('Error fetching agent:', error);
        router.push('/multi-agent');
      } finally {
        setLoading(false);
      }
    };

    if (agentId) {
      fetchAgent();
    }
  }, [agentId, router, setNodes, setEdges]);

  // ノード接続時の処理
  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // ノードクリック時の処理
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // ドラッグオーバー時の処理
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // ドロップ時の処理
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) {
        return;
      }

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('label');

      if (!type) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${Date.now()}`,
        type: 'custom',
        position,
        data: {
          label: label || type,
          type,
          config: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  // フロー保存
  const handleSaveFlow = async () => {
    if (!agent) return;

    const updatedAgent: OwlAgent = {
      ...agent,
      flow: {
        nodes,
        edges,
      },
    };

    try {
      const response = await fetch(`/api/owlagents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAgent),
      });

      if (response.ok) {
        setSaveDialogOpen(false);
        alert('フローを保存しました！');
      } else {
        alert('フローの保存に失敗しました');
      }
    } catch (error) {
      console.error('Failed to save flow:', error);
      alert('フローの保存に失敗しました');
    }
  };

  // ノード設定更新
  const handleNodeConfigChange = useCallback((nodeId: string, config: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              config,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0A0A0A' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#0A0A0A' }}>
      {/* ノードパレット */}
      <NodeSidebar />

      {/* メインキャンバスエリア */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* ツールバー */}
        <AppBar position="static" sx={{ backgroundColor: '#1E1E1E' }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => router.push('/multi-agent')}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span style={{ fontSize: '1.5em' }}>🦉</span>
              <Typography variant="h6">
                {agent?.name || 'エージェントキャンバス'}
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            <Tooltip title="フローを保存">
              <IconButton color="inherit" onClick={() => setSaveDialogOpen(true)}>
                <SaveIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="ホームに戻る">
              <IconButton color="inherit" onClick={() => router.push('/')}>
                <HomeIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        {/* React Flowキャンバス */}
        <Box sx={{ flex: 1, display: 'flex' }}>
          <ReactFlowProvider>
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
                onNodeClick={onNodeClick}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-left"
              >
                <Controls />
                <MiniMap
                  nodeColor={() => '#90CAF9'}
                  style={{
                    backgroundColor: '#1E1E1E',
                    border: '1px solid #333',
                  }}
                />
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#333" />
              </ReactFlow>

              {/* 空状態メッセージ */}
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
                  <Typography variant="h4" sx={{ color: '#666', mb: 2 }}>
                    ノードをドラッグして配置
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#555' }}>
                    左側のサイドバーからノードをドラッグ＆ドロップしてください
                  </Typography>
                </Box>
              )}
            </Box>
          </ReactFlowProvider>

          {/* ノード設定パネル */}
          {selectedNode && (
            <NodeConfigPanel
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onConfigChange={handleNodeConfigChange}
            />
          )}
        </Box>
      </Box>

      {/* 保存確認ダイアログ */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#2C2C2C',
            color: '#E0E0E0',
          },
        }}
      >
        <DialogTitle>フローを保存</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            {agent?.name} のフローを保存しますか？
          </Typography>
          {agent?.description && (
            <Typography variant="body2" sx={{ color: '#B0B0B0', mt: 1 }}>
              {agent.description}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)} sx={{ color: '#999' }}>
            キャンセル
          </Button>
          <Button onClick={handleSaveFlow} variant="contained" sx={{ backgroundColor: '#90CAF9', color: '#000' }}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
