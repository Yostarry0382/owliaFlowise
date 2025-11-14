# Owlia Fabrica - Flowise AI Chat Application

FlowiseとNext.js 15を使用した最新のAIチャットアプリケーションです。

## 特徴

- Next.js 15 App Routerを使用したモダンなアーキテクチャ
- TypeScriptによる型安全な実装
- Tailwind CSSによるレスポンシブデザイン
- Flowise APIとのシームレスな統合
- リアルタイムチャットインターフェース
- セッション管理機能

## 必要条件

- Node.js 18.17以上
- npm または yarn
- Flowiseインスタンス（ローカルまたはリモート）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example`をコピーして`.env.local`を作成し、必要な値を設定します：

```bash
cp .env.local.example .env.local
```

`.env.local`を編集して以下の値を設定：

```env
# Flowise APIのURL
FLOWISE_API_URL=http://localhost:3000

# FlowiseのChatflow ID（Flowiseダッシュボードから取得）
FLOWISE_CHATFLOW_ID=your-chatflow-id-here

# Flowise API Key（オプション）
FLOWISE_API_KEY=your-api-key-here
```

### 3. Flowiseのセットアップ

Flowiseがまだインストールされていない場合：

```bash
# Flowiseのインストール
npm install -g flowise

# Flowiseの起動
npx flowise start
```

Flowiseダッシュボード（通常は`http://localhost:3000`）にアクセスして：
1. 新しいChatflowを作成
2. 必要なノード（LLM、Memory、など）を追加
3. Chatflow IDをコピーして`.env.local`に設定

## 開発

開発サーバーの起動：

```bash
npm run dev
```

ブラウザで [http://localhost:3001](http://localhost:3001) を開いてアプリケーションを確認します。

## ビルドとデプロイ

### プロダクションビルド

```bash
npm run build
npm run start
```

### Vercelへのデプロイ

```bash
# Vercel CLIのインストール
npm i -g vercel

# デプロイ
vercel
```

## プロジェクト構造

```
owlia-fabrica/
├── app/
│   ├── api/
│   │   └── flowise/
│   │       └── chat/
│   │           └── route.ts    # Flowise API エンドポイント
│   ├── components/
│   │   ├── ChatInterface.tsx   # メインチャットUI
│   │   ├── ChatMessage.tsx     # メッセージコンポーネント
│   │   └── ChatInput.tsx       # 入力コンポーネント
│   ├── lib/
│   │   └── flowise-client.ts   # Flowise APIクライアント
│   ├── types/
│   │   └── flowise.ts          # TypeScript型定義
│   ├── layout.tsx              # ルートレイアウト
│   ├── page.tsx                # ホームページ
│   └── globals.css             # グローバルスタイル
├── public/                     # 静的ファイル
├── .env.local.example          # 環境変数テンプレート
├── next.config.js              # Next.js設定
├── tailwind.config.ts          # Tailwind CSS設定
├── tsconfig.json               # TypeScript設定
└── package.json                # プロジェクト依存関係
```

## 主な機能

### チャットインターフェース
- リアルタイムメッセージング
- タイピングインジケーター
- メッセージ履歴
- 自動スクロール

### Flowise統合
- REST API統合
- セッション管理
- エラーハンドリング
- ファイルアップロード対応（準備中）

### UIコンポーネント
- レスポンシブデザイン
- ダークモード対応
- アクセシビリティ配慮

## トラブルシューティング

### Flowiseに接続できない場合
1. Flowiseが起動していることを確認
2. `.env.local`のURLが正しいことを確認
3. Chatflow IDが正しいことを確認
4. CORSの設定を確認

### ビルドエラーの場合
```bash
# キャッシュをクリア
rm -rf .next node_modules
npm install
npm run build
```

## ライセンス

MIT

## 貢献

プルリクエストは歓迎します。大きな変更の場合は、まずイシューを開いて変更内容を議論してください。

## 作者

star'in (Yostarry0382)