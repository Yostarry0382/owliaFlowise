'use client';

import React, { useState, useCallback, useRef, DragEvent } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, AppBar, Toolbar, Typography, IconButton, Tooltip, Button, Paper, Dialog, DialogTitle, DialogContent, TextField, DialogActions } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HomeIcon from '@mui/icons-material/Home';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

import OwlAgentNode from '@/app/components/multi-agent/OwlAgentNode';
import AgentSidebar from '@/app/components/multi-agent/AgentSidebar';
import { MultiAgentFlow, OwlAgentNodeData } from '@/app/types/multi-agent';

// カスタムノードタイプの登録
const nodeTypes = {
  owlAgent: OwlAgentNode,
};

// エッジスタイル
const defaultEdgeOptions = {
  style: { stroke: '#90CAF9', strokeWidth: 2 },
  animated: true,
  type: 'smoothstep',
};

export default function MultiAgentCanvas() {
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [flowName, setFlowName] = useState('新しいマルチエージェントフロー');
  const [flowDescription, setFlowDescription] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<MultiAgentFlow | null>(null);

  // ノード接続時の処理
  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds)),
    [setEdges]
  );

  // ドラッグオーバー時の処理
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // ドロップ時の処理
  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const data = event.dataTransfer.getData('application/reactflow');

      if (!data) return;

      try {
        const agentData = JSON.parse(data);

        if (agentData.type !== 'owlAgent') return;

        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        const newNode: Node<OwlAgentNodeData> = {
          id: uuidv4(),
          type: 'owlAgent',
          position,
          data: {
            agentId: agentData.agentId,
            agentName: agentData.agentName,
            agentDescription: agentData.agentDescription,
            status: 'idle',
          },
        };

        setNodes((nds) => nds.concat(newNode));
      } catch (error) {
        console.error('Failed to parse dropped data:', error);
      }
    },
    [reactFlowInstance, setNodes]
  );

  // フロー保存
  const handleSaveFlow = async () => {
    const flow: MultiAgentFlow = {
      id: selectedFlow?.id || uuidv4(),
      name: flowName,
      description: flowDescription,
      agents: nodes.map(node => ({
        id: node.id,
        agentId: node.data.agentId,
        agentName: node.data.agentName,
        agentDescription: node.data.agentDescription,
        position: node.position,
        data: node.data,
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        sourceAgentNodeId: edge.source,
        targetAgentNodeId: edge.target,
        type: edge.type,
        animated: edge.animated,
        style: edge.style,
        data: edge.data,
      })),
    };

    try {
      const response = await fetch('/api/multi-agent-flows', {
        method: selectedFlow ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flow),
      });

      if (response.ok) {
        const savedFlow = await response.json();
        setSelectedFlow(savedFlow);
        setSaveDialogOpen(false);
        alert('フローを保存しました！');
      }
    } catch (error) {
      console.error('Failed to save flow:', error);
      alert('フローの保存に失敗しました');
    }
  };

  // フロー実行
  const handleExecuteFlow = async () => {
    if (nodes.length === 0) {
      alert('実行するエージェントがありません');
      return;
    }

    const executionData = {
      flowId: selectedFlow?.id || 'temp-' + uuidv4(),
      nodes,
      edges,
    };

    try {
      const response = await fetch('/api/multi-agent-flows/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(executionData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Execution result:', result);
        alert('フローの実行を開始しました');
      }
    } catch (error) {
      console.error('Failed to execute flow:', error);
      alert('フローの実行に失敗しました');
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#0A0A0A' }}>
      {/* サイドバー */}
      <AgentSidebar />

      {/* メインキャンバス */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* ツールバー */}
        <AppBar position="static" sx={{ backgroundColor: '#1E1E1E' }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => router.push('/')}
              sx={{ mr: 2 }}
            >
              <HomeIcon />
            </IconButton>

            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              🦉 Multi-Agent Canvas - {flowName}
            </Typography>

            <Tooltip title="フローを保存">
              <IconButton color="inherit" onClick={() => setSaveDialogOpen(true)}>
                <SaveIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="フローを実行">
              <IconButton color="inherit" onClick={handleExecuteFlow}>
                <PlayArrowIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="ヘルプ">
              <IconButton color="inherit">
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        {/* React Flowキャンバス */}
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
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              fitView
              attributionPosition="bottom-left"
            >
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  switch (node.data?.status) {
                    case 'running': return '#FFA726';
                    case 'success': return '#66BB6A';
                    case 'error': return '#EF5350';
                    default: return '#90CAF9';
                  }
                }}
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
                  🦉 エージェントをドラッグして配置
                </Typography>
                <Typography variant="body1" sx={{ color: '#555' }}>
                  左側のサイドバーからエージェントをドラッグ＆ドロップしてください
                </Typography>
              </Box>
            )}
          </Box>
        </ReactFlowProvider>
      </Box>

      {/* 保存ダイアログ */}
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
          <TextField
            autoFocus
            margin="dense"
            label="フロー名"
            fullWidth
            variant="outlined"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            sx={{
              mb: 2,
              '& .MuiInputBase-root': {
                color: '#E0E0E0',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#666',
                },
              },
            }}
          />
          <TextField
            margin="dense"
            label="説明"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={flowDescription}
            onChange={(e) => setFlowDescription(e.target.value)}
            sx={{
              '& .MuiInputBase-root': {
                color: '#E0E0E0',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#666',
                },
              },
            }}
          />
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
