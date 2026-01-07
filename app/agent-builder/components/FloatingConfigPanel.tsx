'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import KeyIcon from '@mui/icons-material/Key';
import SettingsIcon from '@mui/icons-material/Settings';
import LinkIcon from '@mui/icons-material/Link';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import MinimizeIcon from '@mui/icons-material/Minimize';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import { getNodeDefinition, NodeInputParam, NodeHandle } from '../types/node-definitions';
import { CustomNodeData } from './CustomNode';
import { useTheme } from '../contexts/ThemeContext';
import FunctionCallingSection from './FunctionCallingSection';

interface SavedOwlAgent {
  id: string;
  name: string;
  description: string;
}

interface FloatingConfigPanelProps {
  nodeId: string;
  nodeData: CustomNodeData;
  position: { x: number; y: number };
  onClose: () => void;
  onSave: (nodeId: string, config: Record<string, any>) => void;
  savedOwlAgents?: SavedOwlAgent[];
}

// ツール関連のパラメータ名
const TOOL_RELATED_PARAMS = ['enableTools', 'builtinTools', 'toolAgents', 'toolChoice', 'maxIterations', 'toolSettings'];

function categorizeInputs(inputs: NodeInputParam[], excludeToolParams: boolean = false) {
  const credentials: NodeInputParam[] = [];
  const basic: NodeInputParam[] = [];
  const advanced: NodeInputParam[] = [];

  inputs.forEach((input) => {
    // ツール関連パラメータを除外（LLMノードでFunctionCallingSectionを使用する場合）
    if (excludeToolParams && TOOL_RELATED_PARAMS.includes(input.name)) {
      return;
    }

    if (
      input.type === 'password' ||
      input.name.toLowerCase().includes('apikey') ||
      input.name.toLowerCase().includes('api_key') ||
      input.name.toLowerCase().includes('secret') ||
      input.name.toLowerCase().includes('token') ||
      input.name.toLowerCase().includes('credential')
    ) {
      credentials.push(input);
    } else if (
      input.name.toLowerCase().includes('penalty') ||
      input.name.toLowerCase().includes('batch') ||
      input.name.toLowerCase().includes('timeout') ||
      input.name === 'topP' ||
      input.name === 'frequencyPenalty' ||
      input.name === 'presencePenalty'
    ) {
      advanced.push(input);
    } else {
      basic.push(input);
    }
  });

  return { credentials, basic, advanced };
}

