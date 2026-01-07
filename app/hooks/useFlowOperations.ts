'use client';

import { useState, useCallback, useRef } from 'react';
import { Node, Edge, Connection, addEdge, ReactFlowInstance } from 'reactflow';
import { useFlowHistoryStore } from '../agent-builder/stores/flowHistoryStore';

export interface NodeData {
  label: string;
  type: string;
  category: string;
  config?: Record<string, unknown>;
  agentId?: string;
  agentName?: string;
  onConfigure?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

export interface UseFlowOperationsOptions<T extends NodeData> {
  nodes: Node<T>[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node<T>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  reactFlowInstance: ReactFlowInstance | null;
}

/**
 * フロー操作（ノードの追加・削除・設定、エッジ接続）を管理するカスタムフック
 */
export function useFlowOperations<T extends NodeData>({
  nodes,
  edges,
  setNodes,
  setEdges,
  reactFlowInstance,
}: UseFlowOperationsOptions<T>) {
  // 選択中のノード
  const [selectedNode, setSelectedNode] = useState<Node<T> | null>(null);
  const [floatingConfigPosition, setFloatingConfigPosition] = useState<{ x: number; y: number } | null>(null);

  // History Store
  const { pushSnapshot, undo, redo, canUndo, canRedo } = useFlowHistoryStore();

  // 履歴にスナップショットを保存
  const saveToHistory = useCallback(
    (description: string) => {
      pushSnapshot(nodes, edges, description);
    },
    [nodes, edges, pushSnapshot]
  );

  // ノード設定を開く（refでラップして依存関係を安定化）
  const handleConfigureNodeRef = useRef<(nodeId: string) => void>();
  handleConfigureNodeRef.current = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node && reactFlowInstance) {
      setSelectedNode(node);
      const { x, y } = reactFlowInstance.flowToScreenPosition(node.position);
      setFloatingConfigPosition({ x: x + 280, y: Math.max(80, y - 100) });
    }
  };

  const handleConfigureNode = useCallback((nodeId: string) => {
    handleConfigureNodeRef.current?.(nodeId);
  }, []);

  // ノードを削除（refでラップして依存関係を安定化）
  const handleDeleteNodeRef = useRef<(nodeId: string) => void>();
  handleDeleteNodeRef.current = (nodeId: string) => {
    saveToHistory('Delete node');
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
      setFloatingConfigPosition(null);
    }
  };

  const handleDeleteNode = useCallback((nodeId: string) => {
    handleDeleteNodeRef.current?.(nodeId);
  }, []);

  // 複数ノードを削除
  const handleDeleteNodes = useCallback(
    (nodeIds: string[]) => {
      if (nodeIds.length === 0) return;
      saveToHistory(`Delete ${nodeIds.length} nodes`);
      setNodes((nds) => nds.filter((n) => !nodeIds.includes(n.id)));
      setEdges((eds) => eds.filter((e) => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)));
      if (selectedNode && nodeIds.includes(selectedNode.id)) {
        setSelectedNode(null);
        setFloatingConfigPosition(null);
      }
    },
    [saveToHistory, setNodes, setEdges, selectedNode]
  );

  // エッジ接続
  const onConnect = useCallback(
    (params: Connection) => {
      saveToHistory('Connect nodes');
      setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true }, eds));
    },
    [setEdges, saveToHistory]
  );

  // ノード設定を保存
  const handleSaveNodeConfig = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      saveToHistory('Configure node');
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, config } } : n
        )
      );
      setSelectedNode((prev) =>
        prev?.id === nodeId ? { ...prev, data: { ...prev.data, config } } : prev
      );
    },
    [setNodes, saveToHistory]
  );

  // 設定パネルを閉じる
  const handleCloseConfigPanel = useCallback(() => {
    setSelectedNode(null);
    setFloatingConfigPosition(null);
  }, []);

  // ノードダブルクリックで設定パネルを開く
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node<T>) => {
      handleConfigureNode(node.id);
    },
    [handleConfigureNode]
  );

  // Undo
  const handleUndo = useCallback(() => {
    const snapshot = undo();
    if (snapshot) {
      setNodes(snapshot.nodes as Node<T>[]);
      setEdges(snapshot.edges);
    }
  }, [undo, setNodes, setEdges]);

  // Redo
  const handleRedo = useCallback(() => {
    const snapshot = redo();
    if (snapshot) {
      setNodes(snapshot.nodes as Node<T>[]);
      setEdges(snapshot.edges);
    }
  }, [redo, setNodes, setEdges]);

  // 履歴から復元
  const handleRestoreFromHistory = useCallback(
    (restoredNodes: Node<T>[], restoredEdges: Edge[]) => {
      setNodes(restoredNodes);
      setEdges(restoredEdges);
    },
    [setNodes, setEdges]
  );

  return {
    // State
    selectedNode,
    floatingConfigPosition,
    canUndo,
    canRedo,

    // Node operations
    handleConfigureNode,
    handleDeleteNode,
    handleDeleteNodes,
    handleSaveNodeConfig,
    handleCloseConfigPanel,
    onNodeDoubleClick,

    // Edge operations
    onConnect,

    // History operations
    saveToHistory,
    handleUndo,
    handleRedo,
    handleRestoreFromHistory,
  };
}

export default useFlowOperations;
