'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Tooltip,
  Button,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import RestoreIcon from '@mui/icons-material/Restore';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CircleIcon from '@mui/icons-material/Circle';
import { useTheme } from '../contexts/ThemeContext';
import { useFlowHistoryStore } from '../stores/flowHistoryStore';

interface VersionHistoryPanelProps {
  onRestore: (nodes: any[], edges: any[]) => void;
  onClose: () => void;
}

export default function VersionHistoryPanel({ onRestore, onClose }: VersionHistoryPanelProps) {
  const { colors } = useTheme();
  const { history, currentIndex, undo, redo, canUndo, canRedo, clearHistory, restoreSnapshot } =
    useFlowHistoryStore();

  const handleUndo = () => {
    const snapshot = undo();
    if (snapshot) {
      onRestore(snapshot.nodes, snapshot.edges);
    }
  };

  const handleRedo = () => {
    const snapshot = redo();
    if (snapshot) {
      onRestore(snapshot.nodes, snapshot.edges);
    }
  };

  const handleRestore = (snapshotId: string) => {
    const snapshot = restoreSnapshot(snapshotId);
    if (snapshot) {
      onRestore(snapshot.nodes, snapshot.edges);
    }
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) {
      return 'Today';
    }
    return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  return (
    <Paper
      elevation={4}
      sx={{
        position: 'absolute',
        left: 16,
        top: 60,
        width: 300,
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
          <HistoryIcon sx={{ color: colors.accent, fontSize: 20 }} />
          <Typography sx={{ color: colors.text.primary, fontWeight: 600, fontSize: '0.9rem' }}>
            Version History
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: colors.text.secondary }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Undo/Redo ボタン */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          p: 1.5,
          borderBottom: `1px solid ${colors.border.primary}`,
        }}
      >
        <Button
          variant="outlined"
          size="small"
          startIcon={<UndoIcon />}
          onClick={handleUndo}
          disabled={!canUndo()}
          fullWidth
          sx={{
            color: canUndo() ? colors.text.primary : colors.text.tertiary,
            borderColor: colors.border.secondary,
            fontSize: '0.75rem',
            '&:hover': { borderColor: colors.accent },
            '&.Mui-disabled': {
              color: colors.text.tertiary,
              borderColor: colors.border.primary,
            },
          }}
        >
          Undo
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RedoIcon />}
          onClick={handleRedo}
          disabled={!canRedo()}
          fullWidth
          sx={{
            color: canRedo() ? colors.text.primary : colors.text.tertiary,
            borderColor: colors.border.secondary,
            fontSize: '0.75rem',
            '&:hover': { borderColor: colors.accent },
            '&.Mui-disabled': {
              color: colors.text.tertiary,
              borderColor: colors.border.primary,
            },
          }}
        >
          Redo
        </Button>
      </Box>

      {/* 履歴リスト */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {history.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <HistoryIcon sx={{ fontSize: 40, color: colors.text.tertiary, mb: 1 }} />
            <Typography sx={{ color: colors.text.tertiary, fontSize: '0.85rem' }}>
              No history yet
            </Typography>
            <Typography sx={{ color: colors.text.tertiary, fontSize: '0.75rem', mt: 0.5 }}>
              Changes will appear here
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ py: 0 }}>
            {[...history].reverse().map((snapshot, reversedIndex) => {
              const index = history.length - 1 - reversedIndex;
              const isCurrent = index === currentIndex;

              return (
                <ListItem
                  key={snapshot.id}
                  sx={{
                    borderLeft: isCurrent
                      ? `3px solid ${colors.accent}`
                      : '3px solid transparent',
                    bgcolor: isCurrent ? `${colors.accent}15` : 'transparent',
                    '&:hover': { bgcolor: colors.bg.hover },
                    cursor: 'pointer',
                  }}
                  onClick={() => handleRestore(snapshot.id)}
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <CircleIcon
                      sx={{
                        fontSize: 8,
                        color: isCurrent ? colors.accent : colors.text.tertiary,
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={snapshot.description}
                    secondary={`${formatDate(snapshot.timestamp)} ${formatTime(snapshot.timestamp)}`}
                    primaryTypographyProps={{
                      sx: {
                        color: colors.text.primary,
                        fontSize: '0.8rem',
                        fontWeight: isCurrent ? 600 : 400,
                      },
                    }}
                    secondaryTypographyProps={{
                      sx: { color: colors.text.tertiary, fontSize: '0.7rem' },
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip
                      label={`${snapshot.nodes.length}N`}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.6rem',
                        bgcolor: colors.bg.tertiary,
                        color: colors.text.secondary,
                      }}
                    />
                    {isCurrent && (
                      <Chip
                        label="Current"
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.6rem',
                          bgcolor: colors.accent,
                          color: '#fff',
                        }}
                      />
                    )}
                  </Box>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>

      {/* フッター */}
      {history.length > 0 && (
        <Box
          sx={{
            p: 1.5,
            borderTop: `1px solid ${colors.border.primary}`,
            bgcolor: colors.bg.tertiary,
          }}
        >
          <Button
            variant="text"
            size="small"
            startIcon={<DeleteSweepIcon />}
            onClick={clearHistory}
            fullWidth
            sx={{
              color: colors.text.tertiary,
              fontSize: '0.75rem',
              '&:hover': { color: '#f44336', bgcolor: 'rgba(244, 67, 54, 0.1)' },
            }}
          >
            Clear History
          </Button>
        </Box>
      )}
    </Paper>
  );
}
