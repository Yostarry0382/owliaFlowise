# Flowise flowData サンプル集

このディレクトリにはFlowise形式のflowDataサンプルJSONファイルが含まれています。

## サンプル一覧

### 1. llm-chain.json
**基本的なLLM Chain**
- プロンプトテンプレートとLLMモデルを使用したシンプルなチェーン
- ステートレス（メモリなし）
- 用途: シンプルな質問応答、テキスト生成

### 2. simple-chatbot.json
**シンプルなチャットボット**
- Conversation Chainとメモリを使用
- ステートフル（会話履歴を保持）
- 用途: 基本的な対話型アシスタント

### 3. conversational-agent.json
**会話型エージェント**
- ツール（Calculator、SerpAPI）を使用できるエージェント
- メモリ付きで継続的な会話が可能
- 用途: 計算やWeb検索を含む対話

### 4. rag-qa-chain.json
**RAG（検索拡張生成）QAチェーン**
- PDFドキュメントをベクトルストアに保存
- ドキュメントに基づいた質問応答
- 用途: ドキュメントQA、ナレッジベース検索

## Flowise flowData 形式

```json
{
  "description": "フローの説明",
  "usecases": ["用途1", "用途2"],
  "framework": ["Langchain"],
  "nodes": [
    {
      "id": "nodeId",
      "type": "customNode",
      "position": { "x": 100, "y": 100 },
      "data": {
        "id": "nodeId",
        "label": "表示名",
        "name": "内部名",
        "type": "ノードタイプ",
        "baseClasses": ["基底クラス"],
        "category": "カテゴリ",
        "inputParams": [...],
        "inputAnchors": [...],
        "inputs": {...},
        "outputAnchors": [...],
        "outputs": {...}
      }
    }
  ],
  "edges": [
    {
      "id": "edgeId",
      "source": "sourceNodeId",
      "sourceHandle": "出力ハンドルID",
      "target": "targetNodeId",
      "targetHandle": "入力ハンドルID",
      "type": "buttonedge"
    }
  ],
  "viewport": {
    "x": 0,
    "y": 0,
    "zoom": 1
  }
}
```

## 使用方法

### Flowiseにインポート
1. Flowiseのキャンバスを開く
2. 設定アイコンをクリック
3. 「Load Chatflow」を選択
4. JSONファイルをアップロード

### OwliaFabricaで使用
```typescript
import flowData from './sample/llm-chain.json';
import { fromFlowiseFlowData } from '@/app/lib/flowise-adapter';

const { nodes, edges, viewport } = fromFlowiseFlowData(flowData);
```

## 参考リンク

- [Flowise公式ドキュメント - Chatflows API](https://docs.flowiseai.com/api-reference/chatflows)
- [FlowiseAI/Flowise GitHub](https://github.com/FlowiseAI/Flowise)
- [Flowise マーケットプレイステンプレート](https://github.com/FlowiseAI/Flowise/tree/main/packages/server/marketplaces/chatflows)
