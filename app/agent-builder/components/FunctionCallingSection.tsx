'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  InputLabel,
  Switch,
  IconButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  Tooltip,
  Chip,
  Card,
  CardContent,
  Badge,
  Collapse,
  Alert,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import BuildIcon from '@mui/icons-material/Build';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LinkIcon from '@mui/icons-material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FolderIcon from '@mui/icons-material/Folder';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import HandymanIcon from '@mui/icons-material/Handyman';
import FileDropZone from './FileDropZone';

interface SavedOwlAgent {
  id: string;
  name: string;
  description: string;
}

interface ToolDefinition {
  name: string;
  icon: string;
  description: string;
  category: string;
  settings?: {
    key: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'file' | 'select';
    default?: any;
    placeholder?: string;
    description?: string;
    accept?: string; // ファイルタイプ用
    options?: { value: string; label: string }[]; // select用
  }[];
}

interface FunctionCallingSectionProps {
  enableTools: boolean;
  onEnableToolsChange: (enabled: boolean) => void;
  builtinTools: string[];
  onBuiltinToolsChange: (tools: string[]) => void;
  toolAgents: string[];
  onToolAgentsChange: (agents: string[]) => void;
  toolChoice: string;
  onToolChoiceChange: (choice: string) => void;
  maxIterations: number;
  onMaxIterationsChange: (iterations: number) => void;
  toolSettings: Record<string, Record<string, any>>;
  onToolSettingsChange: (settings: Record<string, Record<string, any>>) => void;
  savedOwlAgents: SavedOwlAgent[];
  connectedTools?: { id: string; label: string; type: string }[];
}

