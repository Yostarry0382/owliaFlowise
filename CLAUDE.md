# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Status

**Current Status**: Active development - OwliaFabrica Visual AI Agent Builder

This project is a visual AI agent builder inspired by Flowise, providing a drag-and-drop interface for creating complex AI workflows and multi-agent systems using React Flow and Next.js. Features include single-agent flow building, multi-agent orchestration, human-in-the-loop review capabilities, and a PowerPro-style agent marketplace.

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
- **AI Integration**: LangChain, OpenAI API support
- **State Management**: Zustand 5.0.8
- **Database**: Prisma ORM, Supabase support
- **Package Manager**: npm
- **Development Tools**: ESLint, PostCSS, Autoprefixer

## Project Setup Instructions

The project is now fully configured with the following structure:

1. **Next.js Application**: Initialized with TypeScript support and App Router
2. **Visual Flow Builder**: React Flow based drag-and-drop interface for AI workflows
3. **Node System**: 10+ node types for different AI operations (LLM, Vector Store, Memory, etc.)
4. **Multi-Agent System**: Visual canvas for connecting multiple OwlAgents into complex workflows
5. **API Routes**: Flow management, execution, and multi-agent orchestration endpoints
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
│   │   └── execute/    # Flow execution engine with human review
│   │       └── route.ts
│   ├── multi-agent-flows/  # Multi-agent flow management
│   │   ├── route.ts    # CRUD operations for multi-agent flows
│   │   └── execute/    # Multi-agent execution engine
│   │       └── route.ts
│   └── owlagents/      # OwlAgent management
│       ├── route.ts    # List and create OwlAgents
│       └── [id]/       # Dynamic route for agent operations
│           └── route.ts
├── components/          # Reusable UI components
│   ├── FlowBuilder.tsx  # Main visual flow builder
│   ├── NodeSidebar.tsx  # Drag-and-drop node palette
│   ├── NodeConfigPanel.tsx # Node configuration panel with human review settings
│   ├── HumanReviewSwitch.tsx # Switch component for human review toggle
│   ├── HumanReviewModal.tsx # Modal for reviewing/approving node outputs
│   ├── MultiAgentCanvas.tsx # Multi-agent visual canvas
│   ├── SavedOwlsList.tsx # Component for displaying saved OwlAgents
│   ├── multi-agent/    # Multi-agent specific components
│   │   ├── OwlAgentNode.tsx # Custom node for OwlAgent
│   │   └── AgentSidebar.tsx # Sidebar for agent selection
│   ├── store/          # Agent store components
│   │   └── AgentStoreCard.tsx # PowerPro-style agent card display
│   └── nodes/          # Custom node components
│       └── CustomNode.tsx # Node component with review indicators
├── multi-agent/        # Multi-agent canvas page
│   └── page.tsx        # Multi-agent flow builder interface
├── agent-canvas/       # Individual agent canvas
│   ├── page.tsx        # Single agent flow builder (list view)
│   └── [id]/           # Dynamic route for specific agent canvas
│       └── page.tsx    # Agent editor canvas
├── store/              # Agent store page
│   └── page.tsx        # Agent marketplace interface
├── lib/                # Utility functions and API clients
│   └── flowise-client.ts
├── types/              # TypeScript type definitions
│   ├── flowise.ts      # Includes HumanReviewConfig and ReviewStatus types
│   └── multi-agent.ts  # Multi-agent system type definitions
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

### Multi-Agent System (新機能)

複数のOwlAgentを視覚的に配置・接続し、高度なマルチエージェントワークフローを構築できるシステム。

#### システム概要
- **Multi-Agent Canvas**: 複数のエージェントを視覚的に配置・接続できるキャンバス
- **OwlAgent References**: 既存のOwlAgentへの参照をノードとして配置
- **エージェント間通信**: エージェント同士でデータをやり取り
- **トポロジカル実行**: 依存関係を解決した順次実行
- **実行状態管理**: 各エージェントの状態をリアルタイムで可視化

#### Multi-Agent Canvas機能
1. **ドラッグ&ドロップ配置**: サイドバーからエージェントをキャンバスに配置
2. **視覚的接続**: エージェント間をエッジで接続してデータフローを定義
3. **状態表示**: 実行中・成功・エラーをカラーコーディングで表示
4. **MiniMap**: 大規模フローの全体像を俯瞰
5. **フロー保存**: 作成したマルチエージェントフローを保存・再利用

