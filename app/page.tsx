'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, Tabs, Tab, Paper, Button, Typography, IconButton, Tooltip } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import FolderIcon from '@mui/icons-material/Folder';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ChatIcon from '@mui/icons-material/Chat';
import { useRouter } from 'next/navigation';

const UnifiedFlowBuilder = dynamic(() => import('./components/UnifiedFlowBuilder'), {
  ssr: false,
});

const SavedOwlsList = dynamic(() => import('./components/SavedOwlsList'), {
  ssr: false,
});

const FlowiseChatEmbed = dynamic(() => import('./components/FlowiseChatEmbed'), {
  ssr: false,
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#1a1a2e' }}>
      {/* ヘッダー */}
      <Paper
        sx={{
          borderRadius: 0,
          bgcolor: '#16213e',
          borderBottom: '2px solid #0f3460',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2 }}>
          {/* ロゴ・タイトル */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: '#e94560',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>🦉</span>
              OwliaFabrica
            </Typography>
          </Box>

          {/* タブナビゲーション */}
          <Tabs
            value={tabValue}
            onChange={handleChange}
            sx={{
              '& .MuiTab-root': {
                color: 'rgba(255,255,255,0.7)',
                minHeight: 64,
                '&.Mui-selected': {
                  color: '#90CAF9',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#e94560',
                height: 3,
              },
            }}
          >
            <Tab
              icon={<BuildIcon />}
              label="Flow Builder"
              iconPosition="start"
            />
            <Tab
              icon={<FolderIcon />}
              label="Saved Owls"
              iconPosition="start"
            />
          </Tabs>

          {/* 右側アクション */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="チャット">
              <IconButton
                onClick={() => router.push('/chat')}
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  '&:hover': { color: '#90CAF9' },
                }}
              >
                <ChatIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<StorefrontIcon />}
              onClick={() => router.push('/store')}
              sx={{
                backgroundColor: '#e94560',
                color: '#fff',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: '#c73e54',
                },
              }}
            >
              Store
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* メインコンテンツ */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <TabPanel value={tabValue} index={0}>
          <UnifiedFlowBuilder />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <SavedOwlsList />
        </TabPanel>
      </Box>

      {/* Flowise チャットバブル（環境変数で設定されている場合のみ表示） */}
      {process.env.NEXT_PUBLIC_FLOWISE_DEFAULT_CHATFLOW_ID && (
        <FlowiseChatEmbed
          chatflowId={process.env.NEXT_PUBLIC_FLOWISE_DEFAULT_CHATFLOW_ID}
        />
      )}
    </Box>
  );
}
