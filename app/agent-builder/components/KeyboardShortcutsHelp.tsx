'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Chip,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { useTheme } from '../contexts/ThemeContext';

interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'File Operations',
    shortcuts: [
      { keys: ['Ctrl', 'S'], description: 'Save Agent' },
      { keys: ['Ctrl', 'Shift', 'S'], description: 'Save As New Agent' },
    ],
  },
  {
    title: 'Edit',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Y'], description: 'Redo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo (Alternative)' },
      { keys: ['Delete'], description: 'Delete Selected Node(s)' },
      { keys: ['Backspace'], description: 'Delete Selected Node(s)' },
      { keys: ['Ctrl', 'A'], description: 'Select All Nodes' },
      { keys: ['Escape'], description: 'Deselect All / Close Panel' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Ctrl', 'F'], description: 'Search Nodes' },
      { keys: ['Space'], description: 'Pan Canvas (Hold)' },
      { keys: ['Ctrl', '+'], description: 'Zoom In' },
      { keys: ['Ctrl', '-'], description: 'Zoom Out' },
      { keys: ['Ctrl', '0'], description: 'Fit View' },
    ],
  },
  {
    title: 'Panels',
    shortcuts: [
      { keys: ['Ctrl', 'E'], description: 'Toggle Execution Preview' },
      { keys: ['Ctrl', 'H'], description: 'Toggle Version History' },
      { keys: ['Ctrl', 'P'], description: 'Toggle Node Palette' },
      { keys: ['?'], description: 'Show Keyboard Shortcuts' },
    ],
  },
  {
    title: 'Run',
    shortcuts: [
      { keys: ['Ctrl', 'Enter'], description: 'Test Run Flow' },
    ],
  },
];

interface KeyboardShortcutsHelpProps {
  onClose: () => void;
}

export default function KeyboardShortcutsHelp({ onClose }: KeyboardShortcutsHelpProps) {
  const { colors } = useTheme();

  const renderKey = (key: string) => (
    <Chip
      key={key}
      label={key}
      size="small"
      sx={{
        height: 24,
        minWidth: 32,
        fontSize: '0.7rem',
        fontWeight: 600,
        fontFamily: 'monospace',
        bgcolor: colors.bg.tertiary,
        color: colors.text.primary,
        border: `1px solid ${colors.border.secondary}`,
        borderRadius: 1,
        mx: 0.25,
      }}
    />
  );

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 500,
        maxWidth: '90vw',
        maxHeight: '80vh',
        bgcolor: colors.bg.secondary,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: 2,
        overflow: 'hidden',
        zIndex: 2000,
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
          <KeyboardIcon sx={{ color: colors.accent, fontSize: 20 }} />
          <Typography sx={{ color: colors.text.primary, fontWeight: 600 }}>
            Keyboard Shortcuts
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label="Press ? to toggle"
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: colors.bg.hover,
              color: colors.text.tertiary,
            }}
          />
          <IconButton size="small" onClick={onClose} sx={{ color: colors.text.secondary }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* コンテンツ */}
      <Box sx={{ overflow: 'auto', maxHeight: 'calc(80vh - 60px)' }}>
        {SHORTCUT_GROUPS.map((group, groupIndex) => (
          <Box key={group.title}>
            <Box sx={{ px: 2, py: 1, bgcolor: colors.bg.primary }}>
              <Typography
                sx={{
                  color: colors.text.secondary,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {group.title}
              </Typography>
            </Box>
            <Table size="small">
              <TableBody>
                {group.shortcuts.map((shortcut, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      '&:hover': { bgcolor: colors.bg.hover },
                      '& td': { borderBottom: `1px solid ${colors.border.primary}` },
                    }}
                  >
                    <TableCell sx={{ width: 180, py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            {renderKey(key)}
                            {keyIndex < shortcut.keys.length - 1 && (
                              <Typography
                                component="span"
                                sx={{ color: colors.text.tertiary, mx: 0.5, fontSize: '0.8rem' }}
                              >
                                +
                              </Typography>
                            )}
                          </React.Fragment>
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Typography sx={{ color: colors.text.primary, fontSize: '0.85rem' }}>
                        {shortcut.description}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
