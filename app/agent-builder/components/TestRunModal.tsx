'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Paper,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import DataObjectIcon from '@mui/icons-material/DataObject';
import VerifiedIcon from '@mui/icons-material/Verified';
import DescriptionIcon from '@mui/icons-material/Description';
import BuildIcon from '@mui/icons-material/Build';
import PersonIcon from '@mui/icons-material/Person';
import InputIcon from '@mui/icons-material/Input';
import OutputIcon from '@mui/icons-material/Output';
import TimelineIcon from '@mui/icons-material/Timeline';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import { Node, Edge } from 'reactflow';
import { CustomNodeData } from './CustomNode';
import HumanReviewModal, { PendingReview, ReviewDecision } from './HumanReviewModal';
import {
  validateFlowForFlowise,
  convertFlowToFlowise,
  FlowiseExecutionResult,
} from '../lib/flowise-converter';

// OwlAgentの展開情報の型
interface ExpandedOwlAgentInfo {
  agentId: string;
  agentName: string;
  description?: string;
  flow?: {
    nodes: any[];
    edges: any[];
  };
}

interface TestRunModalProps {
  open: boolean;
  onClose: () => void;
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

// ノード実行ログの型
interface NodeExecutionLog {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  inputs: Record<string, any>;
  output: any;
  executionTime: number;
  status: 'success' | 'error' | 'pending_review' | 'skipped';
  error?: string;
  timestamp: number;
}

// 拡張された実行結果型（Human Review対応）
interface ExtendedExecutionResult extends FlowiseExecutionResult {
  pendingReview?: PendingReview;
  logs?: string[];
  nodeExecutionLogs?: NodeExecutionLog[];
}

export default function TestRunModal({ open, onClose, nodes, edges }: TestRunModalProps) {
  const [tabValue, setTabValue] = useState(0);
  const [input, setInput] = useState('');
  const [sessionId] = useState(() => `test-${Date.now()}`);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExtendedExecutionResult | null>(null);
  const [expandedOwlAgents, setExpandedOwlAgents] = useState<Map<string, ExpandedOwlAgentInfo>>(new Map());
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  // Human Review状態
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [executionContext, setExecutionContext] = useState<{
    nodeOutputs: Record<string, any>;
    currentNodeIndex: number;
  } | null>(null);

  // OwlAgentノードを検出
  const owlAgentNodes = useMemo(() => {
    return nodes.filter(
      (n) => n.data.type === 'owlAgentReference' && (n.data.agentId || n.data.config?.agentId)
    );
  }, [nodes]);

  // OwlAgentの内部情報を取得
  const fetchOwlAgentDetails = useCallback(async () => {
    if (owlAgentNodes.length === 0) return;

    setIsLoadingAgents(true);
    const agentMap = new Map<string, ExpandedOwlAgentInfo>();

    try {
      for (const node of owlAgentNodes) {
        const agentId = node.data.agentId || node.data.config?.agentId;
        if (!agentId || agentMap.has(agentId)) continue;

        try {
          const response = await fetch(`/api/owlagents?id=${agentId}`);
          if (response.ok) {
            const agentData = await response.json();
            agentMap.set(agentId, {
              agentId: agentData.id,
              agentName: agentData.name,
              description: agentData.description,
              flow: agentData.flow,
            });
          }
        } catch (error) {
          console.error(`Failed to fetch OwlAgent ${agentId}:`, error);
        }
      }
      setExpandedOwlAgents(agentMap);
    } finally {
      setIsLoadingAgents(false);
    }
  }, [owlAgentNodes]);

  // モーダルを開いたときにOwlAgentの情報を取得
  useEffect(() => {
    if (open && owlAgentNodes.length > 0) {
      fetchOwlAgentDetails();
    }
  }, [open, owlAgentNodes.length, fetchOwlAgentDetails]);

  // バリデーション結果
  const validation = useMemo(() => {
    return validateFlowForFlowise(nodes, edges);
  }, [nodes, edges]);

  // Flowise形式に変換されたフローデータ（OwlAgentの展開情報を含む）
  const flowiseData = useMemo(() => {
    return convertFlowToFlowise(nodes, edges, undefined, expandedOwlAgents);
  }, [nodes, edges, expandedOwlAgents]);

  // モーダルを開くたびにリセット
  useEffect(() => {
    if (open) {
      setResult(null);
    }
  }, [open]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Human Reviewの決定を処理
  const handleReviewDecision = useCallback(async (decision: ReviewDecision) => {
    setShowReviewModal(false);

    if (!pendingReview) return;

    // 却下の場合
    if (decision.status === 'rejected') {
      setResult({
        success: false,
        error: `実行がノード "${pendingReview.nodeName || pendingReview.nodeId}" で却下されました。${decision.comments ? ` コメント: ${decision.comments}` : ''}`,
      });
      setPendingReview(null);
      setExecutionContext(null);
      setIsRunning(false);
      return;
    }

    // 承認または編集の場合、フロー実行を継続
    setIsRunning(true);

    try {
      const response = await fetch('/api/flows/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'continue-after-review',
          nodes: nodes.map(n => ({
            id: n.id,
            type: n.data.type || n.type || 'custom',
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
          edges: edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
          sessionId,
          reviewNodeId: pendingReview.nodeId,
          reviewDecision: decision,
          previousOutputs: executionContext?.nodeOutputs,
          input,
          useNative: true,
        }),
      });

      const data = await response.json();

      // 再び Human Review が必要な場合
      if (data.pendingReview) {
        const nodeName = nodes.find(n => n.id === data.pendingReview.nodeId)?.data.label;
        setPendingReview({
          ...data.pendingReview,
          nodeName,
        });
        setExecutionContext({
          nodeOutputs: data.nodeOutputs || {},
          currentNodeIndex: data.currentNodeIndex || 0,
        });
        setShowReviewModal(true);
        setResult({
          success: true,
          text: '人間による確認を待っています...',
          output: data.pendingReview.output,
          executionTime: data.executionTime,
          logs: data.logs,
          pendingReview: data.pendingReview,
          nodeExecutionLogs: data.nodeExecutionLogs,
        });
      } else {
        // 実行完了
        setResult({
          success: data.success,
          output: data.output,
          text: typeof data.output === 'string' ? data.output : JSON.stringify(data.output, null, 2),
          executionTime: data.executionTime,
          error: data.error,
          logs: data.logs,
          nodeExecutionLogs: data.nodeExecutionLogs,
        });
        setPendingReview(null);
        setExecutionContext(null);
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsRunning(false);
    }
  }, [pendingReview, nodes, edges, sessionId, executionContext, input]);

  const handleRun = async () => {
    // ネイティブエンジンはより柔軟なので、ノードがあれば実行可能
    if (!input.trim() || nodes.length === 0) return;

    setIsRunning(true);
    setResult(null);
    setPendingReview(null);
    setExecutionContext(null);
    setTabValue(2); // Executeタブに切り替え

    try {
      // ネイティブエンジンAPIを直接呼び出し（Human Review対応）
      const response = await fetch('/api/flows/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: nodes.map(n => ({
            id: n.id,
            type: n.data.type || n.type || 'custom',
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
          edges: edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
          input,
          sessionId,
          useNative: true,
        }),
      });

      const data = await response.json();

      // Human Review が必要な場合
      if (data.pendingReview) {
        const nodeName = nodes.find(n => n.id === data.pendingReview.nodeId)?.data.label;
        setPendingReview({
          ...data.pendingReview,
          nodeName,
        });
        setExecutionContext({
          nodeOutputs: data.nodeOutputs || {},
          currentNodeIndex: data.currentNodeIndex || 0,
        });
        setShowReviewModal(true);
        setResult({
          success: true,
          text: '人間による確認を待っています...',
          output: data.pendingReview.output,
          executionTime: data.executionTime,
          logs: data.logs,
          pendingReview: data.pendingReview,
          nodeExecutionLogs: data.nodeExecutionLogs,
        });
      } else {
        // 通常の実行結果
        setResult({
          success: data.success,
          output: data.output,
          text: typeof data.output === 'string' ? data.output : JSON.stringify(data.output, null, 2),
          executionTime: data.executionTime,
          error: data.error,
          logs: data.logs,
          usedTools: [{ tool: 'OwliaFabrica Native Engine', toolOutput: 'Executed successfully' }],
          nodeExecutionLogs: data.nodeExecutionLogs,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      if (!pendingReview) {
        setIsRunning(false);
      }
    }
  };

  const handleClose = () => {
    setInput('');
    setResult(null);
    setTabValue(0);
    setExpandedOwlAgents(new Map());
    setPendingReview(null);
    setExecutionContext(null);
    setShowReviewModal(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1e1e2f',
          color: '#fff',
          borderRadius: 2,
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #2d2d44',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlayArrowIcon sx={{ color: '#4CAF50' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Test Run
          </Typography>
          <Chip
            label="Native Engine"
            size="small"
            sx={{
              bgcolor: '#6366f1',
              color: '#fff',
              fontSize: '0.65rem',
              height: 20,
            }}
          />
        </Box>
        <IconButton onClick={handleClose} sx={{ color: '#888' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: '#2d2d44' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': { color: '#888' },
            '& .Mui-selected': { color: '#6366f1' },
            '& .MuiTabs-indicator': { bgcolor: '#6366f1' },
          }}
        >
          <Tab
            icon={<VerifiedIcon />}
            iconPosition="start"
            label="Validation"
            sx={{ minHeight: 48 }}
          />
          <Tab
            icon={<DataObjectIcon />}
            iconPosition="start"
            label="Flow Data"
            sx={{ minHeight: 48 }}
          />
          <Tab
            icon={<PlayArrowIcon />}
            iconPosition="start"
            label="Execute"
            sx={{ minHeight: 48 }}
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ pt: 2 }}>
        {/* Validation Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2 }}>
            <Alert
              severity={validation.valid ? 'success' : 'error'}
              sx={{
                bgcolor: validation.valid ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                color: '#fff',
                '& .MuiAlert-icon': {
                  color: validation.valid ? '#4CAF50' : '#f44336',
                },
              }}
            >
              {validation.valid
                ? 'フローはFlowise実行の準備ができています'
                : 'フローにエラーがあります。修正してください。'}
            </Alert>
          </Box>

          {validation.errors.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ color: '#f44336', fontWeight: 600, mb: 1 }}>
                Errors ({validation.errors.length})
              </Typography>
              <List dense>
                {validation.errors.map((error, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <ErrorIcon sx={{ color: '#f44336', fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={error}
                      primaryTypographyProps={{ sx: { color: '#fff', fontSize: '0.9rem' } }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {validation.warnings.length > 0 && (
            <Box>
              <Typography sx={{ color: '#ff9800', fontWeight: 600, mb: 1 }}>
                Warnings ({validation.warnings.length})
              </Typography>
              <List dense>
                {validation.warnings.map((warning, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <WarningIcon sx={{ color: '#ff9800', fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={warning}
                      primaryTypographyProps={{ sx: { color: '#fff', fontSize: '0.9rem' } }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography sx={{ color: '#888', fontSize: '0.85rem', mb: 1 }}>
              Flow Summary
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`${nodes.length} Nodes`}
                size="small"
                sx={{ bgcolor: '#252536', color: '#fff' }}
              />
              <Chip
                label={`${edges.length} Connections`}
                size="small"
                sx={{ bgcolor: '#252536', color: '#fff' }}
              />
            </Box>
          </Box>
        </TabPanel>

        {/* Flow Data Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography sx={{ color: '#888', fontSize: '0.85rem' }}>
              Flowise-Compatible Flow Data (JSON)
            </Typography>
            {isLoadingAgents && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CircularProgress size={14} sx={{ color: '#6366f1' }} />
                <Typography sx={{ color: '#6366f1', fontSize: '0.75rem' }}>
                  OwlAgent情報を読み込み中...
                </Typography>
              </Box>
            )}
          </Box>

          {/* OwlAgentノードがある場合の情報表示 */}
          {owlAgentNodes.length > 0 && (
            <Alert
              severity="info"
              sx={{
                mb: 2,
                bgcolor: '#1a2744',
                color: '#90caf9',
                '& .MuiAlert-icon': { color: '#90caf9' },
              }}
            >
              <Typography sx={{ fontSize: '0.8rem' }}>
                このフローには {owlAgentNodes.length} 個のOwlAgentノードが含まれています。
                {expandedOwlAgents.size > 0 &&
                  ` 内部フロー情報は「expandedOwlAgents」セクションに展開されています。`}
              </Typography>
            </Alert>
          )}

          <Paper
            sx={{
              bgcolor: '#252536',
              border: '1px solid #3d3d54',
              borderRadius: 1,
              p: 2,
              maxHeight: 400,
              overflow: 'auto',
            }}
          >
            <Typography
              component="pre"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: '#aaa',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                m: 0,
              }}
            >
              {JSON.stringify(flowiseData, null, 2)}
            </Typography>
          </Paper>
        </TabPanel>

        {/* Execute Tab */}
        <TabPanel value={tabValue} index={2}>
          {/* 入力 */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ color: '#888', fontSize: '0.85rem', mb: 1 }}>
              Test Input
            </Typography>
            <TextField
              value={input}
              onChange={(e) => setInput(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Enter your test message..."
              disabled={isRunning}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#3d3d54' },
                  '&:hover fieldset': { borderColor: '#4d4d64' },
                  '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                },
              }}
            />
            <Typography sx={{ color: '#666', fontSize: '0.75rem', mt: 0.5 }}>
              Session ID: {sessionId}
            </Typography>
          </Box>

