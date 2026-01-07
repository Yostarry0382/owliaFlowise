'use client';

import React, { useState, useCallback, useRef, useEffect, Suspense } from 'react';
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
  useReactFlow,
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
  Divider,
} from '@mui/material';
// リサイズ可能パネルはCSS flexboxで実装
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ChatIcon from '@mui/icons-material/Chat';
import HomeIcon from '@mui/icons-material/Home';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRouter, useSearchParams } from 'next/navigation';

// Components
import EnhancedCustomNode, { EnhancedCustomNodeData } from './components/EnhancedCustomNode';
import EnhancedNodePalette from './components/EnhancedNodePalette';
import ButtonEdge from './components/ButtonEdge';
import FloatingConfigPanel from './components/FloatingConfigPanel';
import SaveAgentModal from './components/SaveAgentModal';
import TestRunModal from './components/TestRunModal';
import NodeSearchBar from './components/NodeSearchBar';
import ExecutionPreviewPanel from './components/ExecutionPreviewPanel';
import VersionHistoryPanel from './components/VersionHistoryPanel';
import OnboardingOverlay, { useOnboardingStatus } from './components/OnboardingOverlay';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';

// Contexts and Stores
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useFlowHistoryStore } from './stores/flowHistoryStore';

// Types and Utils
import { getNodeDefinition } from './types/node-definitions';
import { serializeFlowForFlowise } from './lib/flowise-converter';

// 拡張されたノードデータ型
interface ExtendedNodeData extends EnhancedCustomNodeData {
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
function AgentBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { colors, mode, toggleTheme } = useTheme();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { setCenter } = useReactFlow();

