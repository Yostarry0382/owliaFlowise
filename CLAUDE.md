# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Status

**Current Status**: Active development - OwliaFabrica Visual AI Agent Builder (Flowise連携版)

This project is a visual AI agent builder that integrates with **Flowise** for AI workflow execution. It provides a drag-and-drop interface for creating complex AI workflows using React Flow and Next.js, with Flowise as the backend execution engine. Features include visual flow building, human-in-the-loop review capabilities, and a PowerPro-style agent marketplace.

### Recent Updates (2025-12-01)
- **OwlAgent統合**: シングルエージェントとマルチエージェントの概念を統合
  - すべてのエージェントは`OwlAgent`として統一的に扱う
  - フロー内で他のOwlAgentを参照できる`OwlAgentNode`タイプを追加
  - `/multi-agent`ページは廃止、`/agent-canvas`に統合
- **型定義の整理**: `multi-agent.ts`を廃止し、`flowise.ts`に統合

### Recent Updates (2025-11-28)
- **Flowise Integration**: Flowise APIとの完全統合を実装
- **FlowiseClient**: Prediction API、Chatflows管理API、ファイルアップロードAPIをサポート
- **Flowise Adapter**: React Flow形式とFlowise形式の相互変換レイヤーを追加
- **API Enhancements**: `/api/flowise/chatflows`および`/api/flowise/status`エンドポイントを追加
- **OwlAgent Sync**: OwlAgentをFlowiseのchatflowと同期するオプションを追加

### Recent Updates (2025-11-18)
- **Architecture Improvements**: 新しいディレクトリ構造（lib/hooks/services）を追加してコード組織化を改善
- **Ability Calculation System**: 統計データに基づく能力値自動算出システムを実装
- **Execution Engine**: フロー実行エンジンとOwlAgent実行器の基礎実装
- **Statistics Service**: エージェント実行統計の収集・永続化サービスを構築
- **Custom Hooks**: useOwlAgentsとuseFlowExecutionフックでコンポーネント開発を簡素化
- **API Enhancements**: 統計情報と評価のための新しいAPIエンドポイントを追加
- **Component Integration**: SavedOwlsListとAgentStoreCardを実データと統合

### Recent Updates (2025-11-17)
- **Agent Store**: PowerPro野球風のカードデザインでエージェントを表示するマーケットプレイス機能を追加
- **SavedOwlsList**: 保存済みOwlAgentの管理・編集機能を実装
- **Navigation Hub**: メインページを統合ナビゲーションハブとして再設計
- **Dynamic Routing**: agent-canvas/[id]による個別エージェント編集ルートの実装

## Technology Stack

- **Framework**: Next.js 15.0.3 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.3.0, Material-UI 7.3.5
- **Flow Builder**: React Flow 11.11.4 for visual workflow creation
- **UI Components**: Material-UI components with custom React nodes
- **AI Backend**: **Flowise** (required) - LLM orchestration and execution engine
- **AI Integration**: LangChain, OpenAI API support (via Flowise)
- **State Management**: Zustand 5.0.8
- **Database**: Prisma ORM, Supabase support
- **Package Manager**: npm
- **Development Tools**: ESLint, PostCSS, Autoprefixer

## Project Setup Instructions

The project is now fully configured with the following structure:

1. **Next.js Application**: Initialized with TypeScript support and App Router
2. **Visual Flow Builder**: React Flow based drag-and-drop interface for AI workflows
3. **Node System**: 10+ node types for different AI operations (LLM, Vector Store, Memory, OwlAgent Reference, etc.)
4. **Unified Agent System**: すべてのエージェントをOwlAgentとして統一的に管理（フロー内で他のOwlAgentを参照可能）
5. **API Routes**: Flow management, execution endpoints
6. **OwlAgent Storage**: JSON-based storage for individual AI agents in `data/owlagents/`
7. **Environment Configuration**: Uses `.env.local` for sensitive configuration
8. **Development Server**: Runs on `http://localhost:3000` or `3001` if port is in use

## Development Workflow

### Running the Application

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Flowise configuration

# Start development server
npm run dev

