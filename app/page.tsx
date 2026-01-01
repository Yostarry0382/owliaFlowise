'use client';

import React, { useState, useCallback, useRef, useEffect, Suspense, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  ReactFlowInstance,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// Components
import EnhancedCustomNode, { EnhancedCustomNodeData } from './agent-builder/components/EnhancedCustomNode';
import EnhancedNodePalette from './agent-builder/components/EnhancedNodePalette';
import ButtonEdge from './agent-builder/components/ButtonEdge';
import FloatingConfigPanel from './agent-builder/components/FloatingConfigPanel';
import SaveAgentModal from './agent-builder/components/SaveAgentModal';
import TestRunModal from './agent-builder/components/TestRunModal';
import NodeSearchBar from './agent-builder/components/NodeSearchBar';
import ExecutionPreviewPanel from './agent-builder/components/ExecutionPreviewPanel';
import VersionHistoryPanel from './agent-builder/components/VersionHistoryPanel';
import OnboardingOverlay, { useOnboardingStatus } from './agent-builder/components/OnboardingOverlay';
import KeyboardShortcutsHelp from './agent-builder/components/KeyboardShortcutsHelp';
import FlowBuilderHeader from './components/FlowBuilderHeader';

// Contexts and Stores
import { ThemeProvider, useTheme } from './agent-builder/contexts/ThemeContext';

// Types and Utils
import { getNodeDefinition } from './agent-builder/types/node-definitions';

// Hooks
import { useNotification } from './hooks/useNotification';
import { useOwlAgentManager } from './hooks/useOwlAgentManager';
import { useFlowOperations, NodeData } from './hooks/useFlowOperations';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// 拡張されたノードデータ型（NodeDataの制約を満たすように定義）
interface ExtendedNodeData extends EnhancedCustomNodeData {
  label: string;
  type: string;
  category: string;
  onConfigure?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

// カスタムノードタイプの登録
const nodeTypes = {
  custom: EnhancedCustomNode,
};

// カスタムエッジタイプの登録
const edgeTypes = {
  buttonedge: ButtonEdge,
};

// 初期ノード
const initialNodes: Node<ExtendedNodeData>[] = [];
const initialEdges: Edge[] = [];

// メインコンテンツコンポーネント
function HomeContent() {
  const { colors } = useTheme();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { setCenter } = useReactFlow();

  // ReactFlow State
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // UI State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showExecutionPreview, setShowExecutionPreview] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showPalette, setShowPalette] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Notification
  const { snackbar, showError, closeSnackbar } = useNotification();

  // OwlAgent Manager
  const {
    savedOwlAgents,
    currentAgentName,
    saveAgent,
  } = useOwlAgentManager(nodes, edges, setNodes, setEdges);

  // Flow Operations
  const {
    selectedNode,
    floatingConfigPosition,
    canUndo,
    canRedo,
    handleConfigureNode,
    handleDeleteNode,
    handleDeleteNodes,
    handleSaveNodeConfig,
    handleCloseConfigPanel,
    onNodeDoubleClick,
    onConnect,
    saveToHistory,
    handleUndo,
    handleRedo,
    handleRestoreFromHistory,
  } = useFlowOperations<ExtendedNodeData>({
    nodes,
    edges,
    setNodes,
    setEdges,
    reactFlowInstance,
  });

  // Onboarding
  const { isCompleted: onboardingCompleted } = useOnboardingStatus();

  useEffect(() => {
    if (!onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [onboardingCompleted]);

  // 保存モーダルを開く
  const handleOpenSaveModal = useCallback(() => {
    if (nodes.length === 0) {
      showError(new Error('保存するノードがありません'), '保存する前に少なくとも1つのノードを追加してください');
      return;
    }
    setShowSaveModal(true);
  }, [nodes, showError]);

  // エージェントを保存
  const handleSaveAgent = useCallback(
    async (agentData: { name: string; description: string; tags: string[]; iconStyle: string; syncToFlowise: boolean }) => {
      const success = await saveAgent(agentData);
      if (success) {
        setShowSaveModal(false);
      }
    },
    [saveAgent]
  );

  // テスト実行モーダルを開く
  const handleTestRun = useCallback(() => {
    if (nodes.length === 0) {
      showError(new Error('テストするノードがありません'), 'テストする前に少なくとも1つのノードを追加してください');
      return;
    }
    setShowTestModal(true);
  }, [nodes, showError]);

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

      saveToHistory(`Add ${parsed.label}`);

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
    [reactFlowInstance, setNodes, handleConfigureNode, handleDeleteNode, saveToHistory]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // ノード検索でノードを選択
  const handleSelectNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node && reactFlowInstance) {
        setCenter(node.position.x + 100, node.position.y + 50, { zoom: 1, duration: 500 });
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            selected: n.id === nodeId,
          }))
        );
      }
    },
    [nodes, reactFlowInstance, setCenter, setNodes]
  );

  // キーボードショートカットハンドラー
  const keyboardHandlers = useMemo(
    () => ({
      onSave: handleOpenSaveModal,
      onUndo: handleUndo,
      onRedo: handleRedo,
      onSearch: () => setShowSearchBar(true),
      onExecutionPreview: () => setShowExecutionPreview((prev) => !prev),
      onVersionHistory: () => setShowVersionHistory((prev) => !prev),
      onTogglePalette: () => setShowPalette((prev) => !prev),
      onTestRun: handleTestRun,
      onShowShortcutsHelp: () => setShowShortcutsHelp((prev) => !prev),
      onEscape: () => {
        setShowSearchBar(false);
        setShowShortcutsHelp(false);
        handleCloseConfigPanel();
      },
      onDeleteSelected: handleDeleteNodes,
    }),
    [handleOpenSaveModal, handleUndo, handleRedo, handleTestRun, handleCloseConfigPanel, handleDeleteNodes]
  );

  // キーボードショートカット
  useKeyboardShortcuts({
    handlers: keyboardHandlers,
    nodes,
    enabled: true,
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: colors.bg.primary }}>
      {/* ヘッダー */}
      <FlowBuilderHeader
        currentAgentName={currentAgentName}
        canUndo={canUndo()}
        canRedo={canRedo()}
        showExecutionPreview={showExecutionPreview}
        showVersionHistory={showVersionHistory}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSearch={() => setShowSearchBar(true)}
        onToggleExecutionPreview={() => setShowExecutionPreview(!showExecutionPreview)}
        onToggleVersionHistory={() => setShowVersionHistory(!showVersionHistory)}
        onShowShortcutsHelp={() => setShowShortcutsHelp(true)}
        onShowOnboarding={() => setShowOnboarding(true)}
        onTestRun={handleTestRun}
        onSave={handleOpenSaveModal}
      />

      {/* メインコンテンツ */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左サイドバー: ノードパレット */}
        <Box
          sx={{
            width: showPalette ? 280 : 0,
            minWidth: showPalette ? 250 : 0,
            maxWidth: showPalette ? 400 : 0,
            transition: 'all 0.3s ease',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <EnhancedNodePalette savedOwlAgents={savedOwlAgents} isVisible={showPalette} />
        </Box>

        {/* 中央: キャンバス */}
        <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Box ref={reactFlowWrapper} sx={{ flex: 1, position: 'relative', height: '100%' }}>
            {/* パレット表示トグル */}
            <Tooltip title={showPalette ? 'Hide Palette (Ctrl+P)' : 'Show Palette (Ctrl+P)'}>
              <IconButton
                onClick={() => setShowPalette(!showPalette)}
                sx={{
                  position: 'absolute',
                  left: 8,
                  top: 8,
                  zIndex: 10,
                  bgcolor: colors.bg.secondary,
                  border: `1px solid ${colors.border.primary}`,
                  color: colors.text.secondary,
                  '&:hover': { bgcolor: colors.bg.hover },
                }}
                aria-label={showPalette ? 'パレットを隠す' : 'パレットを表示'}
              >
                {showPalette ? <ChevronLeftIcon /> : <ChevronRightIcon />}
              </IconButton>
            </Tooltip>

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
                style: { stroke: colors.accent, strokeWidth: 2 },
              }}
              style={{ background: colors.bg.primary }}
            >
              <Controls />
              <MiniMap
                style={{
                  backgroundColor: colors.bg.secondary,
                  border: `1px solid ${colors.border.primary}`,
                }}
                nodeColor={(node) => {
                  const def = getNodeDefinition(node.data?.type);
                  return def?.color || '#607D8B';
                }}
                maskColor={`${colors.bg.primary}80`}
              />
              <Background color={colors.border.primary} gap={20} size={1} />
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
                <Typography sx={{ fontSize: '2rem', mb: 2 }}>🦉</Typography>
                <Typography sx={{ color: colors.text.secondary, fontSize: '1.2rem', mb: 1 }}>
                  Drag nodes from the palette to get started
                </Typography>
                <Typography sx={{ color: colors.text.tertiary, fontSize: '0.9rem' }}>
                  Connect nodes to build your AI agent workflow
                </Typography>
              </Box>
            )}

            {/* ノード検索バー */}
            <NodeSearchBar
              nodes={nodes}
              onSelectNode={handleSelectNode}
              onClose={() => setShowSearchBar(false)}
              isOpen={showSearchBar}
            />

            {/* 実行プレビューパネル */}
            {showExecutionPreview && (
              <ExecutionPreviewPanel
                nodes={nodes}
                edges={edges}
                onClose={() => setShowExecutionPreview(false)}
              />
            )}

            {/* バージョン履歴パネル */}
            {showVersionHistory && (
              <VersionHistoryPanel
                onRestore={handleRestoreFromHistory}
                onClose={() => setShowVersionHistory(false)}
              />
            )}
          </Box>
        </Box>

        {/* フローティング設定パネル */}
        {floatingConfigPosition && selectedNode && (
          <FloatingConfigPanel
            nodeId={selectedNode.id}
            nodeData={selectedNode.data}
            position={floatingConfigPosition}
            onClose={handleCloseConfigPanel}
            onSave={handleSaveNodeConfig}
            savedOwlAgents={savedOwlAgents}
          />
        )}
      </Box>

      {/* モーダル */}
      <SaveAgentModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveAgent}
      />

      <TestRunModal
        open={showTestModal}
        onClose={() => setShowTestModal(false)}
        nodes={nodes}
        edges={edges}
      />

      {/* キーボードショートカットヘルプ */}
      {showShortcutsHelp && <KeyboardShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />}

      {/* オンボーディング */}
      {showOnboarding && (
        <OnboardingOverlay
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      {/* スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// メインエクスポート（プロバイダーでラップ）
export default function Home() {
  return (
    <ThemeProvider>
      <ReactFlowProvider>
        <Suspense
          fallback={
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: '#0f0f1a',
                color: '#fff',
              }}
            >
              Loading...
            </div>
          }
        >
          <HomeContent />
        </Suspense>
      </ReactFlowProvider>
    </ThemeProvider>
  );
}
