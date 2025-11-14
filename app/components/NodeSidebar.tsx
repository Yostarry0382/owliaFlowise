'use client';

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Psychology,
  Storage,
  Transform,
  Api,
  TextFields,
  Code,
  Memory,
  Chat,
  DocumentScanner,
  Functions,
} from '@mui/icons-material';

interface NodeTypeItem {
  type: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const nodeTypes: NodeTypeItem[] = [
  {
    type: 'llm',
    label: 'LLMノード',
    icon: <Psychology color="primary" />,
    description: '言語モデルの処理',
  },
  {
    type: 'chain',
    label: 'チェーンノード',
    icon: <Functions color="primary" />,
    description: 'ノードを連結',
  },
  {
    type: 'prompt',
    label: 'プロンプトテンプレート',
    icon: <TextFields color="primary" />,
    description: 'プロンプトを定義',
  },
  {
    type: 'memory',
    label: 'メモリノード',
    icon: <Memory color="primary" />,
    description: '会話履歴を保存',
  },
  {
    type: 'vectorstore',
    label: 'ベクトルストア',
    icon: <Storage color="primary" />,
    description: 'ベクトルDB接続',
  },
  {
    type: 'tool',
    label: 'ツールノード',
    icon: <Api color="primary" />,
    description: 'API呼び出し',
  },
  {
    type: 'chat',
    label: 'チャットインターフェース',
    icon: <Chat color="primary" />,
    description: 'チャットUI',
  },
  {
    type: 'document',
    label: 'ドキュメントローダー',
    icon: <DocumentScanner color="primary" />,
    description: 'ドキュメント読み込み',
  },
  {
    type: 'transform',
    label: 'データ変換',
    icon: <Transform color="primary" />,
    description: 'データ処理',
  },
  {
    type: 'code',
    label: 'カスタムコード',
    icon: <Code color="primary" />,
    description: 'カスタム処理',
  },
];

export default function NodeSidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Paper
      sx={{
        width: 280,
        height: '100%',
        overflow: 'auto',
        bgcolor: 'background.paper',
        borderRadius: 0,
      }}
      elevation={2}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          ノードパレット
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          ドラッグ＆ドロップでノードを追加
        </Typography>
      </Box>

      <Divider />

      <List sx={{ p: 1 }}>
        {nodeTypes.map((node) => (
          <ListItem
            key={node.type}
            draggable
            onDragStart={(e) => onDragStart(e, node.type, node.label)}
            sx={{
              mb: 1,
              cursor: 'grab',
              bgcolor: 'background.default',
              borderRadius: 1,
              '&:hover': {
                bgcolor: 'action.hover',
              },
              '&:active': {
                cursor: 'grabbing',
              },
            }}
          >
            <ListItemIcon>{node.icon}</ListItemIcon>
            <ListItemText
              primary={node.label}
              secondary={node.description}
              primaryTypographyProps={{ fontWeight: 500 }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}