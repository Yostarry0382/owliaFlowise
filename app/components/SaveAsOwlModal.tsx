'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Typography,
  IconButton,
  SelectChangeEvent,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { OwlAgent, FlowDefinition } from '@/app/types/flowise';

interface SaveAsOwlModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (owlAgent: Omit<OwlAgent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  flow: FlowDefinition;
}

const ICON_STYLES = [
  { value: 'default', label: 'Default', color: '#8b5cf6' },
  { value: 'red', label: 'Red', color: '#ef4444' },
  { value: 'blue', label: 'Blue', color: '#3b82f6' },
  { value: 'green', label: 'Green', color: '#10b981' },
  { value: 'purple', label: 'Purple', color: '#a855f7' },
  { value: 'orange', label: 'Orange', color: '#f97316' },
] as const;

export default function SaveAsOwlModal({
  open,
  onClose,
  onSave,
  flow,
}: SaveAsOwlModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconStyle, setIconStyle] = useState<OwlAgent['iconStyle']>('default');
  const [version, setVersion] = useState('1.0.0');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleIconStyleChange = (event: SelectChangeEvent) => {
    setIconStyle(event.target.value as OwlAgent['iconStyle']);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!version.trim()) {
      newErrors.version = 'Version is required';
    } else if (!/^\d+\.\d+\.\d+$/.test(version)) {
      newErrors.version = 'Version must be in format X.X.X (e.g., 1.0.0)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const owlAgent: Omit<OwlAgent, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      description: description.trim(),
      iconStyle,
      version,
      flow,
      author: author.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    onSave(owlAgent);
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setIconStyle('default');
    setVersion('1.0.0');
    setAuthor('');
    setTags([]);
    setTagInput('');
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
          borderRadius: 2,
          bgcolor: 'background.paper',
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          Save as Owl Agent
        </Typography>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ color: (theme) => theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            error={!!errors.name}
            helperText={errors.name}
            placeholder="e.g., Customer Support Agent"
          />

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            required
            multiline
            rows={3}
            error={!!errors.description}
            helperText={errors.description}
            placeholder="Describe what this Owl Agent does..."
          />

          <FormControl fullWidth>
            <InputLabel id="icon-style-label">Icon Style</InputLabel>
            <Select
              labelId="icon-style-label"
              value={iconStyle}
              label="Icon Style"
              onChange={handleIconStyleChange}
            >
              {ICON_STYLES.map((style) => (
                <MenuItem key={style.value} value={style.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: style.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                      }}
                    >
                      🦉
                    </Box>
                    <Typography>{style.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            fullWidth
            required
            error={!!errors.version}
            helperText={errors.version || 'Use semantic versioning (e.g., 1.0.0)'}
            placeholder="1.0.0"
          />

          <TextField
            label="Author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            fullWidth
            placeholder="Your name or organization"
          />

          <Box>
            <TextField
              label="Tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              fullWidth
              placeholder="Add tags and press Enter"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              InputProps={{
                endAdornment: tagInput && (
                  <Button size="small" onClick={handleAddTag}>
                    Add
                  </Button>
                ),
              }}
            />
            {tags.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onDelete={() => handleRemoveTag(tag)}
                    sx={{ backgroundColor: 'action.selected' }}
                  />
                ))}
              </Box>
            )}
          </Box>

          <Box
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              <strong>Flow Summary:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • {flow.nodes.length} nodes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • {flow.edges.length} connections
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b4199 100%)',
            },
          }}
        >
          Save as Owl Agent
        </Button>
      </DialogActions>
    </Dialog>
  );
}