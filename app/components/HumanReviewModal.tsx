'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Alert,
  Paper,
  IconButton,
  Divider,
  CircularProgress,
  Tooltip
} from '@mui/material'
import {
  CheckCircle,
  Cancel,
  Edit,
  Info,
  Timer,
  Person,
  ContentCopy
} from '@mui/icons-material'
import { ReviewStatus } from '../types/flowise'

interface HumanReviewModalProps {
  open: boolean
  nodeId: string
  nodeType: string
  nodeLabel?: string
  output: any
  allowEdit: boolean
  timeoutSeconds?: number
  onApprove: (editedOutput?: any) => void
  onReject: (reason?: string) => void
  onClose: () => void
}

export default function HumanReviewModal({
  open,
  nodeId,
  nodeType,
  nodeLabel,
  output,
  allowEdit,
  timeoutSeconds,
  onApprove,
  onReject,
  onClose
}: HumanReviewModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedOutput, setEditedOutput] = useState(
    typeof output === 'string' ? output : JSON.stringify(output, null, 2)
  )
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(timeoutSeconds || 0)
  const [copied, setCopied] = useState(false)

  React.useEffect(() => {
    if (open && timeoutSeconds && timeoutSeconds > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            onApprove() // Auto-approve on timeout
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [open, timeoutSeconds, onApprove])

  const handleApprove = () => {
    if (isEditing && editedOutput !== output) {
      try {
        const parsed = JSON.parse(editedOutput)
        onApprove(parsed)
      } catch {
        onApprove(editedOutput)
      }
    } else {
      onApprove()
    }
  }

  const handleReject = () => {
    onReject(rejectReason)
    setShowRejectDialog(false)
    setRejectReason('')
  }

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(
      typeof output === 'string' ? output : JSON.stringify(output, null, 2)
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderTop: '4px solid',
            borderColor: 'warning.main'
          }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <Person color="warning" />
              <Typography variant="h6">Human Review Required</Typography>
            </Box>
            {timeoutSeconds && timeRemaining > 0 && (
              <Chip
                icon={<Timer />}
                label={`Auto-approve in ${formatTime(timeRemaining)}`}
                color={timeRemaining < 30 ? 'error' : 'default'}
                size="small"
              />
            )}
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Alert severity="info" icon={<Info />}>
              Please review the output from the following node and decide whether to approve or reject it.
            </Alert>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Node Information
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
              <Box display="flex" gap={2}>
                <Chip label={nodeType} size="small" color="primary" />
                <Typography variant="body2">
                  <strong>ID:</strong> {nodeId}
                </Typography>
                {nodeLabel && (
                  <Typography variant="body2">
                    <strong>Label:</strong> {nodeLabel}
                  </Typography>
                )}
              </Box>
            </Paper>
          </Box>

          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Output
              </Typography>
              <Box display="flex" gap={1}>
                <Tooltip title={copied ? 'Copied!' : 'Copy output'}>
                  <IconButton size="small" onClick={handleCopyOutput}>
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Tooltip>
                {allowEdit && (
                  <Tooltip title={isEditing ? 'View mode' : 'Edit output'}>
                    <IconButton
                      size="small"
                      onClick={() => setIsEditing(!isEditing)}
                      color={isEditing ? 'primary' : 'default'}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              {isEditing ? (
                <TextField
                  multiline
                  fullWidth
                  rows={10}
                  value={editedOutput}
                  onChange={(e) => setEditedOutput(e.target.value)}
                  variant="outlined"
                  sx={{
                    '& .MuiInputBase-root': {
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }
                  }}
                />
              ) : (
                <Box
                  component="pre"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    m: 0,
                    maxHeight: 400,
                    overflow: 'auto'
                  }}
                >
                  {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
                </Box>
              )}
            </Paper>

            {isEditing && editedOutput !== (typeof output === 'string' ? output : JSON.stringify(output, null, 2)) && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                You have edited the output. The modified version will be used if you approve.
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setShowRejectDialog(true)}
            color="error"
            startIcon={<Cancel />}
            variant="outlined"
          >
            Reject
          </Button>
          <Button
            onClick={handleApprove}
            color="success"
            startIcon={<CheckCircle />}
            variant="contained"
          >
            {isEditing && editedOutput !== (typeof output === 'string' ? output : JSON.stringify(output, null, 2))
              ? 'Approve with Edits'
              : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog
        open={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Provide Rejection Reason</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            rows={3}
            fullWidth
            label="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            variant="outlined"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRejectDialog(false)}>Cancel</Button>
          <Button onClick={handleReject} color="error" variant="contained">
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}