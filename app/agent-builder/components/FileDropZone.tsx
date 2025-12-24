'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Box, Typography, IconButton, LinearProgress, Chip } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import DataObjectIcon from '@mui/icons-material/DataObject';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

// ファイルタイプに応じたアイコンを取得
function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return <PictureAsPdfIcon sx={{ fontSize: 24, color: '#f44336' }} />;
    case 'doc':
    case 'docx':
      return <DescriptionIcon sx={{ fontSize: 24, color: '#2196f3' }} />;
    case 'xls':
    case 'xlsx':
      return <TableChartIcon sx={{ fontSize: 24, color: '#4caf50' }} />;
    case 'ppt':
    case 'pptx':
      return <SlideshowIcon sx={{ fontSize: 24, color: '#ff9800' }} />;
    case 'csv':
      return <TableChartIcon sx={{ fontSize: 24, color: '#00bcd4' }} />;
    case 'json':
    case 'jsonl':
      return <DataObjectIcon sx={{ fontSize: 24, color: '#ff5722' }} />;
    case 'txt':
    case 'md':
      return <TextSnippetIcon sx={{ fontSize: 24, color: '#9e9e9e' }} />;
    default:
      return <InsertDriveFileIcon sx={{ fontSize: 24, color: '#9e9e9e' }} />;
  }
}

// ファイルサイズをフォーマット
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

interface FileDropZoneProps {
  value?: string;
  onChange: (fileName: string, file?: File) => void;
  accept?: string;
  label?: string;
  required?: boolean;
  description?: string;
  nodeType?: string; // PDFLoader, DOCXLoader等
}

export default function FileDropZone({
  value,
  onChange,
  accept,
  label = 'File',
  required = false,
  description,
  nodeType,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ノードタイプに応じて受け入れるファイル形式を決定
  const getAcceptedTypes = () => {
    if (accept) return accept;
    switch (nodeType) {
      case 'pdfLoader':
        return '.pdf';
      case 'docxLoader':
        return '.doc,.docx';
      case 'excelLoader':
        return '.xls,.xlsx';
      case 'pptxLoader':
        return '.ppt,.pptx';
      case 'csvLoader':
        return '.csv';
      case 'jsonLoader':
        return '.json';
      case 'jsonlLoader':
        return '.jsonl';
      case 'textLoader':
        return '.txt,.md';
      default:
        return '*';
    }
  };

  // ファイル形式のラベルを取得
  const getAcceptedTypesLabel = () => {
    switch (nodeType) {
      case 'pdfLoader':
        return 'PDF';
      case 'docxLoader':
        return 'Word (DOC, DOCX)';
      case 'excelLoader':
        return 'Excel (XLS, XLSX)';
      case 'pptxLoader':
        return 'PowerPoint (PPT, PPTX)';
      case 'csvLoader':
        return 'CSV';
      case 'jsonLoader':
        return 'JSON';
      case 'jsonlLoader':
        return 'JSON Lines';
      case 'textLoader':
        return 'Text (TXT, MD)';
      default:
        return 'All files';
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [onChange]
  );

  const handleFile = (file: File) => {
    // シミュレートされたアップロード進行状況
    setUploadProgress(0);
    setFileInfo({ name: file.name, size: file.size });

    // 進行状況をシミュレート（実際のアップロードロジックに置き換え可能）
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null) return 0;
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 20;
      });
    }, 100);

    setTimeout(() => {
      setUploadProgress(null);
      onChange(file.name, file);
    }, 600);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setFileInfo(null);
  };

  return (
    <Box>
      {/* ラベル */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <Typography sx={{ color: '#888', fontSize: '0.8rem' }}>{label}</Typography>
        {required && (
          <span style={{ color: '#f44336', fontSize: '0.8rem' }}>*</span>
        )}
      </Box>

      {/* ドロップゾーン */}
      <Box
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        sx={{
          border: isDragging
            ? '2px dashed #6366f1'
            : value
            ? '2px solid #4caf50'
            : '2px dashed #3d3d54',
          borderRadius: 2,
          p: 2,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragging ? '#6366f115' : value ? '#4caf5010' : '#252536',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: isDragging ? '#6366f1' : '#4d4d64',
            bgcolor: isDragging ? '#6366f115' : '#2d2d44',
          },
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptedTypes()}
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        {/* アップロード中の進行状況 */}
        {uploadProgress !== null && (
          <Box sx={{ width: '100%', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {fileInfo && getFileIcon(fileInfo.name)}
              <Typography sx={{ color: '#fff', fontSize: '0.85rem' }}>
                Uploading...
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{
                bgcolor: '#3d3d54',
                '& .MuiLinearProgress-bar': {
                  bgcolor: '#6366f1',
                },
              }}
            />
          </Box>
        )}

        {/* ファイル選択済み */}
        {uploadProgress === null && value && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            {getFileIcon(value)}
            <Box sx={{ textAlign: 'left', flex: 1 }}>
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '0.85rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {value}
              </Typography>
              {fileInfo && (
                <Typography sx={{ color: '#888', fontSize: '0.7rem' }}>
                  {formatFileSize(fileInfo.size)}
                </Typography>
              )}
            </Box>
            <IconButton
              onClick={handleRemove}
              size="small"
              sx={{
                color: '#f44336',
                '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.1)' },
              }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        )}

        {/* 未選択状態 */}
        {uploadProgress === null && !value && (
          <>
            <CloudUploadIcon
              sx={{
                fontSize: 40,
                color: isDragging ? '#6366f1' : '#888',
                mb: 1,
              }}
            />
            <Typography sx={{ color: '#fff', fontSize: '0.9rem', mb: 0.5 }}>
              Drag & Drop
            </Typography>
            <Typography sx={{ color: '#666', fontSize: '0.75rem', mb: 1 }}>
              or click to select
            </Typography>
            <Chip
              label={getAcceptedTypesLabel()}
              size="small"
              sx={{
                bgcolor: '#3d3d54',
                color: '#aaa',
                fontSize: '0.7rem',
                height: 22,
              }}
            />
          </>
        )}
      </Box>

      {/* 説明 */}
      {description && (
        <Typography sx={{ color: '#666', fontSize: '0.7rem', mt: 0.5 }}>
          {description}
        </Typography>
      )}
    </Box>
  );
}