  // State
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<ExtendedNodeData> | null>(null);
  const [floatingConfigPosition, setFloatingConfigPosition] = useState<{ x: number; y: number } | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showExecutionPreview, setShowExecutionPreview] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showPalette, setShowPalette] = useState(true);
  const [savedOwlAgents, setSavedOwlAgents] = useState<{ id: string; name: string; description: string }[]>([]);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [currentAgentName, setCurrentAgentName] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Onboarding
  const { isCompleted: onboardingCompleted } = useOnboardingStatus();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [onboardingCompleted]);

  // History Store
  const { pushSnapshot, undo, redo, canUndo, canRedo } = useFlowHistoryStore();

  // URLパラメータからエージェントIDを取得して読み込む
  const loadAgentFromUrl = useCallback(async (agentId: string) => {
    try {
      const response = await fetch(`/api/owlagents/${agentId}`);
      if (response.ok) {
        const agent = await response.json();
        setCurrentAgentId(agent.id);
        setCurrentAgentName(agent.name);

        // フローデータを読み込み
        if (agent.flow) {
          const loadedNodes = agent.flow.nodes.map((n: any) => ({
            id: n.id,
            type: 'custom',
            position: n.position,
            data: {
              ...n.data,
            },
          }));
          const loadedEdges = agent.flow.edges.map((e: any) => ({
            ...e,
            type: 'smoothstep',
            animated: true,
          }));
          setNodes(loadedNodes);
          setEdges(loadedEdges);
          setSnackbar({
            open: true,
            message: `エージェント「${agent.name}」を読み込みました`,
            severity: 'success',
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: 'エージェントの読み込みに失敗しました',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to load agent:', error);
      setSnackbar({
        open: true,
        message: 'エージェントの読み込みに失敗しました',
        severity: 'error',
      });
    }
  }, [setNodes, setEdges]);

  // サンプルフローを読み込む
  const loadSampleFlow = useCallback(async (sampleId: string) => {
    try {
      const response = await fetch(`/api/sample-flows?name=${sampleId}`);
      if (response.ok) {
        const sampleFlow = await response.json();
        setCurrentAgentId(null); // 新規作成扱い
        setCurrentAgentName(sampleFlow.name || sampleId);

        // フローデータを読み込み
        if (sampleFlow.nodes) {
          const loadedNodes = sampleFlow.nodes.map((n: any) => ({
            id: n.id,
            type: 'custom',
            position: n.position,
            data: {
              ...n.data,
            },
          }));
          const loadedEdges = (sampleFlow.edges || []).map((e: any) => ({
            ...e,
            type: 'smoothstep',
            animated: true,
          }));
          setNodes(loadedNodes);
          setEdges(loadedEdges);
          setSnackbar({
            open: true,
            message: `サンプルフロー「${sampleFlow.name}」を読み込みました`,
            severity: 'success',
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: 'サンプルフローの読み込みに失敗しました',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to load sample flow:', error);
      setSnackbar({
        open: true,
        message: 'サンプルフローの読み込みに失敗しました',
        severity: 'error',
      });
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    const agentId = searchParams.get('id');
    const sampleId = searchParams.get('sample');
    if (agentId) {
      loadAgentFromUrl(agentId);
    } else if (sampleId) {
      loadSampleFlow(sampleId);
    }
  }, [searchParams, loadAgentFromUrl, loadSampleFlow]);

  // 保存済みOwlAgentを読み込み
  useEffect(() => {
    const loadOwlAgents = async () => {
      try {
        const response = await fetch('/api/owlagents');
        if (response.ok) {
          const agents = await response.json();
          setSavedOwlAgents(
            agents.map((a: any) => ({
              id: a.id,
              name: a.name,
              description: a.description,
            }))
          );
        }
      } catch (error) {
        console.error('Failed to load OwlAgents:', error);
      }
    };
    loadOwlAgents();
  }, []);

  // 履歴にスナップショットを保存
  const saveToHistory = useCallback(
    (description: string) => {
      pushSnapshot(nodes, edges, description);
    },
    [nodes, edges, pushSnapshot]
  );

  // Undo/Redo ハンドラー
  const handleUndo = useCallback(() => {
    const snapshot = undo();
    if (snapshot) {
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
    }
  }, [undo, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    const snapshot = redo();
    if (snapshot) {
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
    }
  }, [redo, setNodes, setEdges]);

  // ノード設定を開く
  const handleConfigureNodeRef = useRef<(nodeId: string) => void>();
  handleConfigureNodeRef.current = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node && reactFlowInstance) {
      setSelectedNode(node);
      // ノードの位置から設定パネルの位置を計算
      const { x, y } = reactFlowInstance.flowToScreenPosition(node.position);
      setFloatingConfigPosition({ x: x + 280, y: Math.max(80, y - 100) });
    }
  };

  // ノードを削除
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
      saveToHistory('Connect nodes');
      setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true }, eds));
    },
    [setEdges, saveToHistory]
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

  // ノードダブルクリックで設定パネルを開く
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node<ExtendedNodeData>) => {
      handleConfigureNode(node.id);
    },
    [handleConfigureNode]
  );

  // ノード設定を保存
  const handleSaveNodeConfig = useCallback(
    (nodeId: string, config: Record<string, any>) => {
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

  // 履歴から復元
  const handleRestoreFromHistory = useCallback(
    (restoredNodes: any[], restoredEdges: any[]) => {
      setNodes(restoredNodes);
      setEdges(restoredEdges);
    },
    [setNodes, setEdges]
  );

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
            flowiseFlowData,
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

        setSnackbar({ open: true, message, severity: 'success' });
        setShowSaveModal(false);

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

  // 現在のエージェントを削除
  const handleDeleteAgent = useCallback(async () => {
    if (!currentAgentId) {
      setSnackbar({
        open: true,
        message: '削除するエージェントがありません。',
        severity: 'error',
      });
      return;
    }

    if (!confirm(`エージェント「${currentAgentName}」を削除しますか？\nこの操作は元に戻せません。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/owlagents/${currentAgentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: `エージェント「${currentAgentName}」を削除しました`,
          severity: 'success',
        });

        // 保存済みリストから削除
        setSavedOwlAgents((prev) => prev.filter((a) => a.id !== currentAgentId));

        // キャンバスをクリア
        setNodes([]);
        setEdges([]);
        setCurrentAgentId(null);
        setCurrentAgentName('');

        // ホームに戻る
        router.push('/');
      } else {
        const errorData = await response.json();
        setSnackbar({
          open: true,
          message: `削除に失敗しました: ${errorData.error || '不明なエラー'}`,
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
      setSnackbar({
        open: true,
        message: '削除中にエラーが発生しました',
        severity: 'error',
      });
    }
  }, [currentAgentId, currentAgentName, router, setNodes, setEdges]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + キー
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            handleOpenSaveModal();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
          case 'f':
            e.preventDefault();
            setShowSearchBar(true);
            break;
          case 'e':
            e.preventDefault();
            setShowExecutionPreview((prev) => !prev);
            break;
          case 'h':
            e.preventDefault();
            setShowVersionHistory((prev) => !prev);
            break;
          case 'p':
            e.preventDefault();
            setShowPalette((prev) => !prev);
            break;
          case 'enter':
            e.preventDefault();
            handleTestRun();
            break;
        }
      }

      // 単独キー
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key) {
          case '?':
            setShowShortcutsHelp((prev) => !prev);
            break;
          case 'Escape':
            setShowSearchBar(false);
            setShowShortcutsHelp(false);
            handleCloseConfigPanel();
            break;
          case 'Delete':
          case 'Backspace':
            // 選択されたノードを削除（テキスト入力中でない場合）
            if (
              document.activeElement?.tagName !== 'INPUT' &&
              document.activeElement?.tagName !== 'TEXTAREA'
            ) {
              const selectedNodes = nodes.filter((n) => n.selected);
              selectedNodes.forEach((n) => handleDeleteNode(n.id));
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenSaveModal, handleUndo, handleRedo, handleTestRun, handleCloseConfigPanel, nodes, handleDeleteNode]);

  // スナックバーを閉じる
  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: colors.bg.primary }}>
      {/* ヘッダー */}
      <Paper
        sx={{
          borderRadius: 0,
          bgcolor: colors.bg.secondary,
          borderBottom: `2px solid ${colors.border.primary}`,
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title="Back to Home">
            <IconButton onClick={() => router.push('/')} sx={{ color: colors.text.secondary }}>
              <HomeIcon />
            </IconButton>
          </Tooltip>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: colors.text.primary,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <span style={{ fontSize: '1.3rem' }}>🦉</span>
            Agent Builder
            {currentAgentName && (
              <Typography
                component="span"
                sx={{
                  ml: 2,
                  px: 2,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: colors.accent,
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                {currentAgentName}
              </Typography>
            )}
          </Typography>

          <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: colors.border.primary }} />

          {/* Undo/Redo */}
          <Tooltip title="Undo (Ctrl+Z)">
            <span>
              <IconButton
                onClick={handleUndo}
                disabled={!canUndo()}
                sx={{ color: canUndo() ? colors.text.primary : colors.text.tertiary }}
              >
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y)">
            <span>
              <IconButton
                onClick={handleRedo}
                disabled={!canRedo()}
                sx={{ color: canRedo() ? colors.text.primary : colors.text.tertiary }}
              >
                <RedoIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* 検索 */}
          <Tooltip title="Search Nodes (Ctrl+F)">
            <IconButton onClick={() => setShowSearchBar(true)} sx={{ color: colors.text.secondary }}>
              <SearchIcon />
            </IconButton>
          </Tooltip>

          {/* 実行プレビュー */}
          <Tooltip title="Execution Preview (Ctrl+E)">
            <IconButton
              onClick={() => setShowExecutionPreview(!showExecutionPreview)}
              sx={{ color: showExecutionPreview ? colors.accent : colors.text.secondary }}
            >
              <VisibilityIcon />
            </IconButton>
          </Tooltip>

          {/* 履歴 */}
          <Tooltip title="Version History (Ctrl+H)">
            <IconButton
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              sx={{ color: showVersionHistory ? colors.accent : colors.text.secondary }}
            >
              <HistoryIcon />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: colors.border.primary }} />

          {/* テーマ切り替え */}
          <Tooltip title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}>
            <IconButton onClick={toggleTheme} sx={{ color: colors.text.secondary }}>
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {/* ショートカットヘルプ */}
          <Tooltip title="Keyboard Shortcuts (?)">
            <IconButton onClick={() => setShowShortcutsHelp(true)} sx={{ color: colors.text.secondary }}>
              <KeyboardIcon />
            </IconButton>
          </Tooltip>

          {/* ヘルプ */}
          <Tooltip title="Show Tutorial">
            <IconButton onClick={() => setShowOnboarding(true)} sx={{ color: colors.text.secondary }}>
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: colors.border.primary }} />

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
              bgcolor: colors.accent,
              '&:hover': { bgcolor: '#5558e3' },
            }}
          >
            Save Agent
          </Button>
          {currentAgentId && (
            <Tooltip title="Delete Agent">
              <IconButton
                onClick={handleDeleteAgent}
                sx={{
                  color: '#f44336',
                  '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.1)' },
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Go to Chat">
            <IconButton onClick={() => router.push('/chat')} sx={{ color: '#90CAF9' }}>
              <ChatIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

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
              {!showPalette && (
                <Tooltip title="Show Palette (Ctrl+P)">
                  <IconButton
                    onClick={() => setShowPalette(true)}
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
                  >
                    <ChevronRightIcon />
                  </IconButton>
                </Tooltip>
              )}
              {showPalette && (
                <Tooltip title="Hide Palette (Ctrl+P)">
                  <IconButton
                    onClick={() => setShowPalette(false)}
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
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                </Tooltip>
              )}

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
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// メインエクスポート（プロバイダーでラップ）
export default function AgentBuilderPage() {
  return (
    <ThemeProvider>
      <ReactFlowProvider>
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f0f1a', color: '#fff' }}>Loading...</div>}>
          <AgentBuilderContent />
        </Suspense>
      </ReactFlowProvider>
    </ThemeProvider>
  );
}
