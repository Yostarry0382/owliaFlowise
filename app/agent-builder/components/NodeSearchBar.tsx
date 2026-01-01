'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  InputAdornment,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import { Node } from 'reactflow';
import { useTheme } from '../contexts/ThemeContext';
import { getNodeDefinition } from '../types/node-definitions';

interface NodeSearchBarProps {
  nodes: Node[];
  onSelectNode: (nodeId: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function NodeSearchBar({ nodes, onSelectNode, onClose, isOpen }: NodeSearchBarProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredNodes = nodes.filter((node) => {
    const label = node.data?.label?.toLowerCase() || '';
    const type = node.data?.type?.toLowerCase() || '';
    const searchQuery = query.toLowerCase();
    return label.includes(searchQuery) || type.includes(searchQuery);
  });

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    setQuery('');
    setSelectedIndex(0);
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredNodes.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredNodes[selectedIndex]) {
          onSelectNode(filteredNodes[selectedIndex].id);
          onClose();
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: 400,
        maxWidth: '90%',
      }}
    >
      <Paper
        elevation={8}
        sx={{
          bgcolor: colors.bg.secondary,
          border: `1px solid ${colors.border.primary}`,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <TextField
          inputRef={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search nodes... (↑↓ to navigate, Enter to select)"
          fullWidth
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: colors.text.tertiary }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Chip
                    label="ESC"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      bgcolor: colors.bg.tertiary,
                      color: colors.text.tertiary,
                    }}
                  />
                  <IconButton size="small" onClick={onClose} sx={{ color: colors.text.tertiary }}>
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: colors.text.primary,
              bgcolor: colors.bg.tertiary,
              '& fieldset': { border: 'none' },
            },
          }}
        />

        {query && (
          <List dense sx={{ maxHeight: 300, overflow: 'auto', py: 0.5 }}>
            {filteredNodes.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="No nodes found"
                  sx={{ textAlign: 'center', color: colors.text.tertiary }}
                />
              </ListItem>
            ) : (
              filteredNodes.map((node, index) => {
                const nodeDefinition = getNodeDefinition(node.data?.type);
                const isSelected = index === selectedIndex;

                return (
                  <ListItem
                    key={node.id}
                    onClick={() => {
                      onSelectNode(node.id);
                      onClose();
                    }}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isSelected ? colors.bg.hover : 'transparent',
                      borderLeft: isSelected ? `3px solid ${colors.accent}` : '3px solid transparent',
                      '&:hover': { bgcolor: colors.bg.hover },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, fontSize: '1rem' }}>
                      {nodeDefinition?.icon || '📦'}
                    </ListItemIcon>
                    <ListItemText
                      primary={node.data?.label || 'Unknown'}
                      secondary={node.data?.type || 'unknown'}
                      primaryTypographyProps={{
                        sx: { color: colors.text.primary, fontSize: '0.85rem' },
                      }}
                      secondaryTypographyProps={{
                        sx: { color: colors.text.tertiary, fontSize: '0.7rem' },
                      }}
                    />
                    {isSelected && (
                      <KeyboardReturnIcon sx={{ fontSize: 16, color: colors.text.tertiary }} />
                    )}
                  </ListItem>
                );
              })
            )}
          </List>
        )}

        {!query && nodes.length > 0 && (
          <Box sx={{ p: 1.5, borderTop: `1px solid ${colors.border.primary}` }}>
            <Typography sx={{ color: colors.text.tertiary, fontSize: '0.75rem', textAlign: 'center' }}>
              {nodes.length} nodes in canvas
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