export default function FloatingConfigPanel({
  nodeId,
  nodeData,
  position,
  onClose,
  onSave,
  savedOwlAgents = [],
}: FloatingConfigPanelProps) {
  const { colors } = useTheme();
  const [config, setConfig] = useState<Record<string, any>>(nodeData.config || {});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [panelPosition, setPanelPosition] = useState(position);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const nodeDefinition = getNodeDefinition(nodeData.type);

  // LLMノードかどうかを判定（Function Calling対応ノード）
  const isLLMNode = nodeData.type === 'azureChatOpenAI';

  // 入力パラメータをカテゴリ分け（LLMノードの場合はツール関連パラメータを除外）
  const categorizedInputs = useMemo(() => {
    if (!nodeDefinition) return { credentials: [], basic: [], advanced: [] };
    return categorizeInputs(nodeDefinition.inputs, isLLMNode);
  }, [nodeDefinition, isLLMNode]);

  useEffect(() => {
    setConfig(nodeData.config || {});
  }, [nodeId, nodeData]);

  // ドラッグ処理
  const handleMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPanelPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleConfigChange = (name: string, value: any) => {
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(nodeId, config);
    onClose();
  };

  const togglePasswordVisibility = (name: string) => {
    setShowPasswords((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const renderInput = (input: NodeInputParam) => {
    const value = config[input.name] ?? input.default ?? '';

    const labelWithTooltip = (
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {input.label}
        {input.required && <span style={{ color: '#f44336' }}>*</span>}
        {input.description && (
          <Tooltip title={input.description} arrow placement="top">
            <HelpOutlineIcon sx={{ fontSize: 12, color: colors.text.tertiary, cursor: 'help' }} />
          </Tooltip>
        )}
      </span>
    );

    switch (input.type) {
      case 'select':
        return (
          <FormControl fullWidth size="small" key={input.name}>
            <InputLabel sx={{ color: colors.text.secondary, fontSize: '0.8rem' }}>{input.label}</InputLabel>
            <Select
              value={value}
              label={input.label}
              onChange={(e) => handleConfigChange(input.name, e.target.value)}
              sx={{
                color: colors.text.primary,
                fontSize: '0.85rem',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.border.secondary },
              }}
            >
              {(input.options || []).map((option) => (
                <MenuItem key={option.value} value={option.value} sx={{ fontSize: '0.85rem' }}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'boolean':
        return (
          <FormControlLabel
            key={input.name}
            control={
              <Switch
                size="small"
                checked={Boolean(value)}
                onChange={(e) => handleConfigChange(input.name, e.target.checked)}
              />
            }
            label={
              <Typography sx={{ color: colors.text.primary, fontSize: '0.85rem' }}>
                {input.label}
              </Typography>
            }
          />
        );

      case 'number':
        return (
          <Box key={input.name}>
            <Typography sx={{ color: colors.text.secondary, fontSize: '0.75rem', mb: 0.5 }}>
              {labelWithTooltip}
            </Typography>
            {input.min !== undefined && input.max !== undefined ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Slider
                  size="small"
                  value={Number(value) || input.min}
                  min={input.min}
                  max={input.max}
                  step={input.step || 1}
                  onChange={(_, newValue) => handleConfigChange(input.name, newValue)}
                  sx={{ flex: 1, color: colors.accent }}
                />
                <TextField
                  type="number"
                  value={value}
                  onChange={(e) => handleConfigChange(input.name, Number(e.target.value))}
                  size="small"
                  sx={{
                    width: 60,
                    '& .MuiOutlinedInput-root': {
                      color: colors.text.primary,
                      fontSize: '0.8rem',
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: colors.text.primary,
                    fontSize: '0.85rem',
                  },
                }}
              />
            )}
          </Box>
        );

      case 'password':
        return (
          <TextField
            key={input.name}
            type={showPasswords[input.name] ? 'text' : 'password'}
            label={labelWithTooltip}
            value={value}
            onChange={(e) => handleConfigChange(input.name, e.target.value)}
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <KeyIcon sx={{ fontSize: 16, color: colors.text.tertiary }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility(input.name)}
                    size="small"
                    sx={{ color: colors.text.secondary }}
                  >
                    {showPasswords[input.name] ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <VisibilityIcon sx={{ fontSize: 16 }} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: colors.text.primary,
                fontSize: '0.85rem',
              },
            }}
          />
        );

      case 'text':
        return (
          <TextField
            key={input.name}
            label={labelWithTooltip}
            value={value}
            onChange={(e) => handleConfigChange(input.name, e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={3}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: colors.text.primary,
                fontSize: '0.85rem',
              },
            }}
          />
        );

      default:
        return (
          <TextField
            key={input.name}
            label={labelWithTooltip}
            value={value}
            onChange={(e) => handleConfigChange(input.name, e.target.value)}
            fullWidth
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: colors.text.primary,
                fontSize: '0.85rem',
              },
            }}
          />
        );
    }
  };

  if (!nodeDefinition) return null;

  return (
    <Paper
      ref={panelRef}
      elevation={8}
      sx={{
        position: 'fixed',
        left: panelPosition.x,
        top: panelPosition.y,
        width: isMinimized ? 280 : 360,
        maxHeight: isMinimized ? 'auto' : '70vh',
        bgcolor: colors.bg.secondary,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: 2,
        overflow: 'hidden',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ヘッダー（ドラッグハンドル） */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
          bgcolor: nodeDefinition.color,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DragIndicatorIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }} />
          <Typography sx={{ fontSize: '1rem' }}>{nodeDefinition.icon}</Typography>
          <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
            {nodeDefinition.label}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => setIsMinimized(!isMinimized)}
            sx={{ color: '#fff', p: 0.5 }}
          >
            {isMinimized ? <OpenInFullIcon sx={{ fontSize: 16 }} /> : <MinimizeIcon sx={{ fontSize: 16 }} />}
          </IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: '#fff', p: 0.5 }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {!isMinimized && (
        <>
          {/* タブ */}
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 36,
              bgcolor: colors.bg.tertiary,
              '& .MuiTab-root': {
                minHeight: 36,
                fontSize: '0.75rem',
                color: colors.text.secondary,
                '&.Mui-selected': { color: colors.accent },
              },
              '& .MuiTabs-indicator': { bgcolor: colors.accent },
            }}
          >
            <Tab label="Basic" />
            {isLLMNode && <Tab label="Tools" />}
            <Tab label="Advanced" />
          </Tabs>

          {/* コンテンツ */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 1.5, maxHeight: 400 }}>
            {/* Basic タブ (常にインデックス 0) */}
            {activeTab === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {categorizedInputs.credentials.length > 0 && (
                  <Box sx={{ p: 1, bgcolor: colors.bg.tertiary, borderRadius: 1 }}>
                    <Typography sx={{ color: '#ff9800', fontSize: '0.7rem', fontWeight: 600, mb: 1 }}>
                      <KeyIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                      Credentials
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {categorizedInputs.credentials.map(renderInput)}
                    </Box>
                  </Box>
                )}
                {categorizedInputs.basic.map(renderInput)}
              </Box>
            )}

            {/* Tools タブ (LLMノードの場合のみ、インデックス 1) */}
            {isLLMNode && activeTab === 1 && (
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
              />
            )}

            {/* Advanced タブ (LLMノード: インデックス 2, その他: インデックス 1) */}
            {activeTab === (isLLMNode ? 2 : 1) && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {categorizedInputs.advanced.length > 0 ? (
                  categorizedInputs.advanced.map(renderInput)
                ) : (
                  <Typography sx={{ color: colors.text.tertiary, fontSize: '0.85rem', textAlign: 'center', py: 2 }}>
                    No advanced settings available
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {/* フッター */}
          <Box
            sx={{
              p: 1,
              borderTop: `1px solid ${colors.border.primary}`,
              display: 'flex',
              gap: 1,
            }}
          >
            <Button
              size="small"
              variant="outlined"
              onClick={onClose}
              fullWidth
              sx={{
                color: colors.text.secondary,
                borderColor: colors.border.secondary,
                fontSize: '0.8rem',
              }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleSave}
              fullWidth
              sx={{
                bgcolor: colors.accent,
                fontSize: '0.8rem',
                '&:hover': { bgcolor: '#5558e3' },
              }}
            >
              Apply
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );
}
