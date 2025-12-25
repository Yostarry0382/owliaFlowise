'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import TimerIcon from '@mui/icons-material/Timer';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import HistoryIcon from '@mui/icons-material/History';

export interface PendingReview {
  nodeId: string;
  nodeName?: string;
  output: any;
  message: string;
  allowEdit: boolean;
  timeoutSeconds?: number;
}

export interface ReviewDecision {
  status: 'approved' | 'rejected' | 'edited';
  editedOutput?: any;
  comments?: string;
}

interface HumanReviewModalProps {
  open: boolean;
  pendingReview: PendingReview | null;
  onDecision: (decision: ReviewDecision) => void;
  onClose: () => void;
}

export default function HumanReviewModal({
  open,
  pendingReview,
  onDecision,
  onClose,
}: HumanReviewModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedOutput, setEditedOutput] = useState('');
  const [comments, setComments] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [autoApproveProgress, setAutoApproveProgress] = useState(0);

  // AI修正関連の状態
  const [isRevising, setIsRevising] = useState(false);
  const [revisionHistory, setRevisionHistory] = useState<string[]>([]);
  const [currentRevisionIndex, setCurrentRevisionIndex] = useState(-1);
  const [revisionError, setRevisionError] = useState<string | null>(null);

  // 出力を文字列に変換
  const outputString = pendingReview
    ? typeof pendingReview.output === 'string'
      ? pendingReview.output
      : JSON.stringify(pendingReview.output, null, 2)
    : '';

  // 初期化
  useEffect(() => {
    if (open && pendingReview) {
      setEditedOutput(outputString);
      setIsEditing(false);
      setComments('');
      setRevisionHistory([outputString]); // 元の出力を履歴の最初に
      setCurrentRevisionIndex(0);
      setRevisionError(null);

      // タイムアウト設定がある場合
      if (pendingReview.timeoutSeconds && pendingReview.timeoutSeconds > 0) {
        setTimeRemaining(pendingReview.timeoutSeconds);
        setAutoApproveProgress(0);
      } else {
        setTimeRemaining(null);
        setAutoApproveProgress(0);
      }
    }
  }, [open, pendingReview, outputString]);

  // AIによる修正リクエスト
  const handleAIRevision = async () => {
    if (!comments.trim()) {
      setRevisionError('修正の指示を「コメント」欄に入力してください');
      return;
    }

    setIsRevising(true);
    setRevisionError(null);

    try {
      const response = await fetch('/api/flows/revise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalOutput: editedOutput,
          userFeedback: comments,
          nodeContext: {
            nodeName: pendingReview?.nodeName,
            nodeType: 'humanReview',
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '修正に失敗しました');
      }

      // 修正結果を履歴に追加
      const newHistory = [...revisionHistory.slice(0, currentRevisionIndex + 1), data.revisedOutput];
      setRevisionHistory(newHistory);
      setCurrentRevisionIndex(newHistory.length - 1);
      setEditedOutput(data.revisedOutput);
      setIsEditing(true); // 編集モードに切り替え
      setComments(''); // コメントをクリア
    } catch (error) {
      console.error('AI修正エラー:', error);
      setRevisionError(error instanceof Error ? error.message : '修正に失敗しました');
    } finally {
      setIsRevising(false);
    }
  };

  // 修正履歴を戻る
  const handleUndoRevision = () => {
    if (currentRevisionIndex > 0) {
      const newIndex = currentRevisionIndex - 1;
      setCurrentRevisionIndex(newIndex);
      setEditedOutput(revisionHistory[newIndex]);
    }
  };

  // 修正履歴を進む
  const handleRedoRevision = () => {
    if (currentRevisionIndex < revisionHistory.length - 1) {
      const newIndex = currentRevisionIndex + 1;
      setCurrentRevisionIndex(newIndex);
      setEditedOutput(revisionHistory[newIndex]);
    }
  };

  // タイムアウトカウントダウン
  useEffect(() => {
    if (!open || timeRemaining === null || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          // 自動承認
          onDecision({ status: 'approved', comments: 'Auto-approved by timeout' });
          return null;
        }
        return prev - 1;
      });

      // プログレス更新
      if (pendingReview?.timeoutSeconds) {
        setAutoApproveProgress((prev) => {
          const newProgress = ((pendingReview.timeoutSeconds! - (timeRemaining - 1)) / pendingReview.timeoutSeconds!) * 100;
          return Math.min(newProgress, 100);
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [open, timeRemaining, pendingReview, onDecision]);

  const handleApprove = () => {
    onDecision({
      status: 'approved',
      comments: comments || undefined,
    });
  };

  const handleReject = () => {
    onDecision({
      status: 'rejected',
      comments: comments || undefined,
    });
  };

  const handleEdit = () => {
    // 編集した内容を解析して送信
    let parsedOutput: any = editedOutput;
    try {
      parsedOutput = JSON.parse(editedOutput);
    } catch {
      // 文字列のまま
    }

    onDecision({
      status: 'edited',
      editedOutput: parsedOutput,
      comments: comments || undefined,
    });
  };

  if (!pendingReview) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1e1e2f',
          color: '#fff',
          borderRadius: 2,
          border: '2px solid #FFD700',
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #2d2d44',
          bgcolor: 'rgba(255, 215, 0, 0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon sx={{ color: '#FFD700' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Human Review Required
          </Typography>
          <Chip
            label={pendingReview.nodeName || pendingReview.nodeId}
            size="small"
            sx={{
              bgcolor: '#6366f1',
              color: '#fff',
              fontSize: '0.7rem',
            }}
          />
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#888' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* タイムアウトプログレス */}
      {timeRemaining !== null && timeRemaining > 0 && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Alert
            severity="info"
            icon={<TimerIcon />}
            sx={{
              bgcolor: 'rgba(33, 150, 243, 0.1)',
              color: '#90CAF9',
              '& .MuiAlert-icon': { color: '#90CAF9' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '0.9rem' }}>
                Auto-approve in {timeRemaining} seconds
              </Typography>
            </Box>
          </Alert>
          <LinearProgress
            variant="determinate"
            value={autoApproveProgress}
            sx={{
              mt: 1,
              height: 4,
              borderRadius: 2,
              bgcolor: '#2d2d44',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#FFD700',
              },
            }}
          />
        </Box>
      )}

      <DialogContent sx={{ pt: 3 }}>
        {/* レビューメッセージ */}
        {pendingReview.message && (
          <Box
            sx={{
              p: 2,
              mb: 3,
              bgcolor: '#252536',
              borderRadius: 1,
              borderLeft: '4px solid #FFD700',
            }}
          >
            <Typography sx={{ color: '#fff', fontSize: '0.95rem' }}>
              {pendingReview.message}
            </Typography>
          </Box>
        )}

        {/* 出力内容 */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ color: '#888', fontSize: '0.85rem' }}>
              Output to Review
            </Typography>
            {pendingReview.allowEdit && (
              <Button
                size="small"
                startIcon={<EditIcon />}
                onClick={() => setIsEditing(!isEditing)}
                sx={{
                  color: isEditing ? '#FFD700' : '#888',
                  fontSize: '0.75rem',
                }}
              >
                {isEditing ? 'View Original' : 'Edit'}
              </Button>
            )}
          </Box>

          {isEditing ? (
            <TextField
              value={editedOutput}
              onChange={(e) => setEditedOutput(e.target.value)}
              fullWidth
              multiline
              rows={10}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  bgcolor: '#252536',
                  '& fieldset': { borderColor: '#FFD700' },
                  '&:hover fieldset': { borderColor: '#FFD700' },
                  '&.Mui-focused fieldset': { borderColor: '#FFD700' },
                },
              }}
            />
          ) : (
            <Box
              sx={{
                p: 2,
                bgcolor: '#252536',
                borderRadius: 1,
                border: '1px solid #3d3d54',
                maxHeight: 300,
                overflow: 'auto',
              }}
            >
              <Typography
                component="pre"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  color: '#fff',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  m: 0,
                }}
              >
                {outputString}
              </Typography>
            </Box>
          )}
        </Box>

        {/* コメント / 修正指示 */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ color: '#888', fontSize: '0.85rem' }}>
              {isRevising ? 'AI修正中...' : 'コメント / 修正指示'}
            </Typography>
            {revisionHistory.length > 1 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  icon={<HistoryIcon sx={{ fontSize: '0.9rem' }} />}
                  label={`${currentRevisionIndex + 1}/${revisionHistory.length}`}
                  size="small"
                  sx={{
                    bgcolor: '#252536',
                    color: '#888',
                    fontSize: '0.7rem',
                    height: 24,
                  }}
                />
                <Tooltip title="前の版に戻す">
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleUndoRevision}
                      disabled={currentRevisionIndex <= 0}
                      sx={{ color: currentRevisionIndex > 0 ? '#90CAF9' : '#555' }}
                    >
                      <HistoryIcon sx={{ fontSize: '1rem', transform: 'scaleX(-1)' }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="次の版に進む">
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleRedoRevision}
                      disabled={currentRevisionIndex >= revisionHistory.length - 1}
                      sx={{ color: currentRevisionIndex < revisionHistory.length - 1 ? '#90CAF9' : '#555' }}
                    >
                      <HistoryIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            )}
          </Box>
          <TextField
            value={comments}
            onChange={(e) => {
              setComments(e.target.value);
              setRevisionError(null);
            }}
            fullWidth
            multiline
            rows={2}
            placeholder="修正してほしい内容を入力してください（例: もっと丁寧な表現にして、箇条書きで整理して）"
            disabled={isRevising}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                fontSize: '0.9rem',
                '& fieldset': { borderColor: '#3d3d54' },
                '&:hover fieldset': { borderColor: '#4d4d64' },
                '&.Mui-focused fieldset': { borderColor: '#6366f1' },
              },
            }}
          />

          {/* AI修正ボタン */}
          <Box sx={{ mt: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={isRevising ? <CircularProgress size={16} color="inherit" /> : <AutoFixHighIcon />}
              onClick={handleAIRevision}
              disabled={isRevising || !comments.trim()}
              sx={{
                color: '#9C27B0',
                borderColor: '#9C27B0',
                '&:hover': {
                  borderColor: '#7B1FA2',
                  bgcolor: 'rgba(156, 39, 176, 0.1)',
                },
                '&:disabled': {
                  color: '#555',
                  borderColor: '#333',
                },
              }}
            >
              {isRevising ? '修正中...' : 'AIで修正'}
            </Button>
            <Typography sx={{ color: '#666', fontSize: '0.75rem' }}>
              上記の指示に基づいてAIが出力を修正します
            </Typography>
          </Box>

          {/* エラー表示 */}
          {revisionError && (
            <Alert
              severity="error"
              sx={{
                mt: 1,
                bgcolor: 'rgba(244, 67, 54, 0.1)',
                color: '#f44336',
                '& .MuiAlert-icon': { color: '#f44336' },
              }}
            >
              {revisionError}
            </Alert>
          )}

          {/* 修正された場合のインジケーター */}
          {currentRevisionIndex > 0 && (
            <Alert
              severity="info"
              sx={{
                mt: 1,
                bgcolor: 'rgba(156, 39, 176, 0.1)',
                color: '#CE93D8',
                '& .MuiAlert-icon': { color: '#CE93D8' },
              }}
            >
              AIによる修正が適用されています（{currentRevisionIndex}回修正）。内容を確認して承認してください。
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          borderTop: '1px solid #2d2d44',
          gap: 1,
          justifyContent: 'space-between',
        }}
      >
        <Button
          variant="outlined"
          startIcon={<CancelIcon />}
          onClick={handleReject}
          sx={{
            color: '#f44336',
            borderColor: '#f44336',
            '&:hover': {
              borderColor: '#f44336',
              bgcolor: 'rgba(244, 67, 54, 0.1)',
            },
          }}
        >
          Reject
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {isEditing && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEdit}
              sx={{
                bgcolor: '#FF9800',
                '&:hover': { bgcolor: '#F57C00' },
              }}
            >
              Apply Edit
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={handleApprove}
            sx={{
              bgcolor: '#4CAF50',
              '&:hover': { bgcolor: '#43A047' },
            }}
          >
            Approve
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
