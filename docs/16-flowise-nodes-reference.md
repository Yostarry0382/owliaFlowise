# Flowise ノードリファレンス

このドキュメントでは、Flowise OSSで使用可能なノード（インテグレーション）を網羅的に解説します。

## 概要

Flowiseは**140以上のコンポーネント**を提供し、以下の4つの主要カテゴリに分類されています：

1. **LangChain インテグレーション** - 最も豊富なノード群
2. **LlamaIndex インテグレーション** - RAG特化のノード群
3. **ユーティリティ** - 汎用的な補助ノード
4. **外部インテグレーション** - サードパーティ連携

---

## 1. LangChain インテグレーション

### 1.1 Chat Models（チャットモデル）

LLMプロバイダーとの接続を提供するノード群。メッセージのリストを入力として受け取り、モデル生成メッセージを出力します。

| ノード名 | 説明 |
|---------|------|
| **AWS ChatBedrock** | Amazon Bedrock経由でClaude、Titan等を利用 |
| **Azure ChatOpenAI** | Azure OpenAI Serviceとの連携 |
| **ChatAnthropic** | Claude（Anthropic）モデルとの直接連携 |
| **ChatCohere** | Cohereモデルとの連携 |
| **Chat Fireworks** | Fireworks AIとの連携 |
| **ChatGoogleGenerativeAI** | Google Geminiモデルとの連携 |
| **Google VertexAI** | Google Cloud Vertex AIとの連携 |
| **ChatHuggingFace** | HuggingFace Inference APIとの連携 |
| **ChatLocalAI** | LocalAI（ローカルLLM）との連携 |
| **ChatMistralAI** | Mistral AIモデルとの連携 |
| **IBM Watsonx** | IBM Watsonxとの連携 |
| **ChatOllama** | Ollama（ローカルLLM）との連携 |
| **ChatOpenAI** | OpenAI GPTモデルとの連携 |
| **ChatTogetherAI** | Together AIとの連携 |
| **GroqChat** | Groq高速推論との連携 |
| **NVIDIA NIM** | NVIDIA NIMとの連携 |
| **ChatCometAPI** | Comet MLとの連携 |
| **ChatSambanova** | SambaNova Systemsとの連携 |

### 1.2 Embeddings（埋め込みモデル）

テキストをベクトル表現に変換するノード群。ベクターストアと組み合わせて使用します。

| ノード名 | 説明 |
|---------|------|
| **AWS Bedrock Embeddings** | Amazon Bedrock埋め込みモデル |
| **Azure OpenAI Embeddings** | Azure OpenAI埋め込みモデル |
| **Cohere Embeddings** | Cohere埋め込みモデル |
| **Google GenerativeAI Embeddings** | Google Gemini埋め込みモデル |
| **Google VertexAI Embeddings** | Google Vertex AI埋め込みモデル |
| **HuggingFace Inference Embeddings** | HuggingFace埋め込みモデル |
| **LocalAI Embeddings** | LocalAI埋め込みモデル |
| **MistralAI Embeddings** | Mistral AI埋め込みモデル |
| **Ollama Embeddings** | Ollama埋め込みモデル |
| **OpenAI Embeddings** | OpenAI埋め込みモデル |
| **OpenAI Embeddings Custom** | カスタムOpenAI埋め込み設定 |
| **TogetherAI Embedding** | Together AI埋め込みモデル |
| **VoyageAI Embeddings** | Voyage AI埋め込みモデル |

### 1.3 Vector Stores（ベクターストア）

高次元ベクトルを保存・検索するデータベース連携ノード群。

| ノード名 | 説明 |
|---------|------|
| **AstraDB** | DataStax AstraDBとの連携 |
| **Chroma** | Chromaベクターデータベース |
| **Couchbase** | Couchbaseベクター検索 |
| **Elastic** | Elasticsearchベクター検索 |
| **Faiss** | Facebook AISSローカルベクターストア |
| **In-Memory Vector Store** | メモリ内一時ベクターストア |
| **Milvus** | Milvusベクターデータベース |
| **MongoDB Atlas** | MongoDB Atlasベクター検索 |
| **OpenSearch** | OpenSearchベクター検索 |
| **Pinecone** | Pineconeベクターデータベース |
| **Postgres** | PostgreSQL pgvector拡張 |
| **Qdrant** | Qdrantベクターデータベース |
| **Redis** | Redisベクター検索 |
| **SingleStore** | SingleStoreベクター検索 |
| **Supabase** | Supabaseベクター検索 |
| **Upstash Vector** | Upstash Vectorデータベース |
| **Vectara** | Vectaraベクターデータベース |
| **Weaviate** | Weaviateベクターデータベース |
| **Zep Collection - Open Source** | Zep OSS版メモリストア |
| **Zep Collection - Cloud** | Zep Cloud版メモリストア |

