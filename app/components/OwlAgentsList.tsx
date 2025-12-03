'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Button,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import { OwlAgent } from '@/app/types/flowise';

const ICON_COLORS = {
  default: '#8b5cf6',
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#10b981',
  purple: '#a855f7',
  orange: '#f97316',
};

interface OwlAgentsListProps {
  onLoadAgent?: (agent: OwlAgent) => void;
}

export default function OwlAgentsList({ onLoadAgent }: OwlAgentsListProps) {
  const [agents, setAgents] = useState<OwlAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/owlagents');
      if (!response.ok) {
        throw new Error('Failed to fetch Owl Agents');
      }
      const data = await response.json();
      setAgents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Owl Agent?')) {
      return;
    }

    try {
      const response = await fetch(`/api/owlagents?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete Owl Agent');
      }

      // Refresh the list
      await fetchAgents();
    } catch (err) {
      console.error('Error deleting Owl Agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleDuplicate = async (agent: OwlAgent) => {
    try {
      const duplicatedAgent = {
        ...agent,
        name: `${agent.name} (Copy)`,
        version: '1.0.0',
      };

      delete (duplicatedAgent as any).id;
      delete (duplicatedAgent as any).createdAt;
      delete (duplicatedAgent as any).updatedAt;

      const response = await fetch('/api/owlagents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicatedAgent),
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate Owl Agent');
      }

      // Refresh the list
      await fetchAgents();
    } catch (err) {
      console.error('Error duplicating Owl Agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to duplicate');
    }
  };

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agent.tags && agent.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchAgents}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search Owl Agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flex: 1, maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Tooltip title="Refresh">
          <IconButton onClick={fetchAgents} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {filteredAgents.length === 0 ? (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No Owl Agents found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Create your first Owl Agent by saving a flow
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {filteredAgents.map((agent) => (
            <Box key={agent.id} sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.333% - 16px)' } }}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                  cursor: onLoadAgent ? 'pointer' : 'default',
                }}
                onClick={() => onLoadAgent?.(agent)}
              >
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        bgcolor: ICON_COLORS[agent.iconStyle] || ICON_COLORS.default,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        mr: 2,
                      }}
                    >
                      🦉
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {agent.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        v{agent.version}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {agent.description}
                  </Typography>

                  <Box sx={{ mt: 'auto' }}>
                    {agent.tags && agent.tags.length > 0 && (
                      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {agent.tags.slice(0, 3).map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                        {agent.tags.length > 3 && (
                          <Chip label={`+${agent.tags.length - 3}`} size="small" variant="outlined" />
                        )}
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {agent.flow.nodes.length} nodes • {agent.flow.edges.length} edges
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Duplicate">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(agent);
                            }}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(agent.id);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {agent.author && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        by {agent.author}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}