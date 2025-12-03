'use client';

import React from 'react';
import { Box, Card, CardContent, Typography, Chip, IconButton } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PeopleIcon from '@mui/icons-material/People';
import { useRouter } from 'next/navigation';

interface MultiAgentFlow {
  id: string;
  name: string;
  description: string;
  popularity?: number;
  likes?: number;
  tags?: string[];
  agentCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MultiAgentFlowCardProps {
  flow: MultiAgentFlow;
}

// Ability bar component
const AbilityBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <Box sx={{ mb: 1.5 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
      <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ color: '#E0E0E0', fontSize: '0.7rem', fontWeight: 700 }}>
        {value}
      </Typography>
    </Box>
    <Box
      sx={{
        height: 8,
        backgroundColor: '#1A1A1A',
        borderRadius: 1,
        overflow: 'hidden',
        border: '1px solid #333',
      }}
    >
      <Box
        sx={{
          width: `${value}%`,
          height: '100%',
          backgroundColor: color,
          background: `linear-gradient(90deg, ${color}CC 0%, ${color} 100%)`,
          transition: 'width 0.3s ease',
        }}
      />
    </Box>
  </Box>
);

export default function MultiAgentFlowCard({ flow }: MultiAgentFlowCardProps) {
  const router = useRouter();
  const [liked, setLiked] = React.useState(false);

  const handleCardClick = () => {
    // Navigate to agent canvas (OwlAgentとして統合)
    router.push(`/agent-canvas/${flow.id}`);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
  };

  return (
    <Card
      onClick={handleCardClick}
      sx={{
        backgroundColor: '#1E1E1E',
        backgroundImage: 'linear-gradient(145deg, #1E1E1E 0%, #141414 100%)',
        border: '2px solid #333',
        borderRadius: 3,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'visible',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(144, 202, 249, 0.3)',
          borderColor: '#90CAF9',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #4CAF50 0%, #2196F3 50%, #9C27B0 100%)',
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* Top Section: Icon + Name + Like Button */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          {/* Left: Icon + Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                backgroundColor: '#2C2C2C',
                border: '2px solid #444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                mr: 2,
                flexShrink: 0,
              }}
            >
              <AccountTreeIcon sx={{ fontSize: 32, color: '#90CAF9' }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  color: '#E0E0E0',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {flow.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PeopleIcon sx={{ fontSize: 14, color: '#90CAF9' }} />
                <Typography
                  variant="caption"
                  sx={{
                    color: '#90CAF9',
                    fontSize: '0.75rem',
                  }}
                >
                  {flow.agentCount || 0} agents
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Right: Like Button */}
          <IconButton
            onClick={handleLikeClick}
            sx={{
              color: liked ? '#FF6B9D' : '#666',
              '&:hover': { color: '#FF6B9D' },
            }}
          >
            {liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
        </Box>

        {/* Description */}
        <Typography
          variant="body2"
          sx={{
            color: '#AAA',
            fontSize: '0.85rem',
            mb: 2,
            minHeight: 40,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {flow.description}
        </Typography>

        {/* Ability Bars */}
        <Box sx={{ mb: 2 }}>
          <AbilityBar
            label="POPULARITY"
            value={flow.popularity || 0}
            color="#4CAF50"
          />
          <AbilityBar
            label="LIKES"
            value={flow.likes || 0}
            color="#FF6B9D"
          />
        </Box>

        {/* Stats Row */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <VisibilityIcon sx={{ fontSize: 16, color: '#4CAF50' }} />
            <Typography variant="caption" sx={{ color: '#999', fontSize: '0.75rem' }}>
              {flow.popularity || 0}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FavoriteIcon sx={{ fontSize: 16, color: '#FF6B9D' }} />
            <Typography variant="caption" sx={{ color: '#999', fontSize: '0.75rem' }}>
              {flow.likes || 0}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PeopleIcon sx={{ fontSize: 16, color: '#90CAF9' }} />
            <Typography variant="caption" sx={{ color: '#999', fontSize: '0.75rem' }}>
              {flow.agentCount || 0}
            </Typography>
          </Box>
        </Box>

        {/* Tags */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {flow.tags?.slice(0, 3).map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              size="small"
              sx={{
                backgroundColor: '#2C2C2C',
                color: '#90CAF9',
                fontSize: '0.7rem',
                height: 22,
                border: '1px solid #444',
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          ))}
          {(flow.tags?.length || 0) > 3 && (
            <Chip
              label={`+${(flow.tags?.length || 0) - 3}`}
              size="small"
              sx={{
                backgroundColor: '#2C2C2C',
                color: '#999',
                fontSize: '0.7rem',
                height: 22,
                border: '1px solid #444',
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
