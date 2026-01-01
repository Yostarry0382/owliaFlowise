'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Button,
  IconButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  InputAdornment,
  Tooltip,
  Chip,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import KeyIcon from '@mui/icons-material/Key';
import SettingsIcon from '@mui/icons-material/Settings';
import LinkIcon from '@mui/icons-material/Link';
import PersonIcon from '@mui/icons-material/Person';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { getNodeDefinition, NodeInputParam, NodeHandle } from '../types/node-definitions';
import { getNodeReference } from '../types/node-references';
import { CustomNodeData } from './CustomNode';
import FileDropZone from './FileDropZone';
import FunctionCallingSection from './FunctionCallingSection';

interface SavedOwlAgent {
  id: string;
  name: string;
  description: string;
}

interface NodeConfigPanelProps {
  nodeId: string;
  nodeData: CustomNodeData;
  onClose: () => void;
  onSave: (nodeId: string, config: Record<string, any>, humanReview?: CustomNodeData['humanReview']) => void;
  savedOwlAgents?: SavedOwlAgent[];
  connectedTools?: { id: string; label: string; type: string }[];
}

// ツール関連のパラメータ名
const TOOL_RELATED_PARAMS = ['enableTools', 'builtinTools', 'toolAgents', 'toolChoice', 'maxIterations', 'toolSettings'];

// 入力パラメータをグループ化するための分類
function categorizeInputs(inputs: NodeInputParam[], excludeToolParams: boolean = false) {
  const credentials: NodeInputParam[] = [];
  const basic: NodeInputParam[] = [];
  const advanced: NodeInputParam[] = [];

  inputs.forEach((input) => {
    // ツール関連パラメータを除外（LLMノードでFunctionCallingSectionを使用する場合）
    if (excludeToolParams && TOOL_RELATED_PARAMS.includes(input.name)) {
      return;
    }

    // Credential系（API Key, Password, Secret等）
    if (
      input.type === 'password' ||
      input.name.toLowerCase().includes('apikey') ||
      input.name.toLowerCase().includes('api_key') ||
      input.name.toLowerCase().includes('secret') ||
      input.name.toLowerCase().includes('token') ||
      input.name.toLowerCase().includes('credential')
    ) {
      credentials.push(input);
    }
    // Advanced設定（ペナルティ、バッチサイズ等の詳細設定）
    else if (
      input.name.toLowerCase().includes('penalty') ||
      input.name.toLowerCase().includes('batch') ||
      input.name.toLowerCase().includes('timeout') ||
      input.name.toLowerCase().includes('strip') ||
      input.name.toLowerCase().includes('metadata') ||
      input.name === 'topP' ||
      input.name === 'frequencyPenalty' ||
      input.name === 'presencePenalty'
    ) {
      advanced.push(input);
    }
    // 基本設定
    else {
      basic.push(input);
    }
  });

  return { credentials, basic, advanced };
}

