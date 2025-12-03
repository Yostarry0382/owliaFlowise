'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Typography,
  CircularProgress,
  Container,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Modal,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ChatIcon from '@mui/icons-material/Chat';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import dynamic from 'next/dynamic';

const FlowiseCanvasEmbed = dynamic(() => import('../components/FlowiseCanvasEmbed'), {
  ssr: false,
});
import { useRouter } from 'next/navigation';

// Define OwlAgent interface inline (since owlagent.ts was deleted)
interface OwlAgent {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  tags?: string[];
  flowiseChatflowId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// カテゴリー定義
const categories = [
  'すべて',
  'ビジネス',
  'プログラミング',
  'クリエイティブ',
  'データ分析',
  'カスタマーサービス',
  '教育',
];

// ソート順
const sortOptions = [
  { value: 'popular', label: '人気順' },
  { value: 'newest', label: '新着順' },
  { value: 'rating', label: '評価順' },
  { value: 'name', label: '名前順' },
];

export default function StorePage() {
  const router = useRouter();
  const [agents, setAgents] = useState<OwlAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [sortBy, setSortBy] = useState('popular');
  const [canvasModalOpen, setCanvasModalOpen] = useState(false);
  const [selectedChatflowId, setSelectedChatflowId] = useState<string | null>(null);

  const flowiseUrl = process.env.NEXT_PUBLIC_FLOWISE_API_URL || 'http://localhost:3000';

  const openCanvasModal = (chatflowId: string) => {
    setSelectedChatflowId(chatflowId);
    setCanvasModalOpen(true);
  };

  const closeCanvasModal = () => {
    setCanvasModalOpen(false);
    setSelectedChatflowId(null);
  };

  // データ取得
  useEffect(() => {
    const fetchAgents = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/owlagents');
        if (response.ok) {
          const data = await response.json();
          setAgents(data);
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, []);

  // フィルタリング処理
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'すべて' ||
                           agent.tags?.some(tag => tag.includes(selectedCategory));
    return matchesSearch && matchesCategory;
  });

  // ソート処理
  const sortedAgents = [...filteredAgents].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'newest':
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        return dateB - dateA;
      default:
        return 0;
    }
  });

  const openChat = (agent: OwlAgent) => {
    if (agent.flowiseChatflowId) {
      window.open(`/chat?chatflow=${agent.flowiseChatflowId}`, '_blank');
    } else {
      window.open(`/chat?agent=${agent.id}`, '_blank');
    }
  };

  const openInFlowise = (chatflowId: string) => {
    window.open(`${flowiseUrl}/canvas/${chatflowId}`, '_blank');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#1a1a2e' }}>
      {/* ヘッダー */}
      <Box sx={{ bgcolor: '#16213e', borderBottom: '2px solid #0f3460', px: 3, py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => router.push('/')}
            sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#90CAF9' } }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography
              variant="h5"
              sx={{
                color: '#fff',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🏪</span>
              エージェントストア
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
            >
              コミュニティが作成した優秀なAIエージェントを探索して利用しましょう
            </Typography>
          </Box>
        </Box>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>

      {/* フィルターセクション */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 4,
          flexWrap: 'wrap',
        }}
      >
        {/* 検索バー */}
        <TextField
          placeholder="エージェントを検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            flex: '1 1 300px',
            minWidth: 300,
            '& .MuiInputBase-root': {
              backgroundColor: '#16213e',
              color: '#fff',
              '& fieldset': { borderColor: '#0f3460' },
              '&:hover fieldset': { borderColor: '#90CAF9' },
            },
            '& .MuiInputBase-input': { color: '#fff' },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
              </InputAdornment>
            ),
          }}
        />

        {/* カテゴリーフィルター */}
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>カテゴリー</InputLabel>
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            label="カテゴリー"
            sx={{
              backgroundColor: '#16213e',
              color: '#fff',
              '& fieldset': { borderColor: '#0f3460' },
              '&:hover fieldset': { borderColor: '#90CAF9' },
              '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
            }}
          >
            {categories.map(category => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* ソート順 */}
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>並び順</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            label="並び順"
            sx={{
              backgroundColor: '#16213e',
              color: '#fff',
              '& fieldset': { borderColor: '#0f3460' },
              '&:hover fieldset': { borderColor: '#90CAF9' },
              '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
            }}
          >
            {sortOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* エージェント一覧 */}
      {loading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
          }}
        >
          <CircularProgress sx={{ color: '#e94560' }} />
        </Box>
      ) : sortedAgents.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
          }}
        >
          <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 2 }}>
            エージェントが見つかりませんでした
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.3)' }}>
            検索条件を変更してお試しください
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {sortedAgents.map((agent) => (
            <Box key={agent.id} sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.333% - 16px)' } }}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#16213e',
                  border: '1px solid #0f3460',
                  '&:hover': {
                    borderColor: '#e94560',
                    transform: 'translateY(-4px)',
                    transition: 'all 0.3s ease',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: '#e94560',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '1.2em' }}>{agent.icon || '🦉'}</span>
                    </Box>
                    <Typography variant="h6" sx={{ color: '#fff' }}>
                      {agent.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                    {agent.description}
                  </Typography>
                  {agent.tags && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {agent.tags.map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(144, 202, 249, 0.2)',
                            color: '#90CAF9',
                          }}
                        />
                      ))}
                    </Box>
                  )}
                  {agent.flowiseChatflowId && (
                    <Typography variant="caption" sx={{ color: '#4CAF50', mt: 1, display: 'block' }}>
                      ✓ Flowise連携済み
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', p: 2, borderTop: '1px solid #0f3460' }}>
                  {agent.flowiseChatflowId ? (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="text"
                        size="small"
                        startIcon={<AccountTreeIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          openCanvasModal(agent.flowiseChatflowId!);
                        }}
                        sx={{ color: '#90CAF9' }}
                      >
                        Canvas
                      </Button>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          openInFlowise(agent.flowiseChatflowId!);
                        }}
                        sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#90CAF9' } }}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box />
                  )}
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<ChatIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      openChat(agent);
                    }}
                    sx={{
                      backgroundColor: '#e94560',
                      color: '#fff',
                      '&:hover': {
                        backgroundColor: '#c73e54',
                      },
                    }}
                  >
                    チャット
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ))}
        </Box>
      )}

      {/* Flowiseリンクボタン */}
      <Button
        variant="contained"
        startIcon={<OpenInNewIcon />}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          boxShadow: '0 4px 12px rgba(233, 69, 96, 0.4)',
          backgroundColor: '#e94560',
          color: '#fff',
          '&:hover': {
            backgroundColor: '#c73e54',
          },
        }}
        onClick={() => window.open(`${flowiseUrl}/chatflows`, '_blank')}
      >
        Flowiseで新規作成
      </Button>
      </Container>

      {/* Flowise Canvas モーダル */}
      <Modal
        open={canvasModalOpen}
        onClose={closeCanvasModal}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Box
          sx={{
            width: '90vw',
            height: '85vh',
            maxWidth: 1400,
            outline: 'none',
          }}
        >
          <FlowiseCanvasEmbed
            chatflowId={selectedChatflowId || undefined}
            height="100%"
            showHeader={true}
            onClose={closeCanvasModal}
          />
        </Box>
      </Modal>
    </Box>
  );
}
