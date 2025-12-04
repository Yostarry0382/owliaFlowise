'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';

// ローカルストレージのキー
const FLOWS_STORAGE_KEY = 'owliafabrica_flows';

interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label?: string;
    nodeType?: string;
    description?: string;
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

interface SavedFlow {
  id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ローカルストレージからフローを読み込む
function loadFlowFromStorage(flowId: string): SavedFlow | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(FLOWS_STORAGE_KEY);
    if (!stored) return null;
    const flows: SavedFlow[] = JSON.parse(stored);
    return flows.find((f) => f.id === flowId) || null;
  } catch {
    return null;
  }
}

// シンプルなモック応答生成（後でFlowise連携に置き換え可能）
async function generateResponse(flow: SavedFlow, userMessage: string): Promise<string> {
  // フローのノード情報を使ってシンプルな応答を生成
  const nodeTypes = flow.nodes.map((n) => n.data?.label || 'unknown');

  // 実際のLLM連携がない場合のモック応答
  await new Promise((resolve) => setTimeout(resolve, 1000)); // シミュレーション遅延

  return `**${flow.name}** からの応答:\n\n` +
    `あなたのメッセージ「${userMessage}」を受け取りました。\n\n` +
    `このフローには以下のノードが含まれています:\n` +
    nodeTypes.map((t) => `- ${t}`).join('\n') + '\n\n' +
    `_※ これはモック応答です。実際のLLM連携を設定すると、AIが応答を生成します。_`;
}

export default function ChatContent() {
  const searchParams = useSearchParams();
  const flowId = searchParams.get('flowId');

  const [flow, setFlow] = useState<SavedFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // フローを読み込む
  useEffect(() => {
    if (flowId) {
      const loadedFlow = loadFlowFromStorage(flowId);
      if (loadedFlow) {
        setFlow(loadedFlow);
        // ウェルカムメッセージ
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: `こんにちは！**${loadedFlow.name}** にようこそ。\n\n何かお手伝いできることはありますか？`,
            timestamp: new Date(),
          },
        ]);
      } else {
        setError('フローが見つかりません');
      }
    }
    setLoading(false);
  }, [flowId]);

  // メッセージが追加されたらスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // メッセージ送信
  const handleSend = async () => {
    if (!input.trim() || !flow || sending) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await generateResponse(flow, userMessage.content);
      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setError('応答の生成に失敗しました');
    } finally {
      setSending(false);
    }
  };

  // Enter キーで送信
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#1a1a2e',
        }}
      >
        <CircularProgress sx={{ color: '#e94560' }} />
      </Box>
    );
  }

  // フローIDが指定されていない場合
  if (!flowId) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#1a1a2e',
          p: 4,
        }}
      >
        <Paper
          sx={{
            p: 4,
            maxWidth: 400,
            textAlign: 'center',
            bgcolor: '#16213e',
            border: '1px solid #0f3460',
          }}
        >
          <SmartToyIcon sx={{ fontSize: 64, color: 'rgba(255,255,255,0.3)', mb: 2 }} />
          <Typography variant="h5" sx={{ color: '#fff', mb: 2 }}>
            フローを選択してください
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 3 }}>
            チャットを開始するには、Flow Builder でフローを作成し、チャットアイコンをクリックしてください。
          </Typography>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#e94560',
              color: '#fff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Flow Builder へ
          </Link>
        </Paper>
      </Box>
    );
  }

  // エラー表示
  if (error) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#1a1a2e',
          p: 4,
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#e94560',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          ホームに戻る
        </Link>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#1a1a2e' }}>
      {/* ヘッダー */}
      <Paper
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          bgcolor: '#16213e',
          borderBottom: '2px solid #0f3460',
          borderRadius: 0,
        }}
      >
        <Link href="/">
          <IconButton sx={{ color: 'rgba(255,255,255,0.7)' }}>
            <ArrowBackIcon />
          </IconButton>
        </Link>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: '#e94560',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>🦉</span>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600 }}>
            {flow?.name || 'Chat'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            {flow?.nodes?.length || 0} ノード
          </Typography>
        </Box>
      </Paper>

      {/* メッセージエリア */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              display: 'flex',
              gap: 1.5,
              mb: 2,
              flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            {/* アバター */}
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: message.role === 'user' ? '#2196F3' : '#e94560',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {message.role === 'user' ? (
                <PersonIcon sx={{ color: '#fff', fontSize: 20 }} />
              ) : (
                <SmartToyIcon sx={{ color: '#fff', fontSize: 20 }} />
              )}
            </Box>

            {/* メッセージ本文 */}
            <Paper
              sx={{
                p: 2,
                maxWidth: '70%',
                bgcolor: message.role === 'user' ? '#0f3460' : '#16213e',
                border: '1px solid #0f3460',
              }}
            >
              <Typography
                sx={{
                  color: '#fff',
                  whiteSpace: 'pre-wrap',
                  '& strong': { color: '#90CAF9' },
                  '& em': { color: 'rgba(255,255,255,0.6)' },
                }}
                dangerouslySetInnerHTML={{
                  __html: message.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/_(.*?)_/g, '<em>$1</em>')
                    .replace(/\n/g, '<br/>'),
                }}
              />
            </Paper>
          </Box>
        ))}

        {/* 送信中インジケーター */}
        {sending && (
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: '#e94560',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SmartToyIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Paper sx={{ p: 2, bgcolor: '#16213e', border: '1px solid #0f3460' }}>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: '#90CAF9',
                    animation: 'pulse 1s infinite',
                    animationDelay: '0s',
                  }}
                />
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: '#90CAF9',
                    animation: 'pulse 1s infinite',
                    animationDelay: '0.2s',
                  }}
                />
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: '#90CAF9',
                    animation: 'pulse 1s infinite',
                    animationDelay: '0.4s',
                  }}
                />
              </Box>
            </Paper>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* 入力エリア */}
      <Paper
        sx={{
          p: 2,
          bgcolor: '#16213e',
          borderTop: '2px solid #0f3460',
          borderRadius: 0,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            variant="outlined"
            size="small"
            disabled={sending}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: '#0f3460',
                color: '#fff',
                '& fieldset': { borderColor: '#0f3460' },
                '&:hover fieldset': { borderColor: '#90CAF9' },
                '&.Mui-focused fieldset': { borderColor: '#e94560' },
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'rgba(255,255,255,0.5)',
              },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={!input.trim() || sending}
            sx={{
              bgcolor: '#e94560',
              color: '#fff',
              '&:hover': { bgcolor: '#c73e54' },
              '&.Mui-disabled': { bgcolor: '#0f3460', color: 'rgba(255,255,255,0.3)' },
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>

      {/* アニメーション用CSS */}
      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </Box>
  );
}
