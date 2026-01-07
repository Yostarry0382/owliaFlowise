'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography, IconButton, Tooltip, Chip } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { getNodeDefinition, NodeHandle } from '../types/node-definitions';

export interface CustomNodeData {
  label: string;
  type: string;
  category: string;
  config?: Record<string, any>;
  agentId?: string; // OwlAgent参照用
  agentName?: string;
  // コールバック（dataに含める）
  onConfigure?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

function CustomNode({ id, data, selected }: NodeProps<CustomNodeData>) {
  const { onConfigure, onDelete } = data;
  const nodeDefinition = getNodeDefinition(data.type);

  const icon = nodeDefinition?.icon || '📦';
  const color = nodeDefinition?.color || '#607D8B';
  const inputHandles = nodeDefinition?.inputHandles || [];
  const outputHandles = nodeDefinition?.outputHandles || [];

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

  // ハンドルの位置を計算
  const getHandleOffset = (index: number, total: number, position: 'top' | 'bottom' | 'left' | 'right') => {
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
        const offset = getHandleOffset(index, posHandles.length, pos);

        const style: React.CSSProperties = isVertical
          ? { left: offset }
          : { top: offset };

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
        '&:hover': {
          borderColor: color,
        },
      }}
    >
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
          <Tooltip title="Configure">
            <IconButton
              size="small"
              onClick={handleConfigure}
              sx={{
                color: 'inherit',
                p: 0.25,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
              }}
            >
              <SettingsIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={handleDelete}
              sx={{
                color: 'inherit',
                p: 0.25,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
              }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
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
              .slice(0, 3)
              .map(([key, value]) => (
                <Typography
                  key={key}
                  sx={{
                    fontSize: '0.7rem',
                    color: '#888',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {key}: {typeof value === 'string' ? value.slice(0, 20) : String(value)}
                  {typeof value === 'string' && value.length > 20 ? '...' : ''}
                </Typography>
              ))}
          </Box>
        )}

        {/* 入出力ハンドルの説明 */}
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
          {inputHandles.length > 0 && (
            <Box>
              {inputHandles.map((h) => (
                <Typography
                  key={h.id}
                  sx={{ fontSize: '0.65rem', color: '#666' }}
                >
                  ← {h.label}
                </Typography>
              ))}
            </Box>
          )}
          {outputHandles.length > 0 && (
            <Box sx={{ textAlign: 'right' }}>
              {outputHandles.map((h) => (
                <Typography
                  key={h.id}
                  sx={{ fontSize: '0.65rem', color: '#666' }}
                >
                  {h.label} →
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* ハンドル */}
      {renderHandles(inputHandles, true)}
      {renderHandles(outputHandles, false)}
    </Box>
  );
}

export default memo(CustomNode);
