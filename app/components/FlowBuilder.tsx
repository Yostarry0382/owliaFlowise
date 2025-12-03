'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Link as MuiLink,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChatIcon from '@mui/icons-material/Chat';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

interface FlowiseChatflow {
  id: string;
  name: string;
  deployed: boolean;
  isPublic: boolean;
  createdDate: string;
  updatedDate: string;
  category?: string;
}

interface FlowiseStatus {
  success: boolean;
  status: string;
  apiUrl: string;
  chatflowCount?: number;
  error?: string;
}

/**
 * Flowise連携コンポーネント
 * React Flowの代わりにFlowiseサーバーと連携してフローを管理
 */
export default function FlowBuilder() {
  const [status, setStatus] = useState<FlowiseStatus | null>(null);
  const [chatflows, setChatflows] = useState<FlowiseChatflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const flowiseUrl = process.env.NEXT_PUBLIC_FLOWISE_API_URL || 'http://localhost:3000';

  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/flowise/status');
      const data = await response.json();
      setStatus(data);

      if (data.success) {
        // Chatflow一覧を取得
        const chatflowsResponse = await fetch('/api/flowise/chatflows');
        if (chatflowsResponse.ok) {
          const chatflowsData = await chatflowsResponse.json();
          setChatflows(chatflowsData);
        }
      }
    } catch (err) {
      setError('Flowiseサーバーへの接続に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const openFlowiseCanvas = () => {
    window.open(`${flowiseUrl}/canvas`, '_blank');
  };

  const openFlowiseChatflow = (chatflowId: string) => {
    window.open(`${flowiseUrl}/canvas/${chatflowId}`, '_blank');
  };

  const openChat = (chatflowId: string) => {
    window.open(`/chat?chatflow=${chatflowId}`, '_blank');
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography>Flowiseサーバーに接続中...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', p: 3, overflow: 'auto', bgcolor: '#f5f5f5' }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Flowise フロービルダー
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Flowiseサーバーでフローを作成・管理します
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={checkStatus}
            >
              更新
            </Button>
            <Button
              variant="contained"
              startIcon={<OpenInNewIcon />}
              onClick={openFlowiseCanvas}
              disabled={!status?.success}
            >
              Flowiseを開く
            </Button>
          </Box>
        </Box>

        {/* 接続ステータス */}
        {status?.success ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Flowiseサーバーに接続済み ({status.apiUrl})
            {status.chatflowCount !== undefined && (
              <span> - {status.chatflowCount}個のChatflow</span>
            )}
          </Alert>
        ) : (
          <Alert severity="error" sx={{ mb: 2 }}>
            Flowiseサーバーに接続できません: {status?.error || error}
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2">
                Flowiseサーバーを起動してください:
              </Typography>
              <code style={{ display: 'block', marginTop: '8px', padding: '8px', background: '#f0f0f0', borderRadius: '4px' }}>
                npx flowise start
              </code>
            </Box>
          </Alert>
        )}
      </Paper>

      {/* Chatflow一覧 */}
      {status?.success && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Chatflow 一覧
          </Typography>

          {chatflows.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <AccountTreeIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
              <Typography color="text.secondary" gutterBottom>
                Chatflowがありません
              </Typography>
              <Button
                variant="contained"
                startIcon={<OpenInNewIcon />}
                onClick={openFlowiseCanvas}
                sx={{ mt: 2 }}
              >
                新しいChatflowを作成
              </Button>
            </Box>
          ) : (
            <List>
              {chatflows.map((chatflow, index) => (
                <React.Fragment key={chatflow.id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<ChatIcon />}
                          onClick={() => openChat(chatflow.id)}
                        >
                          チャット
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<OpenInNewIcon />}
                          onClick={() => openFlowiseChatflow(chatflow.id)}
                        >
                          編集
                        </Button>
                      </Box>
                    }
                    disablePadding
                  >
                    <ListItemButton>
                      <ListItemIcon>
                        <AccountTreeIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {chatflow.name}
                            {chatflow.deployed && (
                              <Chip label="デプロイ済み" size="small" color="success" />
                            )}
                            {chatflow.isPublic && (
                              <Chip label="公開" size="small" color="info" />
                            )}
                          </Box>
                        }
                        secondary={
                          <>
                            ID: {chatflow.id.substring(0, 8)}...
                            {chatflow.category && ` | カテゴリ: ${chatflow.category}`}
                          </>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      )}

      {/* 使い方ガイド */}
      {!status?.success && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Flowiseのセットアップ
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="1. Flowiseをインストール"
                secondary="npm install -g flowise"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="2. Flowiseを起動"
                secondary="npx flowise start"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="3. 環境変数を設定"
                secondary="NEXT_PUBLIC_FLOWISE_API_URL=http://localhost:3000"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="4. このページを更新"
                secondary="Flowiseサーバーに接続されます"
              />
            </ListItem>
          </List>
        </Paper>
      )}
    </Box>
  );
}
