// ============================================
// ノード定義ファイル (Flowise互換版)
// Flowiseバックエンドで実行可能なノードのみ定義
// ============================================

// ノードカテゴリ
export type NodeCategory =
  | 'chatModels'
  | 'llms'
  | 'embeddings'
  | 'vectorStores'
  | 'documentLoaders'
  | 'textSplitters'
  | 'tools'
  | 'agents'
  | 'chains'
  | 'memory'
  | 'prompts'
  | 'outputParsers';

// ノードの入力パラメータ定義
export interface NodeInputParam {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'password' | 'text' | 'json' | 'file';
  default?: any;
  placeholder?: string;
  description?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
}

// ノードの接続ポイント定義
export interface NodeHandle {
  id: string;
  label: string;
  type: string; // 接続可能なタイプ
  position: 'top' | 'bottom' | 'left' | 'right';
  multiple?: boolean; // 複数接続可能か
}

// ノードタイプ定義
export interface NodeTypeDefinition {
  type: string;
  label: string;
  category: NodeCategory;
  icon: string;
  description: string;
  color: string;
  inputs: NodeInputParam[];
  inputHandles: NodeHandle[];
  outputHandles: NodeHandle[];
}

// カテゴリ定義
export interface CategoryDefinition {
  id: NodeCategory;
  label: string;
  icon: string;
  color: string;
}

// ============================================
// カテゴリ定義 (Flowise互換)
// ============================================
export const NODE_CATEGORIES: CategoryDefinition[] = [
  { id: 'chatModels', label: 'Chat Models', icon: '💬', color: '#4CAF50' },
  { id: 'llms', label: 'LLMs', icon: '🧠', color: '#8BC34A' },
  { id: 'embeddings', label: 'Embeddings', icon: '📊', color: '#00BCD4' },
  { id: 'vectorStores', label: 'Vector Stores', icon: '🗄️', color: '#9C27B0' },
  { id: 'documentLoaders', label: 'Document Loaders', icon: '📄', color: '#FF5722' },
  { id: 'textSplitters', label: 'Text Splitters', icon: '✂️', color: '#795548' },
  { id: 'tools', label: 'Tools', icon: '🔧', color: '#607D8B' },
  { id: 'agents', label: 'Agents', icon: '🤖', color: '#E91E63' },
  { id: 'chains', label: 'Chains', icon: '🔗', color: '#2196F3' },
  { id: 'memory', label: 'Memory', icon: '💾', color: '#673AB7' },
  { id: 'prompts', label: 'Prompts', icon: '📝', color: '#FF9800' },
  { id: 'outputParsers', label: 'Output Parsers', icon: '📤', color: '#009688' },
];