# Build for production
npm run build
npm run start
```

### Key Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality

## Architecture

### Project Structure

```
app/
├── api/
│   ├── flows/          # Flow management API routes
│   │   ├── route.ts    # CRUD operations for flows
│   │   └── execute/    # Flow execution engine (Flowise integrated)
│   │       └── route.ts
│   ├── flowise/        # Flowise integration APIs
│   │   ├── chatflows/  # Chatflow management
│   │   │   └── route.ts
│   │   └── status/     # Flowise connection status
│   │       └── route.ts
│   └── owlagents/      # OwlAgent management
│       ├── route.ts    # List and create OwlAgents (with Flowise sync)
│       ├── statistics/ # Statistics and abilities API
│       │   └── route.ts
│       └── [id]/       # Dynamic route for agent operations
│           ├── route.ts
│           └── rate/   # Agent rating endpoint
│               └── route.ts
├── components/          # Reusable UI components
│   ├── FlowBuilder.tsx  # Main visual flow builder
│   ├── NodeSidebar.tsx  # Drag-and-drop node palette
│   ├── NodeConfigPanel.tsx # Node configuration panel with human review settings
│   ├── HumanReviewSwitch.tsx # Switch component for human review toggle
│   ├── HumanReviewModal.tsx # Modal for reviewing/approving node outputs
│   ├── MultiAgentCanvas.tsx # Flowise連携用キャンバス
│   ├── SavedOwlsList.tsx # Component for displaying saved OwlAgents
│   ├── store/          # Agent store components
│   │   └── AgentStoreCard.tsx # PowerPro-style agent card display
│   └── nodes/          # Custom node components
│       └── CustomNode.tsx # Node component with review indicators
├── agent-canvas/       # Individual agent canvas
│   ├── page.tsx        # Single agent flow builder (list view)
│   └── [id]/           # Dynamic route for specific agent canvas
│       └── page.tsx    # Agent editor canvas
├── store/              # Agent store page
│   └── page.tsx        # Agent marketplace interface
├── lib/                # Business logic and utilities
│   ├── ability-calculator.ts # Agent ability calculation logic
│   ├── execution-engine.ts   # Flow execution engine
│   ├── agent-executor.ts     # OwlAgent execution manager
│   ├── flowise-client.ts     # Flowise API client (Prediction, Chatflows, Upload)
│   └── flowise-adapter.ts    # React Flow ↔ Flowise format converter
├── hooks/              # Custom React hooks
│   ├── useOwlAgents.ts       # Agent management hook
│   └── useFlowExecution.ts   # Flow execution hook
├── services/           # Service layer
│   └── statistics-service.ts # Statistics collection service
├── types/              # TypeScript type definitions
│   └── flowise.ts      # Flowise types, OwlAgent types, FlowDefinition types
├── layout.tsx          # Root layout with metadata
├── page.tsx            # Main application page with navigation hub
└── globals.css         # Global styles with Tailwind

public/                 # Static assets
data/
└── owlagents/          # OwlAgent JSON storage
.env.local             # Environment variables (not in git)
```

### Key Design Patterns

1. **Server Components by Default**: Leveraging Next.js App Router for optimal performance
2. **Client Components for Interactivity**: Flow builder uses 'use client' directive
3. **Visual Programming**: Drag-and-drop interface for AI workflow creation
4. **Node-based Architecture**: Modular components for different AI operations
5. **API Routes**: Server-side handling for flow management and execution
6. **Type Safety**: Full TypeScript implementation with strict mode
7. **Environment Variables**: Secure configuration management
8. **Topological Sorting**: Dependency resolution for flow execution order

## Git Information

- **Repository**: https://github.com/Yostarry0382/OwliaFabrica
- **Main branch**: `main`
- **Author**: star'in (Yostarry0382)

## Flowise Integration

### Overview

OwliaFabricaはFlowiseをバックエンドの実行エンジンとして使用します。Flowiseは強力なLLMオーケストレーションツールであり、複雑なAIワークフローを実行する機能を提供します。

### Flowise Setup

1. **Flowiseのインストール**
```bash
# npxで起動（推奨）
npx flowise start

