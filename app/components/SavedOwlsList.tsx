'use client';

import React, { useState, useEffect } from 'react';
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

// Generate random abilities for saved owls
const generateAbilities = (): AgentAbility[] => {
  const ranks: AbilityRank[] = ['S', 'A', 'B', 'C', 'D'];
  return [
    { label: 'Accuracy', displayName: '精度', value: 85 + Math.floor(Math.random() * 15), rank: ranks[Math.floor(Math.random() * 3)] },
    { label: 'Speed', displayName: '処理速度', value: 70 + Math.floor(Math.random() * 25), rank: ranks[Math.floor(Math.random() * 4)] },
    { label: 'Reliability', displayName: '信頼性', value: 80 + Math.floor(Math.random() * 18), rank: ranks[Math.floor(Math.random() * 3)] },
    { label: 'Efficiency', displayName: '効率性', value: 75 + Math.floor(Math.random() * 20), rank: ranks[Math.floor(Math.random() * 4)] },
    { label: 'Innovation', displayName: '革新性', value: 65 + Math.floor(Math.random() * 30), rank: ranks[Math.floor(Math.random() * 5)] },
  ];
};

export default function SavedOwlsList() {
  const router = useRouter();
  const [selectedOwl, setSelectedOwl] = useState<SavedOwl | null>(null);
  const [savedOwls, setSavedOwls] = useState<SavedOwl[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Fetch saved owls from API
  const fetchSavedOwls = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/owlagents');
      if (response.ok) {
        const data = await response.json();
        // Transform API data to our format
        const transformedOwls: SavedOwl[] = data.map((agent: any) => ({
          ...agent,
          avatarColor: `bg-${['blue', 'green', 'purple', 'orange', 'red'][Math.floor(Math.random() * 5)]}-500`,
          avatarEmoji: agent.icon || '🦉',
          category: agent.tags?.[0] || 'カスタム',
          totalRuns: Math.floor(Math.random() * 10000),
          likes: Math.floor(Math.random() * 1000),
          abilities: generateAbilities(),
          tags: agent.tags || [],
        }));
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
    if (!confirm('このOwlAgentを削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/owlagents?id=${owlId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchSavedOwls();
        if (selectedOwl?.id === owlId) {
          setSelectedOwl(savedOwls[0] || null);
        }
      }
    } catch (error) {
      console.error('Failed to delete owl:', error);
    }
  };

  const handleEdit = (owlId: string) => {
    router.push(`/agent-canvas/${owlId}`);
  };

  // Get flow data for preview
  const getFlowData = () => {
    if (!selectedOwl?.flow) {
      return { nodes: [], edges: [] };
    }
    return selectedOwl.flow;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 p-4 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (!selectedOwl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 p-4 flex items-center justify-center">
        <div className="text-white text-2xl">保存されたOwlAgentがありません</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/95 backdrop-blur rounded-lg shadow-xl flex" style={{ height: '80vh' }}>
          {/* Left Panel - Saved Owls List */}
          <div className="w-64 bg-gradient-to-b from-gray-100 to-gray-200 border-r-4 border-gray-300 overflow-y-auto rounded-l-lg">
            <div className="sticky top-0 bg-gray-800 text-white p-2 text-center font-bold text-sm">
              保存済みOwlAgents
            </div>
            {savedOwls.map((owl) => (
              <div
                key={owl.id}
                onClick={() => setSelectedOwl(owl)}
                className={`
                  p-3 border-b-2 border-gray-300 cursor-pointer transition-all
                  ${selectedOwl.id === owl.id
                    ? 'bg-gradient-to-r from-yellow-300 to-yellow-200 shadow-inner'
                    : 'hover:bg-white/70'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 ${owl.avatarColor} rounded-full flex items-center justify-center text-white shadow-md`}>
                    <span className="text-sm">{owl.avatarEmoji}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-gray-800">{owl.name}</div>
                    <div className="text-xs text-gray-600">{owl.category}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Panel - PowerPro Style Card */}
          <div className="flex-1 p-4 overflow-hidden bg-gradient-to-br from-purple-100 via-pink-50 to-indigo-100 rounded-r-lg">
            <div className="h-full flex items-center justify-center">
              {/* Card Container */}
              <div className="bg-gradient-to-br from-white via-purple-50/30 to-pink-50 rounded-3xl shadow-2xl border-3 border-purple-300 overflow-hidden w-full max-w-5xl">

                {/* Top Header Section */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-200">
                  <div className="flex items-center gap-3">
                    <span className="bg-gradient-to-b from-purple-400 to-purple-500 text-white px-4 py-2 rounded-full font-bold text-lg shadow-md">
                      {selectedOwl.name}
                    </span>
                    <span className="text-gray-600 text-xl">★</span>
                    <span className="text-purple-600 font-bold text-2xl">{Math.floor(selectedOwl.abilities[0].value / 2)}</span>
                  </div>

                  {/* Avatar Circle */}
                  <div className={`w-20 h-20 ${selectedOwl.avatarColor} rounded-full flex items-center justify-center text-white shadow-xl border-4 border-white ring-2 ring-purple-300`}>
                    <span className="text-4xl">{selectedOwl.avatarEmoji}</span>
                  </div>

                  <div className="text-right">
                    <span className="bg-gradient-to-r from-purple-400 to-purple-500 text-white px-4 py-2 rounded-full text-base font-bold shadow">
                      v{selectedOwl.version}
                    </span>
                    <div className="text-sm text-gray-600 mt-2">{selectedOwl.totalRuns.toLocaleString()}回実行</div>
                  </div>
                </div>

                {/* Sub Header */}
                <div className="flex justify-center gap-6 px-6 py-2 bg-white/50 border-b-2 border-purple-200">
                  <span className="text-sm text-gray-600">作成者 <span className="font-bold text-purple-600">{selectedOwl.author || 'Unknown'}</span></span>
                  <span className="text-sm text-gray-600 font-bold text-orange-500">★{selectedOwl.likes}</span>
                  <span className="text-sm text-gray-600">ノード数 <span className="font-bold">{selectedOwl.flow.nodes.length}</span></span>
                  <span className="text-sm text-gray-600">エッジ数 <span className="font-bold">{selectedOwl.flow.edges.length}</span></span>
                </div>

                {/* Main Content Area */}
                <div className="flex p-4 gap-4">

                  {/* Left Side - Abilities */}
                  <div className="w-72">
                    <div className="bg-white/80 rounded-xl shadow-md overflow-hidden border border-purple-200">
                      <table className="w-full">
                        <tbody>
                          {selectedOwl.abilities.map((ability, index) => (
                            <tr key={ability.label} className={index % 2 === 0 ? 'bg-purple-50/50' : 'bg-white'}>
                              <td className="px-4 py-2.5 text-base font-bold text-gray-700 border-r border-purple-100">
                                {ability.displayName}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`text-2xl font-black ${getRankStyle(ability.rank)}`}>
                                  {ability.rank}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right text-lg font-bold text-purple-600">
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
                    <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-4 shadow-md border border-purple-200">
                      <div className="grid grid-cols-4 gap-1.5">
                        {/* Create 24 slots (4x6 grid) */}
                        {Array.from({ length: 24 }).map((_, index) => {
                          const tag = selectedOwl.tags[index];

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

                          // Determine color based on index
                          let colorClasses = '';
                          if (index < 8) {
                            colorClasses = 'bg-gradient-to-b from-purple-300 to-purple-400 border border-purple-500 text-white';
                          } else if (index < 12) {
                            colorClasses = 'bg-gradient-to-b from-pink-300 to-pink-400 border border-pink-500 text-white';
                          } else if (index < 18) {
                            colorClasses = 'bg-gradient-to-b from-indigo-300 to-indigo-400 border border-indigo-500 text-white';
                          } else {
                            colorClasses = 'bg-gradient-to-b from-blue-300 to-blue-400 border border-blue-500 text-white';
                          }

                          return (
                            <div
                              key={tag}
                              className={`px-2 py-1.5 text-center rounded-lg text-xs font-bold shadow-sm
                                ${colorClasses}
                                cursor-pointer hover:shadow-md transform hover:-translate-y-0.5 transition-all`}
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
                <div className="mx-4 mb-4 p-3 bg-gradient-to-b from-white/80 to-gray-100/80 rounded-xl border border-purple-200">
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => setPreviewOpen(true)}
                      className="px-6 py-2 bg-gradient-to-b from-purple-400 to-purple-500 text-white rounded-full font-bold text-sm shadow-md border border-purple-600 hover:shadow-lg hover:from-purple-500 hover:to-purple-600 transform hover:-translate-y-0.5 transition-all flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      プレビュー
                    </button>

                    <button
                      onClick={() => handleEdit(selectedOwl.id)}
                      className="px-6 py-2 bg-gradient-to-b from-blue-400 to-blue-500 text-white rounded-full font-bold text-sm shadow-md border border-blue-600 hover:shadow-lg hover:from-blue-500 hover:to-blue-600 transform hover:-translate-y-0.5 transition-all flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      フロー編集
                    </button>

                    <button
                      onClick={() => handleDelete(selectedOwl.id)}
                      className="px-6 py-2 bg-gradient-to-b from-red-400 to-red-500 text-white rounded-full font-bold text-sm shadow-md border border-red-600 hover:shadow-lg hover:from-red-500 hover:to-red-600 transform hover:-translate-y-0.5 transition-all flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      削除
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

          <div style={{
            background: 'linear-gradient(to right, #7C3AED, #EC4899)',
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
              {selectedOwl?.name} - フロープレビュー
            </h2>
          </div>

          <div style={{ height: '500px', background: '#0A0A0A' }}>
            <ReactFlow
              nodes={getFlowData().nodes}
              edges={getFlowData().edges}
              fitView
              attributionPosition="bottom-left"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}