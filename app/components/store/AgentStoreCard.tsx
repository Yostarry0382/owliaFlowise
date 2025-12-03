'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, IconButton, Box, Typography, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ChatIcon from '@mui/icons-material/Chat';

// Type definitions
type AbilityRank = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

type AgentAbility = {
  label: string;
  displayName: string;
  value: number;
  rank: AbilityRank;
};

type AgentStoreItem = {
  id: string;
  name: string;
  avatarColor: string;
  avatarEmoji: string;
  role: string;
  category: string;
  totalRuns: number;
  likes: number;
  abilities: AgentAbility[];
  tags: string[];
  flowiseChatflowId?: string;
  description?: string;
};

// Mock data
const mockAgents: AgentStoreItem[] = [
  {
    id: 'agent-1',
    name: 'RAGマスター',
    avatarColor: 'bg-blue-500',
    avatarEmoji: '🦉',
    role: 'RAG検索エージェント',
    category: '開発支援',
    totalRuns: 12845,
    likes: 1203,
    abilities: [
      { label: 'Popularity', displayName: '人気度', value: 95, rank: 'S' },
      { label: 'Like', displayName: '好感度', value: 88, rank: 'A' },
      { label: 'Reliability', displayName: '安定性', value: 92, rank: 'S' },
      { label: 'Speed', displayName: '応答速度', value: 76, rank: 'B' },
      { label: 'CostEfficiency', displayName: 'コスパ', value: 85, rank: 'A' },
    ],
    tags: [
      '⚡RAG対応', '🗄️ベクトルDB', '🔗Pinecone', '✂️チャンク',
      '🔍類似検索', '🤖OpenAI', '🧠Claude', '📄ドキュメント',
      '📑PDF処理', '🎨マルチモーダル', '🎯セマンティック', '🔀ハイブリッド'
    ]
  },
  {
    id: 'agent-2',
    name: 'WebScout',
    avatarColor: 'bg-green-500',
    avatarEmoji: '🦉',
    role: 'Web検索エージェント',
    category: 'リサーチ',
    totalRuns: 8932,
    likes: 742,
    abilities: [
      { label: 'Popularity', displayName: '人気度', value: 82, rank: 'A' },
      { label: 'Like', displayName: '好感度', value: 79, rank: 'B' },
      { label: 'Reliability', displayName: '安定性', value: 86, rank: 'A' },
      { label: 'Speed', displayName: '応答速度', value: 93, rank: 'S' },
      { label: 'CostEfficiency', displayName: 'コスパ', value: 70, rank: 'C' },
    ],
    tags: [
      '🌐Web検索', '🔎Google', '🔍Bing', '⏱️リアルタイム',
      '📰最新情報', '📊ニュース', '📈トレンド', '🌍マルチソース',
      '📝要約生成', '🌐自動翻訳', '🕷️スクレイピング', '🔌API統合'
    ]
  },
  {
    id: 'agent-3',
    name: 'CodeHelper',
    avatarColor: 'bg-purple-500',
    avatarEmoji: '🦉',
    role: 'コード生成エージェント',
    category: '開発支援',
    totalRuns: 15234,
    likes: 2103,
    abilities: [
      { label: 'Popularity', displayName: '人気度', value: 98, rank: 'S' },
      { label: 'Like', displayName: '好感度', value: 94, rank: 'S' },
      { label: 'Reliability', displayName: '安定性', value: 88, rank: 'A' },
      { label: 'Speed', displayName: '応答速度', value: 71, rank: 'C' },
      { label: 'CostEfficiency', displayName: 'コスパ', value: 77, rank: 'B' },
    ],
    tags: [
      '💻コード生成', '🐛デバッグ', '🔧リファクタ', '💙TypeScript',
      '🐍Python', '⚡JavaScript', '⚛️React', '🧪テスト',
      '📚ドキュメント', '❌エラー解析', '🚀高速化', '🔒セキュリティ'
    ]
  },
];

// Helper function to get rank color and style
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

// Generate abilities
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
    { label: 'Popularity', displayName: '人気度' },
    { label: 'Like', displayName: '好感度' },
    { label: 'Reliability', displayName: '安定性' },
    { label: 'Speed', displayName: '応答速度' },
    { label: 'CostEfficiency', displayName: 'コスパ' },
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

