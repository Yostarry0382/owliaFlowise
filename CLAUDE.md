# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Status

**Current Status**: Active development - OwliaFabrica Visual AI Agent Builder

This project is a visual AI agent builder inspired by Flowise, providing a drag-and-drop interface for creating complex AI workflows and agent systems using React Flow and Next.js.

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
4. **API Routes**: Flow management and execution endpoints
5. **Environment Configuration**: Uses `.env.local` for sensitive configuration
6. **Development Server**: Runs on `http://localhost:3000` or `3001` if port is in use

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
│   └── flows/          # Flow management API routes
│       ├── route.ts    # CRUD operations for flows
│       └── execute/    # Flow execution engine with human review
│           └── route.ts
├── components/          # Reusable UI components
│   ├── FlowBuilder.tsx  # Main visual flow builder
│   ├── NodeSidebar.tsx  # Drag-and-drop node palette
│   ├── NodeConfigPanel.tsx # Node configuration panel with human review settings
│   ├── HumanReviewSwitch.tsx # Switch component for human review toggle
│   ├── HumanReviewModal.tsx # Modal for reviewing/approving node outputs
│   └── nodes/          # Custom node components
│       └── CustomNode.tsx # Node component with review indicators
├── lib/                # Utility functions and API clients
│   └── flowise-client.ts
├── types/              # TypeScript type definitions
│   └── flowise.ts      # Includes HumanReviewConfig and ReviewStatus types
├── layout.tsx          # Root layout with metadata
├── page.tsx            # Main application page
└── globals.css         # Global styles with Tailwind

public/                 # Static assets
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
- Limited LLM node execution (mock implementation)
- No real-time collaboration features
- Basic error handling in flow execution
- Authentication not yet implemented

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