'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Paper, Typography, Chip, Badge, Tooltip } from '@mui/material';
import {
  Psychology,
  Storage,
  Transform,
  Api,
  TextFields,
  Code,
  Memory,
  Chat,
  DocumentScanner,
  Functions,
  Person,
  CheckCircle,
} from '@mui/icons-material';

const getNodeIcon = (type: string) => {
  const iconProps = { fontSize: 'small' as const };

  switch (type) {
    case 'llm':
      return <Psychology {...iconProps} />;
    case 'chain':
      return <Functions {...iconProps} />;
    case 'prompt':
      return <TextFields {...iconProps} />;
    case 'memory':
      return <Memory {...iconProps} />;
    case 'vectorstore':
      return <Storage {...iconProps} />;
    case 'tool':
      return <Api {...iconProps} />;
    case 'chat':
      return <Chat {...iconProps} />;
    case 'document':
      return <DocumentScanner {...iconProps} />;
    case 'transform':
      return <Transform {...iconProps} />;
    case 'code':
      return <Code {...iconProps} />;
    default:
      return <Functions {...iconProps} />;
  }
};

const getNodeColor = (type: string) => {
  switch (type) {
    case 'llm':
      return '#e3f2fd';
    case 'chain':
      return '#f3e5f5';
    case 'prompt':
      return '#fff3e0';
    case 'memory':
      return '#e8f5e9';
    case 'vectorstore':
      return '#fce4ec';
    case 'tool':
      return '#e0f2f1';
    case 'chat':
      return '#f1f8e9';
    case 'document':
      return '#fef9e7';
    case 'transform':
      return '#ede7f6';
    case 'code':
      return '#e0f7fa';
    default:
      return '#f5f5f5';
  }
};

export function CustomNode({ data, selected }: NodeProps) {
  const nodeColor = getNodeColor(data.type);
  const nodeIcon = getNodeIcon(data.type);
  const hasHumanReview = data.humanReview?.enabled || false;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#555',
          width: 8,
          height: 8,
        }}
      />

      <Paper
        elevation={selected ? 6 : 2}
        sx={{
          p: 2,
          minWidth: 180,
          bgcolor: nodeColor,
          border: selected ? '2px solid #1976d2' : '1px solid #ddd',
          borderRadius: 2,
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative',
          '&:hover': {
            boxShadow: 4,
          },
        }}
      >
        {/* Human Review Indicator */}
        {hasHumanReview && (
          <Tooltip title="人間による確認が有効">
            <Box
              sx={{
                position: 'absolute',
                top: -8,
                right: -8,
                bgcolor: 'warning.main',
                color: 'white',
                borderRadius: '50%',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 2,
                animation: 'pulse 2s infinite',
                zIndex: 1,
              }}
            >
              <Person sx={{ fontSize: 16 }} />
            </Box>
          </Tooltip>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {nodeIcon}
          <Typography variant="subtitle2" fontWeight="bold">
            {data.label}
          </Typography>
        </Box>

        {data.config?.name && (
          <Typography variant="caption" color="text.secondary" display="block">
            {data.config.name}
          </Typography>
        )}

        {data.config?.model && (
          <Chip
            label={data.config.model}
            size="small"
            sx={{ mt: 0.5 }}
            variant="outlined"
          />
        )}

        {data.config?.database && (
          <Chip
            label={data.config.database}
            size="small"
            sx={{ mt: 0.5 }}
            variant="outlined"
          />
        )}

        {hasHumanReview && data.humanReview?.allowEdit && (
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
            <Chip
              icon={<Person />}
              label="確認必須"
              size="small"
              color="warning"
              variant="filled"
              sx={{ fontSize: '0.7rem' }}
            />
            {data.humanReview?.timeoutSeconds > 0 && (
              <Chip
                label={`${data.humanReview.timeoutSeconds}秒`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            )}
          </Box>
        )}
      </Paper>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#555',
          width: 8,
          height: 8,
        }}
      />

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
      `}</style>
    </>
  );
}