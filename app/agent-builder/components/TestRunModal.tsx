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
import InputIcon from '@mui/icons-material/Input';
import OutputIcon from '@mui/icons-material/Output';
import TimelineIcon from '@mui/icons-material/Timeline';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import CloudIcon from '@mui/icons-material/Cloud';
import { Node, Edge } from 'reactflow';
import { CustomNodeData } from './CustomNode';
import {
  validateFlowForFlowise,
  convertFlowToFlowise,
  FlowiseExecutionResult,
} from '../lib/flowise-converter';
import { parseError, getUserFriendlyMessage } from '../../lib/notification';

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
  status: 'success' | 'error' | 'skipped';
  error?: string;
  timestamp: number;
}

// 拡張された実行結果型
interface ExtendedExecutionResult extends FlowiseExecutionResult {
  logs?: string[];
  nodeExecutionLogs?: NodeExecutionLog[];
  executionMode?: 'flowise';
  agentReasoning?: any[];
}

export default function TestRunModal({ open, onClose, nodes, edges }: TestRunModalProps) {
  const [tabValue, setTabValue] = useState(0);
  const [input, setInput] = useState('');
  const [sessionId] = useState(() => `test-${Date.now()}`);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExtendedExecutionResult | null>(null);
  const [expandedOwlAgents, setExpandedOwlAgents] = useState<Map<string, ExpandedOwlAgentInfo>>(new Map());
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [flowiseStatus, setFlowiseStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

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
    const errors: string[] = [];

    try {
      await Promise.all(
        owlAgentNodes.map(async (node) => {
          const agentId = node.data.agentId || node.data.config?.agentId;
          if (!agentId || agentMap.has(agentId)) return;

          try {
            const response = await fetch(`/api/owlagents?id=${agentId}`);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            const agentData = await response.json();
            agentMap.set(agentId, {
              agentId: agentData.id,
              agentName: agentData.name,
              description: agentData.description,
              flow: agentData.flow,
            });
          } catch (error) {
            const appError = parseError(error);
            errors.push(`OwlAgent ${agentId}: ${getUserFriendlyMessage(appError)}`);
          }
        })
      );
      setExpandedOwlAgents(agentMap);

      // エラーがあった場合は結果に含める（ただし処理は継続）
      if (errors.length > 0) {
        console.warn('Some OwlAgents failed to load:', errors);
      }
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

  // Flowiseサーバーの接続状態を確認
  useEffect(() => {
    if (open) {
      setFlowiseStatus('checking');
      fetch('/api/flowise/status')
        .then((res) => res.json())
        .then((data) => {
          setFlowiseStatus(data.connected ? 'connected' : 'disconnected');
        })
        .catch(() => {
          setFlowiseStatus('disconnected');
        });
    }
  }, [open]);

  // バリデーション結果
  const validation = useMemo(() => {
    return validateFlowForFlowise(nodes, edges);
  }, [nodes, edges]);

  // Flowise形式に変換されたフローデータ（OwlAgentの展開情報を含む）
  const flowiseData = useMemo(() => {
    return convertFlowToFlowise(nodes, edges, undefined, expandedOwlAgents);
  }, [nodes, edges, expandedOwlAgents]);

  // JSON表示用のキャッシュ（毎フレームのJSON.stringifyを防止）
  const flowiseDataJson = useMemo(() => {
    return JSON.stringify(flowiseData, null, 2);
  }, [flowiseData]);

  // モーダルを開くたびにリセット
  useEffect(() => {
    if (open) {
      setResult(null);
    }
  }, [open]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRun = async () => {
    // ノードがあれば実行可能
    if (!input.trim() || nodes.length === 0) return;

    // Flowiseサーバーが接続されていない場合は実行不可
    if (flowiseStatus === 'disconnected') {
      setResult({
        success: false,
        error: 'Flowiseサーバーに接続できません。サーバーが起動しているか確認してください。',
      });
      return;
    }

    setIsRunning(true);
    setResult(null);
    setTabValue(2); // Executeタブに切り替え

    try {
      console.log('[TestRunModal] Executing with Flowise backend');

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
        }),
      });

      const data = await response.json();

      // 実行結果
      setResult({
        success: data.success,
        output: data.output,
        text: typeof data.output === 'string' ? data.output : JSON.stringify(data.output, null, 2),
        executionTime: data.executionTime,
        error: data.error,
        logs: data.logs,
        usedTools: data.usedTools || [{ tool: 'Flowise Backend', toolOutput: 'Executed successfully' }],
        nodeExecutionLogs: data.nodeExecutionLogs,
        executionMode: 'flowise',
        sourceDocuments: data.sourceDocuments,
        agentReasoning: data.agentReasoning,
      });
    } catch (error) {
      const appError = parseError(error);
      setResult({
        success: false,
        error: getUserFriendlyMessage(appError, 'フローの実行に失敗しました'),
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleClose = () => {
    setInput('');
    setResult(null);
    setTabValue(0);
    setExpandedOwlAgents(new Map());
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
          {/* Flowise接続状態 */}
          <Chip
            icon={<CloudIcon sx={{ fontSize: 12 }} />}
            label={
              flowiseStatus === 'checking'
                ? 'Checking...'
                : flowiseStatus === 'connected'
                ? 'Flowise Connected'
                : 'Flowise Offline'
            }
            size="small"
            sx={{
              ml: 1,
              bgcolor:
                flowiseStatus === 'checking'
                  ? '#666'
                  : flowiseStatus === 'connected'
                  ? '#4CAF50'
                  : '#f44336',
              color: '#fff',
              fontSize: '0.65rem',
              height: 22,
              '& .MuiChip-icon': { color: '#fff' },
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
                color: validation.valid ? '#4CAF50' : '#f44336',
                '& .MuiAlert-icon': { color: validation.valid ? '#4CAF50' : '#f44336' },
              }}
            >
              {validation.valid
                ? 'Flow validation passed'
                : `Found ${validation.errors.length} error(s)`}
            </Alert>
          </Box>

          {validation.errors.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ color: '#f44336', mb: 1, fontSize: '0.85rem', fontWeight: 600 }}>
                Errors:
              </Typography>
              <List dense sx={{ bgcolor: '#252536', borderRadius: 1, p: 1 }}>
                {validation.errors.map((error, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <ErrorIcon sx={{ color: '#f44336', fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={error}
                      primaryTypographyProps={{ sx: { color: '#fff', fontSize: '0.85rem' } }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {validation.warnings.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ color: '#ff9800', mb: 1, fontSize: '0.85rem', fontWeight: 600 }}>
                Warnings:
              </Typography>
              <List dense sx={{ bgcolor: '#252536', borderRadius: 1, p: 1 }}>
                {validation.warnings.map((warning, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <WarningIcon sx={{ color: '#ff9800', fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={warning}
                      primaryTypographyProps={{ sx: { color: '#fff', fontSize: '0.85rem' } }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography sx={{ color: '#888', fontSize: '0.85rem' }}>
              Nodes: {nodes.length} | Edges: {edges.length}
            </Typography>
          </Box>
        </TabPanel>

        {/* Flow Data Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ color: '#888', fontSize: '0.85rem', mb: 1 }}>
              Flowise Compatible Flow Data (JSON)
            </Typography>
            {isLoadingAgents && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CircularProgress size={14} sx={{ color: '#6366f1' }} />
                <Typography sx={{ color: '#6366f1', fontSize: '0.75rem' }}>
                  Loading OwlAgent details...
                </Typography>
              </Box>
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
              <pre
                style={{
                  color: '#8be9fd',
                  fontSize: '0.75rem',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {flowiseDataJson}
              </pre>
            </Paper>
          </Box>
        </TabPanel>

        {/* Execute Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ color: '#888', fontSize: '0.85rem', mb: 1 }}>
              Test Input
            </Typography>
            <TextField
              fullWidth
              multiline
              value={input}
              onChange={(e) => setInput(e.target.value)}
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
          {isRunning && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <CircularProgress size={24} sx={{ color: '#4CAF50' }} />
              <Typography sx={{ color: '#aaa' }}>
                Flowiseバックエンドでフローを実行中...
              </Typography>
            </Box>
          )}

          {/* 結果 */}
          {result && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
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
                {/* 実行モード表示 */}
                <Chip
                  icon={<CloudIcon sx={{ fontSize: 12 }} />}
                  label="Flowise"
                  size="small"
                  sx={{
                    bgcolor: '#2E7D32',
                    color: '#fff',
                    height: 20,
                    fontSize: '0.65rem',
                    '& .MuiChip-icon': { color: '#fff' },
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
                            log.status === 'skipped' ? '#9E9E9E' : '#888'
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
                            {log.status === 'skipped' && <SkipNextIcon sx={{ color: '#9E9E9E', fontSize: 16 }} />}
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
                            <Typography sx={{ color: '#888', fontSize: '0.7rem', ml: 'auto' }}>
                              {log.executionTime}ms
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Box sx={{ flex: 1, minWidth: 200 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                <InputIcon sx={{ fontSize: 14, color: '#888' }} />
                                <Typography sx={{ color: '#888', fontSize: '0.7rem' }}>
                                  Inputs
                                </Typography>
                              </Box>
                              <Paper
                                sx={{
                                  bgcolor: '#252536',
                                  p: 1,
                                  borderRadius: 1,
                                  maxHeight: 100,
                                  overflow: 'auto',
                                }}
                              >
                                <pre style={{ color: '#8be9fd', fontSize: '0.65rem', margin: 0 }}>
                                  {JSON.stringify(log.inputs, null, 2)}
                                </pre>
                              </Paper>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 200 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                <OutputIcon sx={{ fontSize: 14, color: '#888' }} />
                                <Typography sx={{ color: '#888', fontSize: '0.7rem' }}>
                                  Output
                                </Typography>
                              </Box>
                              <Paper
                                sx={{
                                  bgcolor: '#252536',
                                  p: 1,
                                  borderRadius: 1,
                                  maxHeight: 100,
                                  overflow: 'auto',
                                }}
                              >
                                <pre style={{ color: '#50fa7b', fontSize: '0.65rem', margin: 0 }}>
                                  {typeof log.output === 'string'
                                    ? log.output
                                    : JSON.stringify(log.output, null, 2)}
                                </pre>
                              </Paper>
                            </Box>
                          </Box>
                          {log.error && (
                            <Box sx={{ mt: 1 }}>
                              <Typography sx={{ color: '#f44336', fontSize: '0.75rem' }}>
                                Error: {log.error}
                              </Typography>
                            </Box>
                          )}
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
                      <DescriptionIcon sx={{ color: '#6366f1', fontSize: 18 }} />
                      <Typography sx={{ fontSize: '0.85rem' }}>
                        Source Documents ({result.sourceDocuments.length})
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {result.sourceDocuments.map((doc: any, index: number) => (
                      <Paper
                        key={index}
                        sx={{
                          bgcolor: '#1e1e2f',
                          p: 1.5,
                          mb: 1,
                          borderRadius: 1,
                        }}
                      >
                        <Typography sx={{ color: '#888', fontSize: '0.7rem', mb: 0.5 }}>
                          Source: {doc.metadata?.source || 'Unknown'}
                        </Typography>
                        <Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>
                          {doc.pageContent?.substring(0, 200)}
                          {doc.pageContent?.length > 200 ? '...' : ''}
                        </Typography>
                      </Paper>
                    ))}
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Agent Reasoning */}
              {result.agentReasoning && result.agentReasoning.length > 0 && (
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
                      <TimelineIcon sx={{ color: '#6366f1', fontSize: 18 }} />
                      <Typography sx={{ fontSize: '0.85rem' }}>
                        Agent Reasoning ({result.agentReasoning.length} steps)
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {result.agentReasoning.map((step: any, index: number) => (
                      <Paper
                        key={index}
                        sx={{
                          bgcolor: '#1e1e2f',
                          p: 1.5,
                          mb: 1,
                          borderRadius: 1,
                          borderLeft: '3px solid #6366f1',
                        }}
                      >
                        <Typography sx={{ color: '#6366f1', fontSize: '0.75rem', mb: 0.5 }}>
                          Step {index + 1}
                        </Typography>
                        <Typography sx={{ color: '#fff', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                          {typeof step === 'string' ? step : JSON.stringify(step, null, 2)}
                        </Typography>
                      </Paper>
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
                      <BuildIcon sx={{ color: '#6366f1', fontSize: 18 }} />
                      <Typography sx={{ fontSize: '0.85rem' }}>
                        Used Tools ({result.usedTools.length})
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {result.usedTools.map((tool: any, index: number) => (
                      <Paper
                        key={index}
                        sx={{
                          bgcolor: '#1e1e2f',
                          p: 1.5,
                          mb: 1,
                          borderRadius: 1,
                        }}
                      >
                        <Typography sx={{ color: '#6366f1', fontSize: '0.75rem', mb: 0.5 }}>
                          {tool.tool}
                        </Typography>
                        <Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>
                          {tool.toolOutput?.substring(0, 200) || 'No output'}
                          {tool.toolOutput?.length > 200 ? '...' : ''}
                        </Typography>
                      </Paper>
                    ))}
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Full Response (Debug) */}
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
                    <DataObjectIcon sx={{ color: '#888', fontSize: 18 }} />
                    <Typography sx={{ fontSize: '0.85rem', color: '#888' }}>
                      Full Response (Debug)
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper
                    sx={{
                      bgcolor: '#1e1e2f',
                      p: 1.5,
                      borderRadius: 1,
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    <pre style={{ color: '#8be9fd', fontSize: '0.7rem', margin: 0 }}>
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </Paper>
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
    </Dialog>
  );
}