          {/* 実行中 */}
          {isRunning && !pendingReview && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <CircularProgress size={24} sx={{ color: '#6366f1' }} />
              <Typography sx={{ color: '#aaa' }}>
                ネイティブエンジンでフローを実行中...
              </Typography>
            </Box>
          )}

          {/* Human Review 待機中 */}
          {pendingReview && (
            <Box
              sx={{
                p: 2,
                mb: 2,
                bgcolor: 'rgba(255, 215, 0, 0.1)',
                border: '2px solid #FFD700',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PersonIcon sx={{ color: '#FFD700' }} />
                <Typography sx={{ color: '#FFD700', fontWeight: 600 }}>
                  人間による確認を待っています
                </Typography>
              </Box>
              <Typography sx={{ color: '#aaa', fontSize: '0.85rem', mb: 1 }}>
                ノード: {pendingReview.nodeName || pendingReview.nodeId}
              </Typography>
              <Typography sx={{ color: '#888', fontSize: '0.8rem' }}>
                {pendingReview.message || '出力内容を確認してください'}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowReviewModal(true)}
                sx={{
                  mt: 1,
                  color: '#FFD700',
                  borderColor: '#FFD700',
                  '&:hover': { borderColor: '#FFD700', bgcolor: 'rgba(255, 215, 0, 0.1)' },
                }}
              >
                レビューを開く
              </Button>
            </Box>
          )}

          {/* 結果 */}
          {result && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography sx={{ color: '#888', fontSize: '0.85rem' }}>Result</Typography>
                <Chip
                  label={result.success ? 'Success' : 'Failed'}
                  size="small"
                  sx={{
                    bgcolor: result.success ? '#4CAF50' : '#f44336',
                    color: '#fff',
                    height: 20,
                    fontSize: '0.7rem',
                  }}
                />
                {result.executionTime && (
                  <Typography sx={{ color: '#888', fontSize: '0.75rem' }}>
                    {result.executionTime}ms
                  </Typography>
                )}
              </Box>

              {result.error ? (
                <Paper
                  sx={{
                    bgcolor: 'rgba(244, 67, 54, 0.1)',
                    border: '1px solid #f44336',
                    borderRadius: 1,
                    p: 2,
                  }}
                >
                  <Typography sx={{ color: '#f44336', fontSize: '0.9rem' }}>
                    {result.error}
                  </Typography>
                </Paper>
              ) : (
                <Paper
                  sx={{
                    bgcolor: '#252536',
                    border: '1px solid #3d3d54',
                    borderRadius: 1,
                    p: 2,
                  }}
                >
                  <Typography
                    sx={{
                      color: '#fff',
                      fontSize: '0.9rem',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {result.text || JSON.stringify(result.output, null, 2)}
                  </Typography>
                </Paper>
              )}

              {/* Node Execution Logs */}
              {result.nodeExecutionLogs && result.nodeExecutionLogs.length > 0 && (
                <Accordion
                  defaultExpanded
                  sx={{
                    bgcolor: '#252536',
                    color: '#fff',
                    mt: 2,
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#888' }} />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TimelineIcon sx={{ color: '#6366f1', fontSize: 18 }} />
                      <Typography sx={{ fontSize: '0.85rem' }}>
                        Node Execution Log ({result.nodeExecutionLogs.length} nodes)
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    {result.nodeExecutionLogs.map((log, index) => (
                      <Accordion
                        key={log.nodeId}
                        sx={{
                          bgcolor: '#1e1e2f',
                          color: '#fff',
                          '&:before': { display: 'none' },
                          borderLeft: `3px solid ${
                            log.status === 'success' ? '#4CAF50' :
                            log.status === 'error' ? '#f44336' :
                            log.status === 'pending_review' ? '#FFD700' : '#888'
                          }`,
                          mb: 0.5,
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon sx={{ color: '#888' }} />}
                          sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                            <Chip
                              label={`#${index + 1}`}
                              size="small"
                              sx={{
                                bgcolor: '#3d3d54',
                                color: '#fff',
                                height: 20,
                                fontSize: '0.65rem',
                              }}
                            />
                            {log.status === 'success' && <CheckCircleIcon sx={{ color: '#4CAF50', fontSize: 16 }} />}
                            {log.status === 'error' && <ErrorIcon sx={{ color: '#f44336', fontSize: 16 }} />}
                            {log.status === 'pending_review' && <PauseCircleIcon sx={{ color: '#FFD700', fontSize: 16 }} />}
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                              {log.nodeName}
                            </Typography>
                            <Chip
                              label={log.nodeType}
                              size="small"
                              sx={{
                                bgcolor: '#6366f1',
                                color: '#fff',
                                height: 18,
                                fontSize: '0.6rem',
                              }}
                            />
                            <Typography sx={{ fontSize: '0.7rem', color: '#888', ml: 'auto', mr: 1 }}>
                              {log.executionTime}ms
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                          {/* Inputs */}
                          <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                              <InputIcon sx={{ color: '#90CAF9', fontSize: 14 }} />
                              <Typography sx={{ fontSize: '0.75rem', color: '#90CAF9', fontWeight: 600 }}>
                                Inputs
                              </Typography>
                            </Box>
                            <Paper
                              sx={{
                                bgcolor: '#252536',
                                p: 1,
                                borderRadius: 1,
                                maxHeight: 150,
                                overflow: 'auto',
                              }}
                            >
                              <Typography
                                component="pre"
                                sx={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.7rem',
                                  color: '#aaa',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-all',
                                  m: 0,
                                }}
                              >
                                {Object.keys(log.inputs).length > 0
                                  ? JSON.stringify(log.inputs, null, 2)
                                  : '(no inputs)'}
                              </Typography>
                            </Paper>
                          </Box>

                          {/* Output */}
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                              <OutputIcon sx={{ color: '#A5D6A7', fontSize: 14 }} />
                              <Typography sx={{ fontSize: '0.75rem', color: '#A5D6A7', fontWeight: 600 }}>
                                Output
                              </Typography>
                            </Box>
                            <Paper
                              sx={{
                                bgcolor: '#252536',
                                p: 1,
                                borderRadius: 1,
                                maxHeight: 200,
                                overflow: 'auto',
                              }}
                            >
                              <Typography
                                component="pre"
                                sx={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.7rem',
                                  color: log.status === 'error' ? '#f44336' : '#aaa',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-all',
                                  m: 0,
                                }}
                              >
                                {log.error
                                  ? `Error: ${log.error}`
                                  : log.output !== null && log.output !== undefined
                                  ? (typeof log.output === 'string' ? log.output : JSON.stringify(log.output, null, 2))
                                  : '(no output)'}
                              </Typography>
                            </Paper>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Source Documents */}
              {result.sourceDocuments && result.sourceDocuments.length > 0 && (
                <Accordion
                  sx={{
                    bgcolor: '#252536',
                    color: '#fff',
                    mt: 2,
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#888' }} />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionIcon sx={{ color: '#888', fontSize: 18 }} />
                      <Typography sx={{ fontSize: '0.85rem' }}>
                        Source Documents ({result.sourceDocuments.length})
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {result.sourceDocuments.map((doc, index) => (
                      <Box
                        key={index}
                        sx={{
                          p: 1,
                          mb: 1,
                          bgcolor: '#1e1e2f',
                          borderRadius: 1,
                        }}
                      >
                        <Typography
                          sx={{ fontSize: '0.8rem', color: '#aaa', whiteSpace: 'pre-wrap' }}
                        >
                          {doc.pageContent || JSON.stringify(doc, null, 2)}
                        </Typography>
                        {doc.metadata && (
                          <Typography sx={{ fontSize: '0.7rem', color: '#666', mt: 0.5 }}>
                            Source: {doc.metadata.source || 'Unknown'}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Used Tools */}
              {result.usedTools && result.usedTools.length > 0 && (
                <Accordion
                  sx={{
                    bgcolor: '#252536',
                    color: '#fff',
                    mt: 2,
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#888' }} />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BuildIcon sx={{ color: '#888', fontSize: 18 }} />
                      <Typography sx={{ fontSize: '0.85rem' }}>
                        Used Tools ({result.usedTools.length})
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {result.usedTools.map((tool, index) => (
                      <Box
                        key={index}
                        sx={{
                          p: 1,
                          mb: 1,
                          bgcolor: '#1e1e2f',
                          borderRadius: 1,
                        }}
                      >
                        <Typography sx={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                          {tool.tool || tool.name || 'Unknown Tool'}
                        </Typography>
                        {tool.toolInput && (
                          <Typography
                            sx={{ fontSize: '0.75rem', color: '#888', fontFamily: 'monospace' }}
                          >
                            Input: {JSON.stringify(tool.toolInput)}
                          </Typography>
                        )}
                        {tool.toolOutput && (
                          <Typography
                            sx={{
                              fontSize: '0.75rem',
                              color: '#aaa',
                              mt: 0.5,
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            Output: {tool.toolOutput}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Full Response */}
              <Accordion
                sx={{
                  bgcolor: '#252536',
                  color: '#fff',
                  mt: 2,
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#888' }} />}>
                  <Typography sx={{ fontSize: '0.85rem' }}>Full Response (JSON)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography
                    component="pre"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      color: '#aaa',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      m: 0,
                    }}
                  >
                    {JSON.stringify(result.output, null, 2)}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid #2d2d44' }}>
        <Button
          onClick={handleClose}
          sx={{
            color: '#888',
            '&:hover': { bgcolor: '#252536' },
          }}
        >
          Close
        </Button>
        <Button
          variant="contained"
          startIcon={
            isRunning ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <PlayArrowIcon />
          }
          onClick={handleRun}
          disabled={isRunning || !input.trim() || nodes.length === 0}
          sx={{
            bgcolor: '#4CAF50',
            '&:hover': { bgcolor: '#43A047' },
            '&:disabled': { bgcolor: '#2d2d44', color: '#666' },
          }}
        >
          {isRunning ? 'Running...' : 'Run Test'}
        </Button>
      </DialogActions>

      {/* Human Review Modal */}
      <HumanReviewModal
        open={showReviewModal}
        pendingReview={pendingReview}
        onDecision={handleReviewDecision}
        onClose={() => {
          setShowReviewModal(false);
          // レビューモーダルを閉じても実行は継続しない
          if (pendingReview) {
            setResult({
              success: false,
              error: '人間による確認がキャンセルされました',
            });
            setPendingReview(null);
            setExecutionContext(null);
            setIsRunning(false);
          }
        }}
      />
    </Dialog>
  );
}
