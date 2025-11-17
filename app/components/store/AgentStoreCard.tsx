'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// React Flowを動的インポート（SSRを避けるため）
const ReactFlow = dynamic(() => import('reactflow'), { ssr: false });
import 'reactflow/dist/style.css';

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
  {
    id: 'agent-4',
    name: 'CS Assistant',
    avatarColor: 'bg-orange-500',
    avatarEmoji: '🦉',
    role: 'カスタマーサポート',
    category: 'CS',
    totalRuns: 9876,
    likes: 823,
    abilities: [
      { label: 'Popularity', displayName: '人気度', value: 78, rank: 'B' },
      { label: 'Like', displayName: '好感度', value: 91, rank: 'S' },
      { label: 'Reliability', displayName: '安定性', value: 95, rank: 'S' },
      { label: 'Speed', displayName: '応答速度', value: 85, rank: 'A' },
      { label: 'CostEfficiency', displayName: 'コスパ', value: 88, rank: 'A' },
    ],
    tags: [
      '📞問い合わせ', '🤖自動応答', '❓FAQ', '🎫チケット',
      '⬆️エスカレート', '😊感情分析', '🌏多言語', '💬Slack',
      '✉️メール処理', '💭チャット', '⭐満足度', '🕐24時間'
    ]
  },
  {
    id: 'agent-5',
    name: '営業サポーター',
    avatarColor: 'bg-red-500',
    avatarEmoji: '🦉',
    role: '営業支援エージェント',
    category: '営業支援',
    totalRuns: 6543,
    likes: 543,
    abilities: [
      { label: 'Popularity', displayName: '人気度', value: 72, rank: 'C' },
      { label: 'Like', displayName: '好感度', value: 84, rank: 'A' },
      { label: 'Reliability', displayName: '安定性', value: 81, rank: 'B' },
      { label: 'Speed', displayName: '応答速度', value: 88, rank: 'A' },
      { label: 'CostEfficiency', displayName: 'コスパ', value: 92, rank: 'S' },
    ],
    tags: [
      '📊CRM連携', '☁️Salesforce', '👥リード管理', '💼商談分析',
      '📝提案書', '💰見積もり', '📈パイプライン', '🎯KPI追跡',
      '✉️メール作成', '🔔フォロー', '👤顧客分析', '💹売上予測'
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

// Helper function to get ability bar color
const getAbilityBarColor = (value: number): string => {
  if (value >= 90) return 'bg-gradient-to-r from-red-500 to-pink-500';
  if (value >= 80) return 'bg-gradient-to-r from-orange-500 to-yellow-500';
  if (value >= 70) return 'bg-gradient-to-r from-yellow-500 to-green-500';
  if (value >= 60) return 'bg-gradient-to-r from-green-500 to-teal-500';
  return 'bg-gradient-to-r from-blue-500 to-purple-500';
};

export default function AgentStoreCard() {
  const router = useRouter();
  const [selectedAgent, setSelectedAgent] = useState<AgentStoreItem | null>(null);
  const [likedAgents, setLikedAgents] = useState<Set<string>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);

  // Initialize selectedAgent on client side only
  React.useEffect(() => {
    if (!selectedAgent && mockAgents.length > 0) {
      setSelectedAgent(mockAgents[0]);
    }
  }, [selectedAgent]);

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

  // サンプルのフローノードとエッジ（実際にはエージェントのデータから生成）
  const getFlowData = () => {
    const nodes = [
      {
        id: '1',
        position: { x: 100, y: 100 },
        data: { label: 'Input' },
        style: { background: '#90CAF9', color: 'white', border: '1px solid #42A5F5' },
      },
      {
        id: '2',
        position: { x: 300, y: 100 },
        data: { label: selectedAgent?.name || 'AI Agent' },
        style: { background: '#A5D6A7', color: 'white', border: '1px solid #66BB6A' },
      },
      {
        id: '3',
        position: { x: 500, y: 100 },
        data: { label: 'Process' },
        style: { background: '#FFCC80', color: 'white', border: '1px solid #FFA726' },
      },
      {
        id: '4',
        position: { x: 700, y: 100 },
        data: { label: 'Output' },
        style: { background: '#F48FB1', color: 'white', border: '1px solid #EC407A' },
      }
    ];

    const edges = [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true },
      { id: 'e3-4', source: '3', target: '4', animated: true },
    ];

    return { nodes, edges };
  };

  // Show loading state while initializing
  if (!selectedAgent) {
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
            <div className="text-sm">
              <span className="bg-yellow-500 text-black px-3 py-1 rounded-full font-bold">
                エージェント {mockAgents.length}体
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
            {mockAgents.map((agent) => (
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
              {/* Card Container - Fit to viewport */}
              <div className="bg-gradient-to-br from-white via-cyan-50/30 to-sky-50 rounded-3xl shadow-2xl border-3 border-sky-300 overflow-hidden w-full max-w-5xl">

                {/* Top Header Section - Optimized for viewport */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-sky-50 to-cyan-50 border-b-2 border-sky-200">
                  <div className="flex items-center gap-3">
                    <span className="bg-gradient-to-b from-orange-400 to-orange-500 text-white px-4 py-2 rounded-full font-bold text-lg shadow-md">
                      {selectedAgent.name}
                    </span>
                    <span className="text-gray-600 text-xl">★</span>
                    <span className="text-blue-600 font-bold text-2xl">{Math.floor(selectedAgent.abilities[0].value / 2)}</span>
                  </div>

                  {/* Avatar Circle */}
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
                  <span className="text-sm text-gray-600">実行回数 <span className="font-bold">{selectedAgent.totalRuns.toLocaleString()}</span></span>
                  <span className="text-sm text-gray-600">カテゴリ <span className="font-bold">{selectedAgent.category}</span></span>
                </div>

                {/* Main Content Area - Compact for viewport */}
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

                  {/* Right Side - Special Abilities Grid */}
                  <div className="flex-1">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 shadow-md border border-orange-200">
                      <div className="grid grid-cols-4 gap-1.5">
                        {/* Create 24 slots (4x6 grid) */}
                        {Array.from({ length: 24 }).map((_, index) => {
                          const tag = selectedAgent.tags[index];

                          // Empty slot
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

                          // Determine color based on index (following PowerPro pattern)
                          let colorClasses = '';
                          if (index < 8) {
                            // Yellow/Orange abilities (first 8)
                            colorClasses = 'bg-gradient-to-b from-yellow-300 to-amber-400 border border-amber-500 text-gray-800';
                          } else if (index < 12) {
                            // Gray abilities (positions 9-12)
                            colorClasses = 'bg-gradient-to-b from-gray-200 to-gray-300 border border-gray-400 text-gray-700';
                          } else if (index < 18) {
                            // Blue abilities (positions 13-18)
                            colorClasses = 'bg-gradient-to-b from-cyan-300 to-cyan-400 border border-cyan-500 text-gray-800';
                          } else {
                            // Green abilities (positions 19-24)
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
                        {likedAgents.has(selectedAgent.id)
                          ? `${(selectedAgent.abilities.find(a => a.label === 'Like')?.value || 0) + 1}`
                          : `${selectedAgent.abilities.find(a => a.label === 'Like')?.value || 0}`}
                      </span>
                    </button>

                    <button
                      onClick={() => setPreviewOpen(true)}
                      className="px-6 py-2 bg-gradient-to-b from-purple-400 to-purple-500 text-white rounded-full font-bold text-sm shadow-md border border-purple-600 hover:shadow-lg hover:from-purple-500 hover:to-purple-600 transform hover:-translate-y-0.5 transition-all flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      フロー詳細
                    </button>

                    <button className="px-6 py-2 bg-gradient-to-b from-green-400 to-green-500 text-white rounded-full font-bold text-sm shadow-md border border-green-600 hover:shadow-lg hover:from-green-500 hover:to-green-600 transform hover:-translate-y-0.5 transition-all">
                      エージェント追加
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flow Preview Modal */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#1E1E1E',
            color: '#E0E0E0',
            borderRadius: 3,
            minHeight: '600px',
          },
        }}
      >
        <DialogContent sx={{ position: 'relative', p: 0 }}>
          {/* Close Button */}
          <IconButton
            onClick={() => setPreviewOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: '#E0E0E0',
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 10,
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.7)',
              },
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* Modal Header */}
          <div style={{
            background: 'linear-gradient(to right, #1976D2, #9C27B0)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{ fontSize: '24px' }}>🦉</span>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 'bold',
              color: 'white',
            }}>
              {selectedAgent?.name} - フロープレビュー
            </h2>
          </div>

          {/* React Flow Container */}
          <div style={{ height: '500px', background: '#0A0A0A', position: 'relative' }}>
            <ReactFlow
              nodes={getFlowData().nodes}
              edges={getFlowData().edges}
              fitView
              attributionPosition="bottom-left"
            />

            {/* Test Execution Button in Modal */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              display: 'flex',
              gap: '10px',
              zIndex: 10,
            }}>
              <button
                onClick={() => {
                  alert(`${selectedAgent?.name}のテスト実行を開始します...`);
                  // ここで実際のテスト実行処理を実装
                }}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(to bottom, #60A5FA, #3B82F6)',
                  color: 'white',
                  border: '1px solid #2563EB',
                  borderRadius: '999px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to bottom, #3B82F6, #2563EB)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to bottom, #60A5FA, #3B82F6)';
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                テスト実行
              </button>

              <button
                onClick={() => {
                  alert(`${selectedAgent?.name}の詳細設定を開きます...`);
                  // ここで詳細設定画面への遷移処理を実装
                }}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(to bottom, #94A3B8, #64748B)',
                  color: 'white',
                  border: '1px solid #475569',
                  borderRadius: '999px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to bottom, #64748B, #475569)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to bottom, #94A3B8, #64748B)';
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                詳細設定
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}