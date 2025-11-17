'use client';

import React, { useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  TextField,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NodeSidebar from '@/app/components/NodeSidebar';
import NodeConfigPanel from '@/app/components/NodeConfigPanel';
import { CustomNode } from '@/app/components/nodes/CustomNode';
import { OwlAgent } from '@/app/types/flowise';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export default function NewAgentCanvasPage() {
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');

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

  // フロー保存（新規OwlAgent作成）
  const handleSaveFlow = async () => {
    if (!agentName) {
      alert('エージェント名を入力してください');
      return;
    }

    const newAgent: OwlAgent = {
      id: `agent_${Date.now()}`,
      name: agentName,
      description: agentDescription || 'OwlAgent created from canvas',
      icon: '🦉',
      tags: ['Custom', 'Canvas'],
      capabilities: ['flow-execution'],
      flow: {
        nodes,
        edges,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const response = await fetch('/api/owlagents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent),
      });

      if (response.ok) {
        const savedAgent = await response.json();
        setSaveDialogOpen(false);
        alert('新しいOwlAgentを作成しました！');
        // 作成したエージェントの編集ページへ遷移
        router.push(`/agent-canvas/${savedAgent.id}`);
      } else {
        alert('OwlAgentの作成に失敗しました');
      }
    } catch (error) {
      console.error('Failed to save agent:', error);
      alert('OwlAgentの作成に失敗しました');
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
                新規エージェントキャンバス
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            <Tooltip title="OwlAgentとして保存">
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
                    新規エージェントを作成
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#555' }}>
                    左側のサイドバーからノードをドラッグ＆ドロップして、
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#555' }}>
                    AIエージェントのワークフローを構築しましょう
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
        <DialogTitle>新規OwlAgentを作成</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="エージェント名"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            sx={{
              mt: 2,
              mb: 2,
              '& .MuiInputLabel-root': { color: '#999' },
              '& .MuiOutlinedInput-root': {
                color: '#E0E0E0',
                '& fieldset': { borderColor: '#555' },
                '&:hover fieldset': { borderColor: '#777' },
                '&.Mui-focused fieldset': { borderColor: '#90CAF9' },
              },
            }}
          />
          <TextField
            fullWidth
            label="説明（オプション）"
            value={agentDescription}
            onChange={(e) => setAgentDescription(e.target.value)}
            multiline
            rows={3}
            sx={{
              '& .MuiInputLabel-root': { color: '#999' },
              '& .MuiOutlinedInput-root': {
                color: '#E0E0E0',
                '& fieldset': { borderColor: '#555' },
                '&:hover fieldset': { borderColor: '#777' },
                '&.Mui-focused fieldset': { borderColor: '#90CAF9' },
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)} sx={{ color: '#999' }}>
            キャンセル
          </Button>
          <Button
            onClick={handleSaveFlow}
            variant="contained"
            sx={{ backgroundColor: '#90CAF9', color: '#000' }}
            disabled={!agentName}
          >
            作成
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}