# またはDockerで起動
docker run -d --name flowise -p 3000:3000 flowiseai/flowise
```

2. **環境変数の設定**
```env
# .env.local
FLOWISE_API_URL=http://localhost:3000
FLOWISE_API_KEY=your-api-key-here
FLOWISE_DEFAULT_CHATFLOW_ID=optional-default-chatflow-id
```

### Flowise API Integration

#### FlowiseClient (`lib/flowise-client.ts`)

FlowiseClientはFlowise APIとの通信を管理するクライアントクラスです。

**主要メソッド:**
- `predict(chatflowId, question, options)` - Chatflowにメッセージを送信
- `predictStream(chatflowId, question, options, onMessage)` - ストリーミング応答
- `getChatflows()` - すべてのChatflowを取得
- `getChatflow(id)` - 特定のChatflowを取得
- `createChatflow(data)` - 新しいChatflowを作成
- `updateChatflow(id, data)` - Chatflowを更新
- `deleteChatflow(id)` - Chatflowを削除
- `uploadFiles(files, chatflowId)` - ファイルをアップロード
- `healthCheck()` - 接続状態を確認

#### Flowise Adapter (`lib/flowise-adapter.ts`)

React Flow形式とFlowise形式の間でフローデータを変換します。

**主要関数:**
- `convertFlowToFlowise(flow)` - FlowDefinitionをFlowiseFlowDataに変換
- `convertFlowFromFlowise(flowData)` - FlowiseFlowDataをFlowDefinitionに変換
- `serializeFlowForFlowise(flow)` - フローをJSON文字列にシリアライズ
- `parseFlowFromFlowise(flowDataString)` - JSON文字列からフローを解析
- `validateFlowForFlowise(flow)` - フローの検証

### Flowise API Endpoints

#### 接続ステータス
- `GET /api/flowise/status` - Flowiseサーバーの接続状態を確認

#### Chatflow管理
- `GET /api/flowise/chatflows` - すべてのChatflowを取得
- `GET /api/flowise/chatflows?id={id}` - 特定のChatflowを取得
- `POST /api/flowise/chatflows` - 新しいChatflowを作成
- `PUT /api/flowise/chatflows` - Chatflowを更新
- `DELETE /api/flowise/chatflows?id={id}` - Chatflowを削除

#### フロー実行
- `POST /api/flows/execute` - フローを実行（Flowise経由）
  - `chatflowId`: 直接Flowiseのchatflowを実行
  - `nodes, edges`: OwliaFabricaフローを実行

### OwlAgent-Flowise Sync

OwlAgentを作成する際に`syncToFlowise: true`オプションを指定すると、FlowiseにChatflowとして自動登録されます。

```typescript
// POST /api/owlagents
{
  "name": "My Agent",
  "description": "Description",
  "flow": { nodes: [], edges: [] },
  "syncToFlowise": true  // FlowiseにChatflowを作成
}
```

## OwliaFabrica Features

### Available Node Types

1. **LLM Node** - Language model processing (GPT, Claude, Gemini)
2. **Chain Node** - Connect multiple nodes together
3. **Prompt Template** - Define and manage prompts
4. **Memory Node** - Conversation history management
5. **Vector Store** - Connect to vector databases (Pinecone, Chroma, Qdrant)
6. **Tool Node** - API integrations and external tools
7. **Chat Interface** - User interaction points
8. **Document Loader** - Process various document types
9. **Transform Node** - Data manipulation and processing
10. **Custom Code** - Execute custom JavaScript/Python code

### Human Review Feature (新機能)

各ノードに人間による確認・承認機能を実装。AIの処理結果を人間が確認してから次の工程に進むことができます。

#### 機能概要
- **ノードごとの確認設定**: 各ノードで個別に人間確認のON/OFFが可能
- **視覚的インジケーター**: 確認が有効なノードには黄色の人型アイコンを表示
- **柔軟な承認フロー**: 承認/拒否/編集の3つのアクション
- **タイムアウト機能**: 指定時間後の自動承認
- **編集機能**: 出力結果を編集してから承認可能

#### 設定項目
1. **確認の有効/無効**: スイッチでON/OFF切り替え
2. **出力編集の許可**: 結果を編集可能にするかの設定
3. **確認メッセージ**: カスタムメッセージの設定
4. **自動承認タイムアウト**: 秒単位でのタイムアウト設定（0で無効）

#### 使用方法
1. ノードをクリックして設定パネルを開く
2. 「人間による確認設定」セクションを展開
3. スイッチをONにして機能を有効化
4. 必要に応じてオプションを設定
5. フロー実行時、該当ノードで処理が一時停止
6. レビューモーダルで承認/拒否/編集を実行

#### 関連コンポーネント
- `HumanReviewSwitch.tsx`: 確認機能のON/OFFスイッチ
- `HumanReviewModal.tsx`: レビュー用モーダルダイアログ
- `NodeConfigPanel.tsx`: ノード設定パネル（確認設定含む）
- `CustomNode.tsx`: ノードコンポーネント（視覚的インジケーター付き）

#### APIエンドポイント
- レビュー待機中の確認: `POST /api/flows/execute` with `action: 'check-pending'`
- レビュー決定の送信: `POST /api/flows/execute` with `action: 'review'`

### OwlAgent Store (新機能)

エージェントマーケットプレイスで、パワプロ風のカード表示でOwlAgentを管理・選択できるシステム。

#### Store機能概要
- **PowerPro風カードデザイン**: パワプロ野球ゲーム風の能力値表示とランクシステム
- **能力値システム**: S〜Fランクによる5つの主要能力評価
- **タグシステム**: エージェントの特徴を視覚的にグリッド表示
- **プレビュー機能**: React Flowを使用したフロー構成の可視化
- **リアルタイム統計**: 実行回数、いいね数などの使用統計

#### 能力値ランクシステム
```typescript
type AbilityRank = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