### 1.4 Document Loaders（ドキュメントローダー）

様々なソースからドキュメントを読み込むノード群（43種類以上）。

#### ファイル形式
| ノード名 | 対応形式 |
|---------|---------|
| **PDF Loader** | PDFファイル |
| **DOCX Loader** | Microsoft Word |
| **Excel Loader** | Microsoft Excel |
| **PowerPoint Loader** | Microsoft PowerPoint |
| **CSV Loader** | CSVファイル |
| **JSON Loader** | JSONファイル |
| **JSONL Loader** | JSON Linesファイル |
| **Plain Text Loader** | テキストファイル |
| **EPUB Loader** | 電子書籍 |

#### クラウド・SaaS連携
| ノード名 | 対応サービス |
|---------|-------------|
| **Airtable Loader** | Airtable |
| **Google Drive Loader** | Google Drive |
| **Google Sheets Loader** | Google Sheets |
| **Notion Loader** | Notion |
| **Confluence Loader** | Atlassian Confluence |
| **Jira Loader** | Atlassian Jira |
| **GitHub Loader** | GitHub |
| **GitBook Loader** | GitBook |
| **Figma Loader** | Figma |
| **S3 File Loader** | AWS S3 |

#### Webスクレイピング
| ノード名 | 説明 |
|---------|------|
| **Cheerio Web Scraper** | 軽量HTMLパーサー |
| **Playwright Web Scraper** | ブラウザ自動化スクレイパー |
| **Puppeteer Web Scraper** | Puppeteerベーススクレイパー |
| **Apify Website Content Crawler** | Apifyクローラー |
| **FireCrawl** | FireCrawl Webスクレイパー |
| **Spider** | Spider Webクローラー |

#### 検索・API
| ノード名 | 説明 |
|---------|------|
| **BraveSearch Loader** | Brave Search結果取得 |
| **SearchApi Loader** | SearchApi結果取得 |
| **SerpApi Loader** | SerpApi結果取得 |
| **API Loader** | カスタムAPI連携 |
| **Custom Document Loader** | カスタムローダー |

#### その他
| ノード名 | 説明 |
|---------|------|
| **Document Store** | Flowise内部ドキュメントストア |
| **Unstructured File Loader** | 非構造化ファイル処理 |
| **Unstructured Folder Loader** | フォルダ一括処理 |

### 1.5 Text Splitters（テキスト分割）

ドキュメントを適切なチャンクに分割するノード群。

| ノード名 | 説明 |
|---------|------|
| **Character Text Splitter** | 文字数ベースで分割 |
| **Code Text Splitter** | コード構文を考慮した分割 |
| **Html-To-Markdown Text Splitter** | HTMLをMarkdownに変換して分割 |
| **Markdown Text Splitter** | Markdown構造を考慮した分割 |
| **Recursive Character Text Splitter** | 再帰的に最適なチャンクサイズに分割 |
| **Token Text Splitter** | トークン数ベースで分割 |

### 1.6 Memory（メモリ）

会話履歴を保存・管理するノード群。

| ノード名 | 説明 |
|---------|------|
| **Buffer Memory** | 全履歴をバッファに保存 |
| **Buffer Window Memory** | 直近N件の会話を保存 |
| **Conversation Summary Memory** | 会話を要約して保存 |
| **Conversation Summary Buffer Memory** | 要約とバッファの組み合わせ |
| **DynamoDB Chat Memory** | AWS DynamoDBに保存 |
| **Mem0 Memory** | Mem0メモリシステム |
| **MongoDB Atlas Chat Memory** | MongoDB Atlasに保存 |
| **Redis-Backed Chat Memory** | Redisに保存 |
| **Upstash Redis-Backed Chat Memory** | Upstash Redisに保存 |
| **Zep Memory** | Zepメモリシステム |

### 1.7 Agents（エージェント）

自律的にタスクを実行するエージェントノード群。

