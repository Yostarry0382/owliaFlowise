'use client';

import React, { useState, useEffect, DragEvent } from 'react';
import { Paper, Typography, Box, TextField, InputAdornment, List, ListItem, ListItemIcon, ListItemText, Divider, Chip, IconButton, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { OwlAgent } from '@/app/types/flowise';

interface AgentSidebarProps {
  onAgentSelect?: (agent: OwlAgent) => void;
}

const AgentSidebar: React.FC<AgentSidebarProps> = ({ onAgentSelect }) => {
  const [agents, setAgents] = useState<OwlAgent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // エージェント一覧を取得
  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/owlagents');
      if (response.ok) {
        const data = await response.json();
        setAgents(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // エージェントのドラッグ開始
  const handleDragStart = (e: DragEvent, agent: OwlAgent) => {
    const agentData = {
      type: 'owlAgent',
      agentId: agent.id,
      agentName: agent.name,
      agentDescription: agent.description,
    };
    e.dataTransfer.setData('application/reactflow', JSON.stringify(agentData));
    e.dataTransfer.effectAllowed = 'move';
  };

  // 検索フィルタリング
  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (agent.description && agent.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Paper
      elevation={3}
      sx={{
        width: 320,
        height: '100%',
        backgroundColor: '#1E1E1E',
        color: '#E0E0E0',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 0,
      }}
    >
      {/* ヘッダー */}
      <Box sx={{ p: 2, borderBottom: '1px solid #333' }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <span style={{ fontSize: '1.5em' }}>🦉</span>
          OwlAgent Library
        </Typography>

        {/* 検索バー */}
        <TextField
          fullWidth
          variant="outlined"
          placeholder="エージェントを検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#999' }} />
              </InputAdornment>
            ),
            sx: {
              backgroundColor: '#2C2C2C',
              color: '#E0E0E0',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#444',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#666',
              },
            },
          }}
        />

        {/* アクションボタン */}
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Tooltip title="新しいエージェントを作成">
            <IconButton
              size="small"
              sx={{ color: '#90CAF9' }}
              onClick={() => window.location.href = '/'}
            >
              <AddCircleOutlineIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="リストを更新">
            <IconButton
              size="small"
              sx={{ color: '#90CAF9' }}
              onClick={fetchAgents}
              disabled={loading}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* エージェントリスト */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List>
          {filteredAgents.map((agent) => (
            <ListItem
              key={agent.id}
              draggable
              onDragStart={(e) => handleDragStart(e, agent)}
              onClick={() => onAgentSelect?.(agent)}
              sx={{
                cursor: 'grab',
                borderBottom: '1px solid #333',
                transition: 'background-color 0.2s',
                '&:hover': {
                  backgroundColor: '#2C2C2C',
                },
                '&:active': {
                  cursor: 'grabbing',
                },
              }}
            >
              <ListItemIcon>
                <Box
                  sx={{
                    fontSize: '1.8em',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  🦉
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="subtitle2" sx={{ color: '#E0E0E0' }}>
                    {agent.name}
                  </Typography>
                }
                secondary={
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#B0B0B0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {agent.description}
                    </Typography>
                    {agent.tags && agent.tags.length > 0 && (
                      <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {agent.tags.slice(0, 3).map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7em',
                              backgroundColor: '#333',
                              color: '#90CAF9',
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                }
                secondaryTypographyProps={{ component: 'div' }}
              />
            </ListItem>
          ))}
        </List>

        {filteredAgents.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center', color: '#666' }}>
            <Typography variant="body2">
              {searchTerm ? 'エージェントが見つかりませんでした' : 'エージェントがありません'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* ヒントセクション */}
      <Box sx={{ p: 2, borderTop: '1px solid #333', backgroundColor: '#252525' }}>
        <Typography variant="caption" sx={{ color: '#999' }}>
          💡 ヒント: エージェントをドラッグしてキャンバスに配置できます
        </Typography>
      </Box>
    </Paper>
  );
};

export default AgentSidebar;