// ============================================
// Chat Models (Flowise互換)
// ============================================
export const CHAT_MODEL_NODES: NodeTypeDefinition[] = [
  {
    type: 'chatOpenAI',
    label: 'ChatOpenAI',
    category: 'chatModels',
    icon: '🤖',
    description: 'OpenAI GPTモデルを使用したチャット。GPT-4、GPT-3.5などをサポート。',
    color: '#10A37F',
    inputs: [
      { name: 'modelName', label: 'Model Name', type: 'select', default: 'gpt-3.5-turbo', options: [
        { label: 'GPT-4o', value: 'gpt-4o' },
        { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
        { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
        { label: 'GPT-4', value: 'gpt-4' },
        { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
      ]},
      { name: 'temperature', label: 'Temperature', type: 'number', default: 0.7, min: 0, max: 2, step: 0.1 },
      { name: 'maxTokens', label: 'Max Tokens', type: 'number', default: 2000 },
      { name: 'openAIApiKey', label: 'OpenAI API Key', type: 'password', description: '環境変数OPENAI_API_KEYから自動取得' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'ChatOpenAI', type: 'BaseChatModel', position: 'right' },
    ],
  },
  {
    type: 'azureChatOpenAI',
    label: 'Azure ChatOpenAI',
    category: 'chatModels',
    icon: '☁️',
    description: 'Azure OpenAI Serviceを使用。環境変数から認証情報を自動取得。',
    color: '#0078D4',
    inputs: [
      { name: 'temperature', label: 'Temperature', type: 'number', default: 0.7, min: 0, max: 2, step: 0.1 },
      { name: 'maxTokens', label: 'Max Tokens', type: 'number', default: 2000 },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'AzureChatOpenAI', type: 'BaseChatModel', position: 'right' },
    ],
  },
  {
    type: 'chatAnthropic',
    label: 'ChatAnthropic',
    category: 'chatModels',
    icon: '🅰️',
    description: 'Anthropic Claudeモデルを使用。Claude 3 Opus、Sonnet、Haikuをサポート。',
    color: '#D4A574',
    inputs: [
      { name: 'modelName', label: 'Model Name', type: 'select', default: 'claude-3-sonnet-20240229', options: [
        { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
        { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
        { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
        { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20240620' },
      ]},
      { name: 'temperature', label: 'Temperature', type: 'number', default: 0.7, min: 0, max: 1, step: 0.1 },
      { name: 'maxTokens', label: 'Max Tokens', type: 'number', default: 4096 },
      { name: 'anthropicApiKey', label: 'Anthropic API Key', type: 'password' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'ChatAnthropic', type: 'BaseChatModel', position: 'right' },
    ],
  },
  {
    type: 'chatGoogleGenerativeAI',
    label: 'Google Gemini',
    category: 'chatModels',
    icon: '🔷',
    description: 'Google Geminiモデルを使用。Gemini Pro、Gemini Pro Visionをサポート。',
    color: '#4285F4',
    inputs: [
      { name: 'modelName', label: 'Model Name', type: 'select', default: 'gemini-pro', options: [
        { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
        { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
        { label: 'Gemini Pro', value: 'gemini-pro' },
      ]},
      { name: 'temperature', label: 'Temperature', type: 'number', default: 0.7, min: 0, max: 1, step: 0.1 },
      { name: 'maxOutputTokens', label: 'Max Output Tokens', type: 'number', default: 2048 },
      { name: 'googleApiKey', label: 'Google API Key', type: 'password' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'ChatGoogleGenerativeAI', type: 'BaseChatModel', position: 'right' },
    ],
  },
  {
    type: 'chatOllama',
    label: 'ChatOllama',
    category: 'chatModels',
    icon: '🦙',
    description: 'ローカルで実行するOllamaモデル。Llama、Mistral、Codellama等をサポート。',
    color: '#333333',
    inputs: [
      { name: 'baseUrl', label: 'Base URL', type: 'string', default: 'http://localhost:11434' },
      { name: 'modelName', label: 'Model Name', type: 'string', default: 'llama2', placeholder: 'llama2, mistral, codellama...' },
      { name: 'temperature', label: 'Temperature', type: 'number', default: 0.7, min: 0, max: 1, step: 0.1 },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'ChatOllama', type: 'BaseChatModel', position: 'right' },
    ],
  },
];

// ============================================
// Embeddings (Flowise互換)
// ============================================
export const EMBEDDING_NODES: NodeTypeDefinition[] = [
  {
    type: 'openAIEmbeddings',
    label: 'OpenAI Embeddings',
    category: 'embeddings',
    icon: '📊',
    description: 'OpenAIの埋め込みモデル。テキストをベクトルに変換。',
    color: '#10A37F',
    inputs: [
      { name: 'modelName', label: 'Model Name', type: 'select', default: 'text-embedding-3-small', options: [
        { label: 'text-embedding-3-small', value: 'text-embedding-3-small' },
        { label: 'text-embedding-3-large', value: 'text-embedding-3-large' },
        { label: 'text-embedding-ada-002', value: 'text-embedding-ada-002' },
      ]},
      { name: 'openAIApiKey', label: 'OpenAI API Key', type: 'password' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'OpenAIEmbeddings', type: 'Embeddings', position: 'right' },
    ],
  },
  {
    type: 'azureOpenAIEmbeddings',
    label: 'Azure OpenAI Embeddings',
    category: 'embeddings',
    icon: '☁️',
    description: 'Azure OpenAIの埋め込みモデル。',
    color: '#0078D4',
    inputs: [],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'AzureOpenAIEmbeddings', type: 'Embeddings', position: 'right' },
    ],
  },
  {
    type: 'cohereEmbeddings',
    label: 'Cohere Embeddings',
    category: 'embeddings',
    icon: '🔮',
    description: 'Cohereの埋め込みモデル。多言語対応。',
    color: '#D4A574',
    inputs: [
      { name: 'modelName', label: 'Model Name', type: 'string', default: 'embed-english-v3.0' },
      { name: 'cohereApiKey', label: 'Cohere API Key', type: 'password' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'CohereEmbeddings', type: 'Embeddings', position: 'right' },
    ],
  },
];

// ============================================
// Vector Stores (Flowise互換)
// ============================================
export const VECTOR_STORE_NODES: NodeTypeDefinition[] = [
  {
    type: 'pinecone',
    label: 'Pinecone',
    category: 'vectorStores',
    icon: '🌲',
    description: 'Pineconeベクトルデータベース。スケーラブルなベクトル検索。',
    color: '#000000',
    inputs: [
      { name: 'pineconeIndex', label: 'Pinecone Index', type: 'string', required: true },
      { name: 'pineconeNamespace', label: 'Namespace', type: 'string' },
      { name: 'pineconeApiKey', label: 'Pinecone API Key', type: 'password' },
      { name: 'topK', label: 'Top K', type: 'number', default: 4 },
    ],
    inputHandles: [
      { id: 'embeddings', label: 'Embeddings', type: 'Embeddings', position: 'left' },
      { id: 'document', label: 'Document', type: 'Document', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Pinecone', type: 'VectorStore', position: 'right' },
    ],
  },
  {
    type: 'chroma',
    label: 'Chroma',
    category: 'vectorStores',
    icon: '🎨',
    description: 'Chromaベクトルデータベース。オープンソースで使いやすい。',
    color: '#FF6B6B',
    inputs: [
      { name: 'collectionName', label: 'Collection Name', type: 'string', required: true },
      { name: 'chromaURL', label: 'Chroma URL', type: 'string', default: 'http://localhost:8000' },
      { name: 'topK', label: 'Top K', type: 'number', default: 4 },
    ],
    inputHandles: [
      { id: 'embeddings', label: 'Embeddings', type: 'Embeddings', position: 'left' },
      { id: 'document', label: 'Document', type: 'Document', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Chroma', type: 'VectorStore', position: 'right' },
    ],
  },
  {
    type: 'faiss',
    label: 'FAISS',
    category: 'vectorStores',
    icon: '⚡',
    description: 'Facebook AI Similarity Search。高速なローカルベクトル検索。',
    color: '#1877F2',
    inputs: [
      { name: 'topK', label: 'Top K', type: 'number', default: 4 },
    ],
    inputHandles: [
      { id: 'embeddings', label: 'Embeddings', type: 'Embeddings', position: 'left' },
      { id: 'document', label: 'Document', type: 'Document', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'FAISS', type: 'VectorStore', position: 'right' },
    ],
  },
  {
    type: 'inMemoryVectorStore',
    label: 'In-Memory Vector Store',
    category: 'vectorStores',
    icon: '💾',
    description: 'メモリ内ベクトルストア。開発・テスト用。',
    color: '#9C27B0',
    inputs: [
      { name: 'topK', label: 'Top K', type: 'number', default: 4 },
    ],
    inputHandles: [
      { id: 'embeddings', label: 'Embeddings', type: 'Embeddings', position: 'left' },
      { id: 'document', label: 'Document', type: 'Document', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'InMemoryVectorStore', type: 'VectorStore', position: 'right' },
    ],
  },
];

// ============================================
// Document Loaders (Flowise互換)
// ============================================
export const DOCUMENT_LOADER_NODES: NodeTypeDefinition[] = [
  {
    type: 'pdfLoader',
    label: 'PDF Loader',
    category: 'documentLoaders',
    icon: '📄',
    description: 'PDFファイルを読み込む。',
    color: '#FF5722',
    inputs: [
      { name: 'pdfFile', label: 'PDF File', type: 'file' },
      { name: 'usage', label: 'Usage', type: 'select', default: 'perPage', options: [
        { label: 'One document per page', value: 'perPage' },
        { label: 'One document per file', value: 'perFile' },
      ]},
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'Document', type: 'Document', position: 'right' },
    ],
  },
  {
    type: 'textLoader',
    label: 'Text File Loader',
    category: 'documentLoaders',
    icon: '📝',
    description: 'テキストファイルを読み込む。',
    color: '#795548',
    inputs: [
      { name: 'textFile', label: 'Text File', type: 'file' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'Document', type: 'Document', position: 'right' },
    ],
  },
  {
    type: 'csvLoader',
    label: 'CSV Loader',
    category: 'documentLoaders',
    icon: '📊',
    description: 'CSVファイルを読み込む。',
    color: '#4CAF50',
    inputs: [
      { name: 'csvFile', label: 'CSV File', type: 'file' },
      { name: 'columnName', label: 'Column Name', type: 'string', description: '使用するカラム名' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'Document', type: 'Document', position: 'right' },
    ],
  },
  {
    type: 'jsonLoader',
    label: 'JSON Loader',
    category: 'documentLoaders',
    icon: '📋',
    description: 'JSONファイルを読み込む。',
    color: '#FFC107',
    inputs: [
      { name: 'jsonFile', label: 'JSON File', type: 'file' },
      { name: 'pointersName', label: 'Pointers', type: 'string', placeholder: '/content, /text' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'Document', type: 'Document', position: 'right' },
    ],
  },
  {
    type: 'cheerioWebScraper',
    label: 'Web Scraper',
    category: 'documentLoaders',
    icon: '🌐',
    description: 'Webページをスクレイピング。',
    color: '#2196F3',
    inputs: [
      { name: 'url', label: 'URL', type: 'string', required: true, placeholder: 'https://example.com' },
      { name: 'selector', label: 'CSS Selector', type: 'string', placeholder: 'body, .content, #main' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'Document', type: 'Document', position: 'right' },
    ],
  },
];

// ============================================
// Text Splitters (Flowise互換)
// ============================================
export const TEXT_SPLITTER_NODES: NodeTypeDefinition[] = [
  {
    type: 'recursiveCharacterTextSplitter',
    label: 'Recursive Text Splitter',
    category: 'textSplitters',
    icon: '✂️',
    description: '再帰的にテキストを分割。最も一般的なスプリッター。',
    color: '#795548',
    inputs: [
      { name: 'chunkSize', label: 'Chunk Size', type: 'number', default: 1000 },
      { name: 'chunkOverlap', label: 'Chunk Overlap', type: 'number', default: 200 },
    ],
    inputHandles: [
      { id: 'document', label: 'Document', type: 'Document', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Document', type: 'Document', position: 'right' },
    ],
  },
  {
    type: 'tokenTextSplitter',
    label: 'Token Text Splitter',
    category: 'textSplitters',
    icon: '🔤',
    description: 'トークン数でテキストを分割。',
    color: '#607D8B',
    inputs: [
      { name: 'chunkSize', label: 'Chunk Size (tokens)', type: 'number', default: 500 },
      { name: 'chunkOverlap', label: 'Chunk Overlap (tokens)', type: 'number', default: 50 },
    ],
    inputHandles: [
      { id: 'document', label: 'Document', type: 'Document', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Document', type: 'Document', position: 'right' },
    ],
  },
];

// ============================================
// Tools (Flowise互換)
// ============================================
export const TOOL_NODES: NodeTypeDefinition[] = [
  {
    type: 'calculator',
    label: 'Calculator',
    category: 'tools',
    icon: '🧮',
    description: '数学的な計算を実行。',
    color: '#607D8B',
    inputs: [],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'Calculator', type: 'Tool', position: 'right' },
    ],
  },
  {
    type: 'serpAPI',
    label: 'SerpAPI (Google Search)',
    category: 'tools',
    icon: '🔍',
    description: 'Google検索を実行。',
    color: '#4285F4',
    inputs: [
      { name: 'serpApiKey', label: 'SerpAPI Key', type: 'password' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'SerpAPI', type: 'Tool', position: 'right' },
    ],
  },
  {
    type: 'braveSearch',
    label: 'Brave Search',
    category: 'tools',
    icon: '🦁',
    description: 'Brave Searchを使用したWeb検索。',
    color: '#FB542B',
    inputs: [
      { name: 'braveApiKey', label: 'Brave API Key', type: 'password' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'BraveSearch', type: 'Tool', position: 'right' },
    ],
  },
  {
    type: 'webBrowser',
    label: 'Web Browser',
    category: 'tools',
    icon: '🌐',
    description: 'Webページの内容を取得・解析。',
    color: '#2196F3',
    inputs: [],
    inputHandles: [
      { id: 'model', label: 'Chat Model', type: 'BaseChatModel', position: 'left' },
      { id: 'embeddings', label: 'Embeddings', type: 'Embeddings', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'WebBrowser', type: 'Tool', position: 'right' },
    ],
  },
  {
    type: 'retrieverTool',
    label: 'Retriever Tool',
    category: 'tools',
    icon: '🔎',
    description: 'Vector Storeから情報を検索するツール。',
    color: '#9C27B0',
    inputs: [
      { name: 'name', label: 'Tool Name', type: 'string', required: true },
      { name: 'description', label: 'Tool Description', type: 'text', required: true },
    ],
    inputHandles: [
      { id: 'vectorStore', label: 'Vector Store', type: 'VectorStore', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'RetrieverTool', type: 'Tool', position: 'right' },
    ],
  },
  {
    type: 'customTool',
    label: 'Custom Tool',
    category: 'tools',
    icon: '🔧',
    description: 'JavaScriptでカスタムツールを定義。',
    color: '#FF9800',
    inputs: [
      { name: 'name', label: 'Tool Name', type: 'string', required: true },
      { name: 'description', label: 'Tool Description', type: 'text', required: true },
      { name: 'code', label: 'JavaScript Code', type: 'text', required: true, placeholder: 'return "Hello World"' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'CustomTool', type: 'Tool', position: 'right' },
    ],
  },
];

// ============================================
// Agents (Flowise互換)
// ============================================
export const AGENT_NODES: NodeTypeDefinition[] = [
  {
    type: 'openAIFunctionAgent',
    label: 'OpenAI Function Agent',
    category: 'agents',
    icon: '🤖',
    description: 'OpenAI Function Callingを使用したエージェント。',
    color: '#10A37F',
    inputs: [
      { name: 'systemMessage', label: 'System Message', type: 'text', placeholder: 'You are a helpful assistant.' },
    ],
    inputHandles: [
      { id: 'model', label: 'Chat Model', type: 'BaseChatModel', position: 'left' },
      { id: 'tools', label: 'Tools', type: 'Tool', position: 'left' },
      { id: 'memory', label: 'Memory', type: 'BaseMemory', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Agent', type: 'AgentExecutor', position: 'right' },
    ],
  },
  {
    type: 'conversationalRetrievalAgent',
    label: 'Conversational Retrieval Agent',
    category: 'agents',
    icon: '💬',
    description: 'RAGを使用した会話型エージェント。',
    color: '#2196F3',
    inputs: [
      { name: 'systemMessage', label: 'System Message', type: 'text' },
    ],
    inputHandles: [
      { id: 'model', label: 'Chat Model', type: 'BaseChatModel', position: 'left' },
      { id: 'vectorStore', label: 'Vector Store', type: 'VectorStore', position: 'left' },
      { id: 'memory', label: 'Memory', type: 'BaseMemory', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Agent', type: 'AgentExecutor', position: 'right' },
    ],
  },
  {
    type: 'toolAgent',
    label: 'Tool Agent',
    category: 'agents',
    icon: '🔧',
    description: '複数のツールを使用できる汎用エージェント。',
    color: '#E91E63',
    inputs: [
      { name: 'systemMessage', label: 'System Message', type: 'text' },
      { name: 'maxIterations', label: 'Max Iterations', type: 'number', default: 10 },
    ],
    inputHandles: [
      { id: 'model', label: 'Chat Model', type: 'BaseChatModel', position: 'left' },
      { id: 'tools', label: 'Tools', type: 'Tool', position: 'left' },
      { id: 'memory', label: 'Memory', type: 'BaseMemory', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Agent', type: 'AgentExecutor', position: 'right' },
    ],
  },
];

// ============================================
// Chains (Flowise互換 - 終端ノード)
// ============================================
export const CHAIN_NODES: NodeTypeDefinition[] = [
  {
    type: 'conversationChain',
    label: 'Conversation Chain',
    category: 'chains',
    icon: '🔗',
    description: '会話チェーン。シンプルなチャット機能。終端ノード。',
    color: '#2196F3',
    inputs: [
      { name: 'systemMessage', label: 'System Message', type: 'text', placeholder: 'You are a helpful assistant...' },
    ],
    inputHandles: [
      { id: 'model', label: 'Chat Model', type: 'BaseChatModel', position: 'left' },
      { id: 'memory', label: 'Memory', type: 'BaseMemory', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'Chain', position: 'right' },
    ],
  },
  {
    type: 'llmChain',
    label: 'LLM Chain',
    category: 'chains',
    icon: '⛓️',
    description: 'プロンプトテンプレートとLLMを組み合わせ。終端ノード。',
    color: '#3F51B5',
    inputs: [],
    inputHandles: [
      { id: 'model', label: 'Language Model', type: 'BaseChatModel', position: 'left' },
      { id: 'prompt', label: 'Prompt Template', type: 'BasePromptTemplate', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'Chain', position: 'right' },
    ],
  },
  {
    type: 'conversationalRetrievalQAChain',
    label: 'Conversational Retrieval QA',
    category: 'chains',
    icon: '📚',
    description: 'RAGを使用した質問応答チェーン。終端ノード。',
    color: '#9C27B0',
    inputs: [
      { name: 'returnSourceDocuments', label: 'Return Source Documents', type: 'boolean', default: true },
      { name: 'systemMessage', label: 'System Message', type: 'text' },
    ],
    inputHandles: [
      { id: 'model', label: 'Chat Model', type: 'BaseChatModel', position: 'left' },
      { id: 'vectorStore', label: 'Vector Store', type: 'VectorStore', position: 'left' },
      { id: 'memory', label: 'Memory', type: 'BaseMemory', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'Chain', position: 'right' },
    ],
  },
  {
    type: 'retrievalQAChain',
    label: 'Retrieval QA Chain',
    category: 'chains',
    icon: '🔎',
    description: 'シンプルなRAG質問応答チェーン。終端ノード。',
    color: '#673AB7',
    inputs: [],
    inputHandles: [
      { id: 'model', label: 'Chat Model', type: 'BaseChatModel', position: 'left' },
      { id: 'vectorStore', label: 'Vector Store', type: 'VectorStore', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'Chain', position: 'right' },
    ],
  },
];

// ============================================
// Memory (Flowise互換)
// ============================================
export const MEMORY_NODES: NodeTypeDefinition[] = [
  {
    type: 'bufferMemory',
    label: 'Buffer Memory',
    category: 'memory',
    icon: '💾',
    description: 'シンプルな会話履歴メモリ。',
    color: '#673AB7',
    inputs: [
      { name: 'memoryKey', label: 'Memory Key', type: 'string', default: 'chat_history' },
      { name: 'sessionId', label: 'Session ID', type: 'string' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'Memory', type: 'BaseMemory', position: 'right' },
    ],
  },
  {
    type: 'bufferWindowMemory',
    label: 'Buffer Window Memory',
    category: 'memory',
    icon: '🪟',
    description: '直近N件の会話のみを保持するメモリ。',
    color: '#9C27B0',
    inputs: [
      { name: 'k', label: 'Window Size (K)', type: 'number', default: 5 },
      { name: 'memoryKey', label: 'Memory Key', type: 'string', default: 'chat_history' },
      { name: 'sessionId', label: 'Session ID', type: 'string' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'Memory', type: 'BaseMemory', position: 'right' },
    ],
  },
  {
    type: 'conversationSummaryMemory',
    label: 'Conversation Summary Memory',
    category: 'memory',
    icon: '📝',
    description: '会話を要約して保持するメモリ。長い会話向け。',
    color: '#E91E63',
    inputs: [
      { name: 'memoryKey', label: 'Memory Key', type: 'string', default: 'chat_history' },
      { name: 'sessionId', label: 'Session ID', type: 'string' },
    ],
    inputHandles: [
      { id: 'model', label: 'Chat Model', type: 'BaseChatModel', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Memory', type: 'BaseMemory', position: 'right' },
    ],
  },
  {
    type: 'redisBackedChatMemory',
    label: 'Redis Chat Memory',
    category: 'memory',
    icon: '🔴',
    description: 'Redisで会話履歴を永続化。',
    color: '#D82C20',
    inputs: [
      { name: 'redisUrl', label: 'Redis URL', type: 'string', default: 'redis://localhost:6379' },
      { name: 'sessionId', label: 'Session ID', type: 'string', required: true },
      { name: 'sessionTTL', label: 'Session TTL (seconds)', type: 'number', default: 3600 },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'Memory', type: 'BaseMemory', position: 'right' },
    ],
  },
];

// ============================================
// Prompts (Flowise互換)
// ============================================
export const PROMPT_NODES: NodeTypeDefinition[] = [
  {
    type: 'promptTemplate',
    label: 'Prompt Template',
    category: 'prompts',
    icon: '📝',
    description: '変数を含むプロンプトテンプレート。',
    color: '#FF9800',
    inputs: [
      { name: 'template', label: 'Template', type: 'text', required: true, placeholder: '質問: {input}\n回答:' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'Prompt', type: 'BasePromptTemplate', position: 'right' },
    ],
  },
  {
    type: 'chatPromptTemplate',
    label: 'Chat Prompt Template',
    category: 'prompts',
    icon: '💬',
    description: 'チャット形式のプロンプトテンプレート。',
    color: '#FFC107',
    inputs: [
      { name: 'systemMessage', label: 'System Message', type: 'text', placeholder: 'You are a helpful assistant.' },
      { name: 'humanMessage', label: 'Human Message', type: 'text', default: '{input}' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'ChatPrompt', type: 'BasePromptTemplate', position: 'right' },
    ],
  },
  {
    type: 'fewShotPromptTemplate',
    label: 'Few-Shot Prompt Template',
    category: 'prompts',
    icon: '📚',
    description: '例を含むFew-shotプロンプトテンプレート。',
    color: '#FF5722',
    inputs: [
      { name: 'examplePrompt', label: 'Example Prompt', type: 'text', required: true },
      { name: 'examples', label: 'Examples (JSON)', type: 'json', required: true },
      { name: 'prefix', label: 'Prefix', type: 'text' },
      { name: 'suffix', label: 'Suffix', type: 'text' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'FewShotPrompt', type: 'BasePromptTemplate', position: 'right' },
    ],
  },
];

// ============================================
// Output Parsers (Flowise互換)
// ============================================
export const OUTPUT_PARSER_NODES: NodeTypeDefinition[] = [
  {
    type: 'structuredOutputParser',
    label: 'Structured Output Parser',
    category: 'outputParsers',
    icon: '📤',
    description: 'LLM出力を構造化データに変換。',
    color: '#009688',
    inputs: [
      { name: 'jsonSchema', label: 'JSON Schema', type: 'json', required: true },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'OutputParser', type: 'BaseOutputParser', position: 'right' },
    ],
  },
  {
    type: 'csvOutputParser',
    label: 'CSV Output Parser',
    category: 'outputParsers',
    icon: '📊',
    description: 'LLM出力をCSV形式に変換。',
    color: '#4CAF50',
    inputs: [],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'OutputParser', type: 'BaseOutputParser', position: 'right' },
    ],
  },
];

// ============================================
// 全ノード定義の統合
// ============================================
export const ALL_NODE_DEFINITIONS: NodeTypeDefinition[] = [
  ...CHAT_MODEL_NODES,
  ...EMBEDDING_NODES,
  ...VECTOR_STORE_NODES,
  ...DOCUMENT_LOADER_NODES,
  ...TEXT_SPLITTER_NODES,
  ...TOOL_NODES,
  ...AGENT_NODES,
  ...CHAIN_NODES,
  ...MEMORY_NODES,
  ...PROMPT_NODES,
  ...OUTPUT_PARSER_NODES,
];

// ============================================
// ヘルパー関数
// ============================================

/**
 * ノードタイプから定義を取得
 */
export function getNodeDefinition(type: string): NodeTypeDefinition | undefined {
  return ALL_NODE_DEFINITIONS.find(def => def.type === type);
}

/**
 * カテゴリからノード定義を取得
 */
export function getNodesByCategory(category: NodeCategory): NodeTypeDefinition[] {
  return ALL_NODE_DEFINITIONS.filter(def => def.category === category);
}

/**
 * カテゴリ定義を取得
 */
export function getCategoryDefinition(id: NodeCategory): CategoryDefinition | undefined {
  return NODE_CATEGORIES.find(cat => cat.id === id);
}

/**
 * カテゴリごとにグループ化されたノード定義を取得
 */
export function getGroupedNodeDefinitions(): Record<NodeCategory, NodeTypeDefinition[]> {
  const grouped: Partial<Record<NodeCategory, NodeTypeDefinition[]>> = {};

  NODE_CATEGORIES.forEach(cat => {
    grouped[cat.id] = [];
  });

  ALL_NODE_DEFINITIONS.forEach(def => {
    if (grouped[def.category]) {
      grouped[def.category]!.push(def);
    }
  });

  return grouped as Record<NodeCategory, NodeTypeDefinition[]>;
}

/**
 * Flowise互換ノードかどうかを判定
 */
export function isFlowiseCompatible(type: string): boolean {
  return ALL_NODE_DEFINITIONS.some(def => def.type === type);
}
