'use client';

import React, { useCallback, useMemo, useState } from 'react';
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
  Panel,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Paper, Typography, Button, IconButton, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import NodeSidebar from './NodeSidebar';
import NodeConfigPanel from './NodeConfigPanel';
import { CustomNode } from './nodes/CustomNode';
import SaveAsOwlModal from './SaveAsOwlModal';
import { OwlAgent, FlowDefinition } from '@/app/types/flowise';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'custom',
    position: { x: 250, y: 100 },
    data: {
      label: 'LLMチェーンノード',
      type: 'llm',
      config: {}
    }
  },
];

const initialEdges: Edge[] = [];

function FlowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onInit = useCallback((instance: any) => {
    setReactFlowInstance(instance);
  }, []);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('label');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      if (!reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${Date.now()}`,
        type: 'custom',
        position,
        data: {
          label: label || type,
          type,
          config: {}
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const updateNodeConfig = useCallback(
    (nodeId: string, config: any) => {
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
    },
    [setNodes]
  );

  const handleSaveAsOwl = async (owlAgent: Omit<OwlAgent, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await fetch('/api/owlagents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(owlAgent),
      });

      if (!response.ok) {
        throw new Error('Failed to save Owl Agent');
      }

      const savedOwl = await response.json();
      console.log('Owl Agent saved successfully:', savedOwl);
      // TODO: Show success notification
    } catch (error) {
      console.error('Error saving Owl Agent:', error);
      // TODO: Show error notification
    }
  };

  const getCurrentFlow = (): FlowDefinition => {
    const viewport = reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 };
    return {
      nodes,
      edges,
      viewport,
    };
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f5f5f5' }}>
      {/* サイドバー */}
      <NodeSidebar />

      {/* メインフロービルダー */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={onInit}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background variant="dots" gap={16} size={1} />
          <Controls />
          <MiniMap />

          <Panel position="top-left">
            <Paper sx={{ p: 2, m: 2 }}>
              <Typography variant="h6">OwliaFabrica</Typography>
              <Typography variant="body2" color="text.secondary">
                AIエージェントビジュアルビルダー
              </Typography>
            </Paper>
          </Panel>

          <Panel position="top-right">
            <Paper sx={{ p: 1, m: 2 }}>
              <Tooltip title="Save as Owl Agent">
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={() => setSaveModalOpen(true)}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a67d8 0%, #6b4199 100%)',
                    },
                  }}
                >
                  フクロウとして保存
                </Button>
              </Tooltip>
            </Paper>
          </Panel>
        </ReactFlow>
      </Box>

      {/* 設定パネル */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={(config) => updateNodeConfig(selectedNode.id, config)}
        />
      )}

      {/* Save as Owl Modal */}
      <SaveAsOwlModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSaveAsOwl}
        flow={getCurrentFlow()}
      />
    </Box>
  );
}

export default function FlowBuilderWrapper() {
  return (
    <ReactFlowProvider>
      <FlowBuilder />
    </ReactFlowProvider>
  );
}