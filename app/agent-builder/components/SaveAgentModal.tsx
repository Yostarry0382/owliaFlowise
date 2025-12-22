'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Chip,
  FormControlLabel,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';

interface SaveAgentModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    tags: string[];
    iconStyle: string;
    syncToFlowise: boolean;
  }) => void;
  initialData?: {
    name?: string;
    description?: string;
    tags?: string[];
    iconStyle?: string;
  };
}

const ICON_STYLES = [
  { value: 'default', emoji: '🦉', label: 'Default' },
  { value: 'red', emoji: '🔴', label: 'Red' },
  { value: 'blue', emoji: '🔵', label: 'Blue' },
  { value: 'green', emoji: '🟢', label: 'Green' },
  { value: 'purple', emoji: '🟣', label: 'Purple' },
  { value: 'orange', emoji: '🟠', label: 'Orange' },
];

const PRESET_TAGS = [
  'FAQ',
  'Customer Support',
  'Data Analysis',
  'Code Review',
  'Document Processing',
  'Research',
  'Report Generation',
  'Translation',
  'Summarization',
  'Chat Assistant',
];

export default function SaveAgentModal({
  open,
  onClose,
  onSave,
  initialData,
}: SaveAgentModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [iconStyle, setIconStyle] = useState(initialData?.iconStyle || 'default');
  const [syncToFlowise, setSyncToFlowise] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTogglePresetTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleSubmit = () => {
    const newErrors: { name?: string; description?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      tags,
      iconStyle,
      syncToFlowise,
    });
  };

  const handleClose = () => {
    setName(initialData?.name || '');
    setDescription(initialData?.description || '');
    setTags(initialData?.tags || []);
    setIconStyle(initialData?.iconStyle || 'default');
    setSyncToFlowise(true);
    setNewTag('');
    setErrors({});
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1e1e2f',
          color: '#fff',
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #2d2d44',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span style={{ fontSize: '1.5rem' }}>🦉</span>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Save as OwlAgent
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: '#888' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* 名前 */}
        <TextField
          label="Agent Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          fullWidth
          required
          error={!!errors.name}
          helperText={errors.name}
          placeholder="e.g., FAQ Bot"
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': { borderColor: '#3d3d54' },
              '&:hover fieldset': { borderColor: '#4d4d64' },
              '&.Mui-focused fieldset': { borderColor: '#6366f1' },
            },
            '& .MuiInputLabel-root': { color: '#888' },
          }}
        />

        {/* 説明 */}
        <TextField
          label="Description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setErrors((prev) => ({ ...prev, description: undefined }));
          }}
          fullWidth
          required
          multiline
          rows={3}
          error={!!errors.description}
          helperText={errors.description}
          placeholder="What does this agent do?"
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': { borderColor: '#3d3d54' },
              '&:hover fieldset': { borderColor: '#4d4d64' },
              '&.Mui-focused fieldset': { borderColor: '#6366f1' },
            },
            '& .MuiInputLabel-root': { color: '#888' },
          }}
        />

        {/* タグ */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ color: '#888', fontSize: '0.85rem', mb: 1 }}>Tags</Typography>

          {/* プリセットタグ */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
            {PRESET_TAGS.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                onClick={() => handleTogglePresetTag(tag)}
                sx={{
                  bgcolor: tags.includes(tag) ? '#6366f1' : '#252536',
                  color: tags.includes(tag) ? '#fff' : '#888',
                  '&:hover': {
                    bgcolor: tags.includes(tag) ? '#5558e3' : '#2d2d44',
                  },
                }}
              />
            ))}
          </Box>

          {/* カスタムタグ入力 */}
          <TextField
            size="small"
            placeholder="Add custom tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    size="small"
                    sx={{ color: '#6366f1' }}
                  >
                    <AddIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              width: '100%',
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: '#3d3d54' },
              },
            }}
          />

          {/* 選択されたタグ */}
          {tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1.5 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onDelete={() => handleRemoveTag(tag)}
                  sx={{
                    bgcolor: '#6366f1',
                    color: '#fff',
                    '& .MuiChip-deleteIcon': {
                      color: 'rgba(255,255,255,0.7)',
                      '&:hover': { color: '#fff' },
                    },
                  }}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* アイコンスタイル */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ color: '#888', fontSize: '0.85rem', mb: 1 }}>Icon Style</Typography>
          <ToggleButtonGroup
            value={iconStyle}
            exclusive
            onChange={(_, value) => value && setIconStyle(value)}
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              '& .MuiToggleButton-root': {
                color: '#888',
                borderColor: '#3d3d54',
                '&.Mui-selected': {
                  bgcolor: '#252536',
                  color: '#fff',
                  borderColor: '#6366f1',
                },
                '&:hover': {
                  bgcolor: '#252536',
                },
              },
            }}
          >
            {ICON_STYLES.map((style) => (
              <ToggleButton key={style.value} value={style.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span style={{ fontSize: '1.2rem' }}>{style.emoji}</span>
                  <Typography sx={{ fontSize: '0.75rem' }}>{style.label}</Typography>
                </Box>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Flowise同期 */}
        <Box
          sx={{
            p: 2,
            bgcolor: '#252536',
            borderRadius: 1,
            border: '1px solid #3d3d54',
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={syncToFlowise}
                onChange={(e) => setSyncToFlowise(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#6366f1' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#6366f1',
                  },
                }}
              />
            }
            label={
              <Box>
                <Typography sx={{ color: '#fff', fontSize: '0.9rem' }}>
                  Sync to Flowise
                </Typography>
                <Typography sx={{ color: '#888', fontSize: '0.75rem' }}>
                  Register as a Chatflow in Flowise for execution
                </Typography>
              </Box>
            }
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid #2d2d44' }}>
        <Button
          onClick={handleClose}
          sx={{
            color: '#888',
            '&:hover': { bgcolor: '#252536' },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          sx={{
            bgcolor: '#6366f1',
            '&:hover': { bgcolor: '#5558e3' },
          }}
        >
          Save Agent
        </Button>
      </DialogActions>
    </Dialog>
  );
}
