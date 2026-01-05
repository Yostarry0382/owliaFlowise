'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography, IconButton, Tooltip, Chip, Collapse } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { getNodeDefinition, NodeHandle } from '../types/node-definitions';

export interface EnhancedCustomNodeData {
  label: string;
  type: string;
  category: string;
  config?: Record<string, any>;
  humanReview?: {
    enabled: boolean;
    requiresApproval?: boolean;
    approvalMessage?: string;
    timeoutSeconds?: number;
    allowEdit?: boolean;
  };
  agentId?: string;
  agentName?: string;
  // コールバック
  onConfigure?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  // 実行状態
  executionStatus?: 'idle' | 'running' | 'success' | 'error' | 'pending-review';
  executionOutput?: string;
  // 表示モード
  isCompact?: boolean;
}

function EnhancedCustomNode({ id, data, selected }: NodeProps<EnhancedCustomNodeData>) {
  const { onConfigure, onDelete } = data;
  const [isExpanded, setIsExpanded] = useState(!data.isCompact);
  const nodeDefinition = getNodeDefinition(data.type);

  const icon = nodeDefinition?.icon || '📦';
  const color = nodeDefinition?.color || '#607D8B';
  const inputHandles = nodeDefinition?.inputHandles || [];
  const outputHandles = nodeDefinition?.outputHandles || [];

  // 設定状態を計算
  const configStatus = React.useMemo(() => {
    if (!nodeDefinition) return { status: 'unknown', missing: [] };

    const requiredInputs = nodeDefinition.inputs.filter((i) => i.required);
    const config = data.config || {};
    const missing = requiredInputs
      .filter((input) => !config[input.name])
      .map((input) => input.label);

    if (missing.length === 0 && Object.keys(config).length > 0) {
      return { status: 'configured', missing: [] };
    } else if (missing.length > 0) {
      return { status: 'incomplete', missing };
    }
    return { status: 'empty', missing: requiredInputs.map((i) => i.label) };
  }, [nodeDefinition, data.config]);

  // 実行ステータスの色
  const getStatusColor = () => {
    switch (data.executionStatus) {
      case 'running':
        return '#2196F3';
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#f44336';
      case 'pending-review':
        return '#FFD700';
      default:
        return 'transparent';
    }
  };

  // 実行ステータスアイコン
  const getStatusIcon = () => {
    switch (data.executionStatus) {
      case 'running':
        return <PlayArrowIcon sx={{ fontSize: 14, color: '#2196F3', animation: 'pulse 1s infinite' }} />;
      case 'success':
        return <CheckCircleIcon sx={{ fontSize: 14, color: '#4CAF50' }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 14, color: '#f44336' }} />;
      case 'pending-review':
        return <PersonIcon sx={{ fontSize: 14, color: '#FFD700' }} />;
      default:
        return null;
    }
  };

  const handleConfigure = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onConfigure) {
      onConfigure(id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(id);
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // ハンドルの位置を計算
  const getHandleOffset = (index: number, total: number) => {
    if (total === 1) return '50%';
    const spacing = 100 / (total + 1);
    return `${spacing * (index + 1)}%`;
  };

  const renderHandles = (handles: NodeHandle[], isInput: boolean) => {
    const groupedByPosition: Record<string, NodeHandle[]> = {
      top: [],
      bottom: [],
      left: [],
      right: [],
    };

    handles.forEach((handle) => {
      groupedByPosition[handle.position].push(handle);
    });

    return Object.entries(groupedByPosition).flatMap(([position, posHandles]) => {
      return posHandles.map((handle, index) => {
        const pos = position as 'top' | 'bottom' | 'left' | 'right';
        const isVertical = pos === 'top' || pos === 'bottom';
        const offset = getHandleOffset(index, posHandles.length);

        const style: React.CSSProperties = isVertical ? { left: offset } : { top: offset };

        return (
          <Tooltip key={handle.id} title={handle.label} placement={pos}>
            <Handle
              type={isInput ? 'target' : 'source'}
              position={
                pos === 'top'
                  ? Position.Top
                  : pos === 'bottom'
                  ? Position.Bottom
                  : pos === 'left'
                  ? Position.Left
                  : Position.Right
              }
              id={handle.id}
              style={{
                ...style,
                background: color,
                width: 10,
                height: 10,
                border: '2px solid #fff',
              }}
            />
          </Tooltip>
        );
      });
    });
  };

  // コンパクトモード
  if (!isExpanded) {
    return (
      <Box
        sx={{
          width: 60,
          height: 60,
          bgcolor: '#1e1e2f',
          borderRadius: 2,
          border: `2px solid ${selected ? color : '#2d2d44'}`,
          boxShadow: selected ? `0 0 10px ${color}40` : '0 2px 8px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s',
          '&:hover': { borderColor: color },
        }}
        onDoubleClick={handleToggleExpand}
      >
        {/* 実行ステータスインジケーター */}
        {data.executionStatus && data.executionStatus !== 'idle' && (
          <Box
            sx={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: getStatusColor(),
              border: '2px solid #1e1e2f',
            }}
          />
        )}

        <Typography sx={{ fontSize: '1.5rem' }}>{icon}</Typography>
        <Typography
          sx={{
            fontSize: '0.55rem',
            color: '#fff',
            fontWeight: 600,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            width: '90%',
          }}
        >
          {data.label}
        </Typography>

        {/* ステータスアイコン */}
        <Box sx={{ position: 'absolute', bottom: 2, right: 2 }}>
          {configStatus.status === 'configured' && (
            <CheckCircleIcon sx={{ fontSize: 12, color: '#4CAF50' }} />
          )}
          {configStatus.status === 'incomplete' && (
            <WarningIcon sx={{ fontSize: 12, color: '#ff9800' }} />
          )}
        </Box>

        {/* 展開ボタン */}
        <IconButton
          size="small"
          onClick={handleToggleExpand}
          sx={{
            position: 'absolute',
            bottom: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: color,
            color: '#fff',
            width: 16,
            height: 16,
            '&:hover': { bgcolor: color },
          }}
        >
          <ExpandMoreIcon sx={{ fontSize: 12 }} />
        </IconButton>

        {renderHandles(inputHandles, true)}
        {renderHandles(outputHandles, false)}
      </Box>
    );
  }

  // 拡張モード
  return (
    <Box
      sx={{
        minWidth: 180,
        maxWidth: 250,
        bgcolor: '#1e1e2f',
        borderRadius: 2,
        border: `2px solid ${selected ? color : '#2d2d44'}`,
        boxShadow: selected ? `0 0 10px ${color}40` : '0 2px 8px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        position: 'relative',
        '&:hover': { borderColor: color },
      }}
    >
      {/* 実行ステータスバー */}
      {data.executionStatus && data.executionStatus !== 'idle' && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            bgcolor: getStatusColor(),
          }}
        />
      )}

      {/* ヘッダー */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
          bgcolor: color,
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
          <Typography sx={{ fontSize: '1.1rem' }}>{icon}</Typography>
          <Typography
            sx={{
              fontSize: '0.85rem',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {data.label}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {getStatusIcon()}
          {data.humanReview?.enabled && (
            <Tooltip title="Human Review Enabled">
              <PersonIcon sx={{ fontSize: 16, color: '#FFD700' }} />
            </Tooltip>
          )}
          <Tooltip title="Configure">
            <IconButton
              size="small"
              onClick={handleConfigure}
              sx={{ color: 'inherit', p: 0.25, '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
            >
              <SettingsIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Collapse">
            <IconButton
              size="small"
              onClick={handleToggleExpand}
              sx={{ color: 'inherit', p: 0.25, '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
            >
              <ExpandLessIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={handleDelete}
              sx={{ color: 'inherit', p: 0.25, '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ステータスインジケーター */}
      <Box sx={{ px: 1.5, py: 0.5, bgcolor: '#252536' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {configStatus.status === 'configured' && (
            <>
              <CheckCircleIcon sx={{ fontSize: 14, color: '#4CAF50' }} />
              <Typography sx={{ color: '#4CAF50', fontSize: '0.7rem' }}>Configured</Typography>
            </>
          )}
          {configStatus.status === 'incomplete' && (
            <>
              <WarningIcon sx={{ fontSize: 14, color: '#ff9800' }} />
              <Typography sx={{ color: '#ff9800', fontSize: '0.7rem' }}>
                Missing: {configStatus.missing.slice(0, 2).join(', ')}
                {configStatus.missing.length > 2 && ` +${configStatus.missing.length - 2}`}
              </Typography>
            </>
          )}
          {configStatus.status === 'empty' && (
            <>
              <ErrorIcon sx={{ fontSize: 14, color: '#888' }} />
              <Typography sx={{ color: '#888', fontSize: '0.7rem' }}>Not configured</Typography>
            </>
          )}
        </Box>
      </Box>

      {/* ボディ */}
      <Box sx={{ px: 1.5, py: 1 }}>
        {/* OwlAgent参照の場合は参照名を表示 */}
        {data.type === 'owlAgentReference' && data.agentName && (
          <Chip
            icon={<span style={{ fontSize: '0.8rem' }}>🦉</span>}
            label={data.agentName}
            size="small"
            sx={{
              bgcolor: '#FF5722',
              color: '#fff',
              fontSize: '0.7rem',
              height: 22,
              mb: 0.5,
            }}
          />
        )}

        {/* 設定済み項目のプレビュー */}
        {data.config && Object.keys(data.config).length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            {Object.entries(data.config)
              .filter(([key, value]) => value && !key.includes('Key') && !key.includes('Password'))
              .slice(0, 2)
              .map(([key, value]) => (
                <Typography
                  key={key}
                  sx={{
                    fontSize: '0.65rem',
                    color: '#888',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ color: '#666' }}>{key}:</span>{' '}
                  {typeof value === 'string' ? value.slice(0, 15) : String(value)}
                  {typeof value === 'string' && value.length > 15 ? '...' : ''}
                </Typography>
              ))}
          </Box>
        )}

        {/* 入出力ハンドルの説明 */}
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
          {inputHandles.length > 0 && (
            <Box>
              {inputHandles.slice(0, 2).map((h) => (
                <Typography key={h.id} sx={{ fontSize: '0.6rem', color: '#666' }}>
                  ← {h.label}
                </Typography>
              ))}
              {inputHandles.length > 2 && (
                <Typography sx={{ fontSize: '0.6rem', color: '#555' }}>
                  +{inputHandles.length - 2} more
                </Typography>
              )}
            </Box>
          )}
          {outputHandles.length > 0 && (
            <Box sx={{ textAlign: 'right' }}>
              {outputHandles.slice(0, 2).map((h) => (
                <Typography key={h.id} sx={{ fontSize: '0.6rem', color: '#666' }}>
                  {h.label} →
                </Typography>
              ))}
              {outputHandles.length > 2 && (
                <Typography sx={{ fontSize: '0.6rem', color: '#555' }}>
                  +{outputHandles.length - 2} more
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* ハンドル */}
      {renderHandles(inputHandles, true)}
      {renderHandles(outputHandles, false)}

      {/* CSSアニメーション */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Box>
  );
}

export default memo(EnhancedCustomNode);
