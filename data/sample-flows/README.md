# Flowise Sample Flows

このディレクトリにはFlowiseで推奨されるフローパターンのサンプルが含まれています。

## サンプル一覧

### 1. Basic Conversation Chain (`basic-conversation-chain.json`)
最もシンプルな会話フロー。

**構成:**
- ChatOpenAI → ConversationChain
- BufferMemory → ConversationChain

**用途:** 基本的なチャットボット

---

### 2. RAG Q&A Chain (`rag-qa-chain.json`)
RAG（Retrieval Augmented Generation）パターンの質問応答システム。

**構成:**
- PDFLoader → TextSplitter → InMemoryVectorStore
- OpenAIEmbeddings → InMemoryVectorStore
- ChatOpenAI → RetrievalQAChain
- InMemoryVectorStore → RetrievalQAChain

**用途:** ドキュメントベースの質問応答

---

### 3. Tool Agent (`tool-agent.json`)
ツールを使用できるAIエージェント。

**構成:**
- ChatOpenAI (GPT-4) → OpenAIFunctionAgent
- Calculator → OpenAIFunctionAgent
- SerpAPI → OpenAIFunctionAgent
- BufferMemory → OpenAIFunctionAgent

**用途:** 計算やWeb検索が必要なタスク

---

### 4. Conversational Retrieval Chain (`conversational-retrieval-chain.json`)
会話履歴を考慮したRAGシステム。

**構成:**
- ChatOpenAI → ConversationalRetrievalQAChain
- OpenAIEmbeddings → Pinecone
- Pinecone → ConversationalRetrievalQAChain
- BufferWindowMemory → ConversationalRetrievalQAChain

**用途:** 継続的な会話での文書検索

---

### 5. LLM Chain with Custom Prompt (`llm-chain-with-prompt.json`)
カスタムプロンプトテンプレートを使用。

**構成:**
- ChatOpenAI → LLMChain
- PromptTemplate → LLMChain

**用途:** 特定フォーマットの出力が必要な場合

---

### 6. Azure OpenAI Conversation (`azure-openai-conversation.json`)
Azure OpenAIを使用した会話（環境変数から自動設定）。

**構成:**
- AzureChatOpenAI → ConversationChain
- BufferMemory → ConversationChain

**用途:** Azure環境での会話ボット

---

### 7. Web Scraper QA (`web-scraper-qa.json`)
Webページから情報を取得して質問に回答。

**構成:**
- WebLoader → TextSplitter → FAISS
- OpenAIEmbeddings → FAISS
- ChatOpenAI → RetrievalQAChain
- FAISS → RetrievalQAChain

**用途:** Webコンテンツベースの質問応答

---

## 使用方法

### Agent Builderで読み込む

1. Agent Builder (`/agent-builder`) を開く
2. 「Load Sample」ボタンをクリック
3. サンプルを選択

### APIで読み込む

```javascript
// サンプルフローを取得
const response = await fetch('/api/sample-flows/basic-conversation-chain');
const flow = await response.json();

// フローを実行
await fetch('/api/flows/execute', {
  method: 'POST',
  body: JSON.stringify({
    nodes: flow.nodes,
    edges: flow.edges,
    input: 'Hello!'
  })
});
```

## ノード接続ルール

### Chat Models / LLMs → Chains/Agents
- ターゲットハンドル: `model`

### Memory → Chains/Agents
- ターゲットハンドル: `memory`

### Embeddings → Vector Stores
- ターゲットハンドル: `embeddings`

### Vector Stores → Chains
- ターゲットハンドル: `vectorStore`

### Document Loaders → Text Splitters
- ターゲットハンドル: `document`

### Text Splitters → Vector Stores
- ターゲットハンドル: `document`

### Prompt Templates → LLM Chain
- ターゲットハンドル: `prompt`

### Tools → Agents
- ターゲットハンドル: `tools`

## 必要な環境変数

```env
# OpenAI
OPENAI_API_KEY=your-key

# Azure OpenAI
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Pinecone (Vector Store使用時)
PINECONE_API_KEY=your-key
PINECONE_ENVIRONMENT=your-env

# SerpAPI (検索ツール使用時)
SERPAPI_API_KEY=your-key

# Flowise
FLOWISE_API_URL=http://localhost:3000
FLOWISE_API_KEY=your-key
```
