'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  ToggleButton,
  ToggleButtonGroup,
  Popover,
  Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import HistoryIcon from '@mui/icons-material/History';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useRouter } from 'next/navigation';
import { useTheme } from '../contexts/ThemeContext';
import {
  NODE_CATEGORIES,
  ALL_NODE_DEFINITIONS,
  getNodesByCategory,
  NodeTypeDefinition,
  NodeCategory,
} from '../types/node-definitions';

interface EnhancedNodePaletteProps {
  savedOwlAgents?: { id: string; name: string; description: string }[];
  onDragStart?: (event: React.DragEvent, nodeType: string, nodeDefinition: NodeTypeDefinition) => void;
  isVisible?: boolean;
}

type ViewMode = 'list' | 'grid';

export default function EnhancedNodePalette({
  savedOwlAgents = [],
  onDragStart,
  isVisible = true,
}: EnhancedNodePaletteProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<NodeCategory[]>(['chatModels', 'tools']);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<NodeCategory[]>([]);

  // Load favorites and recent from localStorage on client side only
  useEffect(() => {
    const savedFavorites = localStorage.getItem('node-palette-favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
    const savedRecent = localStorage.getItem('node-palette-recent');
    if (savedRecent) {
      setRecentlyUsed(JSON.parse(savedRecent));
    }
  }, []);
  const [previewAnchor, setPreviewAnchor] = useState<{
    element: HTMLElement | null;
    node: NodeTypeDefinition | null;
  }>({ element: null, node: null });

  // お気に入り管理
  const toggleFavorite = (nodeType: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = favorites.includes(nodeType)
      ? favorites.filter((f) => f !== nodeType)
      : [...favorites, nodeType];
    setFavorites(newFavorites);
    localStorage.setItem('node-palette-favorites', JSON.stringify(newFavorites));
  };

  // 最近使用に追加
  const addToRecent = (nodeType: string) => {
    const newRecent = [nodeType, ...recentlyUsed.filter((r) => r !== nodeType)].slice(0, 5);
    setRecentlyUsed(newRecent);
    localStorage.setItem('node-palette-recent', JSON.stringify(newRecent));
  };

  // OwlAgentを編集
  const handleEditAgent = (agentId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    router.push(`/agent-builder?id=${agentId}`);
  };

  const handleAccordionChange =
    (category: NodeCategory) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedCategories((prev) =>
        isExpanded ? [...prev, category] : prev.filter((c) => c !== category)
      );
    };

  const handleDragStart = (event: React.DragEvent, nodeDefinition: NodeTypeDefinition) => {
    event.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify({
        type: nodeDefinition.type,
        label: nodeDefinition.label,
        category: nodeDefinition.category,
      })
    );
    event.dataTransfer.effectAllowed = 'move';
    addToRecent(nodeDefinition.type);

    if (onDragStart) {
      onDragStart(event, nodeDefinition.type, nodeDefinition);
    }
  };

  const handleOwlAgentDragStart = (event: React.DragEvent, agent: { id: string; name: string }) => {
    event.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify({
        type: 'owlAgentReference',
        label: agent.name,
        category: 'owlAgent',
        agentId: agent.id,
      })
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  // プレビュー表示
  const handlePreviewOpen = (event: React.MouseEvent<HTMLElement>, node: NodeTypeDefinition) => {
    setPreviewAnchor({ element: event.currentTarget, node });
  };

  const handlePreviewClose = () => {
    setPreviewAnchor({ element: null, node: null });
  };

  // 検索・フィルタリング
  const filteredNodes = useMemo(() => {
    let nodes = ALL_NODE_DEFINITIONS;

    // カテゴリフィルター
    if (activeFilters.length > 0) {
      nodes = nodes.filter((node) => activeFilters.includes(node.category));
    }

    // 検索フィルター
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      nodes = nodes.filter(
        (node) =>
          node.label.toLowerCase().includes(query) ||
          node.description.toLowerCase().includes(query) ||
          node.type.toLowerCase().includes(query)
      );
    }

    return nodes;
  }, [searchQuery, activeFilters]);

  // お気に入りノード
  const favoriteNodes = useMemo(
    () => ALL_NODE_DEFINITIONS.filter((n) => favorites.includes(n.type)),
    [favorites]
  );

  // 最近使用ノード
  const recentNodes = useMemo(
    () =>
      recentlyUsed
        .map((type) => ALL_NODE_DEFINITIONS.find((n) => n.type === type))
        .filter((n): n is NodeTypeDefinition => n !== undefined),
    [recentlyUsed]
  );

  // ノードアイテムのレンダリング
  const renderNodeItem = (node: NodeTypeDefinition, compact = false) => {
    const isFavorite = favorites.includes(node.type);

    if (viewMode === 'grid' || compact) {
      return (
        <Box
          key={node.type}
          draggable
          onDragStart={(e) => handleDragStart(e, node)}
          onMouseEnter={(e) => handlePreviewOpen(e, node)}
          onMouseLeave={handlePreviewClose}
          sx={{
            width: compact ? 60 : 70,
            p: 1,
            borderRadius: 1,
            bgcolor: colors.bg.tertiary,
            border: `1px solid ${colors.border.primary}`,
            cursor: 'grab',
            textAlign: 'center',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: colors.bg.hover,
              borderColor: node.color,
              transform: 'scale(1.05)',
            },
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <Typography sx={{ fontSize: compact ? '1.2rem' : '1.5rem', mb: 0.5 }}>
            {node.icon}
          </Typography>
          <Typography
            sx={{
              color: colors.text.primary,
              fontSize: '0.6rem',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {node.label}
          </Typography>
        </Box>
      );
    }

    return (
      <ListItem
        key={node.type}
        draggable
        onDragStart={(e) => handleDragStart(e, node)}
        onMouseEnter={(e) => handlePreviewOpen(e, node)}
        onMouseLeave={handlePreviewClose}
        sx={{
          cursor: 'grab',
          mx: 1,
          mb: 0.5,
          borderRadius: 1,
          bgcolor: colors.bg.tertiary,
          border: '1px solid transparent',
          '&:hover': {
            bgcolor: colors.bg.hover,
            borderColor: node.color,
          },
          '&:active': { cursor: 'grabbing' },
        }}
        secondaryAction={
          <IconButton
            size="small"
            onClick={(e) => toggleFavorite(node.type, e)}
            sx={{
              color: isFavorite ? '#FFD700' : colors.text.tertiary,
              '&:hover': { color: '#FFD700' },
            }}
          >
            {isFavorite ? <StarIcon sx={{ fontSize: 16 }} /> : <StarBorderIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        }
      >
        <ListItemIcon sx={{ minWidth: 28, fontSize: '1rem' }}>{node.icon}</ListItemIcon>
        <ListItemText
          primary={node.label}
          primaryTypographyProps={{
            sx: { color: colors.text.primary, fontSize: '0.8rem' },
          }}
        />
      </ListItem>
    );
  };

  if (!isVisible) return null;

  return (
    <Box
      sx={{
        height: '100%',
        bgcolor: colors.bg.secondary,
        borderRight: `1px solid ${colors.border.primary}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ヘッダー */}
      <Box sx={{ p: 1.5, borderBottom: `1px solid ${colors.border.primary}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontWeight: 600, color: colors.text.primary, fontSize: '0.9rem' }}>
            Node Palette
          </Typography>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newValue) => newValue && setViewMode(newValue)}
            size="small"
          >
            <ToggleButton value="list" sx={{ p: 0.5 }}>
              <ViewListIcon sx={{ fontSize: 16, color: colors.text.secondary }} />
            </ToggleButton>
            <ToggleButton value="grid" sx={{ p: 0.5 }}>
              <GridViewIcon sx={{ fontSize: 16, color: colors.text.secondary }} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <TextField
          size="small"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: colors.text.tertiary, fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: colors.bg.tertiary,
              color: colors.text.primary,
              fontSize: '0.85rem',
              '& fieldset': { borderColor: colors.border.secondary },
              '&:hover fieldset': { borderColor: colors.border.primary },
              '&.Mui-focused fieldset': { borderColor: colors.accent },
            },
          }}
        />

        {/* カテゴリフィルターチップ */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
          {NODE_CATEGORIES.slice(0, 4).map((category) => (
            <Chip
              key={category.id}
              label={category.icon}
              size="small"
              onClick={() =>
                setActiveFilters((prev) =>
                  prev.includes(category.id)
                    ? prev.filter((f) => f !== category.id)
                    : [...prev, category.id]
                )
              }
              sx={{
                height: 24,
                bgcolor: activeFilters.includes(category.id) ? category.color : colors.bg.tertiary,
                color: activeFilters.includes(category.id) ? '#fff' : colors.text.secondary,
                border: `1px solid ${activeFilters.includes(category.id) ? category.color : colors.border.secondary}`,
                '&:hover': { bgcolor: category.color, color: '#fff' },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* ノードリスト */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* お気に入り */}
        {favoriteNodes.length > 0 && !searchQuery && (
          <Box sx={{ px: 1.5, py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <StarIcon sx={{ fontSize: 14, color: '#FFD700' }} />
              <Typography sx={{ color: colors.text.secondary, fontSize: '0.7rem', fontWeight: 600 }}>
                FAVORITES
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {favoriteNodes.map((node) => renderNodeItem(node, true))}
            </Box>
          </Box>
        )}

        {/* 最近使用 */}
        {recentNodes.length > 0 && !searchQuery && (
          <Box sx={{ px: 1.5, py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <HistoryIcon sx={{ fontSize: 14, color: colors.text.tertiary }} />
              <Typography sx={{ color: colors.text.secondary, fontSize: '0.7rem', fontWeight: 600 }}>
                RECENT
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {recentNodes.map((node) => renderNodeItem(node, true))}
            </Box>
          </Box>
        )}

        {(favoriteNodes.length > 0 || recentNodes.length > 0) && !searchQuery && (
          <Divider sx={{ borderColor: colors.border.primary, my: 1 }} />
        )}

        {/* 検索結果またはカテゴリ別表示 */}
        {searchQuery || activeFilters.length > 0 ? (
          viewMode === 'grid' ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1.5 }}>
              {filteredNodes.length === 0 ? (
                <Typography sx={{ color: colors.text.tertiary, fontSize: '0.85rem', width: '100%', textAlign: 'center', py: 2 }}>
                  No nodes found
                </Typography>
              ) : (
                filteredNodes.map((node) => renderNodeItem(node))
              )}
            </Box>
          ) : (
            <List dense sx={{ py: 1 }}>
              {filteredNodes.length === 0 ? (
                <ListItem>
                  <ListItemText
                    primary="No nodes found"
                    sx={{ color: colors.text.tertiary, textAlign: 'center' }}
                  />
                </ListItem>
              ) : (
                filteredNodes.map((node) => renderNodeItem(node))
              )}
            </List>
          )
        ) : (
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
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: colors.text.secondary }} />}
                    sx={{
                      minHeight: 36,
                      px: 1.5,
                      '&:hover': { bgcolor: colors.bg.tertiary },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '0.9rem' }}>{category.icon}</Typography>
                      <Typography sx={{ color: colors.text.primary, fontSize: '0.8rem', fontWeight: 500 }}>
                        {category.label}
                      </Typography>
                      <Chip
                        label={categoryNodes.length}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '0.6rem',
                          bgcolor: category.color,
                          color: '#fff',
                        }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    {viewMode === 'grid' ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1 }}>
                        {categoryNodes.map((node) => renderNodeItem(node))}
                      </Box>
                    ) : (
                      <List dense sx={{ py: 0 }}>
                        {categoryNodes.map((node) => renderNodeItem(node))}
                      </List>
                    )}
                  </AccordionDetails>
                </Accordion>
              );
            })}

            {/* 保存済みOwlAgent */}
            {savedOwlAgents.length > 0 && (
              <>
                <Divider sx={{ borderColor: colors.border.primary, my: 1 }} />
                <Box sx={{ px: 1.5, py: 1 }}>
                  <Typography
                    sx={{
                      color: colors.text.secondary,
                      fontSize: '0.7rem',
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
                          bgcolor: colors.bg.tertiary,
                          border: '1px solid transparent',
                          '&:hover': {
                            bgcolor: colors.bg.hover,
                            borderColor: '#FF5722',
                          },
                          '&:active': { cursor: 'grabbing' },
                        }}
                        secondaryAction={
                          <Tooltip title="Edit">
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={(e) => handleEditAgent(agent.id, e)}
                              sx={{ color: '#FF9800', '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.2)' } }}
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        }
                      >
                        <ListItemIcon sx={{ minWidth: 28, fontSize: '1rem' }}>🦉</ListItemIcon>
                        <ListItemText
                          primary={agent.name}
                          secondary={agent.description}
                          primaryTypographyProps={{ sx: { color: colors.text.primary, fontSize: '0.8rem' } }}
                          secondaryTypographyProps={{
                            sx: {
                              color: colors.text.tertiary,
                              fontSize: '0.7rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100px',
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

      {/* ノードプレビューポップオーバー */}
      <Popover
        open={Boolean(previewAnchor.element)}
        anchorEl={previewAnchor.element}
        onClose={handlePreviewClose}
        anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
        transformOrigin={{ vertical: 'center', horizontal: 'left' }}
        disableRestoreFocus
        sx={{ pointerEvents: 'none' }}
      >
        {previewAnchor.node && (
          <Paper
            sx={{
              p: 2,
              maxWidth: 280,
              bgcolor: colors.bg.secondary,
              border: `1px solid ${previewAnchor.node.color}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography sx={{ fontSize: '1.5rem' }}>{previewAnchor.node.icon}</Typography>
              <Box>
                <Typography sx={{ color: colors.text.primary, fontWeight: 600, fontSize: '0.9rem' }}>
                  {previewAnchor.node.label}
                </Typography>
                <Typography sx={{ color: colors.text.tertiary, fontSize: '0.7rem' }}>
                  {previewAnchor.node.category}
                </Typography>
              </Box>
            </Box>
            <Typography sx={{ color: colors.text.secondary, fontSize: '0.8rem', mb: 1 }}>
              {previewAnchor.node.description}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {previewAnchor.node.inputHandles.map((h) => (
                <Chip
                  key={h.id}
                  label={`← ${h.label}`}
                  size="small"
                  sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#1e3a5f', color: '#fff' }}
                />
              ))}
              {previewAnchor.node.outputHandles.map((h) => (
                <Chip
                  key={h.id}
                  label={`${h.label} →`}
                  size="small"
                  sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#3d1e5f', color: '#fff' }}
                />
              ))}
            </Box>
          </Paper>
        )}
      </Popover>
    </Box>
  );
}
