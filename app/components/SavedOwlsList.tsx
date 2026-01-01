'use client';

import React, { useState, useEffect } from 'react';
import { Typography, Button } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ChatIcon from '@mui/icons-material/Chat';
import DeleteIcon from '@mui/icons-material/Delete';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useRouter } from 'next/navigation';

// Type definitions
type AbilityRank = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

type AgentAbility = {
  label: string;
  displayName: string;
  value: number;
  rank: AbilityRank;
};

type SavedOwl = {
  id: string;
  name: string;
  avatarColor: string;
  avatarEmoji: string;
  description: string;
  version: string;
  author?: string;
  category: string;
  totalRuns: number;
  likes: number;
  abilities: AgentAbility[];
  tags: string[];
  flowiseChatflowId?: string;
  flow: {
    nodes: any[];
    edges: any[];
  };
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to get rank color
const getRankStyle = (rank: AbilityRank): string => {
  switch (rank) {
    case 'S': return 'text-red-500 font-black text-shadow-lg';
    case 'A': return 'text-orange-500 font-black';
    case 'B': return 'text-yellow-600 font-bold';
    case 'C': return 'text-green-600 font-bold';
    case 'D': return 'text-blue-600 font-semibold';
    case 'E': return 'text-purple-600 font-semibold';
    case 'F': return 'text-gray-600';
    default: return 'text-gray-400';
  }
};

// Simple ability generator (replacing the deleted ability-calculator)
const generateAbilities = (): AgentAbility[] => {
  const getRank = (value: number): AbilityRank => {
    if (value >= 90) return 'S';
    if (value >= 80) return 'A';
    if (value >= 70) return 'B';
    if (value >= 60) return 'C';
    if (value >= 50) return 'D';
    if (value >= 40) return 'E';
    return 'F';
  };

  const abilities = [
    { label: 'popularity', displayName: '人気度' },
    { label: 'like', displayName: '好感度' },
    { label: 'reliability', displayName: '安定性' },
    { label: 'speed', displayName: '応答速度' },
    { label: 'costEfficiency', displayName: 'コスパ' },
  ];

  return abilities.map(a => {
    const value = Math.floor(Math.random() * 60) + 40;
    return {
      ...a,
      value,
      rank: getRank(value),
    };
  });
};

export default function SavedOwlsList() {
  const router = useRouter();
  const [selectedOwl, setSelectedOwl] = useState<SavedOwl | null>(null);
  const [savedOwls, setSavedOwls] = useState<SavedOwl[]>([]);
  const [loading, setLoading] = useState(true);

  const flowiseUrl = process.env.NEXT_PUBLIC_FLOWISE_API_URL || 'http://localhost:3000';

  // OwliaFabricaの編集画面に遷移
  const handleEditInOwliaFabrica = (agentId: string) => {
    router.push(`/agent-builder?id=${agentId}`);
  };

  // Fetch saved owls from API
  const fetchSavedOwls = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/owlagents');
      if (response.ok) {
        const data = await response.json();
        const transformedOwls: SavedOwl[] = data.map((agent: any) => {
          return {
            ...agent,
            avatarColor: `bg-${['blue', 'green', 'purple', 'orange', 'red'][Math.floor(Math.random() * 5)]}-500`,
            avatarEmoji: agent.icon || '🦉',
            category: agent.tags?.[0] || 'カスタム',
            totalRuns: Math.floor(Math.random() * 1000),
            likes: Math.floor(Math.random() * 100),
            abilities: generateAbilities(),
            tags: agent.tags || [],
          };
        });
        setSavedOwls(transformedOwls);
        if (transformedOwls.length > 0 && !selectedOwl) {
          setSelectedOwl(transformedOwls[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch saved owls:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedOwls();
  }, []);

  const handleDelete = async (owlId: string) => {
    if (!confirm('このOwlAgentを削除しますか？この操作は元に戻せません。')) {
      return;
    }

    try {
      const response = await fetch(`/api/owlagents/${owlId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // 削除成功後、リストを更新
        const remainingOwls = savedOwls.filter(owl => owl.id !== owlId);
        setSavedOwls(remainingOwls);

        // 削除したのが選択中のOwlAgentの場合、次のOwlAgentを選択
        if (selectedOwl?.id === owlId) {
          setSelectedOwl(remainingOwls.length > 0 ? remainingOwls[0] : null);
        }
      } else {
        const errorData = await response.json();
        alert(`削除に失敗しました: ${errorData.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('Failed to delete owl:', error);
      alert('削除中にエラーが発生しました');
    }
  };

  const handleOpenInFlowise = (chatflowId?: string) => {
    if (chatflowId) {
      window.open(`${flowiseUrl}/canvas/${chatflowId}`, '_blank');
    } else {
      window.open(`${flowiseUrl}/canvas`, '_blank');
    }
  };

  const handleOpenChat = (chatflowId?: string) => {
    if (chatflowId) {
      window.open(`/chat?chatflow=${chatflowId}`, '_blank');
    } else {
      alert('このエージェントにはFlowiseのChatflow IDが設定されていません');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: '#1a1a2e' }}>
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (!selectedOwl) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: '#1a1a2e' }}>
        <div className="text-center">
          <div className="text-white text-2xl mb-4">保存されたOwlAgentがありません</div>
          <Button
            variant="contained"
            startIcon={<OpenInNewIcon />}
            onClick={() => window.open(`${flowiseUrl}/canvas`, '_blank')}
            sx={{ backgroundColor: '#e94560', color: '#fff', '&:hover': { backgroundColor: '#c73e54' } }}
          >
            Flowiseで新規作成
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4" style={{ backgroundColor: '#1a1a2e' }}>
      <div className="h-full max-w-7xl mx-auto">
        <div className="rounded-lg shadow-xl flex h-full" style={{ backgroundColor: '#16213e', border: '1px solid #0f3460' }}>
          {/* Left Panel - Saved Owls List */}
          <div className="w-64 overflow-y-auto rounded-l-lg" style={{ backgroundColor: '#0f3460', borderRight: '2px solid #1a1a2e' }}>
            <div className="sticky top-0 p-3 text-center font-bold text-sm" style={{ backgroundColor: '#e94560', color: '#fff' }}>
              保存済みOwlAgents
            </div>
            {savedOwls.map((owl) => (
              <div
                key={owl.id}
                onClick={() => setSelectedOwl(owl)}
                className="p-3 cursor-pointer transition-all"
                style={{
                  borderBottom: '1px solid #1a1a2e',
                  backgroundColor: selectedOwl.id === owl.id ? 'rgba(233, 69, 96, 0.3)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (selectedOwl.id !== owl.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(144, 202, 249, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedOwl.id !== owl.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: '#e94560' }}>
                    <span className="text-sm">{owl.avatarEmoji}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm" style={{ color: '#fff' }}>{owl.name}</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{owl.category}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Panel - PowerPro Style Card */}
          <div className="flex-1 p-4 overflow-hidden rounded-r-lg" style={{ backgroundColor: '#1a1a2e' }}>
            <div className="h-full flex items-center justify-center">
              {/* Card Container */}
              <div className="rounded-3xl shadow-2xl overflow-hidden w-full max-w-5xl" style={{ backgroundColor: '#16213e', border: '2px solid #0f3460' }}>

                {/* Top Header Section */}
                <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: '#0f3460', borderBottom: '2px solid #1a1a2e' }}>
                  <div className="flex items-center gap-3">
                    <span className="px-4 py-2 rounded-full font-bold text-lg shadow-md" style={{ backgroundColor: '#e94560', color: '#fff' }}>
                      {selectedOwl.name}
                    </span>
                    <span style={{ color: '#FFD700' }} className="text-xl">★</span>
                    <span style={{ color: '#90CAF9' }} className="font-bold text-2xl">{Math.floor(selectedOwl.abilities[0].value / 2)}</span>
                  </div>

                  {/* Avatar Circle */}
                  <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl" style={{ backgroundColor: '#e94560', border: '4px solid #16213e' }}>
                    <span className="text-4xl">{selectedOwl.avatarEmoji}</span>
                  </div>

                  <div className="text-right">
                    <span className="px-4 py-2 rounded-full text-base font-bold shadow" style={{ backgroundColor: '#4CAF50', color: '#fff' }}>
                      v{selectedOwl.version}
                    </span>
                    <div className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{selectedOwl.totalRuns.toLocaleString()}回実行</div>
                  </div>
                </div>

                {/* Sub Header */}
                <div className="flex justify-center gap-6 px-6 py-2" style={{ backgroundColor: 'rgba(15, 52, 96, 0.5)', borderBottom: '1px solid #0f3460' }}>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>作成者 <span className="font-bold" style={{ color: '#90CAF9' }}>{selectedOwl.author || 'Unknown'}</span></span>
                  <span className="text-sm font-bold" style={{ color: '#FFD700' }}>★{selectedOwl.likes}</span>
                  {selectedOwl.flowiseChatflowId && (
                    <span className="text-sm font-bold" style={{ color: '#4CAF50' }}>Flowise連携済み</span>
                  )}
                </div>

                {/* Main Content Area */}
                <div className="flex p-4 gap-4">

                  {/* Left Side - Abilities */}
                  <div className="w-72">
                    <div className="rounded-xl shadow-md overflow-hidden" style={{ backgroundColor: '#0f3460', border: '1px solid #1a1a2e' }}>
                      <table className="w-full">
                        <tbody>
                          {selectedOwl.abilities.map((ability, index) => (
                            <tr key={ability.label} style={{ backgroundColor: index % 2 === 0 ? 'rgba(26, 26, 46, 0.5)' : 'transparent' }}>
                              <td className="px-4 py-2.5 text-base font-bold" style={{ color: 'rgba(255,255,255,0.8)', borderRight: '1px solid #1a1a2e' }}>
                                {ability.displayName}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`text-2xl font-black ${getRankStyle(ability.rank)}`}>
                                  {ability.rank}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right text-lg font-bold" style={{ color: '#90CAF9' }}>
                                {ability.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Side - Description & Tags */}
                  <div className="flex-1">
                    <div className="rounded-xl p-4 shadow-md mb-4" style={{ backgroundColor: '#0f3460', border: '1px solid #1a1a2e' }}>
                      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
                        {selectedOwl.description}
                      </Typography>
                    </div>
                    <div className="rounded-xl p-4 shadow-md" style={{ backgroundColor: '#0f3460', border: '1px solid #1a1a2e' }}>
                      <div className="grid grid-cols-4 gap-1.5">
                        {Array.from({ length: 24 }).map((_, index) => {
                          const tag = selectedOwl.tags[index];

                          if (!tag) {
                            return (
                              <div
                                key={`empty-${index}`}
                                className="px-2 py-1.5 text-center rounded-lg text-xs font-bold"
                                style={{ backgroundColor: '#1a1a2e', color: 'rgba(255,255,255,0.3)' }}
                              >
                                -
                              </div>
                            );
                          }

                          let bgColor = '';
                          if (index < 8) {
                            bgColor = '#9C27B0';
                          } else if (index < 12) {
                            bgColor = '#E91E63';
                          } else if (index < 18) {
                            bgColor = '#3F51B5';
                          } else {
                            bgColor = '#2196F3';
                          }

                          return (
                            <div
                              key={tag}
                              className="px-2 py-1.5 text-center rounded-lg text-xs font-bold shadow-sm cursor-pointer hover:shadow-md transform hover:-translate-y-0.5 transition-all"
                              style={{ backgroundColor: bgColor, color: '#fff' }}
                              title={tag}
                            >
                              {tag.substring(0, 6)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Section - Action Buttons */}
                <div className="mx-4 mb-4 p-3 rounded-xl" style={{ backgroundColor: '#0f3460', border: '1px solid #1a1a2e' }}>
                  <div className="flex justify-center gap-3 flex-wrap">
                    <button
                      onClick={() => handleEditInOwliaFabrica(selectedOwl.id)}
                      className="px-6 py-2 rounded-full font-bold text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-1"
                      style={{ backgroundColor: '#FF9800', color: '#fff' }}
                    >
                      <EditNoteIcon sx={{ fontSize: 16 }} />
                      編集
                    </button>

                    <button
                      onClick={() => handleOpenChat(selectedOwl.flowiseChatflowId)}
                      className="px-6 py-2 rounded-full font-bold text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-1"
                      style={{ backgroundColor: '#4CAF50', color: '#fff' }}
                    >
                      <ChatIcon sx={{ fontSize: 16 }} />
                      チャット
                    </button>

                    <button
                      onClick={() => handleOpenInFlowise(selectedOwl.flowiseChatflowId)}
                      className="px-6 py-2 rounded-full font-bold text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-1"
                      style={{ backgroundColor: '#2196F3', color: '#fff' }}
                    >
                      <OpenInNewIcon sx={{ fontSize: 16 }} />
                      Flowise
                    </button>

                    <button
                      onClick={() => handleDelete(selectedOwl.id)}
                      className="px-6 py-2 rounded-full font-bold text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-1"
                      style={{ backgroundColor: '#e94560', color: '#fff' }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                      削除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