// 組み込みツール定義
const builtinToolDefinitions: Record<string, ToolDefinition> = {
  writeFile: {
    name: 'Write File',
    icon: '✍️',
    description: 'ファイルを書き込む',
    category: 'file',
    settings: [
      { key: 'basePath', label: 'Base Path', type: 'string', default: './data/output', placeholder: './data/output', description: '出力先のベースディレクトリ' },
      {
        key: 'fileFormat',
        label: 'ファイル形式',
        type: 'select',
        default: 'txt',
        description: '出力ファイルの形式を選択',
        options: [
          { value: 'txt', label: 'テキスト (.txt)' },
          { value: 'json', label: 'JSON (.json)' },
          { value: 'csv', label: 'CSV (.csv)' },
          { value: 'md', label: 'Markdown (.md)' },
          { value: 'html', label: 'HTML (.html)' },
          { value: 'xml', label: 'XML (.xml)' },
          { value: 'yaml', label: 'YAML (.yaml)' },
          { value: 'log', label: 'ログ (.log)' },
        ],
      },
      {
        key: 'writeMode',
        label: '書き込みモード',
        type: 'select',
        default: 'overwrite',
        description: 'ファイルの書き込み方法を選択',
        options: [
          { value: 'overwrite', label: '上書き' },
          { value: 'append', label: '追記' },
        ],
      },
    ],
  },
  readFile: {
    name: 'Read File',
    icon: '📖',
    description: 'ファイルを読み込む',
    category: 'file',
    settings: [
      { key: 'basePath', label: 'Base Path', type: 'string', default: './data', placeholder: './data', description: '読み込み元のベースディレクトリ' },
    ],
  },
  pdfLoader: {
    name: 'PDF Loader',
    icon: '📄',
    description: 'PDFファイルを読み込む',
    category: 'document',
    settings: [
      { key: 'file', label: 'PDFファイル', type: 'file', accept: '.pdf', description: 'ドラッグ&ドロップまたはクリックでPDFファイルを選択' },
      { key: 'basePath', label: 'Base Path', type: 'string', default: './data', placeholder: './data', description: 'PDFファイルのベースディレクトリ' },
    ],
  },
  csvLoader: {
    name: 'CSV Loader',
    icon: '📊',
    description: 'CSVファイルを読み込む',
    category: 'document',
    settings: [
      { key: 'file', label: 'CSVファイル', type: 'file', accept: '.csv', description: 'ドラッグ&ドロップまたはクリックでCSVファイルを選択' },
      { key: 'basePath', label: 'Base Path', type: 'string', default: './data', placeholder: './data', description: 'CSVファイルのベースディレクトリ' },
      { key: 'delimiter', label: 'Delimiter', type: 'string', default: ',', placeholder: ',', description: '区切り文字' },
    ],
  },
  jsonLoader: {
    name: 'JSON Loader',
    icon: '📋',
    description: 'JSONファイルを読み込む',
    category: 'document',
    settings: [
      { key: 'file', label: 'JSONファイル', type: 'file', accept: '.json', description: 'ドラッグ&ドロップまたはクリックでJSONファイルを選択' },
      { key: 'basePath', label: 'Base Path', type: 'string', default: './data', placeholder: './data', description: 'JSONファイルのベースディレクトリ' },
    ],
  },
  textLoader: {
    name: 'Text Loader',
    icon: '📝',
    description: 'テキストファイルを読み込む',
    category: 'document',
    settings: [
      { key: 'file', label: 'テキストファイル', type: 'file', accept: '.txt,.md', description: 'ドラッグ&ドロップまたはクリックでテキストファイルを選択' },
      { key: 'basePath', label: 'Base Path', type: 'string', default: './data', placeholder: './data', description: 'テキストファイルのベースディレクトリ' },
      { key: 'maxLength', label: 'Max Length', type: 'number', default: 10000, description: '読み込む最大文字数' },
    ],
  },
  docxLoader: {
    name: 'DOCX Loader',
    icon: '📃',
    description: 'Wordファイルを読み込む',
    category: 'document',
    settings: [
      { key: 'file', label: 'Wordファイル', type: 'file', accept: '.doc,.docx', description: 'ドラッグ&ドロップまたはクリックでWordファイルを選択' },
      { key: 'basePath', label: 'Base Path', type: 'string', default: './data', placeholder: './data', description: 'DOCXファイルのベースディレクトリ' },
    ],
  },
  excelLoader: {
    name: 'Excel Loader',
    icon: '📈',
    description: 'Excelファイルを読み込む',
    category: 'document',
    settings: [
      { key: 'file', label: 'Excelファイル', type: 'file', accept: '.xls,.xlsx', description: 'ドラッグ&ドロップまたはクリックでExcelファイルを選択' },
      { key: 'basePath', label: 'Base Path', type: 'string', default: './data', placeholder: './data', description: 'Excelファイルのベースディレクトリ' },
      { key: 'sheetName', label: 'Sheet Name', type: 'string', placeholder: 'Sheet1', description: '読み込むシート名（空白で最初のシート）' },
    ],
  },
  webSearch: {
    name: 'Web Search',
    icon: '🔍',
    description: 'Web検索を実行',
    category: 'web',
    settings: [
      { key: 'maxResults', label: 'Max Results', type: 'number', default: 5, description: '取得する検索結果の最大数' },
    ],
  },
  webScraper: {
    name: 'Web Scraper',
    icon: '🌐',
    description: 'Webページの内容を取得',
    category: 'web',
    settings: [
      { key: 'maxLength', label: 'Max Length', type: 'number', default: 5000, description: '取得する最大文字数' },
      { key: 'removeScripts', label: 'Remove Scripts', type: 'boolean', default: true, description: 'スクリプトタグを除去' },
    ],
  },
  calculator: {
    name: 'Calculator',
    icon: '🧮',
    description: '数式を計算',
    category: 'utility',
  },
  dateTime: {
    name: 'Date/Time',
    icon: '📅',
    description: '現在の日時を取得',
    category: 'utility',
    settings: [
      { key: 'timezone', label: 'Timezone', type: 'string', default: 'Asia/Tokyo', placeholder: 'Asia/Tokyo', description: 'タイムゾーン' },
    ],
  },
  jsonParser: {
    name: 'JSON Parser',
    icon: '🔧',
    description: 'JSONを解析・変換',
    category: 'utility',
  },
};

