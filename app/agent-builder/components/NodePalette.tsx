'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  InputAdornment,
  Divider,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import { useRouter } from 'next/navigation';
import {
  NODE_CATEGORIES,
  ALL_NODE_DEFINITIONS,
  getNodesByCategory,
  NodeTypeDefinition,
  NodeCategory,
} from '../types/node-definitions';

interface NodePaletteProps {
  savedOwlAgents?: { id: string; name: string; description: string }[];
  onDragStart?: (event: React.DragEvent, nodeType: string, nodeDefinition: NodeTypeDefinition) => void;
}

export default function NodePalette({ savedOwlAgents = [], onDragStart }: NodePaletteProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<NodeCategory[]>(['chatModels', 'agents', 'chains']);

  // OwlAgentを編集
  const handleEditAgent = (agentId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // ドラッグを防止
    router.push(`/agent-canvas/${agentId}`);
  };

  const handleAccordionChange = (category: NodeCategory) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedCategories((prev) =>
      isExpanded ? [...prev, category] : prev.filter((c) => c !== category)
    );
  };

  const handleDragStart = (event: React.DragEvent, nodeDefinition: NodeTypeDefinition) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: nodeDefinition.type,
      label: nodeDefinition.label,
      category: nodeDefinition.category,
    }));
    event.dataTransfer.effectAllowed = 'move';

    if (onDragStart) {
      onDragStart(event, nodeDefinition.type, nodeDefinition);
    }
  };

  const handleOwlAgentDragStart = (event: React.DragEvent, agent: { id: string; name: string }) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: 'owlAgentReference',
      label: agent.name,
      category: 'owlAgent',
      agentId: agent.id,
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  // 検索フィルタリング
  const filteredNodes = searchQuery
    ? ALL_NODE_DEFINITIONS.filter(
        (node) =>
          node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  return (
    <Box
      sx={{
        width: 260,
        height: '100%',
        bgcolor: '#1e1e2f',
        borderRight: '1px solid #2d2d44',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ヘッダー */}
      <Box sx={{ p: 2, borderBottom: '1px solid #2d2d44' }}>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, color: '#fff', mb: 1.5 }}
        >
          Node Palette
        </Typography>
        <TextField
          size="small"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#666' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#252536',
              color: '#fff',
              '& fieldset': { borderColor: '#3d3d54' },
              '&:hover fieldset': { borderColor: '#4d4d64' },
              '&.Mui-focused fieldset': { borderColor: '#6366f1' },
            },
            '& .MuiInputBase-input::placeholder': {
              color: '#666',
              opacity: 1,
            },
          }}
        />
      </Box>

      {/* ノードリスト */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* 検索結果表示 */}
        {filteredNodes ? (
          <List dense sx={{ py: 1 }}>
            {filteredNodes.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="No nodes found"
                  sx={{ color: '#666', textAlign: 'center' }}
                />
              </ListItem>
            ) : (
              filteredNodes.map((node) => (
                <ListItem
                  key={node.type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, node)}
                  sx={{
                    cursor: 'grab',
                    mx: 1,
                    mb: 0.5,
                    borderRadius: 1,
                    bgcolor: '#252536',
                    border: '1px solid transparent',
                    '&:hover': {
                      bgcolor: '#2d2d44',
                      borderColor: node.color,
                    },
                    '&:active': {
                      cursor: 'grabbing',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, fontSize: '1.2rem' }}>
                    {node.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={node.label}
                    secondary={node.description}
                    primaryTypographyProps={{
                      sx: { color: '#fff', fontSize: '0.85rem' },
                    }}
                    secondaryTypographyProps={{
                      sx: { color: '#888', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
                    }}
                  />
                </ListItem>
              ))
            )}
          </List>
        ) : (
          /* カテゴリ別表示 */
          <>
            {NODE_CATEGORIES.map((category) => {
              const categoryNodes = getNodesByCategory(category.id);
              if (categoryNodes.length === 0) return null;

              return (
                <Accordion
                  key={category.id}
                  expanded={expandedCategories.includes(category.id)}
                  onChange={handleAccordionChange(category.id)}
                  disableGutters
                  sx={{
                    bgcolor: 'transparent',
                    boxShadow: 'none',
                    '&:before': { display: 'none' },
                    '& .MuiAccordionSummary-root': {
                      minHeight: 40,
                      px: 2,
                      '&:hover': { bgcolor: '#252536' },
                    },
                    '& .MuiAccordionDetails-root': {
                      p: 0,
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: '#888' }} />}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '1rem' }}>{category.icon}</Typography>
                      <Typography sx={{ color: '#fff', fontSize: '0.85rem', fontWeight: 500 }}>
                        {category.label}
                      </Typography>
                      <Chip
                        label={categoryNodes.length}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          bgcolor: category.color,
                          color: '#fff',
                        }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense sx={{ py: 0 }}>
                      {categoryNodes.map((node) => (
                        <ListItem
                          key={node.type}
                          draggable
                          onDragStart={(e) => handleDragStart(e, node)}
                          sx={{
                            cursor: 'grab',
                            mx: 1,
                            mb: 0.5,
                            borderRadius: 1,
                            bgcolor: '#252536',
                            border: '1px solid transparent',
                            '&:hover': {
                              bgcolor: '#2d2d44',
                              borderColor: node.color,
                            },
                            '&:active': {
                              cursor: 'grabbing',
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 28, fontSize: '1rem' }}>
                            {node.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={node.label}
                            primaryTypographyProps={{
                              sx: { color: '#fff', fontSize: '0.8rem' },
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              );
            })}

            {/* 保存済みOwlAgent */}
            {savedOwlAgents.length > 0 && (
              <>
                <Divider sx={{ borderColor: '#2d2d44', my: 1 }} />
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography
                    sx={{
                      color: '#888',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      mb: 1,
                    }}
                  >
                    Saved OwlAgents
                  </Typography>
                  <List dense sx={{ py: 0 }}>
                    {savedOwlAgents.map((agent) => (
                      <ListItem
                        key={agent.id}
                        draggable
                        onDragStart={(e) => handleOwlAgentDragStart(e, agent)}
                        sx={{
                          cursor: 'grab',
                          mb: 0.5,
                          borderRadius: 1,
                          bgcolor: '#252536',
                          border: '1px solid transparent',
                          '&:hover': {
                            bgcolor: '#2d2d44',
                            borderColor: '#FF5722',
                          },
                          '&:active': {
                            cursor: 'grabbing',
                          },
                        }}
                        secondaryAction={
                          <Tooltip title="編集">
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={(e) => handleEditAgent(agent.id, e)}
                              sx={{
                                color: '#FF9800',
                                '&:hover': {
                                  bgcolor: 'rgba(255, 152, 0, 0.2)',
                                },
                              }}
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        }
                      >
                        <ListItemIcon sx={{ minWidth: 28, fontSize: '1rem' }}>
                          🦉
                        </ListItemIcon>
                        <ListItemText
                          primary={agent.name}
                          secondary={agent.description}
                          primaryTypographyProps={{
                            sx: { color: '#fff', fontSize: '0.8rem' },
                          }}
                          secondaryTypographyProps={{
                            sx: {
                              color: '#888',
                              fontSize: '0.7rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '120px',
                            },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