export default function AgentStoreCard() {
  const router = useRouter();
  const flowiseUrl = process.env.NEXT_PUBLIC_FLOWISE_API_URL || 'http://localhost:3000';
  const [selectedAgent, setSelectedAgent] = useState<AgentStoreItem | null>(null);
  const [likedAgents, setLikedAgents] = useState<Set<string>>(new Set());
  const [storeAgents, setStoreAgents] = useState<AgentStoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch agents
  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch('/api/owlagents');
        if (response.ok) {
          const data = await response.json();
          const transformedAgents: AgentStoreItem[] = data.map((agent: any) => {
            const avatarColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500'];
            const colorIndex = agent.id.charCodeAt(0) % avatarColors.length;

            return {
              id: agent.id,
              name: agent.name,
              avatarColor: avatarColors[colorIndex],
              avatarEmoji: agent.icon || '🦉',
              role: agent.description?.substring(0, 30) + '...' || 'AI Agent',
              category: agent.tags?.[0] || 'カスタム',
              totalRuns: Math.floor(Math.random() * 10000),
              likes: Math.floor(Math.random() * 1000),
              abilities: generateAbilities(),
              tags: agent.tags || [],
              flowiseChatflowId: agent.flowiseChatflowId,
              description: agent.description,
            };
          });

          // Combine with mock agents
          const combinedAgents = [...transformedAgents, ...mockAgents.slice(0, Math.max(0, 5 - transformedAgents.length))];
          setStoreAgents(combinedAgents);
          if (combinedAgents.length > 0) {
            setSelectedAgent(combinedAgents[0]);
          }
        } else {
          setStoreAgents(mockAgents);
          setSelectedAgent(mockAgents[0]);
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
        setStoreAgents(mockAgents);
        setSelectedAgent(mockAgents[0]);
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, []);

  const toggleLike = (agentId: string) => {
    setLikedAgents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(agentId)) {
        newSet.delete(agentId);
      } else {
        newSet.add(agentId);
      }
      return newSet;
    });
  };

  const handleOpenChat = (chatflowId?: string) => {
    if (chatflowId) {
      window.open(`/chat?chatflow=${chatflowId}`, '_blank');
    } else {
      alert('このエージェントにはFlowiseのChatflow IDが設定されていません');
    }
  };

  const handleOpenFlowise = () => {
    window.open(`${flowiseUrl}/canvas`, '_blank');
  };

  if (loading || !selectedAgent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-blue-400 to-purple-400 p-4 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-blue-400 to-purple-400 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-purple-900 text-white p-4 rounded-t-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="text-white hover:bg-blue-800 rounded-lg p-2 transition-colors"
                title="ホームに戻る"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
              <span className="text-3xl">🦉</span>
              <h1 className="text-2xl font-bold">OwlAgent Store</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="contained"
                startIcon={<OpenInNewIcon />}
                onClick={handleOpenFlowise}
                sx={{ backgroundColor: '#90CAF9', color: '#000' }}
              >
                Flowiseで作成
              </Button>
              <span className="bg-yellow-500 text-black px-3 py-1 rounded-full font-bold">
                エージェント {storeAgents.length}体
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/95 backdrop-blur rounded-b-lg shadow-xl flex" style={{ height: '75vh' }}>
          {/* Left Panel - Agent List */}
          <div className="w-64 bg-gradient-to-b from-gray-100 to-gray-200 border-r-4 border-gray-300 overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 text-white p-2 text-center font-bold text-sm">
              エージェント一覧
            </div>
            {storeAgents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`
                  p-3 border-b-2 border-gray-300 cursor-pointer transition-all
                  ${selectedAgent && selectedAgent.id === agent.id
                    ? 'bg-gradient-to-r from-yellow-300 to-yellow-200 shadow-inner'
                    : 'hover:bg-white/70'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 ${agent.avatarColor} rounded-full flex items-center justify-center text-white shadow-md`}>
                    <span className="text-sm">{agent.avatarEmoji}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-gray-800">{agent.name}</div>
                    <div className="text-xs text-gray-600">{agent.category}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Panel - PowerPro Style Card */}
          <div className="flex-1 p-4 overflow-hidden bg-gradient-to-br from-sky-100 via-cyan-50 to-blue-100">
            <div className="h-full flex items-center justify-center">
              <div className="bg-gradient-to-br from-white via-cyan-50/30 to-sky-50 rounded-3xl shadow-2xl border-3 border-sky-300 overflow-hidden w-full max-w-5xl">

                {/* Top Header Section */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-sky-50 to-cyan-50 border-b-2 border-sky-200">
                  <div className="flex items-center gap-3">
                    <span className="bg-gradient-to-b from-orange-400 to-orange-500 text-white px-4 py-2 rounded-full font-bold text-lg shadow-md">
                      {selectedAgent.name}
                    </span>
                    <span className="text-gray-600 text-xl">★</span>
                    <span className="text-blue-600 font-bold text-2xl">{Math.floor(selectedAgent.abilities[0].value / 2)}</span>
                  </div>

                  <div className={`w-20 h-20 ${selectedAgent.avatarColor} rounded-full flex items-center justify-center text-white shadow-xl border-4 border-white ring-2 ring-sky-300`}>
                    <span className="text-4xl">{selectedAgent.avatarEmoji}</span>
                  </div>

                  <div className="text-right">
                    <span className="bg-gradient-to-r from-orange-400 to-orange-500 text-white px-4 py-2 rounded-full text-base font-bold shadow">
                      {selectedAgent.category}
                    </span>
                    <div className="text-sm text-gray-600 mt-2">{selectedAgent.totalRuns.toLocaleString()}回使用</div>
                  </div>
                </div>

                {/* Sub Header */}
                <div className="flex justify-center gap-6 px-6 py-2 bg-white/50 border-b-2 border-sky-200">
                  <span className="text-sm text-gray-600">タイプ <span className="font-bold text-blue-600">{selectedAgent.role}</span></span>
                  <span className="text-sm text-gray-600 font-bold text-orange-500">★{selectedAgent.likes}</span>
                  {selectedAgent.flowiseChatflowId && (
                    <span className="text-sm text-green-600 font-bold">Flowise連携済み</span>
                  )}
                </div>

                {/* Main Content Area */}
                <div className="flex p-4 gap-4">

                  {/* Left Side - Abilities */}
                  <div className="w-72">
                    <div className="bg-white/80 rounded-xl shadow-md overflow-hidden border border-sky-200">
                      <table className="w-full">
                        <tbody>
                          {selectedAgent.abilities.map((ability, index) => (
                            <tr key={ability.label} className={index % 2 === 0 ? 'bg-sky-50/50' : 'bg-white'}>
                              <td className="px-4 py-2.5 text-base font-bold text-gray-700 border-r border-sky-100">
                                {ability.displayName}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`text-2xl font-black ${getRankStyle(ability.rank)}`}>
                                  {ability.rank}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right text-lg font-bold text-blue-600">
                                {ability.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Side - Tags Grid */}
                  <div className="flex-1">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 shadow-md border border-orange-200">
                      <div className="grid grid-cols-4 gap-1.5">
                        {Array.from({ length: 24 }).map((_, index) => {
                          const tag = selectedAgent.tags[index];

                          if (!tag) {
                            return (
                              <div
                                key={`empty-${index}`}
                                className="px-2 py-1.5 text-center rounded-lg text-xs font-bold
                                  bg-gradient-to-b from-gray-100 to-gray-200 border border-gray-300
                                  text-gray-400"
                              >
                                -
                              </div>
                            );
                          }

                          const cleanTag = tag.replace(/[^ぁ-んァ-ヶー一-龥a-zA-Z0-9]/g, '');

                          let colorClasses = '';
                          if (index < 8) {
                            colorClasses = 'bg-gradient-to-b from-yellow-300 to-amber-400 border border-amber-500 text-gray-800';
                          } else if (index < 12) {
                            colorClasses = 'bg-gradient-to-b from-gray-200 to-gray-300 border border-gray-400 text-gray-700';
                          } else if (index < 18) {
                            colorClasses = 'bg-gradient-to-b from-cyan-300 to-cyan-400 border border-cyan-500 text-gray-800';
                          } else {
                            colorClasses = 'bg-gradient-to-b from-green-300 to-green-400 border border-green-500 text-gray-800';
                          }

                          return (
                            <div
                              key={tag}
                              className={`px-2 py-1.5 text-center rounded-lg text-xs font-bold shadow-sm
                                ${colorClasses}
                                cursor-pointer hover:shadow-md transform hover:-translate-y-0.5 transition-all`}
                              title={tag}
                            >
                              {cleanTag.substring(0, 6)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Section - Action Buttons */}
                <div className="mx-4 mb-4 p-3 bg-gradient-to-b from-white/80 to-gray-100/80 rounded-xl border border-sky-200">
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => toggleLike(selectedAgent.id)}
                      className={`
                        px-4 py-2 rounded-full font-bold text-sm transition-all shadow-md
                        flex items-center gap-2 hover:shadow-lg transform hover:-translate-y-0.5
                        ${likedAgents.has(selectedAgent.id)
                          ? 'bg-gradient-to-b from-red-400 to-red-500 text-white border border-red-600'
                          : 'bg-gradient-to-b from-gray-200 to-gray-300 text-gray-700 border border-gray-400'
                        }
                      `}
                    >
                      <span className="text-base">{likedAgents.has(selectedAgent.id) ? '♥' : '♡'}</span>
                      <span className="text-xs">
                        {likedAgents.has(selectedAgent.id) ? selectedAgent.likes + 1 : selectedAgent.likes}
                      </span>
                    </button>

                    <button
                      onClick={() => handleOpenChat(selectedAgent.flowiseChatflowId)}
                      className="px-6 py-2 bg-gradient-to-b from-green-400 to-green-500 text-white rounded-full font-bold text-sm shadow-md border border-green-600 hover:shadow-lg hover:from-green-500 hover:to-green-600 transform hover:-translate-y-0.5 transition-all flex items-center gap-1"
                    >
                      <ChatIcon sx={{ fontSize: 16 }} />
                      チャット
                    </button>

                    <button
                      onClick={handleOpenFlowise}
                      className="px-6 py-2 bg-gradient-to-b from-blue-400 to-blue-500 text-white rounded-full font-bold text-sm shadow-md border border-blue-600 hover:shadow-lg hover:from-blue-500 hover:to-blue-600 transform hover:-translate-y-0.5 transition-all flex items-center gap-1"
                    >
                      <OpenInNewIcon sx={{ fontSize: 16 }} />
                      Flowiseで編集
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
