'use client';

import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useRouter } from 'next/navigation';
import { IconButton, Tooltip, Paper, Typography, Box, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { OwlAgentNodeData } from '@/app/types/multi-agent';

const OwlAgentNode = memo(({ data, selected }: NodeProps<OwlAgentNodeData>) => {
  const router = useRouter();

  const handleEditClick = useCallback(() => {
    // 該当するOwlAgentの編集ページに遷移
    router.push(`/agent-canvas/${data.agentId}`);
  }, [data.agentId, router]);

  const getStatusColor = () => {
    switch (data.status) {
      case 'running':
        return '#FFA726';
      case 'success':
        return '#66BB6A';
      case 'error':
        return '#EF5350';
      default:
        return '#90CAF9';
    }
  };

  return (
    <Paper
      elevation={selected ? 8 : 3}
      sx={{
        padding: 2,
        borderRadius: 2,
        backgroundColor: '#2C2C2C',
        border: selected ? '2px solid #90CAF9' : '1px solid #444',
        minWidth: 200,
        position: 'relative',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        },
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 12,
          height: 12,
          backgroundColor: '#90CAF9',
          border: '2px solid #1E1E1E',
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* フクロウアイコン */}
        <Box
          sx={{
            fontSize: '2.5em',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        >
          🦉
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ color: '#E0E0E0', fontWeight: 'bold' }}>
            {data.agentName}
          </Typography>
          {data.agentDescription && (
            <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
              {data.agentDescription}
            </Typography>
          )}
        </Box>
      </Box>

      {/* ステータスインジケーター */}
      {data.status && (
        <Box
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
            border: '2px solid #1E1E1E',
            animation: data.status === 'running' ? 'pulse 1.5s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.5 },
              '100%': { opacity: 1 },
            },
          }}
        />
      )}

      {/* アクションボタン */}
      <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'flex-end' }}>
        <Tooltip title="エージェントを編集">
          <IconButton
            size="small"
            onClick={handleEditClick}
            sx={{
              color: '#90CAF9',
              '&:hover': {
                backgroundColor: 'rgba(144, 202, 249, 0.1)',
              },
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="エージェントを実行">
          <IconButton
            size="small"
            sx={{
              color: '#66BB6A',
              '&:hover': {
                backgroundColor: 'rgba(102, 187, 106, 0.1)',
              },
            }}
          >
            <PlayArrowIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 12,
          height: 12,
          backgroundColor: '#90CAF9',
          border: '2px solid #1E1E1E',
        }}
      />
    </Paper>
  );
});

OwlAgentNode.displayName = 'OwlAgentNode';

export default OwlAgentNode;