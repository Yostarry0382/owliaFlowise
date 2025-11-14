'use client'

import React from 'react'
import { FormControlLabel, Switch, Tooltip, Box, Typography } from '@mui/material'
import { PersonOutline, CheckCircleOutline } from '@mui/icons-material'

interface HumanReviewSwitchProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  label?: string
  helperText?: string
}

export default function HumanReviewSwitch({
  enabled,
  onChange,
  label = 'Require Human Review',
  helperText = 'Pause execution and wait for human approval before proceeding'
}: HumanReviewSwitchProps) {
  return (
    <Box sx={{ my: 2 }}>
      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            onChange={(e) => onChange(e.target.checked)}
            color="warning"
            icon={<CheckCircleOutline />}
            checkedIcon={<PersonOutline />}
          />
        }
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">{label}</Typography>
            {enabled && (
              <Tooltip title="Human review is enabled for this node">
                <PersonOutline
                  sx={{
                    fontSize: 16,
                    color: 'warning.main',
                    animation: 'pulse 2s infinite'
                  }}
                />
              </Tooltip>
            )}
          </Box>
        }
      />
      {helperText && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            ml: 4.5,
            color: 'text.secondary',
            mt: 0.5
          }}
        >
          {helperText}
        </Typography>
      )}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </Box>
  )
}