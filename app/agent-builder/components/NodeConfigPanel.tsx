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
}

// 入力パラメータをグループ化するための分類
function categorizeInputs(inputs: NodeInputParam[]) {
  const credentials: NodeInputParam[] = [];
  const basic: NodeInputParam[] = [];
  const advanced: NodeInputParam[] = [];

  inputs.forEach((input) => {
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

export default function NodeConfigPanel({ nodeId, nodeData, onClose, onSave, savedOwlAgents = [] }: NodeConfigPanelProps) {
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

  // 入力パラメータをカテゴリ分け
  const categorizedInputs = useMemo(() => {
    if (!nodeDefinition) return { credentials: [], basic: [], advanced: [] };
    return categorizeInputs(nodeDefinition.inputs);
  }, [nodeDefinition]);

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {input.label}
        {input.required && <span style={{ color: '#f44336' }}>*</span>}
        {input.description && (
          <Tooltip title={input.description} arrow placement="top">
            <HelpOutlineIcon sx={{ fontSize: 14, color: '#666', cursor: 'help' }} />
          </Tooltip>
        )}
      </Box>
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
        // 組み込みツールを選択するためのUI
        const builtinToolOptions = [
          { id: 'writeFile', name: 'Write File', icon: '✍️', description: 'ファイルを書き込む' },
          { id: 'readFile', name: 'Read File', icon: '📖', description: 'ファイルを読み込む' },
          { id: 'webSearch', name: 'Web Search', icon: '🔍', description: 'Web検索を実行' },
          { id: 'calculator', name: 'Calculator', icon: '🧮', description: '数式を計算' },
          { id: 'dateTime', name: 'Date/Time', icon: '📅', description: '現在の日時を取得' },
        ];
        const selectedBuiltinTools: string[] = Array.isArray(value) ? value : [];
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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {builtinToolOptions.map((tool) => {
                const isSelected = selectedBuiltinTools.includes(tool.id);
                return (
                  <Chip
                    key={tool.id}
                    icon={<span style={{ fontSize: '0.9rem' }}>{tool.icon}</span>}
                    label={tool.name}
                    onClick={() => {
                      const newValue = isSelected
                        ? selectedBuiltinTools.filter((id) => id !== tool.id)
                        : [...selectedBuiltinTools, tool.id];
                      handleConfigChange(input.name, newValue);
                    }}
                    sx={{
                      bgcolor: isSelected ? '#6366f1' : '#252536',
                      color: '#fff',
                      border: isSelected ? 'none' : '1px solid #3d3d54',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: isSelected ? '#5558e3' : '#3d3d54',
                      },
                    }}
                  />
                );
              })}
            </Box>
            {selectedBuiltinTools.length > 0 && (
              <Typography sx={{ color: '#6366f1', fontSize: '0.75rem', mt: 1 }}>
                選択中: {selectedBuiltinTools.length}個のツール
              </Typography>
            )}
          </Box>
        );

      case 'agentMultiSelect':
        // OwlAgentを複数選択するためのUI
        const selectedAgents: string[] = Array.isArray(value) ? value : [];
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
            {savedOwlAgents.length === 0 ? (
              <Alert severity="info" sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', color: '#64B5F6' }}>
                保存されたOwlAgentがありません
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {savedOwlAgents.map((agent) => {
                  const isSelected = selectedAgents.includes(agent.id);
                  return (
                    <Box
                      key={agent.id}
                      onClick={() => {
                        const newValue = isSelected
                          ? selectedAgents.filter((id) => id !== agent.id)
                          : [...selectedAgents, agent.id];
                        handleConfigChange(input.name, newValue);
                      }}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        border: isSelected ? '2px solid #6366f1' : '1px solid #3d3d54',
                        bgcolor: isSelected ? 'rgba(99, 102, 241, 0.1)' : '#252536',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: '#6366f1',
                          bgcolor: 'rgba(99, 102, 241, 0.05)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '4px',
                            border: isSelected ? 'none' : '2px solid #555',
                            bgcolor: isSelected ? '#6366f1' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected && (
                            <CheckCircleOutlineIcon sx={{ fontSize: 16, color: '#fff' }} />
                          )}
                        </Box>
                        <Typography sx={{ fontSize: '1rem' }}>🦉</Typography>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ color: '#fff', fontSize: '0.85rem', fontWeight: 500 }}>
                            {agent.name}
                          </Typography>
                          {agent.description && (
                            <Typography sx={{ color: '#888', fontSize: '0.7rem', mt: 0.25 }}>
                              {agent.description.slice(0, 50)}{agent.description.length > 50 ? '...' : ''}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
            {selectedAgents.length > 0 && (
              <Box sx={{ mt: 1.5, p: 1, bgcolor: '#1a1a2e', borderRadius: 1 }}>
                <Typography sx={{ color: '#6366f1', fontSize: '0.75rem', fontWeight: 600 }}>
                  選択中: {selectedAgents.length}個のエージェント
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {selectedAgents.map((id) => {
                    const agent = savedOwlAgents.find((a) => a.id === id);
                    return (
                      <Chip
                        key={id}
                        label={agent?.name || id}
                        size="small"
                        onDelete={() => {
                          handleConfigChange(
                            input.name,
                            selectedAgents.filter((agentId) => agentId !== id)
                          );
                        }}
                        sx={{
                          bgcolor: '#FF5722',
                          color: '#fff',
                          fontSize: '0.7rem',
                          '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)' },
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>
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
