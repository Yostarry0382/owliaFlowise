'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useRouter } from 'next/navigation';
import { OwlAgent } from '@/app/types/flowise';

export default function AgentCanvasPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<OwlAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDescription, setNewAgentDescription] = useState('');

  // Load agents
  const loadAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/owlagents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      } else {
        setError('エージェントの読み込みに失敗しました');
      }
    } catch (err) {
      setError('エージェントの読み込み中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  // Create new agent
  const handleCreateAgent = async () => {
    if (!newAgentName.trim() || !newAgentDescription.trim()) {
      return;
    }

    try {
      const response = await fetch('/api/owlagents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgentName,
          description: newAgentDescription,
          iconStyle: 'default',
          version: '1.0.0',
          flow: {
            nodes: [],
            edges: [],
          },
        }),
      });

      if (response.ok) {
        const newAgent = await response.json();
        setCreateDialogOpen(false);
        setNewAgentName('');
        setNewAgentDescription('');
        // Navigate to editor
        router.push(`/agent-canvas/${newAgent.id}`);
      } else {
        setError('エージェントの作成に失敗しました');
      }
    } catch (err) {
      setError('エージェントの作成中にエラーが発生しました');
    }
  };

  // Delete agent
  const handleDeleteAgent = async (id: string) => {
    if (!confirm('このエージェントを削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/owlagents?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadAgents();
      } else {
        setError('エージェントの削除に失敗しました');
      }
    } catch (err) {
      setError('エージェントの削除中にエラーが発生しました');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            エージェント作成
          </Typography>
          <Typography variant="body1" color="text.secondary">
            AIエージェントを作成・管理します
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          新規作成
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Agent List */}
      {agents.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            エージェントがありません
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            新しいエージェントを作成してください
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新規作成
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {agents.map((agent) => (
            <Grid item xs={12} sm={6} md={4} key={agent.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                      {agent.name}
                    </Typography>
                    <Chip label={agent.version} size="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {agent.description}
                  </Typography>
                  {agent.tags && agent.tags.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                      {agent.tags.map((tag, idx) => (
                        <Chip key={idx} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    ノード数: {agent.flow.nodes.length} | エッジ数: {agent.flow.edges.length}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => router.push(`/agent-canvas/${agent.id}`)}
                      title="編集"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteAgent(agent.id)}
                      title="削除"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => router.push(`/agent-canvas/${agent.id}/run`)}
                  >
                    実行
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Agent Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新規エージェント作成</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="エージェント名"
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="説明"
              value={newAgentDescription}
              onChange={(e) => setNewAgentDescription(e.target.value)}
              multiline
              rows={3}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateAgent}
            disabled={!newAgentName.trim() || !newAgentDescription.trim()}
          >
            作成して編集
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
