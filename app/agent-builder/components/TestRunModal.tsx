'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { Node, Edge } from 'reactflow';
import { CustomNodeData } from './CustomNode';
import {
  validateFlowForFlowise,
  convertFlowToFlowise,
  executeTemporaryFlow,
  FlowiseExecutionResult,
} from '../lib/flowise-converter';

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

export default function TestRunModal({ open, onClose, nodes, edges }: TestRunModalProps) {
  const [tabValue, setTabValue] = useState(0);
  const [input, setInput] = useState('');
  const [sessionId] = useState(() => `test-${Date.now()}`);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<FlowiseExecutionResult | null>(null);

  // バリデーション結果
  const validation = useMemo(() => {
    return validateFlowForFlowise(nodes, edges);
  }, [nodes, edges]);

  // Flowise形式に変換されたフローデータ
  const flowiseData = useMemo(() => {
    return convertFlowToFlowise(nodes, edges);
  }, [nodes, edges]);

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
    if (!input.trim() || !validation.valid) return;

    setIsRunning(true);
    setResult(null);
    setTabValue(2); // Executeタブに切り替え

    try {
      const executionResult = await executeTemporaryFlow(nodes, edges, input, sessionId);
      setResult(executionResult);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleClose = () => {
    setInput('');
    setResult(null);
    setTabValue(0);
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
            Test Run (Flowise Integration)
          </Typography>
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
          <Typography sx={{ color: '#888', fontSize: '0.85rem', mb: 1 }}>
            Flowise-Compatible Flow Data (JSON)
          </Typography>
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
          {isRunning && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <CircularProgress size={24} sx={{ color: '#6366f1' }} />
              <Typography sx={{ color: '#aaa' }}>
                Executing flow via Flowise API...
              </Typography>
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
          disabled={isRunning || !input.trim() || !validation.valid}
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