export default function NodeConfigPanel({ nodeId, nodeData, onClose, onSave, savedOwlAgents = [], connectedTools = [] }: NodeConfigPanelProps) {
  const [config, setConfig] = useState<Record<string, any>>(nodeData.config || {});
  const [humanReview, setHumanReview] = useState(nodeData.humanReview || {
    enabled: false,
    requiresApproval: true,
    approvalMessage: '',
    timeoutSeconds: 0,
    allowEdit: true,
  });
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  const nodeDefinition = getNodeDefinition(nodeData.type);

  // LLMノードかどうかを判定（Function Calling対応ノード）
  const isLLMNode = nodeData.type === 'azureChatOpenAI';

  // 入力パラメータをカテゴリ分け（LLMノードの場合はツール関連パラメータを除外）
  const categorizedInputs = useMemo(() => {
    if (!nodeDefinition) return { credentials: [], basic: [], advanced: [] };
    return categorizeInputs(nodeDefinition.inputs, isLLMNode);
  }, [nodeDefinition, isLLMNode]);

  // nodeIdまたはnodeDataが変更されたらconfigとhumanReviewを更新
  useEffect(() => {
    setConfig(nodeData.config || {});
    setHumanReview(nodeData.humanReview || {
      enabled: false,
      requiresApproval: true,
      approvalMessage: '',
      timeoutSeconds: 0,
      allowEdit: true,
    });
  }, [nodeId, nodeData]);

  // デフォルト値の設定（初期ロード時のみ）
  useEffect(() => {
    if (nodeDefinition) {
      // 既存の設定値にデフォルト値をマージ
      const defaults: Record<string, any> = {};
      const currentConfig = nodeData.config || {};

      // Azure OpenAI環境変数からのプリセット値
      const azureEnvDefaults: Record<string, string | undefined> = {
        apiKey: process.env.NEXT_PUBLIC_AZURE_OPENAI_API_KEY,
        azureOpenAIApiKey: process.env.NEXT_PUBLIC_AZURE_OPENAI_API_KEY,
        endpoint: process.env.NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT,
        azureOpenAIApiInstanceName: process.env.NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT?.replace('https://', '').replace('.openai.azure.com', ''),
        deploymentName: process.env.NEXT_PUBLIC_AZURE_OPENAI_DEPLOYMENT_NAME,
        apiVersion: process.env.NEXT_PUBLIC_AZURE_OPENAI_API_VERSION,
      };

      nodeDefinition.inputs.forEach((input) => {
        if (currentConfig[input.name] === undefined) {
          // Azure関連フィールドの環境変数プリセット
          if (azureEnvDefaults[input.name]) {
            defaults[input.name] = azureEnvDefaults[input.name];
          } else if (input.default !== undefined) {
            defaults[input.name] = input.default;
          }
        }
      });
      if (Object.keys(defaults).length > 0) {
        setConfig((prev) => ({ ...defaults, ...prev }));
      }
    }
  }, [nodeDefinition, nodeId, nodeData.config]);

  const handleConfigChange = (name: string, value: any) => {
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleHumanReviewChange = (field: string, value: any) => {
    setHumanReview((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(nodeId, config, humanReview);
    onClose();
  };

  const togglePasswordVisibility = (name: string) => {
    setShowPasswords((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // 必須フィールドが埋まっているかチェック
  const missingRequired = useMemo(() => {
    if (!nodeDefinition) return [];
    return nodeDefinition.inputs
      .filter((input) => input.required && !config[input.name])
      .map((input) => input.label);
  }, [nodeDefinition, config]);

  const renderInput = (input: NodeInputParam) => {
    const value = config[input.name] ?? input.default ?? '';

    // 共通のラベルヘルパー
    const labelWithTooltip = (
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {input.label}
        {input.required && <span style={{ color: '#f44336' }}>*</span>}
        {input.description && (
          <Tooltip title={input.description} arrow placement="top">
            <HelpOutlineIcon sx={{ fontSize: 14, color: '#666', cursor: 'help' }} />
          </Tooltip>
        )}
      </span>
    );

    switch (input.type) {
      case 'select':
        // OwlAgent Reference用の特別処理：agentIdフィールドの場合は動的にオプションを設定
        const isAgentSelect = nodeData.type === 'owlAgentReference' && input.name === 'agentId';
        const selectOptions = isAgentSelect
          ? savedOwlAgents.map((agent) => ({ label: agent.name, value: agent.id }))
          : input.options || [];

        return (
          <FormControl fullWidth size="small" key={input.name}>
            <InputLabel sx={{ color: '#888' }}>{labelWithTooltip}</InputLabel>
            <Select
              value={value}
              label={input.label}
              onChange={(e) => handleConfigChange(input.name, e.target.value)}
              sx={{
                color: '#fff',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#3d3d54' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4d4d64' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
                '& .MuiSvgIcon-root': { color: '#888' },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    bgcolor: '#252536',
                    maxHeight: 300,
                    '& .MuiMenuItem-root': {
                      color: '#fff',
                      '&:hover': { bgcolor: '#3d3d54' },
                      '&.Mui-selected': { bgcolor: '#6366f1' },
                    },
                  },
                },
              }}
            >
              {selectOptions.length === 0 ? (
                <MenuItem disabled value="">
                  <Typography sx={{ color: '#888', fontStyle: 'italic' }}>
                    {isAgentSelect ? 'No saved agents available' : 'No options available'}
                  </Typography>
                </MenuItem>
              ) : (
                selectOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {isAgentSelect && <span style={{ marginRight: 8 }}>🦉</span>}
                    {option.label}
                  </MenuItem>
                ))
              )}
            </Select>
            {input.description && (
              <Typography sx={{ color: '#666', fontSize: '0.7rem', mt: 0.5 }}>
                {input.description}
              </Typography>
            )}
            {isAgentSelect && value && (
              <Box sx={{ mt: 1, p: 1, bgcolor: '#252536', borderRadius: 1 }}>
                <Typography sx={{ color: '#FF5722', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  🦉 Selected: {savedOwlAgents.find(a => a.id === value)?.name || value}
                </Typography>
                {savedOwlAgents.find(a => a.id === value)?.description && (
                  <Typography sx={{ color: '#888', fontSize: '0.7rem', mt: 0.5 }}>
                    {savedOwlAgents.find(a => a.id === value)?.description}
                  </Typography>
                )}
              </Box>
            )}
          </FormControl>
        );

      case 'boolean':
        return (
          <Box key={input.name}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(value)}
                  onChange={(e) => handleConfigChange(input.name, e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#6366f1',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#6366f1',
                    },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ color: '#fff', fontSize: '0.9rem' }}>
                    {input.label}
                  </Typography>
                  {input.description && (
                    <Tooltip title={input.description} arrow>
                      <HelpOutlineIcon sx={{ fontSize: 14, color: '#666' }} />
                    </Tooltip>
                  )}
                </Box>
              }
            />
          </Box>
        );

      case 'number':
        return (
          <Box key={input.name}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Typography sx={{ color: '#888', fontSize: '0.8rem' }}>
                {input.label}
              </Typography>
              {input.required && <span style={{ color: '#f44336', fontSize: '0.8rem' }}>*</span>}
              {input.description && (
                <Tooltip title={input.description} arrow>
                  <HelpOutlineIcon sx={{ fontSize: 14, color: '#666' }} />
                </Tooltip>
              )}
            </Box>
            {input.min !== undefined && input.max !== undefined ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Slider
                  value={Number(value) || input.min}
                  min={input.min}
                  max={input.max}
                  step={input.step || 1}
                  onChange={(_, newValue) => handleConfigChange(input.name, newValue)}
                  valueLabelDisplay="auto"
                  sx={{
                    flex: 1,
                    color: '#6366f1',
                    '& .MuiSlider-valueLabel': {
                      bgcolor: '#6366f1',
                    },
                  }}
                />
                <TextField
                  type="number"
                  value={value}
                  onChange={(e) => handleConfigChange(input.name, Number(e.target.value))}
                  size="small"
                  inputProps={{ min: input.min, max: input.max, step: input.step }}
                  sx={{
                    width: 80,
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': { borderColor: '#3d3d54' },
                    },
                  }}
                />
              </Box>
            ) : (
              <TextField
                type="number"
                value={value}
                onChange={(e) => handleConfigChange(input.name, Number(e.target.value))}
                fullWidth
                size="small"
                placeholder={input.placeholder}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#3d3d54' },
                    '&:hover fieldset': { borderColor: '#4d4d64' },
                    '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                  },
                }}
              />
            )}
          </Box>
        );

      case 'password':
        return (
          <Box key={input.name}>
            <TextField
              type={showPasswords[input.name] ? 'text' : 'password'}
              label={labelWithTooltip}
              value={value}
              onChange={(e) => handleConfigChange(input.name, e.target.value)}
              fullWidth
              size="small"
              required={input.required}
              placeholder={input.placeholder}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <KeyIcon sx={{ fontSize: 18, color: '#666' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility(input.name)}
                      edge="end"
                      size="small"
                      sx={{ color: '#888' }}
                    >
                      {showPasswords[input.name] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#3d3d54' },
                  '&:hover fieldset': { borderColor: '#4d4d64' },
                  '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                },
                '& .MuiInputLabel-root': { color: '#888' },
              }}
            />
            {input.description && (
              <Typography sx={{ color: '#666', fontSize: '0.7rem', mt: 0.5 }}>
                {input.description}
              </Typography>
            )}
          </Box>
        );

      case 'text':
        return (
          <Box key={input.name}>
            <TextField
              label={labelWithTooltip}
              value={value}
              onChange={(e) => handleConfigChange(input.name, e.target.value)}
              fullWidth
              size="small"
              required={input.required}
              placeholder={input.placeholder}
              multiline
              rows={4}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#3d3d54' },
                  '&:hover fieldset': { borderColor: '#4d4d64' },
                  '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                },
                '& .MuiInputLabel-root': { color: '#888' },
              }}
            />
            {input.description && (
              <Typography sx={{ color: '#666', fontSize: '0.7rem', mt: 0.5 }}>
                {input.description}
              </Typography>
            )}
          </Box>
        );

      case 'json':
        return (
          <Box key={input.name}>
            <TextField
              label={labelWithTooltip}
              value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleConfigChange(input.name, parsed);
                } catch {
                  handleConfigChange(input.name, e.target.value);
                }
              }}
              fullWidth
              size="small"
              placeholder={input.placeholder || '{"key": "value"}'}
              multiline
              rows={3}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  '& fieldset': { borderColor: '#3d3d54' },
                  '&:hover fieldset': { borderColor: '#4d4d64' },
                  '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                },
                '& .MuiInputLabel-root': { color: '#888' },
              }}
            />
            {input.description && (
              <Typography sx={{ color: '#666', fontSize: '0.7rem', mt: 0.5 }}>
                {input.description}
              </Typography>
            )}
          </Box>
        );

      case 'file':
        return (
          <FileDropZone
            key={input.name}
            value={value}
            onChange={(fileName, file) => {
              handleConfigChange(input.name, fileName);
              // ファイルオブジェクト自体も保存（将来のアップロード処理用）
              if (file) {
                handleConfigChange(`${input.name}_file`, file);
              }
            }}
            label={input.label}
            required={input.required}
            description={input.description}
            nodeType={nodeData.type}
          />
        );

      case 'builtinToolSelect':
        // 組み込みツールを選択するためのUI（カテゴリ別＋詳細設定）
        const builtinToolDefinitions: Record<string, {
          name: string;
          icon: string;
          description: string;
          category: string;
          settings?: { key: string; label: string; type: 'string' | 'number' | 'boolean'; default?: any; placeholder?: string; description?: string }[];
        }> = {
          writeFile: {
            name: 'Write File',
            icon: '✍️',
            description: 'ファイルを書き込む',
            category: 'ファイル操作',
            settings: [
              { key: 'basePath', label: 'Base Path', type: 'string', default: './data/output', placeholder: './data/output', description: '出力先のベースディレクトリ' },
            ],
          },
          readFile: {
            name: 'Read File',
            icon: '📖',
            description: 'ファイルを読み込む',
            category: 'ファイル操作',
            settings: [
              { key: 'basePath', label: 'Base Path', type: 'string', default: './data', placeholder: './data', description: '読み込み元のベースディレクトリ' },
            ],
          },
          pdfLoader: {
            name: 'PDF Loader',
            icon: '📄',
            description: 'PDFファイルを読み込む',
            category: 'ドキュメント読み込み',
            settings: [
              { key: 'basePath', label: 'Base Path', type: 'string', default: './data', placeholder: './data', description: 'PDFファイルのベースディレクトリ' },
            ],
          },
          csvLoader: {
            name: 'CSV Loader',
            icon: '📊',
            description: 'CSVファイルを読み込む',
            category: 'ドキュメント読み込み',
            settings: [
              { key: 'basePath', label: 'Base Path', type: 'string', default: './data', placeholder: './data', description: 'CSVファイルのベースディレクトリ' },
              { key: 'delimiter', label: 'Delimiter', type: 'string', default: ',', placeholder: ',', description: '区切り文字' },
            ],
          },
          jsonLoader: {
            name: 'JSON Loader',
            icon: '📋',
            description: 'JSONファイルを読み込む',
            category: 'ドキュメント読み込み',
            settings: [
              { key: 'basePath', label: 'Base Path', type: 'string', default: './data', placeholder: './data', description: 'JSONファイルのベースディレクトリ' },
            ],
          },
          textLoader: {
            name: 'Text Loader',
            icon: '📝',
            description: 'テキストファイルを読み込む',
            category: 'ドキュメント読み込み',
            settings: [
              { key: 'basePath', label: 'Base Path', type: 'string', default: './data', placeholder: './data', description: 'テキストファイルのベースディレクトリ' },
              { key: 'maxLength', label: 'Max Length', type: 'number', default: 10000, description: '読み込む最大文字数' },
            ],
          },
          docxLoader: {
            name: 'DOCX Loader',
            icon: '📃',
            description: 'Wordファイルを読み込む',
            category: 'ドキュメント読み込み',
            settings: [
              { key: 'basePath', label: 'Base Path', type: 'string', default: './data', placeholder: './data', description: 'DOCXファイルのベースディレクトリ' },
            ],
          },
          excelLoader: {
            name: 'Excel Loader',
            icon: '📈',
            description: 'Excelファイルを読み込む',
            category: 'ドキュメント読み込み',
            settings: [
              { key: 'basePath', label: 'Base Path', type: 'string', default: './data', placeholder: './data', description: 'Excelファイルのベースディレクトリ' },
              { key: 'sheetName', label: 'Sheet Name', type: 'string', placeholder: 'Sheet1', description: '読み込むシート名（空白で最初のシート）' },
            ],
          },
          webSearch: {
            name: 'Web Search',
            icon: '🔍',
            description: 'Web検索を実行',
            category: 'Web・検索',
            settings: [
              { key: 'maxResults', label: 'Max Results', type: 'number', default: 5, description: '取得する検索結果の最大数' },
            ],
          },
          webScraper: {
            name: 'Web Scraper',
            icon: '🌐',
            description: 'Webページの内容を取得',
            category: 'Web・検索',
            settings: [
              { key: 'maxLength', label: 'Max Length', type: 'number', default: 5000, description: '取得する最大文字数' },
              { key: 'removeScripts', label: 'Remove Scripts', type: 'boolean', default: true, description: 'スクリプトタグを除去' },
            ],
          },
          calculator: {
            name: 'Calculator',
            icon: '🧮',
            description: '数式を計算',
            category: 'ユーティリティ',
          },
          dateTime: {
            name: 'Date/Time',
            icon: '📅',
            description: '現在の日時を取得',
            category: 'ユーティリティ',
            settings: [
              { key: 'timezone', label: 'Timezone', type: 'string', default: 'Asia/Tokyo', placeholder: 'Asia/Tokyo', description: 'タイムゾーン' },
            ],
          },
          jsonParser: {
            name: 'JSON Parser',
            icon: '🔧',
            description: 'JSONを解析・変換',
            category: 'ユーティリティ',
          },
        };

        // カテゴリでグループ化
        const toolCategories = ['ファイル操作', 'ドキュメント読み込み', 'Web・検索', 'ユーティリティ'];
        const selectedBuiltinTools: string[] = Array.isArray(value) ? value : [];
        const toolSettings: Record<string, Record<string, any>> = nodeData.config?.toolSettings || {};

        const handleToolSettingChange = (toolId: string, settingKey: string, settingValue: any) => {
          const currentToolSettings = nodeData.config?.toolSettings || {};
          const newToolSettings = {
            ...currentToolSettings,
            [toolId]: {
              ...(currentToolSettings[toolId] || {}),
              [settingKey]: settingValue,
            },
          };
          handleConfigChange('toolSettings', newToolSettings);
        };

        return (
          <Box key={input.name}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <Typography sx={{ color: '#888', fontSize: '0.8rem' }}>
                {input.label}
              </Typography>
              {input.description && (
                <Tooltip title={input.description} arrow>
                  <HelpOutlineIcon sx={{ fontSize: 14, color: '#666' }} />
                </Tooltip>
              )}
            </Box>
            {toolCategories.map((category) => {
              const categoryTools = Object.entries(builtinToolDefinitions).filter(
                ([, def]) => def.category === category
              );
              if (categoryTools.length === 0) return null;
              return (
                <Box key={category} sx={{ mb: 1.5 }}>
                  <Typography sx={{ color: '#666', fontSize: '0.7rem', mb: 0.5, fontWeight: 500 }}>
                    {category}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {categoryTools.map(([toolId, toolDef]) => {
                      const isSelected = selectedBuiltinTools.includes(toolId);
                      const currentSettings = toolSettings[toolId] || {};
                      return (
                        <Box key={toolId}>
                          <Box
                            onClick={() => {
                              const newValue = isSelected
                                ? selectedBuiltinTools.filter((id) => id !== toolId)
                                : [...selectedBuiltinTools, toolId];
                              handleConfigChange(input.name, newValue);
                            }}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              p: 0.75,
                              borderRadius: 1,
                              bgcolor: isSelected ? 'rgba(99, 102, 241, 0.15)' : '#252536',
                              border: isSelected ? '1px solid #6366f1' : '1px solid #3d3d54',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': {
                                bgcolor: isSelected ? 'rgba(99, 102, 241, 0.2)' : '#2d2d44',
                              },
                            }}
                          >
                            <Box
                              sx={{
                                width: 18,
                                height: 18,
                                borderRadius: '4px',
                                border: isSelected ? 'none' : '2px solid #555',
                                bgcolor: isSelected ? '#6366f1' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {isSelected && (
                                <CheckCircleOutlineIcon sx={{ fontSize: 14, color: '#fff' }} />
                              )}
                            </Box>
                            <Typography sx={{ fontSize: '0.9rem' }}>{toolDef.icon}</Typography>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ color: '#fff', fontSize: '0.75rem', fontWeight: 500 }}>
                                {toolDef.name}
                              </Typography>
                              <Typography sx={{ color: '#666', fontSize: '0.65rem' }}>
                                {toolDef.description}
                              </Typography>
                            </Box>
                          </Box>
                          {/* 選択時に詳細設定を表示 */}
                          {isSelected && toolDef.settings && toolDef.settings.length > 0 && (
                            <Box
                              sx={{
                                ml: 3,
                                mt: 0.5,
                                p: 1,
                                bgcolor: '#1a1a2e',
                                borderRadius: 1,
                                borderLeft: '2px solid #6366f1',
                              }}
                            >
                              {toolDef.settings.map((setting) => (
                                <Box key={setting.key} sx={{ mb: 1, '&:last-child': { mb: 0 } }}>
                                  {setting.type === 'boolean' ? (
                                    <FormControlLabel
                                      control={
                                        <Switch
                                          size="small"
                                          checked={currentSettings[setting.key] ?? setting.default ?? false}
                                          onChange={(e) => handleToolSettingChange(toolId, setting.key, e.target.checked)}
                                        />
                                      }
                                      label={
                                        <Typography sx={{ fontSize: '0.7rem', color: '#aaa' }}>
                                          {setting.label}
                                        </Typography>
                                      }
                                    />
                                  ) : (
                                    <TextField
                                      label={setting.label}
                                      type={setting.type === 'number' ? 'number' : 'text'}
                                      value={currentSettings[setting.key] ?? setting.default ?? ''}
                                      onChange={(e) => handleToolSettingChange(
                                        toolId,
                                        setting.key,
                                        setting.type === 'number' ? Number(e.target.value) : e.target.value
                                      )}
                                      placeholder={setting.placeholder}
                                      size="small"
                                      fullWidth
                                      sx={{
                                        '& .MuiOutlinedInput-root': {
                                          fontSize: '0.75rem',
                                          color: '#fff',
                                          '& fieldset': { borderColor: '#3d3d54' },
                                          '&:hover fieldset': { borderColor: '#4d4d64' },
                                          '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                                        },
                                        '& .MuiInputLabel-root': {
                                          fontSize: '0.7rem',
                                          color: '#888',
                                        },
                                      }}
                                      InputProps={{
                                        endAdornment: setting.description ? (
                                          <InputAdornment position="end">
                                            <Tooltip title={setting.description} arrow>
                                              <HelpOutlineIcon sx={{ fontSize: 12, color: '#555' }} />
                                            </Tooltip>
                                          </InputAdornment>
                                        ) : null,
                                      }}
                                    />
                                  )}
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
            {selectedBuiltinTools.length > 0 && (
              <Typography sx={{ color: '#6366f1', fontSize: '0.75rem', mt: 0.5 }}>
                選択中: {selectedBuiltinTools.length}個のツール
              </Typography>
            )}
          </Box>
        );

      case 'agentMultiSelect':
        // OwlAgentを複数選択するためのUI（控えめなチップ形式）
        const selectedAgents: string[] = Array.isArray(value) ? value : [];
        return (
          <Box key={input.name}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Typography sx={{ color: '#666', fontSize: '0.7rem' }}>
                {input.label}
              </Typography>
              {input.description && (
                <Tooltip title={input.description} arrow>
                  <HelpOutlineIcon sx={{ fontSize: 12, color: '#555' }} />
                </Tooltip>
              )}
            </Box>
            {savedOwlAgents.length === 0 ? (
              <Typography sx={{ color: '#555', fontSize: '0.7rem', fontStyle: 'italic' }}>
                保存されたOwlAgentがありません
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {savedOwlAgents.map((agent) => {
                  const isSelected = selectedAgents.includes(agent.id);
                  return (
                    <Tooltip key={agent.id} title={agent.description || agent.name} arrow>
                      <Chip
                        label={agent.name}
                        size="small"
                        onClick={() => {
                          const newValue = isSelected
                            ? selectedAgents.filter((id) => id !== agent.id)
                            : [...selectedAgents, agent.id];
                          handleConfigChange(input.name, newValue);
                        }}
                        sx={{
                          bgcolor: isSelected ? '#607D8B' : '#252536',
                          color: isSelected ? '#fff' : '#888',
                          border: isSelected ? 'none' : '1px solid #3d3d54',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          height: 24,
                          '&:hover': {
                            bgcolor: isSelected ? '#546E7A' : '#3d3d54',
                          },
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>
            )}
            {selectedAgents.length > 0 && (
              <Typography sx={{ color: '#607D8B', fontSize: '0.7rem', mt: 0.5 }}>
                選択中: {selectedAgents.length}個
              </Typography>
            )}
          </Box>
        );

      default:
        return (
          <Box key={input.name}>
            <TextField
              label={labelWithTooltip}
              value={value}
              onChange={(e) => handleConfigChange(input.name, e.target.value)}
              fullWidth
              size="small"
              required={input.required}
              placeholder={input.placeholder}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#3d3d54' },
                  '&:hover fieldset': { borderColor: '#4d4d64' },
                  '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                },
                '& .MuiInputLabel-root': { color: '#888' },
              }}
            />
            {input.description && (
              <Typography sx={{ color: '#666', fontSize: '0.7rem', mt: 0.5 }}>
                {input.description}
              </Typography>
            )}
          </Box>
        );
    }
  };

  // ハンドル情報を表示
  const renderHandleInfo = (handles: NodeHandle[], direction: 'input' | 'output') => {
    if (handles.length === 0) return null;

    return (
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ color: '#888', fontSize: '0.75rem', mb: 1 }}>
          {direction === 'input' ? 'Inputs' : 'Outputs'}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {handles.map((handle) => (
            <Chip
              key={handle.id}
              icon={<LinkIcon sx={{ fontSize: 14 }} />}
              label={`${handle.label} (${handle.type})`}
              size="small"
              sx={{
                bgcolor: direction === 'input' ? '#1e3a5f' : '#3d1e5f',
                color: '#fff',
                fontSize: '0.7rem',
                '& .MuiChip-icon': { color: '#888' },
              }}
            />
          ))}
        </Box>
      </Box>
    );
  };

  if (!nodeDefinition) {
    return (
      <Box
        sx={{
          width: 380,
          height: '100%',
          bgcolor: '#1e1e2f',
          borderLeft: '1px solid #2d2d44',
          p: 2,
        }}
      >
        <Typography sx={{ color: '#fff' }}>Node definition not found</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 380,
        height: '100%',
        bgcolor: '#1e1e2f',
        borderLeft: '1px solid #2d2d44',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ヘッダー */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid #2d2d44',
          bgcolor: nodeDefinition.color,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '1.2rem' }}>{nodeDefinition.icon}</Typography>
          <Box>
            <Typography sx={{ color: '#fff', fontWeight: 600 }}>
              {nodeDefinition.label}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem' }}>
              {nodeDefinition.category}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* 説明 */}
      <Box sx={{ px: 2, py: 1, bgcolor: '#252536' }}>
        <Typography sx={{ color: '#aaa', fontSize: '0.8rem' }}>
          {nodeDefinition.description}
        </Typography>
      </Box>

      {/* 必須項目警告 */}
      {missingRequired.length > 0 && (
        <Box sx={{ px: 2, py: 1 }}>
          <Alert
            severity="warning"
            sx={{
              bgcolor: 'rgba(255, 152, 0, 0.1)',
              color: '#ff9800',
              '& .MuiAlert-icon': { color: '#ff9800' },
              fontSize: '0.8rem',
              py: 0,
            }}
          >
            Missing: {missingRequired.join(', ')}
          </Alert>
        </Box>
      )}

      {/* コンテンツ */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* 接続情報 */}
        {(nodeDefinition.inputHandles.length > 0 || nodeDefinition.outputHandles.length > 0) && (
          <Accordion
            defaultExpanded={false}
            sx={{
              bgcolor: '#252536',
              color: '#fff',
              mb: 2,
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#888' }} />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinkIcon sx={{ fontSize: 18, color: '#888' }} />
                <Typography sx={{ fontSize: '0.85rem' }}>Connections</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {renderHandleInfo(nodeDefinition.inputHandles, 'input')}
              {renderHandleInfo(nodeDefinition.outputHandles, 'output')}
            </AccordionDetails>
          </Accordion>
        )}

        {/* Credentials設定 */}
        {categorizedInputs.credentials.length > 0 && (
          <Accordion
            defaultExpanded
            sx={{
              bgcolor: '#252536',
              color: '#fff',
              mb: 2,
              '&:before': { display: 'none' },
              border: '1px solid #3d3d54',
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#888' }} />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <KeyIcon sx={{ fontSize: 18, color: '#ff9800' }} />
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Credentials
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {categorizedInputs.credentials.map((input) => renderInput(input))}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {/* 基本設定 */}
        {categorizedInputs.basic.length > 0 && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SettingsIcon sx={{ fontSize: 18, color: '#888' }} />
              <Typography
                sx={{
                  color: '#888',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                Basic Settings
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              {categorizedInputs.basic.map((input) => renderInput(input))}
            </Box>
          </>
        )}

        {/* Advanced設定 */}
        {categorizedInputs.advanced.length > 0 && (
          <Accordion
            expanded={advancedExpanded}
            onChange={() => setAdvancedExpanded(!advancedExpanded)}
            sx={{
              bgcolor: '#252536',
              color: '#fff',
              mb: 2,
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#888' }} />}>
              <Typography sx={{ fontSize: '0.85rem' }}>
                Advanced Settings ({categorizedInputs.advanced.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {categorizedInputs.advanced.map((input) => renderInput(input))}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Function Calling設定（LLMノードのみ） */}
        {isLLMNode && (
          <FunctionCallingSection
            enableTools={config.enableTools ?? false}
            onEnableToolsChange={(enabled) => handleConfigChange('enableTools', enabled)}
            builtinTools={config.builtinTools ?? []}
            onBuiltinToolsChange={(tools) => handleConfigChange('builtinTools', tools)}
            toolAgents={config.toolAgents ?? []}
            onToolAgentsChange={(agents) => handleConfigChange('toolAgents', agents)}
            toolChoice={config.toolChoice ?? 'auto'}
            onToolChoiceChange={(choice) => handleConfigChange('toolChoice', choice)}
            maxIterations={config.maxIterations ?? 5}
            onMaxIterationsChange={(iterations) => handleConfigChange('maxIterations', iterations)}
            toolSettings={config.toolSettings ?? {}}
            onToolSettingsChange={(settings) => handleConfigChange('toolSettings', settings)}
            savedOwlAgents={savedOwlAgents}
            connectedTools={connectedTools}
          />
        )}

        <Divider sx={{ borderColor: '#2d2d44', my: 2 }} />

        {/* 人間レビュー設定 */}
        <Accordion
          sx={{
            bgcolor: '#252536',
            color: '#fff',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#888' }} />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ fontSize: 18, color: humanReview.enabled ? '#FFD700' : '#888' }} />
              <Typography sx={{ fontSize: '0.85rem' }}>Human Review</Typography>
              {humanReview.enabled && (
                <Chip
                  label="ON"
                  size="small"
                  sx={{
                    bgcolor: '#FFD700',
                    color: '#000',
                    height: 18,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={humanReview.enabled}
                    onChange={(e) => handleHumanReviewChange('enabled', e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#FFD700' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#FFD700',
                      },
                    }}
                  />
                }
                label={<Typography sx={{ color: '#fff', fontSize: '0.9rem' }}>Enable Review</Typography>}
              />

              {humanReview.enabled && (
                <>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={humanReview.allowEdit}
                        onChange={(e) => handleHumanReviewChange('allowEdit', e.target.checked)}
                      />
                    }
                    label={<Typography sx={{ color: '#fff', fontSize: '0.9rem' }}>Allow Edit</Typography>}
                  />

                  <TextField
                    label="Approval Message"
                    value={humanReview.approvalMessage || ''}
                    onChange={(e) => handleHumanReviewChange('approvalMessage', e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="Please review this output..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#fff',
                        '& fieldset': { borderColor: '#3d3d54' },
                      },
                      '& .MuiInputLabel-root': { color: '#888' },
                    }}
                  />

                  <Box>
                    <Typography sx={{ color: '#888', fontSize: '0.8rem', mb: 0.5 }}>
                      Auto-approve Timeout (seconds, 0 = disabled)
                    </Typography>
                    <TextField
                      type="number"
                      value={humanReview.timeoutSeconds || 0}
                      onChange={(e) =>
                        handleHumanReviewChange('timeoutSeconds', Math.max(0, Number(e.target.value)))
                      }
                      fullWidth
                      size="small"
                      inputProps={{ min: 0 }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#fff',
                          '& fieldset': { borderColor: '#3d3d54' },
                        },
                      }}
                    />
                  </Box>
                </>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* ノードリファレンス */}
        {(() => {
          const reference = getNodeReference(nodeData.type);
          if (!reference) return null;

          return (
            <Accordion
              sx={{
                bgcolor: '#1a1a2e',
                color: '#fff',
                '&:before': { display: 'none' },
                border: '1px solid #2d2d44',
                borderRadius: 1,
                mt: 1,
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: '#888' }} />}
                sx={{
                  '& .MuiAccordionSummary-content': {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  },
                }}
              >
                <MenuBookIcon sx={{ color: '#64B5F6', fontSize: 20 }} />
                <Typography sx={{ fontWeight: 500 }}>ノードリファレンス</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* 説明 */}
                  <Box>
                    <Typography sx={{ color: '#ccc', fontSize: '0.85rem', lineHeight: 1.6 }}>
                      {reference.description}
                    </Typography>
                  </Box>

                  {/* 機能 */}
                  {reference.features && reference.features.length > 0 && (
                    <Box>
                      <Typography
                        sx={{
                          color: '#81C784',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          mb: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
                        主な機能
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        {reference.features.map((feature, idx) => (
                          <Box
                            component="li"
                            key={idx}
                            sx={{ color: '#aaa', fontSize: '0.8rem', mb: 0.5 }}
                          >
                            {feature}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* ユースケース */}
                  {reference.useCases && reference.useCases.length > 0 && (
                    <Box>
                      <Typography
                        sx={{
                          color: '#64B5F6',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          mb: 1,
                        }}
                      >
                        使用例
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {reference.useCases.map((useCase, idx) => (
                          <Chip
                            key={idx}
                            label={useCase}
                            size="small"
                            sx={{
                              bgcolor: '#2d2d44',
                              color: '#ccc',
                              fontSize: '0.7rem',
                              height: 24,
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Tips */}
                  {reference.tips && reference.tips.length > 0 && (
                    <Box
                      sx={{
                        bgcolor: '#2a2a3d',
                        borderRadius: 1,
                        p: 1.5,
                        border: '1px solid #FFB74D33',
                      }}
                    >
                      <Typography
                        sx={{
                          color: '#FFB74D',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          mb: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        <LightbulbIcon sx={{ fontSize: 16 }} />
                        Tips
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        {reference.tips.map((tip, idx) => (
                          <Box
                            component="li"
                            key={idx}
                            sx={{ color: '#bbb', fontSize: '0.75rem', mb: 0.5 }}
                          >
                            {tip}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* ドキュメントリンク */}
                  {reference.docUrl && (
                    <Box sx={{ mt: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        href={reference.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                        sx={{
                          color: '#64B5F6',
                          borderColor: '#64B5F6',
                          fontSize: '0.75rem',
                          textTransform: 'none',
                          '&:hover': {
                            borderColor: '#90CAF9',
                            bgcolor: '#64B5F610',
                          },
                        }}
                      >
                        Flowise公式ドキュメント
                      </Button>
                    </Box>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })()}
      </Box>

      {/* フッター */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid #2d2d44',
          display: 'flex',
          gap: 1,
        }}
      >
        <Button
          variant="outlined"
          onClick={onClose}
          fullWidth
          sx={{
            color: '#888',
            borderColor: '#3d3d54',
            '&:hover': { borderColor: '#4d4d64' },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          fullWidth
          sx={{
            bgcolor: '#6366f1',
            '&:hover': { bgcolor: '#5558e3' },
          }}
        >
          Apply
        </Button>
      </Box>
    </Box>
  );
}
