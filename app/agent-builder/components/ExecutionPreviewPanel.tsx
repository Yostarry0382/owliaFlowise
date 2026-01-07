'use client';

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import { Node, Edge } from 'reactflow';
import { useTheme } from '../contexts/ThemeContext';
import { getNodeDefinition } from '../types/node-definitions';

interface ExecutionPreviewPanelProps {
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
}

interface ExecutionStep {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  nodeIcon: string;
  color: string;
  hasConfig: boolean;
  missingConfig: string[];
}

export default function ExecutionPreviewPanel({ nodes, edges, onClose }: ExecutionPreviewPanelProps) {
  const { colors } = useTheme();

  // トポロジカルソートで実行順序を計算
  const executionOrder = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    // 初期化
    nodes.forEach((node) => {
      inDegree.set(node.id, 0);
      adjacency.set(node.id, []);
    });

    // エッジから依存関係を構築
    edges.forEach((edge) => {
      const targets = adjacency.get(edge.source) || [];
      targets.push(edge.target);
      adjacency.set(edge.source, targets);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Kahnのアルゴリズム
    const queue: string[] = [];
    const result: ExecutionStep[] = [];

    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodeMap.get(nodeId);

      if (node) {
        const nodeDef = getNodeDefinition(node.data?.type);
        const requiredInputs = nodeDef?.inputs.filter((i) => i.required) || [];
        const config = node.data?.config || {};
        const missingConfig = requiredInputs
          .filter((input) => !config[input.name])
          .map((input) => input.label);

        result.push({
          nodeId: node.id,
          nodeLabel: node.data?.label || 'Unknown',
          nodeType: node.data?.type || 'unknown',
          nodeIcon: nodeDef?.icon || '📦',
          color: nodeDef?.color || '#607D8B',
          hasConfig: Object.keys(config).length > 0,
          missingConfig,
        });
      }

      const neighbors = adjacency.get(nodeId) || [];
      neighbors.forEach((neighbor) => {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      });
    }

    return result;
  }, [nodes, edges]);

  // 検証結果
  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 循環依存チェック
    if (executionOrder.length !== nodes.length) {
      errors.push('Circular dependency detected in the flow');
    }

    // 未設定ノードチェック
    executionOrder.forEach((step) => {
      if (step.missingConfig.length > 0) {
        warnings.push(`${step.nodeLabel}: Missing ${step.missingConfig.join(', ')}`);
      }
    });

    // 空のフローチェック
    if (nodes.length === 0) {
      errors.push('No nodes in the flow');
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }, [executionOrder, nodes.length]);

  return (
    <Paper
      elevation={4}
      sx={{
        position: 'absolute',
        right: 16,
        top: 60,
        width: 320,
        maxHeight: 'calc(100vh - 120px)',
        bgcolor: colors.bg.secondary,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      {/* ヘッダー */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          bgcolor: colors.bg.tertiary,
          borderBottom: `1px solid ${colors.border.primary}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlayArrowIcon sx={{ color: colors.accent, fontSize: 20 }} />
          <Typography sx={{ color: colors.text.primary, fontWeight: 600, fontSize: '0.9rem' }}>
            Execution Preview
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: colors.text.secondary }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* 検証結果 */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <Box sx={{ p: 1.5, borderBottom: `1px solid ${colors.border.primary}` }}>
          {validation.errors.map((error, index) => (
            <Alert
              key={`error-${index}`}
              severity="error"
              sx={{
                mb: 0.5,
                py: 0,
                fontSize: '0.75rem',
                bgcolor: 'rgba(211, 47, 47, 0.1)',
                '& .MuiAlert-icon': { fontSize: 16 },
              }}
            >
              {error}
            </Alert>
          ))}
          {validation.warnings.map((warning, index) => (
            <Alert
              key={`warning-${index}`}
              severity="warning"
              sx={{
                mb: 0.5,
                py: 0,
                fontSize: '0.75rem',
                bgcolor: 'rgba(237, 108, 2, 0.1)',
                '& .MuiAlert-icon': { fontSize: 16 },
              }}
            >
              {warning}
            </Alert>
          ))}
        </Box>
      )}

      {/* 実行ステップ */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        <Typography sx={{ color: colors.text.secondary, fontSize: '0.7rem', px: 1, mb: 1 }}>
          EXECUTION ORDER ({executionOrder.length} steps)
        </Typography>
        <List dense sx={{ py: 0 }}>
          {executionOrder.map((step, index) => (
            <React.Fragment key={step.nodeId}>
              <ListItem
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: colors.bg.tertiary,
                  border: `1px solid ${colors.border.primary}`,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: step.color,
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    mr: 1,
                  }}
                >
                  {index + 1}
                </Box>
                <ListItemIcon sx={{ minWidth: 28, fontSize: '1rem' }}>
                  {step.nodeIcon}
                </ListItemIcon>
                <ListItemText
                  primary={step.nodeLabel}
                  secondary={step.nodeType}
                  primaryTypographyProps={{
                    sx: { color: colors.text.primary, fontSize: '0.8rem', fontWeight: 500 },
                  }}
                  secondaryTypographyProps={{
                    sx: { color: colors.text.tertiary, fontSize: '0.65rem' },
                  }}
                />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {step.missingConfig.length > 0 ? (
                    <Tooltip title={`Missing: ${step.missingConfig.join(', ')}`}>
                      <WarningIcon sx={{ fontSize: 16, color: '#ff9800' }} />
                    </Tooltip>
                  ) : step.hasConfig ? (
                    <Tooltip title="Configured">
                      <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} />
                    </Tooltip>
                  ) : null}
                </Box>
              </ListItem>
              {index < executionOrder.length - 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
                  <ArrowForwardIcon
                    sx={{
                      fontSize: 16,
                      color: colors.text.tertiary,
                      transform: 'rotate(90deg)',
                    }}
                  />
                </Box>
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>

      {/* フッター */}
      <Box
        sx={{
          p: 1.5,
          borderTop: `1px solid ${colors.border.primary}`,
          bgcolor: colors.bg.tertiary,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          {validation.isValid ? (
            <>
              <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} />
              <Typography sx={{ color: '#4caf50', fontSize: '0.8rem' }}>
                Ready to execute
              </Typography>
            </>
          ) : (
            <>
              <ErrorIcon sx={{ fontSize: 16, color: '#f44336' }} />
              <Typography sx={{ color: '#f44336', fontSize: '0.8rem' }}>
                Fix errors before executing
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </Paper>
  );
}
