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
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter, useParams } from 'next/navigation';
import { OwlAgent, ExecutionResult } from '@/app/types/flowise';

export default function AgentRunPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<OwlAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ExecutionResult | null>(null);

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

  // Execute agent
  const handleExecute = async () => {
    if (!input.trim()) {
      setError('入力を入力してください');
      return;
    }

    setExecuting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/owlagents/${agentId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        setError('実行に失敗しました');
      }
    } catch (err) {
      setError('実行中にエラーが発生しました');
    } finally {
      setExecuting(false);
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
      <Box sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/agent-canvas')}
          sx={{ mb: 2 }}
        >
          戻る
        </Button>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {agent.name}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {agent.description}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Chip label={`Version ${agent.version}`} size="small" />
          <Chip label={`${agent.flow.nodes.length} ノード`} size="small" variant="outlined" />
          <Chip label={`${agent.flow.edges.length} エッジ`} size="small" variant="outlined" />
          {agent.flowiseChatflowId && (
            <Chip label="Flowise連携" size="small" color="primary" />
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Input Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          入力
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="エージェントへの入力を入力してください"
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          size="large"
          startIcon={executing ? <CircularProgress size={20} /> : <PlayArrowIcon />}
          onClick={handleExecute}
          disabled={executing || !input.trim()}
          fullWidth
        >
          {executing ? '実行中...' : '実行'}
        </Button>
      </Paper>

      {/* Result Section */}
      {result && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              実行結果
            </Typography>
            <Chip
              label={result.success ? '成功' : '失敗'}
              color={result.success ? 'success' : 'error'}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Output */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              出力
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {typeof result.output === 'string'
                  ? result.output
                  : JSON.stringify(result.output, null, 2)}
              </pre>
            </Paper>
          </Box>

          {/* Execution Info */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              実行情報
            </Typography>
            <Typography variant="body2" color="text.secondary">
              実行時間: {result.executionTime}ms
            </Typography>
          </Box>

          {/* Logs */}
          {result.logs && result.logs.length > 0 && (
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                実行ログ
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 300, overflow: 'auto' }}>
                <List dense>
                  {result.logs.map((log, idx) => (
                    <ListItem key={idx} disablePadding>
                      <ListItemText
                        primary={log}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontFamily: 'monospace',
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Box>
          )}

          {/* Error */}
          {result.error && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="error">
                {result.error}
              </Alert>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