// カテゴリ定義
const toolCategories = [
  { id: 'file', label: 'ファイル操作', icon: <FolderIcon sx={{ fontSize: 16 }} />, color: '#4CAF50' },
  { id: 'document', label: 'ドキュメント読み込み', icon: <DescriptionIcon sx={{ fontSize: 16 }} />, color: '#FF9800' },
  { id: 'web', label: 'Web・検索', icon: <SearchIcon sx={{ fontSize: 16 }} />, color: '#2196F3' },
  { id: 'utility', label: 'ユーティリティ', icon: <HandymanIcon sx={{ fontSize: 16 }} />, color: '#9C27B0' },
];

export default function FunctionCallingSection({
  enableTools,
  onEnableToolsChange,
  builtinTools,
  onBuiltinToolsChange,
  toolAgents,
  onToolAgentsChange,
  toolChoice,
  onToolChoiceChange,
  maxIterations,
  onMaxIterationsChange,
  toolSettings,
  onToolSettingsChange,
  savedOwlAgents,
  connectedTools = [],
}: FunctionCallingSectionProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(enableTools);

  // 有効なツールの合計数を計算
  const totalActiveTools = useMemo(() => {
    return builtinTools.length + toolAgents.length + connectedTools.length;
  }, [builtinTools, toolAgents, connectedTools]);

  // ツール選択ハンドラー
  const handleToolToggle = (toolId: string) => {
    const isSelected = builtinTools.includes(toolId);
    if (isSelected) {
      onBuiltinToolsChange(builtinTools.filter((id) => id !== toolId));
    } else {
      onBuiltinToolsChange([...builtinTools, toolId]);
    }
  };

  // OwlAgent選択ハンドラー
  const handleAgentToggle = (agentId: string) => {
    const isSelected = toolAgents.includes(agentId);
    if (isSelected) {
      onToolAgentsChange(toolAgents.filter((id) => id !== agentId));
    } else {
      onToolAgentsChange([...toolAgents, agentId]);
    }
  };

  // ツール設定更新ハンドラー
  const handleToolSettingChange = (toolId: string, settingKey: string, settingValue: any) => {
    const newSettings = {
      ...toolSettings,
      [toolId]: {
        ...(toolSettings[toolId] || {}),
        [settingKey]: settingValue,
      },
    };
    onToolSettingsChange(newSettings);
  };

  // ツールカードをレンダリング
  const renderToolCard = (toolId: string, toolDef: ToolDefinition) => {
    const isSelected = builtinTools.includes(toolId);
    const isToolExpanded = expandedTool === toolId;
    const currentSettings = toolSettings[toolId] || {};
    const category = toolCategories.find((c) => c.id === toolDef.category);

    return (
      <Card
        key={toolId}
        sx={{
          mb: 1,
          bgcolor: isSelected ? 'rgba(99, 102, 241, 0.1)' : '#252536',
          border: isSelected ? '2px solid #6366f1' : '1px solid #3d3d54',
          borderRadius: 2,
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: isSelected ? '#6366f1' : '#5558e3',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          },
        }}
      >
        <CardContent
          onClick={() => handleToolToggle(toolId)}
          sx={{
            p: 1.5,
            '&:last-child': { pb: 1.5 },
            cursor: 'pointer',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* チェックボックス */}
            <Box
              sx={{
                width: 22,
                height: 22,
                borderRadius: '6px',
                border: isSelected ? 'none' : '2px solid #555',
                bgcolor: isSelected ? '#6366f1' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              {isSelected && (
                <CheckCircleIcon sx={{ fontSize: 18, color: '#fff' }} />
              )}
            </Box>

            {/* アイコン */}
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                bgcolor: category?.color + '22' || '#3d3d54',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Typography sx={{ fontSize: '1.3rem' }}>{toolDef.icon}</Typography>
            </Box>

            {/* ツール情報 */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  lineHeight: 1.3,
                }}
              >
                {toolDef.name}
              </Typography>
              <Typography
                sx={{
                  color: '#888',
                  fontSize: '0.72rem',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {toolDef.description}
              </Typography>
            </Box>

            {/* 設定ボタン */}
            {isSelected && toolDef.settings && toolDef.settings.length > 0 && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedTool(isToolExpanded ? null : toolId);
                }}
                sx={{
                  color: isToolExpanded ? '#6366f1' : '#888',
                  '&:hover': { color: '#6366f1' },
                }}
              >
                <TuneIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Box>
        </CardContent>

        {/* 設定パネル */}
        <Collapse in={isSelected && isToolExpanded && toolDef.settings && toolDef.settings.length > 0}>
          <Divider sx={{ borderColor: '#3d3d54' }} />
          <Box
            sx={{ p: 1.5, bgcolor: '#1a1a2e' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography
              sx={{
                color: '#888',
                fontSize: '0.7rem',
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <SettingsIcon sx={{ fontSize: 14 }} />
              詳細設定
            </Typography>
            {toolDef.settings?.map((setting) => (
              <Box key={setting.key} sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
                {setting.type === 'file' ? (
                  // ファイルアップロード
                  <Box onClick={(e) => e.stopPropagation()}>
                    <FileDropZone
                      value={currentSettings[setting.key] || ''}
                      onChange={(fileName, file) => {
                        handleToolSettingChange(toolId, setting.key, fileName);
                        if (file) {
                          handleToolSettingChange(toolId, `${setting.key}_file`, file);
                        }
                      }}
                      accept={setting.accept}
                      label={setting.label}
                      description={setting.description}
                    />
                  </Box>
                ) : setting.type === 'boolean' ? (
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={currentSettings[setting.key] ?? setting.default ?? false}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToolSettingChange(toolId, setting.key, e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: '#6366f1' },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#6366f1',
                          },
                        }}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '0.75rem', color: '#ccc' }}>
                          {setting.label}
                        </Typography>
                        {setting.description && (
                          <Tooltip title={setting.description} arrow>
                            <HelpOutlineIcon sx={{ fontSize: 12, color: '#666' }} />
                          </Tooltip>
                        )}
                      </Box>
                    }
                  />
                ) : setting.type === 'select' ? (
                  <FormControl fullWidth size="small" onClick={(e) => e.stopPropagation()}>
                    <InputLabel
                      sx={{
                        fontSize: '0.75rem',
                        color: '#888',
                        '&.Mui-focused': { color: '#6366f1' },
                      }}
                    >
                      {setting.label}
                    </InputLabel>
                    <Select
                      value={currentSettings[setting.key] ?? setting.default ?? ''}
                      label={setting.label}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToolSettingChange(toolId, setting.key, e.target.value);
                      }}
                      sx={{
                        fontSize: '0.8rem',
                        color: '#fff',
                        bgcolor: '#252536',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#3d3d54' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4d4d64' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
                        '& .MuiSvgIcon-root': { color: '#888' },
                      }}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            bgcolor: '#252536',
                            '& .MuiMenuItem-root': {
                              fontSize: '0.8rem',
                              color: '#fff',
                              '&:hover': { bgcolor: '#3d3d54' },
                              '&.Mui-selected': { bgcolor: '#6366f1' },
                            },
                          },
                        },
                      }}
                    >
                      {setting.options?.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {setting.description && (
                      <Typography sx={{ fontSize: '0.65rem', color: '#666', mt: 0.5 }}>
                        {setting.description}
                      </Typography>
                    )}
                  </FormControl>
                ) : (
                  <TextField
                    label={setting.label}
                    type={setting.type === 'number' ? 'number' : 'text'}
                    value={currentSettings[setting.key] ?? setting.default ?? ''}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToolSettingChange(
                        toolId,
                        setting.key,
                        setting.type === 'number' ? Number(e.target.value) : e.target.value
                      );
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    placeholder={setting.placeholder}
                    size="small"
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '0.8rem',
                        color: '#fff',
                        bgcolor: '#252536',
                        '& fieldset': { borderColor: '#3d3d54' },
                        '&:hover fieldset': { borderColor: '#4d4d64' },
                        '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.75rem',
                        color: '#888',
                      },
                    }}
                    InputProps={{
                      endAdornment: setting.description ? (
                        <InputAdornment position="end">
                          <Tooltip title={setting.description} arrow>
                            <HelpOutlineIcon sx={{ fontSize: 14, color: '#555' }} />
                          </Tooltip>
                        </InputAdornment>
                      ) : null,
                    }}
                  />
                )}
              </Box>
            ))}
          </Box>
        </Collapse>
      </Card>
    );
  };

  // OwlAgentカードをレンダリング
  const renderAgentCard = (agent: SavedOwlAgent) => {
    const isSelected = toolAgents.includes(agent.id);

    return (
      <Card
        key={agent.id}
        onClick={() => handleAgentToggle(agent.id)}
        sx={{
          mb: 1,
          bgcolor: isSelected ? 'rgba(255, 87, 34, 0.1)' : '#252536',
          border: isSelected ? '2px solid #FF5722' : '1px solid #3d3d54',
          borderRadius: 2,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: isSelected ? '#FF5722' : '#FF7043',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          },
        }}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* チェックボックス */}
            <Box
              sx={{
                width: 22,
                height: 22,
                borderRadius: '6px',
                border: isSelected ? 'none' : '2px solid #555',
                bgcolor: isSelected ? '#FF5722' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isSelected && (
                <CheckCircleIcon sx={{ fontSize: 18, color: '#fff' }} />
              )}
            </Box>

            {/* アイコン */}
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                bgcolor: '#FF572233',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Typography sx={{ fontSize: '1.3rem' }}>🦉</Typography>
            </Box>

            {/* エージェント情報 */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  lineHeight: 1.3,
                }}
              >
                {agent.name}
              </Typography>
              <Typography
                sx={{
                  color: '#888',
                  fontSize: '0.72rem',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {agent.description || 'No description'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Accordion
      expanded={isExpanded}
      onChange={(_, expanded) => setIsExpanded(expanded)}
      sx={{
        bgcolor: '#252536',
        color: '#fff',
        mb: 2,
        '&:before': { display: 'none' },
        border: enableTools ? '1px solid #6366f1' : '1px solid #3d3d54',
        borderRadius: '8px !important',
        overflow: 'hidden',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: '#888' }} />}
        sx={{
          minHeight: 56,
          '& .MuiAccordionSummary-content': { my: 1 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: enableTools
                ? 'linear-gradient(135deg, #6366f1 0%, #8B5CF6 100%)'
                : '#3d3d54',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BuildIcon sx={{ fontSize: 20, color: '#fff' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
              Function Calling
            </Typography>
            <Typography sx={{ color: '#888', fontSize: '0.72rem' }}>
              LLMがツールを呼び出して外部機能を実行
            </Typography>
          </Box>
          {totalActiveTools > 0 && (
            <Badge
              badgeContent={totalActiveTools}
              color="primary"
              sx={{
                mr: 2,
                '& .MuiBadge-badge': {
                  bgcolor: '#6366f1',
                  fontSize: '0.7rem',
                },
              }}
            />
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0 }}>
        {/* 有効/無効スイッチ */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
            p: 1.5,
            bgcolor: '#1a1a2e',
            borderRadius: 2,
          }}
        >
          <Box>
            <Typography sx={{ color: '#fff', fontSize: '0.85rem', fontWeight: 500 }}>
              ツール機能を有効化
            </Typography>
            <Typography sx={{ color: '#666', fontSize: '0.7rem' }}>
              選択したツールをLLMから呼び出し可能にします
            </Typography>
          </Box>
          <Switch
            checked={enableTools}
            onChange={(e) => onEnableToolsChange(e.target.checked)}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': { color: '#6366f1' },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#6366f1',
              },
            }}
          />
        </Box>

        {enableTools && (
          <>
            {/* 接続済みツール表示 */}
            {connectedTools.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  sx={{
                    color: '#888',
                    fontSize: '0.75rem',
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <LinkIcon sx={{ fontSize: 14 }} />
                  接続済みツール
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {connectedTools.map((tool) => (
                    <Chip
                      key={tool.id}
                      label={tool.label}
                      size="small"
                      icon={<LinkIcon sx={{ fontSize: 14 }} />}
                      sx={{
                        bgcolor: '#1e3a5f',
                        color: '#fff',
                        fontSize: '0.72rem',
                        '& .MuiChip-icon': { color: '#64B5F6' },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* ツール選択タブ */}
            <Box sx={{ borderBottom: 1, borderColor: '#3d3d54', mb: 2 }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                sx={{
                  minHeight: 40,
                  '& .MuiTab-root': {
                    minHeight: 40,
                    fontSize: '0.8rem',
                    color: '#888',
                    textTransform: 'none',
                    '&.Mui-selected': { color: '#6366f1' },
                  },
                  '& .MuiTabs-indicator': { bgcolor: '#6366f1' },
                }}
              >
                <Tab
                  icon={<BuildIcon sx={{ fontSize: 16 }} />}
                  iconPosition="start"
                  label={
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      組み込みツール
                      {builtinTools.length > 0 && (
                        <Chip
                          label={builtinTools.length}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.65rem',
                            bgcolor: '#6366f1',
                            color: '#fff',
                          }}
                        />
                      )}
                    </span>
                  }
                />
                <Tab
                  icon={<SmartToyIcon sx={{ fontSize: 16 }} />}
                  iconPosition="start"
                  label={
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      OwlAgentツール
                      {toolAgents.length > 0 && (
                        <Chip
                          label={toolAgents.length}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.65rem',
                            bgcolor: '#FF5722',
                            color: '#fff',
                          }}
                        />
                      )}
                    </span>
                  }
                />
              </Tabs>
            </Box>

            {/* 組み込みツールタブ */}
            {activeTab === 0 && (
              <Box sx={{ maxHeight: 400, overflow: 'auto', pr: 0.5 }}>
                {toolCategories.map((category) => {
                  const categoryTools = Object.entries(builtinToolDefinitions).filter(
                    ([, def]) => def.category === category.id
                  );
                  if (categoryTools.length === 0) return null;

                  const selectedCount = categoryTools.filter(([id]) => builtinTools.includes(id)).length;

                  return (
                    <Box key={category.id} sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 1,
                          px: 0.5,
                        }}
                      >
                        <Box
                          sx={{
                            color: category.color,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {category.icon}
                        </Box>
                        <Typography
                          sx={{
                            color: '#aaa',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            flex: 1,
                          }}
                        >
                          {category.label}
                        </Typography>
                        {selectedCount > 0 && (
                          <Chip
                            label={`${selectedCount}/${categoryTools.length}`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              bgcolor: category.color + '33',
                              color: category.color,
                            }}
                          />
                        )}
                      </Box>
                      {categoryTools.map(([toolId, toolDef]) => renderToolCard(toolId, toolDef))}
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* OwlAgentツールタブ */}
            {activeTab === 1 && (
              <Box sx={{ maxHeight: 400, overflow: 'auto', pr: 0.5 }}>
                {savedOwlAgents.length === 0 ? (
                  <Alert
                    severity="info"
                    sx={{
                      bgcolor: '#1a1a2e',
                      color: '#888',
                      '& .MuiAlert-icon': { color: '#888' },
                    }}
                  >
                    保存されたOwlAgentがありません。
                    他のOwlAgentをツールとして使用するには、まずOwlAgentを作成してください。
                  </Alert>
                ) : (
                  <>
                    <Typography
                      sx={{
                        color: '#888',
                        fontSize: '0.72rem',
                        mb: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                      選択したOwlAgentをツールとしてLLMから呼び出せます
                    </Typography>
                    {savedOwlAgents.map((agent) => renderAgentCard(agent))}
                  </>
                )}
              </Box>
            )}

            <Divider sx={{ borderColor: '#3d3d54', my: 2 }} />

            {/* 実行設定 */}
            <Box>
              <Typography
                sx={{
                  color: '#888',
                  fontSize: '0.75rem',
                  mb: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <SettingsIcon sx={{ fontSize: 14 }} />
                実行設定
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                {/* Tool Choice */}
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel
                    sx={{
                      color: '#888',
                      fontSize: '0.8rem',
                      '&.Mui-focused': { color: '#6366f1' },
                    }}
                  >
                    Tool Choice
                  </InputLabel>
                  <Select
                    value={toolChoice}
                    label="Tool Choice"
                    onChange={(e) => onToolChoiceChange(e.target.value)}
                    sx={{
                      color: '#fff',
                      fontSize: '0.8rem',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#3d3d54' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4d4d64' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
                      '& .MuiSvgIcon-root': { color: '#888' },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: '#252536',
                          '& .MuiMenuItem-root': {
                            fontSize: '0.8rem',
                            color: '#fff',
                            '&:hover': { bgcolor: '#3d3d54' },
                            '&.Mui-selected': { bgcolor: '#6366f1' },
                          },
                        },
                      },
                    }}
                  >
                    <MenuItem value="auto">Auto（LLMが判断）</MenuItem>
                    <MenuItem value="required">Required（必ず使用）</MenuItem>
                  </Select>
                </FormControl>

                {/* Max Iterations */}
                <TextField
                  label="Max Iterations"
                  type="number"
                  value={maxIterations}
                  onChange={(e) => onMaxIterationsChange(Math.max(1, Math.min(20, Number(e.target.value))))}
                  size="small"
                  sx={{
                    width: 120,
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      fontSize: '0.8rem',
                      '& fieldset': { borderColor: '#3d3d54' },
                      '&:hover fieldset': { borderColor: '#4d4d64' },
                      '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#888',
                      fontSize: '0.8rem',
                      '&.Mui-focused': { color: '#6366f1' },
                    },
                  }}
                  inputProps={{ min: 1, max: 20 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="ツール呼び出しの最大回数。無限ループを防止します" arrow>
                          <HelpOutlineIcon sx={{ fontSize: 14, color: '#555' }} />
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Box>

            {/* 選択サマリー */}
            {totalActiveTools > 0 && (
              <Paper
                sx={{
                  mt: 2,
                  p: 1.5,
                  bgcolor: '#1a1a2e',
                  borderRadius: 2,
                  border: '1px solid #3d3d54',
                }}
              >
                <Typography
                  sx={{
                    color: '#888',
                    fontSize: '0.72rem',
                    mb: 1,
                    fontWeight: 500,
                  }}
                >
                  有効なツール（{totalActiveTools}個）
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {connectedTools.map((tool) => (
                    <Chip
                      key={`connected-${tool.id}`}
                      label={tool.label}
                      size="small"
                      icon={<LinkIcon sx={{ fontSize: 12 }} />}
                      sx={{
                        height: 22,
                        fontSize: '0.68rem',
                        bgcolor: '#1e3a5f',
                        color: '#fff',
                        '& .MuiChip-icon': { color: '#64B5F6' },
                      }}
                    />
                  ))}
                  {builtinTools.map((toolId) => {
                    const def = builtinToolDefinitions[toolId];
                    return (
                      <Chip
                        key={`builtin-${toolId}`}
                        label={def?.name || toolId}
                        size="small"
                        icon={<span style={{ fontSize: '0.75rem', marginLeft: 4 }}>{def?.icon}</span>}
                        onDelete={() => handleToolToggle(toolId)}
                        sx={{
                          height: 22,
                          fontSize: '0.68rem',
                          bgcolor: '#6366f122',
                          color: '#fff',
                          border: '1px solid #6366f144',
                          '& .MuiChip-deleteIcon': {
                            color: '#888',
                            fontSize: 16,
                            '&:hover': { color: '#f44336' },
                          },
                        }}
                      />
                    );
                  })}
                  {toolAgents.map((agentId) => {
                    const agent = savedOwlAgents.find((a) => a.id === agentId);
                    return (
                      <Chip
                        key={`agent-${agentId}`}
                        label={agent?.name || agentId}
                        size="small"
                        icon={<span style={{ fontSize: '0.75rem', marginLeft: 4 }}>🦉</span>}
                        onDelete={() => handleAgentToggle(agentId)}
                        sx={{
                          height: 22,
                          fontSize: '0.68rem',
                          bgcolor: '#FF572222',
                          color: '#fff',
                          border: '1px solid #FF572244',
                          '& .MuiChip-deleteIcon': {
                            color: '#888',
                            fontSize: 16,
                            '&:hover': { color: '#f44336' },
                          },
                        }}
                      />
                    );
                  })}
                </Box>
              </Paper>
            )}
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