| ノード名 | 説明 |
|---------|------|
| **Airtable Agent** | Airtable操作エージェント |
| **AutoGPT** | 自律型GPTエージェント |
| **BabyAGI** | 軽量自律エージェント |
| **CSV Agent** | CSVデータ処理エージェント |
| **Conversational Agent** | 対話型エージェント |
| **Conversational Retrieval Agent** | 対話+検索エージェント |
| **MistralAI Tool Agent** | Mistral AIツールエージェント |
| **OpenAI Assistant** | OpenAI Assistant API連携 |
| **OpenAI Function Agent** | OpenAI Function Calling対応 |
| **OpenAI Tool Agent** | OpenAI Tool Use対応 |
| **ReAct Agent Chat** | ReAct推論（チャット形式） |
| **ReAct Agent LLM** | ReAct推論（LLM形式） |
| **Tool Agent** | 汎用ツールエージェント |
| **XML Agent** | XML形式エージェント |

### 1.8 Chains（チェーン）

複数の処理を連結するワークフローノード群。

| ノード名 | 説明 |
    |---------|------|
| **GET API Chain** | GET APIリクエストチェーン |
| **POST API Chain** | POST APIリクエストチェーン |
| **OpenAPI Chain** | OpenAPI仕様ベースチェーン |
| **Conversation Chain** | 対話管理チェーン |
| **Conversational Retrieval QA Chain** | 対話+検索QAチェーン |
| **LLM Chain** | 基本LLMチェーン |
| **Multi Prompt Chain** | 複数プロンプトルーティング |
| **Multi Retrieval QA Chain** | 複数検索ソースQA |
| **Retrieval QA Chain** | 検索QAチェーン |
| **Sql Database Chain** | SQLデータベースチェーン |
| **Vectara QA Chain** | Vectara専用QAチェーン |
| **VectorDB QA Chain** | ベクターDB QAチェーン |

### 1.9 Tools（ツール）

エージェントが使用できる外部ツール群。

#### 検索ツール
| ノード名 | 説明 |
|---------|------|
| **BraveSearch API** | Brave Search検索 |
| **Exa Search** | Exa AI検索 |
| **Google Custom Search** | Google Custom Search |
| **SearchApi** | SearchApi検索 |
| **SearXNG** | SearXNGメタ検索 |
| **Serp API** | SerpApi検索 |
| **Serper** | Serper検索 |
| **Tavily** | Tavily AI検索 |
| **Web Browser** | Webブラウザ操作 |

#### ユーティリティツール
| ノード名 | 説明 |
|---------|------|
| **Calculator** | 計算ツール |
| **Chain Tool** | チェーンをツール化 |
| **Chatflow Tool** | Chatflowをツール化 |
| **Custom Tool** | カスタムツール定義 |
| **OpenAPI Toolkit** | OpenAPIからツール生成 |
| **Python Interpreter** | Pythonコード実行（E2B） |
| **Read File** | ファイル読み取り |
| **Write File** | ファイル書き込み |
| **Request Get** | HTTP GETリクエスト |
| **Request Post** | HTTP POSTリクエスト |
| **Retriever Tool** | 検索をツール化 |

#### SaaS連携ツール
| ノード名 | 説明 |
|---------|------|
| **Gmail** | Gmail操作 |
| **Google Calendar** | Googleカレンダー操作 |
| **Google Drive** | Google Drive操作 |
| **Google Sheets** | Google Sheets操作 |
| **Microsoft Outlook** | Outlook操作 |
| **Microsoft Teams** | Teams操作 |

### 1.10 Retrievers（リトリーバー）

ドキュメント検索・フィルタリングノード群。

| ノード名 | 説明 |
|---------|------|
| **Cohere Rerank Retriever** | Cohereリランキング |
| **Embeddings Filter Retriever** | 埋め込みフィルタリング |
| **HyDE Retriever** | 仮説ドキュメント埋め込み |
| **LLM Filter Retriever** | LLMフィルタリング |
| **Multi Query Retriever** | 複数クエリ生成検索 |
| **Prompt Retriever** | プロンプトベース検索 |
| **Reciprocal Rank Fusion Retriever** | RRFランキング統合 |
| **Similarity Score Threshold Retriever** | 類似度閾値フィルタリング |
| **Vector Store Retriever** | ベクターストア検索 |
| **Voyage AI Rerank Retriever** | Voyage AIリランキング |