// 能力値の定義
- Popularity (人気度): エージェントの使用頻度
- Like (好感度): ユーザー評価
- Reliability (安定性): 実行の安定性
- Speed (応答速度): 処理速度
- CostEfficiency (コスパ): コスト効率
```

#### 関連コンポーネント
- `app/store/page.tsx`: Storeページのエントリーポイント
- `app/components/store/AgentStoreCard.tsx`: PowerPro風カード表示コンポーネント
- 能力値の視覚化（グラデーション背景、ランク別カラーコード）
- 24スロットのタググリッド（色分けされた4つのカテゴリ）

### SavedOwlsList (新機能)

保存済みのOwlAgentを管理・編集するための一覧表示コンポーネント。

#### SavedOwlsList機能概要
- **OwlAgent一覧表示**: 保存済みエージェントのリスト表示
- **詳細カード表示**: PowerPro風のカードデザインで詳細情報表示
- **フロー編集機能**: 各エージェントのフロー編集画面への遷移
- **削除機能**: 不要なエージェントの削除
- **プレビュー機能**: フローの視覚的確認

#### 管理機能
1. **CRUD操作**
   - Create: 新規エージェント作成（agent-canvas経由）
   - Read: 保存済みエージェントの表示
   - Update: フロー編集画面への遷移
   - Delete: エージェントの削除（確認ダイアログ付き）

2. **API連携**
   - `GET /api/owlagents`: エージェント一覧取得
   - `DELETE /api/owlagents?id={id}`: エージェント削除
   - 自動的な能力値生成とランク付け

#### 関連コンポーネント
- `app/components/SavedOwlsList.tsx`: 保存済みOwlAgent管理コンポーネント
- `app/agent-canvas/page.tsx`: エージェント一覧ページ
- `app/agent-canvas/[id]/page.tsx`: 個別エージェント編集ページ

### 統合エージェントシステム（OwlAgent）

**概念の統合**: 単一エージェントも複数エージェントの組み合わせも、すべて**OwlAgent**として統一的に扱います。

#### 設計思想
- エージェントは処理単位として1つ
- 複数のエージェントを組み合わせる場合も、それは新しい1つのOwlAgentとして保存
- フロー内で他のOwlAgentを参照する`OwlAgentNode`タイプを使用

#### OwlAgentノード
フロー内で他のOwlAgentを参照するためのノードタイプ：

```typescript
// app/types/flowise.ts
interface OwlAgentNode {
  id: string;
  type: 'owlAgent';
  position: { x: number; y: number };
  data: {
    label: string;
    agentId: string;  // 参照するOwlAgentのID
    agentName?: string;
    agentDescription?: string;
    icon?: string;
    inputMapping?: Record<string, string>;
    outputMapping?: Record<string, string>;
  };
}
```

#### 使用方法
1. `/agent-canvas`でエージェントを編集
2. サイドバーから既存のOwlAgentをドラッグ&ドロップで配置
3. 他のノードと同様にエッジで接続
4. 保存すると、参照を含む新しいOwlAgentとして保存される

#### Flowise連携
`MultiAgentCanvas.tsx`はFlowiseのagentflowsとchatflowsを管理するためのコンポーネントとして機能します。

### Ability Calculation System (2025-11-18 新実装)

エージェントの能力値を統計データから自動算出するシステム。

#### 能力値算出ロジック (`lib/ability-calculator.ts`)

5つの主要能力を自動計算：

1. **Popularity（人気度）**
   - 実行回数（70%）と最近の使用頻度（30%）から算出
   - 7日以内: 100%, 14日以内: 80%, 30日以内: 60%

2. **Like（好感度）**
   - ユーザー評価（1-5）の平均値を100点満点に変換

3. **Reliability（安定性）**
   - 成功率（80%）とエラー率（20%）から算出

4. **Speed（応答速度）**
   - 平均実行時間から算出
   - 1秒以下: 100点, 3秒: 80点, 5秒: 60点, 10秒: 30点

5. **CostEfficiency（コスパ）**
   - 平均コストと成功率から効率を計算

#### ランク判定システム
```typescript
S: 90-100点（最高評価）
A: 80-89点（優秀）
B: 70-79点（良好）
C: 60-69点（標準）
D: 50-59点（改善余地あり）
E: 40-49点（要改善）
F: 0-39点（問題あり）
```

### Execution Engine (2025-11-18 新実装)

フローとエージェントの実行を管理するエンジン。

#### フロー実行エンジン (`lib/execution-engine.ts`)

**実装済みノード実行器**:
- `LLMNodeExecutor`: OpenAI/Claude API統合（モックフォールバック付き）
- `PromptTemplateNodeExecutor`: 変数置換機能
- `MemoryNodeExecutor`: 会話履歴管理

**主要機能**:
- トポロジカルソートによる実行順序決定
- ノードごとのエラーハンドリング
- 人間確認機能のサポート
- 実行ログとコンテキスト管理

#### エージェント実行器 (`lib/agent-executor.ts`)

**機能**:
- 単一OwlAgentの実行
- マルチエージェント順次実行
- エージェント間データパイプライン
- 実行メトリクスの自動収集
- 循環依存の検出

### Statistics Service (2025-11-18 新実装)

統計データの収集と永続化を管理するサービス。

#### 統計管理サービス (`services/statistics-service.ts`)

**主要機能**:
- 実行統計の記録（成功率、実行時間、コスト）
- ユーザー評価の管理
- JSONファイルへの永続化（`data/statistics.json`）
- CSV形式でのエクスポート
- 人気エージェントのランキング
- パフォーマンス低下エージェントの特定

**統計データ構造**:
```typescript
interface AgentStatistics {
  executionCount: number;      // 実行回数
  successRate: number;         // 成功率
  averageExecutionTime: number;// 平均実行時間
  userRatings: number[];       // ユーザー評価
  errorCount: number;          // エラー数
  lastExecuted: Date | null;   // 最終実行日時
  totalCost: number;           // 累計コスト
}
```

### Custom Hooks (2025-11-18 新実装)

コンポーネント開発を簡素化するカスタムフック。

#### useOwlAgents Hook (`hooks/useOwlAgents.ts`)

**提供機能**:
- エージェント一覧の取得と管理
- CRUD操作（作成、読取、更新、削除）
- 能力値の取得とキャッシュ
- エージェント評価の送信
- エラーハンドリング

#### useFlowExecution Hook (`hooks/useFlowExecution.ts`)

**提供機能**:
- フロー実行の管理
- 実行状態のリアルタイム追跡
- 実行ログとエラーの管理
- 人間確認リクエストの処理
- ストリーミングレスポンス対応

### API Endpoints

#### Flow Management
- `GET /api/flows` - List all flows or get specific flow
- `POST /api/flows` - Create new flow
- `PUT /api/flows` - Update existing flow
- `DELETE /api/flows` - Delete flow

#### Flow Execution
- `POST /api/flows/execute` - Execute a flow with input data
  - Request: `{ flowId: string, nodes: Node[], edges: Edge[], input: any }`
  - Response: `{ success: boolean, output: any, executionTime: number, logs: string[], pendingReview?: object }`

#### Human Review Management
- `POST /api/flows/execute` with `action: 'review'` - Submit review decision
  - Request: `{ action: 'review', reviewId: string, reviewData: { status: string, editedOutput?: any, comments?: string } }`
  - Response: `{ success: boolean, reviewId: string, status: string, message: string }`

- `POST /api/flows/execute` with `action: 'check-pending'` - Check pending reviews
  - Request: `{ action: 'check-pending' }`
  - Response: `{ success: boolean, pendingReviews: ReviewStatus[] }`

#### OwlAgent Management
- `GET /api/owlagents` - List all saved OwlAgents
  - Response: Array of OwlAgent objects with metadata

- `GET /api/owlagents/[id]` - Get specific OwlAgent by ID
  - Response: Single OwlAgent object with full flow data

- `POST /api/owlagents` - Create new OwlAgent
  - Request: `{ name: string, description: string, flow: { nodes: Node[], edges: Edge[] }, tags?: string[], icon?: string }`
  - Response: Created OwlAgent with generated ID

- `PUT /api/owlagents/[id]` - Update existing OwlAgent
  - Request: Updated OwlAgent data
  - Response: Updated OwlAgent object

- `DELETE /api/owlagents?id={id}` - Delete OwlAgent
  - Query params: `?id={agentId}`
  - Response: `{ message: string }`

#### Statistics and Abilities (2025-11-18 新規追加)

- `POST /api/owlagents/statistics` - Calculate abilities from statistics
  - Request: `{ agentId: string, stats?: AgentStatistics }`
  - Response: `CalculatedAbilities` object with all ability scores and ranks

- `GET /api/owlagents/statistics` - Get agent statistics
  - Query params: `?agentId={agentId}` for specific agent, or no params for all
  - Response: Statistics and calculated abilities for one or all agents

- `PUT /api/owlagents/statistics` - Record execution
  - Request: `{ agentId: string, success: boolean, executionTime: number, cost?: number }`
  - Response: Updated statistics and recalculated abilities

- `POST /api/owlagents/[id]/rate` - Rate an agent
  - Request: `{ rating: number }` (1-5)
  - Response: Updated statistics with new rating included

### Required Environment Variables

```env
# Azure OpenAI Configuration（推奨）
# Azure OpenAIを使用する場合、以下の4つを設定してください
# ノード内での入力は不要です（環境変数から自動取得されます）
AZURE_OPENAI_API_KEY=<your-azure-openai-key>
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# LLM Configuration（通常のOpenAI APIを使用する場合）
OPENAI_API_KEY=<your-openai-key>
ANTHROPIC_API_KEY=<your-anthropic-key>
GOOGLE_API_KEY=<your-google-key>

