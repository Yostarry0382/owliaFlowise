'use client';

import { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, IconButton, Tooltip, Alert } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';

interface FlowiseCanvasEmbedProps {
  chatflowId?: string;
  apiHost?: string;
  height?: string | number;
  showHeader?: boolean;
  onClose?: () => void;
}

/**
 * Flowise キャンバス埋め込みコンポーネント
 *
 * FlowiseのChatflow編集画面をiframeで埋め込み表示します。
 *
 * 使用方法:
 * <FlowiseCanvasEmbed
 *   chatflowId="your-chatflow-id"
 *   apiHost="http://localhost:3000"
 *   height={600}
 * />
 */
export default function FlowiseCanvasEmbed({
  chatflowId,
  apiHost,
  height = '100%',
  showHeader = true,
  onClose,
}: FlowiseCanvasEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  const effectiveApiHost = apiHost || process.env.NEXT_PUBLIC_FLOWISE_API_URL || 'http://localhost:3000';

  // chatflowIdがある場合は編集画面、ない場合はchatflows一覧
  const iframeUrl = chatflowId
    ? `${effectiveApiHost}/canvas/${chatflowId}`
    : `${effectiveApiHost}/chatflows`;

  useEffect(() => {
    setIsLoading(true);
    setError(null);
  }, [chatflowId, effectiveApiHost]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Flowiseへの接続に失敗しました。Flowiseサーバーが起動しているか確認してください。');
  };

  const handleRefresh = () => {
    setKey(prev => prev + 1);
    setIsLoading(true);
    setError(null);
  };

  const handleOpenInNewTab = () => {
    window.open(iframeUrl, '_blank');
  };

  return (
    <Box
      sx={{
        height: typeof height === 'number' ? `${height}px` : height,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#1a1a2e',
        borderRadius: showHeader ? 1 : 0,
        overflow: 'hidden',
        border: showHeader ? '1px solid #0f3460' : 'none',
      }}
    >
      {/* ヘッダー */}
      {showHeader && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1,
            bgcolor: '#16213e',
            borderBottom: '1px solid #0f3460',
          }}
        >
          <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600 }}>
            {chatflowId ? (
              <>
                <span style={{ marginRight: 8 }}>📊</span>
                Flowise Canvas
              </>
            ) : (
              <>
                <span style={{ marginRight: 8 }}>📋</span>
                Flowise Chatflows
              </>
            )}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="更新">
              <IconButton
                size="small"
                onClick={handleRefresh}
                sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#90CAF9' } }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="新しいタブで開く">
              <IconButton
                size="small"
                onClick={handleOpenInNewTab}
                sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#90CAF9' } }}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {onClose && (
              <Tooltip title="閉じる">
                <IconButton
                  size="small"
                  onClick={onClose}
                  sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#e94560' } }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      )}

      {/* iframeコンテンツ */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        {/* ローディング表示 */}
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#1a1a2e',
              zIndex: 10,
            }}
          >
            <CircularProgress sx={{ color: '#e94560', mb: 2 }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Flowiseを読み込んでいます...
            </Typography>
          </Box>
        )}

        {/* エラー表示 */}
        {error && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#1a1a2e',
              zIndex: 10,
              p: 4,
            }}
          >
            <Alert
              severity="error"
              sx={{
                maxWidth: 400,
                bgcolor: 'rgba(244, 67, 54, 0.1)',
                color: '#f44336',
                border: '1px solid #f44336',
              }}
              action={
                <IconButton
                  size="small"
                  onClick={handleRefresh}
                  sx={{ color: '#f44336' }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              }
            >
              {error}
            </Alert>
            <Typography
              variant="body2"
              sx={{ color: 'rgba(255,255,255,0.5)', mt: 2, textAlign: 'center' }}
            >
              Flowise URL: {effectiveApiHost}
            </Typography>
          </Box>
        )}

        {/* iframe */}
        <iframe
          key={key}
          src={iframeUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: error ? 'none' : 'block',
          }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title="Flowise Canvas"
          allow="clipboard-read; clipboard-write"
        />
      </Box>
    </Box>
  );
}
