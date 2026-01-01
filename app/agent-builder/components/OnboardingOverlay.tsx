'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Fade,
  Backdrop,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SettingsIcon from '@mui/icons-material/Settings';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { useTheme } from '../contexts/ThemeContext';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string; // CSSセレクタで要素をハイライト
  position?: 'center' | 'left' | 'right' | 'top' | 'bottom';
}

interface OnboardingOverlayProps {
  onComplete: () => void;
  onSkip: () => void;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Agent Builderへようこそ！ 🦉',
    description:
      'ノードを接続して、AIエージェントを視覚的に構築できます。\nこのチュートリアルで基本的な使い方をご紹介します。',
    icon: <Box sx={{ fontSize: 48 }}>🦉</Box>,
    position: 'center',
  },
  {
    title: 'パレットからノードをドラッグ',
    description:
      '左側のサイドバーには利用可能なすべてのノードがあります。\nキャンバスにドラッグして、エージェントワークフローの構築を始めましょう。',
    icon: <DragIndicatorIcon sx={{ fontSize: 48 }} />,
    position: 'left',
  },
  {
    title: 'ノードの設定',
    description:
      'ノードをダブルクリックするか、歯車アイコンをクリックして設定パネルを開きます。\nAPIキー、プロンプト、その他のパラメータを設定できます。',
    icon: <SettingsIcon sx={{ fontSize: 48 }} />,
    position: 'center',
  },
  {
    title: 'ノードを接続',
    description:
      '出力ハンドル（右側）から別のノードの入力ハンドル（左側）へドラッグして接続を作成します。',
    icon: <Box sx={{ fontSize: 48 }}>🔗</Box>,
    position: 'center',
  },
  {
    title: 'エージェントをテスト',
    description:
      '「Test Run」をクリックしてエージェントフローを実行します。\n実行順序と結果をリアルタイムで確認できます。',
    icon: <PlayArrowIcon sx={{ fontSize: 48 }} />,
    position: 'right',
  },
  {
    title: 'エージェントを保存',
    description:
      'エージェントが完成したら「Save Agent」をクリックして保存します。\n保存したエージェントは再利用したり、他のフローで参照できます。',
    icon: <SaveIcon sx={{ fontSize: 48 }} />,
    position: 'right',
  },
  {
    title: 'キーボードショートカット',
    description:
      'ショートカットで作業を効率化：\n• Ctrl+S: 保存\n• Ctrl+Z: 元に戻す\n• Ctrl+F: ノード検索\n• Delete: 選択を削除\n• Space: キャンバス移動',
    icon: <KeyboardIcon sx={{ fontSize: 48 }} />,
    position: 'center',
  },
  {
    title: '準備完了！ 🎉',
    description:
      '以上が基本的な使い方です！\nまずはLLMノードをキャンバスにドラッグして始めましょう。',
    icon: <CheckCircleIcon sx={{ fontSize: 48, color: '#4caf50' }} />,
    position: 'center',
  },
];

const STORAGE_KEY = 'agent-builder-onboarding-completed';

export default function OnboardingOverlay({ onComplete, onSkip }: OnboardingOverlayProps) {
  const { colors } = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const currentStep = ONBOARDING_STEPS[activeStep];
  const isLastStep = activeStep === ONBOARDING_STEPS.length - 1;
  const isFirstStep = activeStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(0, prev - 1));
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
    setTimeout(onSkip, 300);
  };

  // 位置に応じたスタイル
  const getPositionStyle = () => {
    switch (currentStep.position) {
      case 'left':
        return { left: 300, top: '50%', transform: 'translateY(-50%)' };
      case 'right':
        return { right: 32, top: '50%', transform: 'translateY(-50%)' };
      case 'top':
        return { top: 100, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom':
        return { bottom: 100, left: '50%', transform: 'translateX(-50%)' };
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  return (
    <Fade in={isVisible}>
      <Box>
        <Backdrop
          open={true}
          sx={{
            zIndex: 2000,
            bgcolor: 'rgba(0, 0, 0, 0.8)',
          }}
        />
        <Paper
          elevation={24}
          sx={{
            position: 'fixed',
            ...getPositionStyle(),
            width: 440,
            maxWidth: '90vw',
            bgcolor: colors.bg.secondary,
            border: `1px solid ${colors.border.primary}`,
            borderRadius: 3,
            overflow: 'hidden',
            zIndex: 2001,
          }}
        >
          {/* ヘッダー */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              bgcolor: colors.accent,
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 600 }}>はじめに</Typography>
            <IconButton size="small" onClick={handleSkip} sx={{ color: 'rgba(255,255,255,0.8)' }}>
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>

          {/* ステッパー */}
          <Box sx={{ px: 2, py: 1, bgcolor: colors.bg.tertiary }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {ONBOARDING_STEPS.map((step, index) => (
                <Step key={index}>
                  <StepLabel
                    sx={{
                      '& .MuiStepLabel-label': {
                        display: 'none',
                      },
                      '& .MuiStepIcon-root': {
                        color: colors.border.secondary,
                        '&.Mui-active': { color: colors.accent },
                        '&.Mui-completed': { color: '#4caf50' },
                      },
                    }}
                  />
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* コンテンツ */}
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mb: 2,
                color: colors.accent,
              }}
            >
              {currentStep.icon}
            </Box>
            <Typography
              variant="h6"
              sx={{ color: colors.text.primary, fontWeight: 600, mb: 1.5 }}
            >
              {currentStep.title}
            </Typography>
            <Typography
              sx={{
                color: colors.text.secondary,
                fontSize: '0.9rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-line',
              }}
            >
              {currentStep.description}
            </Typography>
          </Box>

          {/* フッター */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 2,
              py: 1.5,
              borderTop: `1px solid ${colors.border.primary}`,
              bgcolor: colors.bg.tertiary,
            }}
          >
            <Button
              size="small"
              onClick={handleSkip}
              sx={{ color: colors.text.tertiary, fontSize: '0.8rem' }}
            >
              スキップ
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {!isFirstStep && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={handleBack}
                  sx={{
                    color: colors.text.primary,
                    borderColor: colors.border.secondary,
                    fontSize: '0.8rem',
                  }}
                >
                  戻る
                </Button>
              )}
              <Button
                size="small"
                variant="contained"
                endIcon={isLastStep ? <CheckCircleIcon /> : <ArrowForwardIcon />}
                onClick={handleNext}
                sx={{
                  bgcolor: colors.accent,
                  fontSize: '0.8rem',
                  '&:hover': { bgcolor: '#5558e3' },
                }}
              >
                {isLastStep ? 'はじめる！' : '次へ'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Fade>
  );
}

// オンボーディングが完了しているかチェック
export function useOnboardingStatus() {
  const [isCompleted, setIsCompleted] = useState(true); // デフォルトtrueで初期表示を防ぐ

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY) === 'true';
    setIsCompleted(completed);
  }, []);

  const resetOnboarding = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsCompleted(false);
  };

  return { isCompleted, resetOnboarding };
}
