import { create } from 'zustand';
import { Node, Edge } from 'reactflow';
import { produce } from 'immer';

interface FlowSnapshot {
  id: string;
  timestamp: Date;
  nodes: Node[];
  edges: Edge[];
  description: string;
}

interface FlowHistoryState {
  history: FlowSnapshot[];
  currentIndex: number;
  maxHistory: number;

  // Actions
  pushSnapshot: (nodes: Node[], edges: Edge[], description?: string) => void;
  undo: () => FlowSnapshot | null;
  redo: () => FlowSnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getSnapshot: (index: number) => FlowSnapshot | null;
  clearHistory: () => void;
  restoreSnapshot: (id: string) => FlowSnapshot | null;
}

export const useFlowHistoryStore = create<FlowHistoryState>((set, get) => ({
  history: [],
  currentIndex: -1,
  maxHistory: 50,

  pushSnapshot: (nodes, edges, description = 'Change') => {
    set(
      produce((state: FlowHistoryState) => {
        // 現在位置より後の履歴を削除
        if (state.currentIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.currentIndex + 1);
        }

        // 新しいスナップショットを追加
        const snapshot: FlowSnapshot = {
          id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          description,
        };

        state.history.push(snapshot);
        state.currentIndex = state.history.length - 1;

        // 最大履歴数を超えた場合、古い履歴を削除
        if (state.history.length > state.maxHistory) {
          state.history.shift();
          state.currentIndex--;
        }
      })
    );
  },

  undo: () => {
    const state = get();
    if (state.currentIndex > 0) {
      const newIndex = state.currentIndex - 1;
      set({ currentIndex: newIndex });
      return state.history[newIndex];
    }
    return null;
  },

  redo: () => {
    const state = get();
    if (state.currentIndex < state.history.length - 1) {
      const newIndex = state.currentIndex + 1;
      set({ currentIndex: newIndex });
      return state.history[newIndex];
    }
    return null;
  },

  canUndo: () => {
    const state = get();
    return state.currentIndex > 0;
  },

  canRedo: () => {
    const state = get();
    return state.currentIndex < state.history.length - 1;
  },

  getSnapshot: (index) => {
    const state = get();
    return state.history[index] || null;
  },

  clearHistory: () => {
    set({ history: [], currentIndex: -1 });
  },

  restoreSnapshot: (id) => {
    const state = get();
    const index = state.history.findIndex((s) => s.id === id);
    if (index !== -1) {
      set({ currentIndex: index });
      return state.history[index];
    }
    return null;
  },
}));
