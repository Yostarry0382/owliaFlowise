'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Paper,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChatIcon from '@mui/icons-material/Chat';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useRouter } from 'next/navigation';

interface FlowiseChatflow {
  id: string;
  name: string;
  deployed: boolean;
  isPublic: boolean;
  createdDate: string;
  updatedDate: string;
  category?: string;
}

interface FlowiseAgentflow {
  id: string;
  name: string;
  deployed: boolean;
  isPublic: boolean;
  createdDate: string;
  updatedDate: string;
}

interface FlowiseStatus {
  success: boolean;
  status: string;
  apiUrl: string;
  chatflowCount?: number;
  error?: string;
}

/**
 * Flowise マルチエージェント管理コンポーネント
 * Flowiseのagentflowsとマルチエージェント機能を管理
 */
export default function MultiAgentCanvas() {
  const router = useRouter();
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

  const openFlowiseAgentflows = () => {
    window.open(`${flowiseUrl}/agentflows`, '_blank');
  };

  const openFlowiseMarketplace = () => {
    window.open(`${flowiseUrl}/marketplaces`, '_blank');
  };

  const openChat = (chatflowId: string) => {
    window.open(`/chat?chatflow=${chatflowId}`, '_blank');
  };

  const openFlowiseChatflow = (chatflowId: string) => {
    window.open(`${flowiseUrl}/canvas/${chatflowId}`, '_blank');
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
          bgcolor: '#0A0A0A',
        }}
      >
        <CircularProgress sx={{ color: '#90CAF9' }} />
        <Typography sx={{ color: '#E0E0E0' }}>Flowiseサーバーに接続中...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#0A0A0A' }}>
      {/* ツールバー */}
      <AppBar position="static" sx={{ backgroundColor: '#1E1E1E' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => router.push('/')}
            sx={{ mr: 2 }}
          >
            <HomeIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Multi-Agent Canvas (Flowise)
          </Typography>

          <Tooltip title="更新">
            <IconButton color="inherit" onClick={checkStatus}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<OpenInNewIcon />}
            onClick={openFlowiseAgentflows}
            disabled={!status?.success}
            sx={{
              ml: 2,
              backgroundColor: '#90CAF9',
              color: '#000',
              '&:hover': { backgroundColor: '#64B5F6' },
            }}
          >
            Agentflowsを開く
          </Button>
        </Toolbar>
      </AppBar>

      {/* メインコンテンツ */}
      <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
        {/* 接続ステータス */}
        {status?.success ? (
          <Alert severity="success" sx={{ mb: 3 }}>
            Flowiseサーバーに接続済み ({status.apiUrl})
          </Alert>
        ) : (
          <Alert severity="error" sx={{ mb: 3 }}>
            Flowiseサーバーに接続できません: {status?.error || error}
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2">
                Flowiseサーバーを起動してください: <code>npx flowise start</code>
              </Typography>
            </Box>
          </Alert>
        )}

        {status?.success && (
          <>
            {/* クイックアクション */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Card sx={{ bgcolor: '#1E1E1E', minWidth: 250 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <SmartToyIcon sx={{ color: '#90CAF9' }} />
                    <Typography variant="h6" sx={{ color: '#E0E0E0' }}>
                      Agentflows
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#999' }}>
                    AIエージェントのワークフローを作成・管理
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<OpenInNewIcon />}
                    onClick={openFlowiseAgentflows}
                    sx={{ color: '#90CAF9' }}
                  >
                    開く
                  </Button>
                </CardActions>
              </Card>

              <Card sx={{ bgcolor: '#1E1E1E', minWidth: 250 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <GroupWorkIcon sx={{ color: '#90CAF9' }} />
                    <Typography variant="h6" sx={{ color: '#E0E0E0' }}>
                      マーケットプレイス
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#999' }}>
                    テンプレートやノードを探す
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<OpenInNewIcon />}
                    onClick={openFlowiseMarketplace}
                    sx={{ color: '#90CAF9' }}
                  >
                    開く
                  </Button>
                </CardActions>
              </Card>
            </Box>

            {/* Chatflow一覧 */}
            <Paper sx={{ p: 3, bgcolor: '#1E1E1E' }}>
              <Typography variant="h6" sx={{ color: '#E0E0E0', mb: 2 }}>
                利用可能なChatflows
              </Typography>

              {chatflows.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <GroupWorkIcon sx={{ fontSize: 64, color: 'grey.600', mb: 2 }} />
                  <Typography sx={{ color: '#999' }} gutterBottom>
                    Chatflowがありません
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<OpenInNewIcon />}
                    onClick={openFlowiseAgentflows}
                    sx={{ mt: 2, backgroundColor: '#90CAF9', color: '#000' }}
                  >
                    新しいAgentflowを作成
                  </Button>
                </Box>
              ) : (
                <List>
                  {chatflows.map((chatflow, index) => (
                    <React.Fragment key={chatflow.id}>
                      {index > 0 && <Divider sx={{ borderColor: '#333' }} />}
                      <ListItem
                        secondaryAction={
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              startIcon={<ChatIcon />}
                              onClick={() => openChat(chatflow.id)}
                              sx={{ color: '#90CAF9' }}
                            >
                              チャット
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<OpenInNewIcon />}
                              onClick={() => openFlowiseChatflow(chatflow.id)}
                              sx={{ borderColor: '#666', color: '#E0E0E0' }}
                            >
                              編集
                            </Button>
                          </Box>
                        }
                        disablePadding
                      >
                        <ListItemButton>
                          <ListItemIcon>
                            <SmartToyIcon sx={{ color: '#90CAF9' }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography sx={{ color: '#E0E0E0' }}>
                                  {chatflow.name}
                                </Typography>
                                {chatflow.deployed && (
                                  <Chip label="デプロイ済み" size="small" color="success" />
                                )}
                              </Box>
                            }
                            secondary={
                              <Typography variant="body2" sx={{ color: '#999' }}>
                                ID: {chatflow.id.substring(0, 8)}...
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>
          </>
        )}

        {/* 未接続時のガイド */}
        {!status?.success && (
          <Paper sx={{ p: 3, bgcolor: '#1E1E1E' }}>
            <Typography variant="h6" sx={{ color: '#E0E0E0', mb: 2 }}>
              Flowiseのセットアップ
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary={<Typography sx={{ color: '#E0E0E0' }}>1. Flowiseをインストール</Typography>}
                  secondary={<code style={{ color: '#90CAF9' }}>npm install -g flowise</code>}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={<Typography sx={{ color: '#E0E0E0' }}>2. Flowiseを起動</Typography>}
                  secondary={<code style={{ color: '#90CAF9' }}>npx flowise start</code>}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={<Typography sx={{ color: '#E0E0E0' }}>3. 環境変数を設定</Typography>}
                  secondary={<code style={{ color: '#90CAF9' }}>NEXT_PUBLIC_FLOWISE_API_URL=http://localhost:3000</code>}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={<Typography sx={{ color: '#E0E0E0' }}>4. このページを更新</Typography>}
                  secondary={<Typography sx={{ color: '#999' }}>Flowiseサーバーに接続されます</Typography>}
                />
              </ListItem>
            </List>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