### 1.11 Output Parsers（出力パーサー）

LLM出力を構造化データに変換するノード群。

| ノード名 | 説明 |
|---------|------|
| **CSV Output Parser** | CSV形式にパース |
| **Custom List Output Parser** | カスタムリスト形式にパース |
| **Structured Output Parser** | 構造化データにパース |
| **Advanced Structured Output Parser** | 高度な構造化パース |

### 1.12 その他のLangChainノード

| カテゴリ | 説明 |
|---------|------|
| **Cache** | InMemory、Momentoキャッシュ |
| **LLMs** | 非チャット形式のLLMノード |
| **Moderation** | コンテンツモデレーション |
| **Prompts** | プロンプトテンプレート管理 |
| **Record Managers** | レコード管理 |

---

## 2. LlamaIndex インテグレーション

RAG（Retrieval Augmented Generation）に特化したノード群。

| カテゴリ | 説明 |
|---------|------|
| **Agents** | LlamaIndexエージェント |
| **Chat Models** | LlamaIndex対応チャットモデル |
| **Embeddings** | LlamaIndex埋め込みモデル |
| **Engine** | クエリエンジン、チャットエンジン |
| **Response Synthesizer** | 回答生成・合成 |
| **Tools** | LlamaIndexツール |
| **Vector Stores** | LlamaIndex対応ベクターストア |

---

## 3. ユーティリティノード

フロー制御・補助機能を提供するノード群。

| ノード名 | 説明 |
|---------|------|
| **Custom JS Function** | カスタムJavaScript実行 |
| **Set Variable** | 変数の設定 |
| **Get Variable** | 変数の取得 |
| **If Else** | 条件分岐 |
| **Sticky Note** | メモ・注釈 |

---

## 4. Agentflow V2 専用ノード

マルチエージェント・複雑なワークフロー向けの14種類のノード。

### コアノード

| ノード名 | 説明 |
|---------|------|
| **Start Node** | ワークフロー開始点、初期入力・状態変数定義 |
| **LLM Node** | LLMへの直接アクセス、テキスト/JSON出力 |
| **Agent Node** | 自律型AIエージェント（推論・計画・ツール利用） |
| **Tool Node** | 特定ツールの決定論的実行 |

### データ処理ノード

| ノード名 | 説明 |
|---------|------|
| **Retriever Node** | Document Storeからの意味検索 |
| **HTTP Node** | 外部API通信（GET/POST/PUT/DELETE/PATCH） |
| **Custom Function Node** | サーバーサイドJavaScript実行 |

### 制御フローノード

| ノード名 | 説明 |
|---------|------|
| **Condition Node** | 決定論的条件分岐 |
| **Condition Agent Node** | AI駆動の条件分岐 |
| **Iteration Node** | 配列要素のループ処理 |
| **Loop Node** | 前のノードへの再実行ループ |

### ユーザーインタラクションノード

| ノード名 | 説明 |
|---------|------|
| **Human Input Node** | 実行一時停止、ユーザー承認要求 |
| **Direct Reply Node** | 最終メッセージ送信、実行終了 |
| **Execute Flow Node** | 別のFlowise Workflowを呼び出し |

---

## 5. 外部インテグレーション

| ノード名 | 説明 |
|---------|------|
| **Zapier Zaps** | Zapierワークフロー連携 |

---

## ノード選択ガイド

### ユースケース別推奨ノード

#### シンプルなチャットボット
- Chat Models → Memory → Conversation Chain

#### RAGシステム
- Document Loaders → Text Splitters → Embeddings → Vector Stores → Retrieval QA Chain

#### 自律エージェント
- Agent Node + Tools + Memory

#### マルチエージェントシステム
- Agentflow V2: Start → Agent Nodes → Condition Nodes → Direct Reply

#### Human-in-the-Loop
- Agentflow V2: Human Input Node + Condition Agent Node

---

## 参考リンク

- [Flowise公式ドキュメント](https://docs.flowiseai.com/)
- [Integrations一覧](https://docs.flowiseai.com/integrations)
- [Agentflow V2ガイド](https://docs.flowiseai.com/using-flowise/agentflowv2)
- [カスタムノード開発](https://docs.flowiseai.com/contributing/building-node)
- [FlowiseAI GitHub](https://github.com/FlowiseAI/Flowise)
