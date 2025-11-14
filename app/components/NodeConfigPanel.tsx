'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Stack,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Close, Save } from '@mui/icons-material';
import { Node } from 'reactflow';

interface NodeConfigPanelProps {
  node: Node;
  onClose: () => void;
  onUpdate: (config: any) => void;
}

export default function NodeConfigPanel({ node, onClose, onUpdate }: NodeConfigPanelProps) {
  const [config, setConfig] = useState(node.data.config || {});

  const handleConfigChange = (key: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    onUpdate(config);
  };

  const renderConfigFields = () => {
    switch (node.data.type) {
      case 'llm':
        return (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>モデル</InputLabel>
              <Select
                value={config.model || 'gpt-3.5-turbo'}
                label="モデル"
                onChange={(e) => handleConfigChange('model', e.target.value)}
              >
                <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
                <MenuItem value="gpt-4">GPT-4</MenuItem>
                <MenuItem value="claude-3">Claude 3</MenuItem>
                <MenuItem value="gemini-pro">Gemini Pro</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Temperature"
              type="number"
              value={config.temperature || 0.7}
              onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
              inputProps={{ min: 0, max: 2, step: 0.1 }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Max Tokens"
              type="number"
              value={config.maxTokens || 2048}
              onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="API Key"
              type="password"
              value={config.apiKey || ''}
              onChange={(e) => handleConfigChange('apiKey', e.target.value)}
              sx={{ mb: 2 }}
            />
          </>
        );

      case 'prompt':
        return (
          <>
            <TextField
              fullWidth
              multiline
              rows={6}
              label="プロンプトテンプレート"
              value={config.template || ''}
              onChange={(e) => handleConfigChange('template', e.target.value)}
              placeholder="例: あなたは{role}です。{input}について説明してください。"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="入力変数 (カンマ区切り)"
              value={config.variables || ''}
              onChange={(e) => handleConfigChange('variables', e.target.value)}
              placeholder="例: role, input"
              sx={{ mb: 2 }}
            />
          </>
        );

      case 'vectorstore':
        return (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>ベクトルDB</InputLabel>
              <Select
                value={config.database || 'pinecone'}
                label="ベクトルDB"
                onChange={(e) => handleConfigChange('database', e.target.value)}
              >
                <MenuItem value="pinecone">Pinecone</MenuItem>
                <MenuItem value="weaviate">Weaviate</MenuItem>
                <MenuItem value="chroma">Chroma</MenuItem>
                <MenuItem value="qdrant">Qdrant</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="インデックス名"
              value={config.indexName || ''}
              onChange={(e) => handleConfigChange('indexName', e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="API Key"
              type="password"
              value={config.apiKey || ''}
              onChange={(e) => handleConfigChange('apiKey', e.target.value)}
              sx={{ mb: 2 }}
            />
          </>
        );

      case 'memory':
        return (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>メモリタイプ</InputLabel>
              <Select
                value={config.memoryType || 'buffer'}
                label="メモリタイプ"
                onChange={(e) => handleConfigChange('memoryType', e.target.value)}
              >
                <MenuItem value="buffer">バッファメモリ</MenuItem>
                <MenuItem value="summary">サマリーメモリ</MenuItem>
                <MenuItem value="conversation">会話メモリ</MenuItem>
                <MenuItem value="entity">エンティティメモリ</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="メモリサイズ"
              type="number"
              value={config.memorySize || 10}
              onChange={(e) => handleConfigChange('memorySize', parseInt(e.target.value))}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.returnMessages || false}
                  onChange={(e) => handleConfigChange('returnMessages', e.target.checked)}
                />
              }
              label="メッセージを返す"
            />
          </>
        );

      case 'tool':
        return (
          <>
            <TextField
              fullWidth
              label="ツール名"
              value={config.toolName || ''}
              onChange={(e) => handleConfigChange('toolName', e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="APIエンドポイント"
              value={config.endpoint || ''}
              onChange={(e) => handleConfigChange('endpoint', e.target.value)}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>HTTPメソッド</InputLabel>
              <Select
                value={config.method || 'GET'}
                label="HTTPメソッド"
                onChange={(e) => handleConfigChange('method', e.target.value)}
              >
                <MenuItem value="GET">GET</MenuItem>
                <MenuItem value="POST">POST</MenuItem>
                <MenuItem value="PUT">PUT</MenuItem>
                <MenuItem value="DELETE">DELETE</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="ヘッダー (JSON)"
              value={config.headers || '{}'}
              onChange={(e) => handleConfigChange('headers', e.target.value)}
              sx={{ mb: 2 }}
            />
          </>
        );

      case 'document':
        return (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>ドキュメントタイプ</InputLabel>
              <Select
                value={config.documentType || 'pdf'}
                label="ドキュメントタイプ"
                onChange={(e) => handleConfigChange('documentType', e.target.value)}
              >
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="text">テキスト</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="web">Webページ</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="ソースURL/パス"
              value={config.source || ''}
              onChange={(e) => handleConfigChange('source', e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="チャンクサイズ"
              type="number"
              value={config.chunkSize || 1000}
              onChange={(e) => handleConfigChange('chunkSize', parseInt(e.target.value))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="チャンクオーバーラップ"
              type="number"
              value={config.chunkOverlap || 200}
              onChange={(e) => handleConfigChange('chunkOverlap', parseInt(e.target.value))}
              sx={{ mb: 2 }}
            />
          </>
        );

      case 'code':
        return (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>言語</InputLabel>
              <Select
                value={config.language || 'javascript'}
                label="言語"
                onChange={(e) => handleConfigChange('language', e.target.value)}
              >
                <MenuItem value="javascript">JavaScript</MenuItem>
                <MenuItem value="python">Python</MenuItem>
                <MenuItem value="typescript">TypeScript</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={10}
              label="カスタムコード"
              value={config.code || ''}
              onChange={(e) => handleConfigChange('code', e.target.value)}
              sx={{ mb: 2, fontFamily: 'monospace' }}
            />
          </>
        );

      default:
        return (
          <Typography color="text.secondary">
            このノードタイプの設定はまだ実装されていません。
          </Typography>
        );
    }
  };

  return (
    <Paper
      sx={{
        width: 350,
        height: '100%',
        overflow: 'auto',
        bgcolor: 'background.paper',
        borderRadius: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
      elevation={2}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6">ノード設定</Typography>
        <IconButton size="small" onClick={onClose}>
          <Close />
        </IconButton>
      </Box>

      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          label="ノード名"
          value={config.name || node.data.label}
          onChange={(e) => handleConfigChange('name', e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          multiline
          rows={2}
          label="説明"
          value={config.description || ''}
          onChange={(e) => handleConfigChange('description', e.target.value)}
          sx={{ mb: 2 }}
        />

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          {node.data.label}の設定
        </Typography>

        {renderConfigFields()}
      </Box>

      <Box sx={{ mt: 'auto', p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={2}>
          <Button fullWidth variant="outlined" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            fullWidth
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
          >
            保存
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}