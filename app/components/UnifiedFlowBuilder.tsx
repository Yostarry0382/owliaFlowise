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
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InputIcon from '@mui/icons-material/Input';
import OutputIcon from '@mui/icons-material/Output';

// ノードタイプの定義
const nodeTypeConfigs = {
  llm: { label: 'LLM', icon: SmartToyIcon, color: '#4CAF50', category: 'AI', description: '言語モデル処理' },
  prompt: { label: 'プロンプト', icon: TextFieldsIcon, color: '#2196F3', category: 'Input', description: 'プロンプトテンプレート' },
  memory: { label: 'メモリ', icon: MemoryIcon, color: '#9C27B0', category: 'Memory', description: '会話履歴管理' },
  tool: { label: 'ツール', icon: CodeIcon, color: '#FF9800', category: 'Tool', description: '外部ツール連携' },
  vectorStore: { label: 'ベクトルDB', icon: StorageIcon, color: '#E91E63', category: 'Database', description: 'ベクトル検索' },
  input: { label: '入力', icon: InputIcon, color: '#00BCD4', category: 'IO', description: 'ユーザー入力' },
  output: { label: '出力', icon: OutputIcon, color: '#8BC34A', category: 'IO', description: '結果出力' },
};

// ローカルストレージのキー
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

// カスタムノードコンポーネント
function CustomNode({ data }: { data: { label: string; nodeType: string; description?: string; config?: Record<string, string> } }) {
  const nodeType = nodeTypeConfigs[data.nodeType as keyof typeof nodeTypeConfigs] || nodeTypeConfigs.llm;
  const IconComponent = nodeType.icon;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        minWidth: 180,
        borderRadius: 2,
        border: `2px solid ${nodeType.color}`,
        bgcolor: '#1e1e2e',
        color: '#fff',
        position: 'relative',
      }}
    >
      {/* 入力ハンドル */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: nodeType.color,
          width: 12,
          height: 12,
          border: '2px solid #1e1e2e',
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <IconComponent sx={{ color: nodeType.color }} />
        <Typography variant="subtitle2" fontWeight="bold">
          {data.label}
        </Typography>
      </Box>
      {data.description && (
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
          {data.description}
        </Typography>
      )}

      {/* 出力ハンドル */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: nodeType.color,
          width: 12,
          height: 12,
          border: '2px solid #1e1e2e',
        }}
      />
    </Paper>
  );
}

const customNodeTypes = {
  custom: CustomNode,
};

// ローカルストレージからフローを読み込む
function loadFlowsFromStorage(): SavedFlow[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(FLOWS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// ローカルストレージにフローを保存
function saveFlowsToStorage(flows: SavedFlow[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FLOWS_STORAGE_KEY, JSON.stringify(flows));
}

/**
 * 統合フロービルダーコンポーネント
 * React Flowを使用してFabrica内でフローを直接作成・編集
 */
function FlowBuilderInner() {
  const [flows, setFlows] = useState<SavedFlow[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [currentFlowName, setCurrentFlowName] = useState('新規フロー');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // 初期読み込み
  useEffect(() => {
    const loadedFlows = loadFlowsFromStorage();
    setFlows(loadedFlows);
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges]
  );

  // ノードをドラッグ&ドロップで追加
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
        x: event.clientX - bounds.left - 90,
        y: event.clientY - bounds.top - 30,
      };

      const nodeType = nodeTypeConfigs[type as keyof typeof nodeTypeConfigs];
      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type: 'custom',
        position,
        data: {
          label: nodeType?.label || type,
          nodeType: type,
          description: nodeType?.description || '',
        },
      };

      setNodes((nds: Node[]) => nds.concat(newNode));
    },
    [setNodes]
  );

  // 新規フロー作成
  const createNewFlow = () => {
    setNodes([]);
    setEdges([]);
    setCurrentFlowId(null);
    setCurrentFlowName('新規フロー');
    setEditMode(true);
  };

  // フローを開く
  const openFlow = (flow: SavedFlow) => {
    setCurrentFlowId(flow.id);
    setCurrentFlowName(flow.name);
    setNodes(flow.nodes || []);
    setEdges(flow.edges || []);
    setEditMode(true);
  };

  // フローを保存
  const saveFlow = () => {
    const now = new Date().toISOString();

    if (currentFlowId) {
      // 更新
      const updatedFlows = flows.map((f) =>
        f.id === currentFlowId
          ? { ...f, name: currentFlowName, nodes, edges, updatedAt: now }
          : f
      );
      setFlows(updatedFlows);
      saveFlowsToStorage(updatedFlows);
      setSnackbar({ open: true, message: 'フローを更新しました', severity: 'success' });
    } else {
      // 新規作成
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

  // フローを削除
  const deleteFlow = () => {
    if (!flowToDelete) return;

    const updatedFlows = flows.filter((f) => f.id !== flowToDelete);
    setFlows(updatedFlows);
    saveFlowsToStorage(updatedFlows);
    setDeleteDialogOpen(false);
    setFlowToDelete(null);
    setSnackbar({ open: true, message: 'フローを削除しました', severity: 'info' });
  };

  // エディタを閉じる
  const closeEditor = () => {
    setEditMode(false);
    setCurrentFlowId(null);
    setNodes([]);
    setEdges([]);
  };

  // チャット画面を開く
  const openChat = (flowId: string) => {
    window.open(`/chat?flowId=${flowId}`, '_blank');
  };

  // エディタモード
  if (editMode) {
    return (
      <Box sx={{ height: '100%', display: 'flex', bgcolor: '#1a1a2e' }}>
        {/* 左サイドバー - ノードパレット */}
        <Paper
          sx={{
            width: 240,
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
                    '&:hover': { bgcolor: '#1a4080' },
                    '&:active': { cursor: 'grabbing' },
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconComponent sx={{ color: config.color, fontSize: 20 }} />
                      <Typography variant="body2" sx={{ color: '#fff' }}>
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
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.6)',
                      }}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Paper>

        {/* メインキャンバス */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* ツールバー */}
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

          {/* React Flow キャンバス */}
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
            </ReactFlow>
          </Box>
        </Box>

        {/* 保存ダイアログ */}
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

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
        />
      </Box>
    );
  }

  // 一覧表示モード
  return (
    <Box sx={{ height: '100%', display: 'flex', bgcolor: '#1a1a2e' }}>
      {/* 左サイドバー - フロー一覧 */}
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
            ローカルストレージに保存
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

      {/* メインエリア - ウェルカム画面 */}
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
          フロービルダー準備完了 - {flows.length}個のフロー
        </Alert>

        <Box sx={{ textAlign: 'center', maxWidth: 500 }}>
          <HomeIcon sx={{ fontSize: 80, color: 'rgba(255,255,255,0.2)', mb: 2 }} />
          <Typography variant="h5" sx={{ color: '#fff', mb: 2, fontWeight: 600 }}>
            OwlAgent フロービルダー
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mb: 4 }}>
            左のサイドバーからフローを選択するか、
            新規作成ボタンをクリックしてフローを作成してください。
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 4 }}>
            フローはブラウザのローカルストレージに保存されます。
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

      {/* 削除確認ダイアログ */}
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

      {/* Snackbar */}
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