# Vector Database Configuration
PINECONE_API_KEY=<your-pinecone-key>
PINECONE_ENVIRONMENT=<your-pinecone-env>

# Supabase Configuration (optional)
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-key>
```

**Note**: Azure OpenAI を使用する場合、`Azure ChatOpenAI` ノードや `Azure OpenAI Embeddings` ノードでは API キーとエンドポイントの入力は不要です。環境変数から自動的に取得されます。

## Code Style Guidelines

### TypeScript Conventions

- Use strict mode for type safety
- Define interfaces for all data structures
- Prefer `const` over `let` when possible
- Use async/await for asynchronous operations

### Component Guidelines

- Keep components focused and single-purpose
- Use TypeScript interfaces for props
- Implement proper error boundaries
- Maintain accessibility standards (ARIA labels, keyboard navigation)

### State Management

- Use React hooks for local state
- Session IDs managed with UUID v4
- Messages stored in component state with proper typing

## Testing Considerations

### Areas for Testing

1. **API Integration**: Mock Flowise API responses
2. **Component Testing**: Test user interactions and state changes
3. **Error Handling**: Verify graceful degradation
4. **Accessibility**: Ensure WCAG compliance

## Performance Optimizations

### Current Optimizations

- Server Components for static content
- Client Components only where needed
- Tailwind CSS for minimal CSS bundle
- Proper TypeScript configuration for tree-shaking

### Future Optimizations

- Implement message pagination for long conversations
- Add response caching
- Optimize bundle size with dynamic imports
- Implement virtual scrolling for message list

## Security Considerations

- Environment variables for sensitive data
- API routes handle authentication
- Input sanitization in chat messages
- CORS configuration for API endpoints

## Deployment Notes

### Vercel Deployment

The application is optimized for Vercel deployment:
- Automatic CI/CD with GitHub integration
- Environment variables configuration in Vercel dashboard
- Edge Functions for API routes

### Docker Deployment (Future)

Consider containerization for:
- Self-hosted deployments
- Consistent development environments
- Kubernetes orchestration

## Known Issues and TODOs

### Current Limitations

- Flow persistence is in-memory only (needs database integration)
- OwlAgent data stored in JSON files (needs database migration)
- ~~Limited LLM node execution (mock implementation)~~ → 基礎実装完了、API統合待ち
- No real-time collaboration features
- Basic error handling in flow execution
- Authentication not yet implemented
- ~~Agent Store uses mock data~~ → 実データとの統合完了
- ~~PowerPro card abilities are randomly generated~~ → 統計ベースの算出システム実装済み
- ~~Multi-agent vs Single-agent separation~~ → OwlAgentに統合済み（2025-12-01）

### Planned Features

1. **Enhanced Flow Builder**
   - Undo/redo functionality
   - Copy/paste nodes
   - Node templates and presets
   - Flow version control
   - Subflow support

2. **Advanced Node Types**
   - Conditional branching nodes
   - Loop/iteration nodes
   - Parallel execution nodes
   - Webhook nodes
   - Scheduled trigger nodes

3. **Execution Engine**
   - Real LLM API integration
   - Streaming execution results
   - Parallel node execution
   - Error recovery and retry logic
   - Execution history and logs

4. **Collaboration**
   - Multi-user editing
   - Comments on nodes
   - Flow sharing and permissions
   - Team workspaces

5. **Performance**
   - Flow caching
   - Lazy loading for large flows
   - WebSocket for real-time updates
   - Background job processing

6. **OwlAgent Enhancements**
   - Parallel OwlAgentNode execution (when no dependencies)
   - OwlAgentNode streaming communication
   - Conditional branching support
   - Looping and iteration support
   - Agent health monitoring
   - Agent result caching
   - Debugging tools for nested agents

7. **Agent Store Enhancements**
   - Real marketplace backend integration
   - User rating and review system
   - Agent performance metrics tracking
   - Download and usage statistics
   - Agent versioning and updates
   - Community contributed agents
   - Agent certification/verification
   - Premium agent monetization
   - Agent recommendation system
   - Advanced search and filtering

## Contributing Guidelines

When adding new features:

1. Update TypeScript types in `app/types/`
2. Follow existing component patterns
3. Add environment variables to `.env.local.example`
4. Update this documentation
5. Ensure ESLint passes (`npm run lint`)
6. Test in both development and production builds

## Troubleshooting Guide

### Common Issues

1. **"Module not found: Can't resolve 'reactflow'"**
   - Install React Flow: `npm install reactflow`
   - Clear `.next` cache: `rm -rf .next`

2. **"TypeError: Cannot read properties"**
   - Clear `.next` cache: `rm -rf .next`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

3. **Build errors**
   - Check TypeScript errors: `npx tsc --noEmit`
   - Verify all imports are correct
   - Ensure environment variables are set

4. **Flow execution fails**
   - Check API keys in `.env.local`
   - Verify node connections are valid
   - Review execution logs in API response

5. **Drag and drop not working**
   - Ensure browser supports HTML5 drag events
   - Check console for JavaScript errors
   - Verify React Flow is properly initialized

6. **OwlAgentノードの実行が失敗する**
   - 参照先のOwlAgentがdata/owlagentsディレクトリに存在するか確認
   - 循環参照がないか確認（A→B→A）
   - 実行ログでエラー詳細を確認

7. **OwlAgent not appearing in sidebar**
   - Check data/owlagents directory exists
   - Verify JSON file format is correct
   - Ensure agent has required fields (id, name, description)
   - Restart development server to reload agent list