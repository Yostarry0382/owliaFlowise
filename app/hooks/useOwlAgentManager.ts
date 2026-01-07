'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Node, Edge, useNodesState, useEdgesState } from 'reactflow';
import { useNotification } from './useNotification';
import { serializeFlowForFlowise } from '../agent-builder/lib/flowise-converter';
import { CustomNodeData } from '../agent-builder/components/CustomNode';

// OwlAgent の簡易情報
export interface OwlAgentInfo {
  id: string;
  name: string;
  description: string;
}

// 保存時のデータ
export interface SaveAgentData {
  name: string;
  description: string;
  tags: string[];
  iconStyle: string;
  syncToFlowise: boolean;
}

/**
 * OwlAgentの読み込み・保存を管理するカスタムフック
 */
export function useOwlAgentManager<T extends object>(
  nodes: Node<T>[],
  edges: Edge[],
  setNodes: ReturnType<typeof useNodesState<T>>[1],
  setEdges: ReturnType<typeof useEdgesState>[1]
) {
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useNotification();

  // State
  const [savedOwlAgents, setSavedOwlAgents] = useState<OwlAgentInfo[]>([]);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [currentAgentName, setCurrentAgentName] = useState<string>('');
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // URLパラメータからエージェントIDを取得して読み込む
  const loadAgentFromUrl = useCallback(
    async (agentId: string) => {
      try {
        const response = await fetch(`/api/owlagents/${agentId}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const agent = await response.json();
        setCurrentAgentId(agent.id);
        setCurrentAgentName(agent.name);

        // フローデータを読み込み
        if (agent.flow) {
          const loadedNodes = agent.flow.nodes.map(
            (n: { id: string; position: { x: number; y: number }; data: T }) => ({
              id: n.id,
              type: 'custom',
              position: n.position,
              data: {
                ...n.data,
              },
            })
          );
          const loadedEdges = agent.flow.edges.map((e: Edge) => ({
            ...e,
            type: 'smoothstep',
            animated: true,
          }));
          setNodes(loadedNodes);
          setEdges(loadedEdges);
          showSuccess(`エージェント「${agent.name}」を読み込みました`);
        }
      } catch (error) {
        showError(error, 'エージェントの読み込みに失敗しました');
      }
    },
    [setNodes, setEdges, showSuccess, showError]
  );

  // URLパラメータの変更を監視
  useEffect(() => {
    const agentId = searchParams.get('id');
    if (agentId) {
      loadAgentFromUrl(agentId);
    }
  }, [searchParams, loadAgentFromUrl]);

  // 保存済みOwlAgentを読み込み
  const loadOwlAgents = useCallback(async () => {
    setIsLoadingAgents(true);
    try {
      const response = await fetch('/api/owlagents');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const agents = await response.json();
      setSavedOwlAgents(
        agents.map((a: { id: string; name: string; description: string }) => ({
          id: a.id,
          name: a.name,
          description: a.description,
        }))
      );
    } catch (error) {
      showError(error, 'OwlAgentの読み込みに失敗しました');
    } finally {
      setIsLoadingAgents(false);
    }
  }, [showError]);

  // 初回読み込み
  useEffect(() => {
    loadOwlAgents();
  }, [loadOwlAgents]);

  // エージェントを保存
  const saveAgent = useCallback(
    async (agentData: SaveAgentData): Promise<boolean> => {
      setIsSaving(true);
      try {
        let flowiseFlowData: string | undefined;
        if (agentData.syncToFlowise) {
          flowiseFlowData = serializeFlowForFlowise(nodes as Node<CustomNodeData>[], edges);
        }

        const response = await fetch('/api/owlagents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...agentData,
            flow: {
              nodes: nodes.map((n) => ({
                id: n.id,
                type: (n.data as { type?: string }).type,
                position: n.position,
                data: {
                  label: (n.data as { label?: string }).label,
                  type: (n.data as { type?: string }).type,
                  category: (n.data as { category?: string }).category,
                  config: (n.data as { config?: object }).config,
                  agentId: (n.data as { agentId?: string }).agentId,
                  agentName: (n.data as { agentName?: string }).agentName,
                },
              })),
              edges: edges.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle,
                targetHandle: e.targetHandle,
              })),
            },
            flowiseFlowData,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save agent');
        }

        const savedAgent = await response.json();

        let message = `エージェント「${savedAgent.name}」を保存しました`;
        if (savedAgent.flowiseChatflowId) {
          message += ` (Flowise Chatflow: ${savedAgent.flowiseChatflowId})`;
        }

        showSuccess(message);

        // リストに追加
        setSavedOwlAgents((prev) => [
          ...prev,
          { id: savedAgent.id, name: savedAgent.name, description: savedAgent.description },
        ]);

        return true;
      } catch (error) {
        showError(error, 'エージェントの保存に失敗しました');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [nodes, edges, showSuccess, showError]
  );

  // リフレッシュ
  const refreshAgents = useCallback(() => {
    loadOwlAgents();
  }, [loadOwlAgents]);

  return {
    // State
    savedOwlAgents,
    currentAgentId,
    currentAgentName,
    isLoadingAgents,
    isSaving,

    // Actions
    loadAgentFromUrl,
    saveAgent,
    refreshAgents,
  };
}

export default useOwlAgentManager;
