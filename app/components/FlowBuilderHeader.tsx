'use client';

import React from 'react';
import {
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Box,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ChatIcon from '@mui/icons-material/Chat';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useRouter } from 'next/navigation';
import { useTheme } from '../agent-builder/contexts/ThemeContext';

export interface FlowBuilderHeaderProps {
  currentAgentName: string;
  canUndo: boolean;
  canRedo: boolean;
  showExecutionPreview: boolean;
  showVersionHistory: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSearch: () => void;
  onToggleExecutionPreview: () => void;
  onToggleVersionHistory: () => void;
  onShowShortcutsHelp: () => void;
  onShowOnboarding: () => void;
  onTestRun: () => void;
  onSave: () => void;
}

export default function FlowBuilderHeader({
  currentAgentName,
  canUndo,
  canRedo,
  showExecutionPreview,
  showVersionHistory,
  onUndo,
  onRedo,
  onSearch,
  onToggleExecutionPreview,
  onToggleVersionHistory,
  onShowShortcutsHelp,
  onShowOnboarding,
  onTestRun,
  onSave,
}: FlowBuilderHeaderProps) {
  const router = useRouter();
  const { colors, mode, toggleTheme } = useTheme();

  return (
    <Paper
      sx={{
        borderRadius: 0,
        bgcolor: colors.bg.secondary,
        borderBottom: `2px solid ${colors.border.primary}`,
        px: 2,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: colors.text.primary,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>🦉</span>
          OwliaFabrica
          {currentAgentName && (
            <Typography
              component="span"
              sx={{
                ml: 2,
                px: 2,
                py: 0.5,
                borderRadius: 1,
                bgcolor: colors.accent,
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 500,
              }}
            >
              {currentAgentName}
            </Typography>
          )}
        </Typography>

        <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: colors.border.primary }} />

        {/* Undo/Redo */}
        <Tooltip title="Undo (Ctrl+Z)">
          <span>
            <IconButton
              onClick={onUndo}
              disabled={!canUndo}
              sx={{ color: canUndo ? colors.text.primary : colors.text.tertiary }}
              aria-label="元に戻す"
            >
              <UndoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Redo (Ctrl+Y)">
          <span>
            <IconButton
              onClick={onRedo}
              disabled={!canRedo}
              sx={{ color: canRedo ? colors.text.primary : colors.text.tertiary }}
              aria-label="やり直し"
            >
              <RedoIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* 検索 */}
        <Tooltip title="Search Nodes (Ctrl+F)">
          <IconButton onClick={onSearch} sx={{ color: colors.text.secondary }} aria-label="ノード検索">
            <SearchIcon />
          </IconButton>
        </Tooltip>

        {/* 実行プレビュー */}
        <Tooltip title="Execution Preview (Ctrl+E)">
          <IconButton
            onClick={onToggleExecutionPreview}
            sx={{ color: showExecutionPreview ? colors.accent : colors.text.secondary }}
            aria-label="実行プレビュー"
          >
            <VisibilityIcon />
          </IconButton>
        </Tooltip>

        {/* 履歴 */}
        <Tooltip title="Version History (Ctrl+H)">
          <IconButton
            onClick={onToggleVersionHistory}
            sx={{ color: showVersionHistory ? colors.accent : colors.text.secondary }}
            aria-label="バージョン履歴"
          >
            <HistoryIcon />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: colors.border.primary }} />

        {/* テーマ切り替え */}
        <Tooltip title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}>
          <IconButton onClick={toggleTheme} sx={{ color: colors.text.secondary }} aria-label="テーマ切替">
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>

        {/* ショートカットヘルプ */}
        <Tooltip title="Keyboard Shortcuts (?)">
          <IconButton onClick={onShowShortcutsHelp} sx={{ color: colors.text.secondary }} aria-label="ショートカット">
            <KeyboardIcon />
          </IconButton>
        </Tooltip>

        {/* ヘルプ */}
        <Tooltip title="Show Tutorial">
          <IconButton onClick={onShowOnboarding} sx={{ color: colors.text.secondary }} aria-label="チュートリアル">
            <HelpOutlineIcon />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: colors.border.primary }} />

        <Button
          variant="outlined"
          startIcon={<PlayArrowIcon />}
          onClick={onTestRun}
          sx={{
            color: '#4CAF50',
            borderColor: '#4CAF50',
            '&:hover': {
              borderColor: '#66BB6A',
              bgcolor: 'rgba(76, 175, 80, 0.1)',
            },
          }}
        >
          Test Run
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={onSave}
          sx={{
            bgcolor: colors.accent,
            '&:hover': { bgcolor: '#5558e3' },
          }}
        >
          Save Agent
        </Button>
        <Tooltip title="Agent Store">
          <IconButton onClick={() => router.push('/store')} sx={{ color: '#e94560' }} aria-label="エージェントストア">
            <StorefrontIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Go to Chat">
          <IconButton onClick={() => router.push('/chat')} sx={{ color: '#90CAF9' }} aria-label="チャット">
            <ChatIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
}