#### エージェント実行フロー
1. **トポロジカルソート**: エッジの依存関係を解析して実行順序を決定
2. **順次実行**: 決定された順序でエージェントを実行
3. **データパイプライン**: 前のエージェントの出力を次のエージェントの入力に渡す
4. **メッセージ記録**: エージェント間のデータ転送を全て記録
5. **エラーハンドリング**: エージェントごとにエラーを捕捉して記録

#### 型定義 (app/types/multi-agent.ts)
```typescript
// OwlAgentへの参照ノード
interface OwlAgentRefNode {
  id: string;
  agentId: string;
  agentName?: string;
  agentDescription?: string;
  position: { x: number; y: number };
}

// マルチエージェントフロー
interface MultiAgentFlow {
  id: string;
  name: string;
  description: string;
  agents: OwlAgentRefNode[];
  edges: OwlAgentEdge[];
}

// 実行コンテキスト
interface MultiAgentExecutionContext {
  flowId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  agents: { [agentId: string]: AgentStatus };
  messages: AgentMessage[];
}
```

#### 関連コンポーネント
- `MultiAgentCanvas.tsx`: メインキャンバスコンポーネント
- `OwlAgentNode.tsx`: エージェントノードの視覚表現
- `AgentSidebar.tsx`: エージェント選択サイドバー
- `/multi-agent/page.tsx`: マルチエージェントビルダーページ

#### 使用方法
1. `/multi-agent` ページにアクセス
2. サイドバーから使用したいOwlAgentを選択
3. キャンバスにドラッグ&ドロップで配置
4. エージェント間をドラッグして接続
5. フロー名と説明を設定して保存
6. 実行ボタンでフローを実行

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

#### Multi-Agent Flow Management
- `GET /api/multi-agent-flows` - List all multi-agent flows or get specific flow
  - Query params: `?id={flowId}` for specific flow
  - Response: `{ flows: MultiAgentFlow[] }` or single `MultiAgentFlow`

- `POST /api/multi-agent-flows` - Create new multi-agent flow
  - Request: `{ name: string, description: string, agents: OwlAgentRefNode[], edges: OwlAgentEdge[] }`
  - Response: `MultiAgentFlow` with generated ID and timestamps

- `PUT /api/multi-agent-flows` - Update existing multi-agent flow
  - Request: `{ id: string, name: string, description: string, agents: OwlAgentRefNode[], edges: OwlAgentEdge[] }`
  - Response: Updated `MultiAgentFlow`

- `DELETE /api/multi-agent-flows` - Delete multi-agent flow
  - Query params: `?id={flowId}`
  - Response: `{ message: string }`

#### Multi-Agent Flow Execution
- `POST /api/multi-agent-flows/execute` - Execute a multi-agent flow
  - Request: `{ flowId: string, nodes: Node[], edges: Edge[], input?: any }`
  - Response: `{ success: boolean, executionId: string, results: any[], context: MultiAgentExecutionContext }`
  - Features:
    - Topological sorting for execution order
    - Sequential agent execution with data pipeline
    - Message logging between agents
    - Per-agent status tracking

- `GET /api/multi-agent-flows/execute` - Get execution status
  - Query params: `?executionId={executionId}`
  - Response: `MultiAgentExecutionContext` with current execution state

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

### Required Environment Variables

```env
# LLM Configuration
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
- Multi-agent flow persistence is in-memory only
- OwlAgent data stored in JSON files (needs database migration)
- Limited LLM node execution (mock implementation)
- Multi-agent execution uses mock agent processing
- No real-time collaboration features
- Basic error handling in flow execution
- Authentication not yet implemented
- No parallel agent execution in multi-agent flows
- Agent Store uses mock data (needs real marketplace backend)
- PowerPro card abilities are randomly generated (needs real metrics)

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

6. **Multi-Agent Enhancements**
   - Parallel agent execution (when no dependencies)
   - Real OwlAgent integration (currently using mock execution)
   - Agent-to-agent streaming communication
   - Conditional branching in multi-agent flows
   - Looping and iteration support
   - Agent health monitoring
   - Distributed agent execution
   - Agent result caching
   - Agent marketplace/library
   - Multi-agent debugging tools

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

6. **Multi-agent flow execution fails**
   - Verify all agents exist in the data/owlagents directory
   - Check for circular dependencies in agent connections
   - Review execution logs in API response
   - Ensure topological sort can resolve all dependencies

7. **OwlAgent not appearing in sidebar**
   - Check data/owlagents directory exists
   - Verify JSON file format is correct
   - Ensure agent has required fields (id, name, description)
   - Restart development server to reload agent list