'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import { useRouter, useParams } from 'next/navigation';
import { OwlAgent } from '@/app/types/flowise';

export default function AgentEditorPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<OwlAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  // Load agent
  useEffect(() => {
    const loadAgent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/owlagents?id=${agentId}`);
        if (response.ok) {
          const data = await response.json();
          setAgent(data);
          setName(data.name);
          setDescription(data.description);
          setTags(data.tags?.join(', ') || '');
        } else {
          setError('エージェントが見つかりません');
        }
      } catch (err) {
        setError('エージェントの読み込み中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    if (agentId) {
      loadAgent();
    }
  }, [agentId]);

  // Save agent
  const handleSave = async () => {
    if (!agent) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/owlagents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...agent,
          name: name.trim(),
          description: description.trim(),
          tags: tags.split(',').map(t => t.trim()).filter(t => t),
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setAgent(updated);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError('保存に失敗しました');
      }
    } catch (err) {
      setError('保存中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!agent) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">エージェントが見つかりません</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/agent-canvas')}
          sx={{ mt: 2 }}
        >
          戻る
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: '1200px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 4 }}>
        <Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/agent-canvas')}
            sx={{ mb: 2 }}
          >
            戻る
          </Button>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            エージェント編集
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Chip label={`Version ${agent.version}`} size="small" />
            <Chip label={`${agent.flow.nodes.length} ノード`} size="small" variant="outlined" />
            <Chip label={`${agent.flow.edges.length} エッジ`} size="small" variant="outlined" />
            {agent.flowiseChatflowId && (
              <Chip label="Flowise連携" size="small" color="primary" />
            )}
          </Box>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<PlayArrowIcon />}
          onClick={() => router.push(`/agent-canvas/${agentId}/run`)}
        >
          実行
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          保存しました
        </Alert>
      )}

      {/* Basic Info Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          基本情報
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <TextField
          fullWidth
          label="エージェント名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
          required
        />

        <TextField
          fullWidth
          label="説明"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={3}
          sx={{ mb: 2 }}
          required
        />

        <TextField
          fullWidth
          label="タグ（カンマ区切り）"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="例: AI, チャットボット, カスタマーサポート"
          helperText="タグをカンマで区切って入力してください"
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving || !name.trim() || !description.trim()}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </Box>
      </Paper>

      {/* Flow Editor Placeholder */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          フロー編集
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Box
          sx={{
            minHeight: 400,
            border: '2px dashed',
            borderColor: 'grey.300',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.50',
            p: 4,
          }}
        >
          <EditIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            フローエディタは開発中です
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
            現在、ビジュアルフローエディタを実装中です。<br />
            Flowiseと連携している場合は、Flowiseのエディタをご利用ください。
          </Typography>
          {agent.flowiseChatflowId && (
            <Button
              variant="outlined"
              onClick={() => {
                const flowiseUrl = process.env.NEXT_PUBLIC_FLOWISE_API_URL || 'http://localhost:3000';
                window.open(`${flowiseUrl}/canvas/${agent.flowiseChatflowId}`, '_blank');
              }}
            >
              Flowiseで編集
            </Button>
          )}
        </Box>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            フロー情報
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ノード数: {agent.flow.nodes.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            エッジ数: {agent.flow.edges.length}
          </Typography>
          {agent.flowiseChatflowId && (
            <Typography variant="body2" color="text.secondary">
              Flowise Chatflow ID: {agent.flowiseChatflowId}
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
