// ============================================
// ノード定義ファイル
// エージェント作成画面で使用する全ノードタイプの定義
// ============================================

// ノードカテゴリ
export type NodeCategory =
  | 'flowControl'
  | 'chatModels'
  | 'embeddings'
  | 'vectorStores'
  | 'documentLoaders'
  | 'memory'
  | 'agents'
  | 'chains'
  | 'tools'
  | 'owlAgent';

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
// カテゴリ定義
// ============================================
export const NODE_CATEGORIES: CategoryDefinition[] = [
  { id: 'flowControl', label: 'Flow Control', icon: '🎯', color: '#8BC34A' },
  { id: 'chatModels', label: 'Chat Models', icon: '💬', color: '#4CAF50' },
  { id: 'embeddings', label: 'Embeddings', icon: '🔤', color: '#2196F3' },
  { id: 'vectorStores', label: 'Vector Stores', icon: '📚', color: '#9C27B0' },
  { id: 'documentLoaders', label: 'Document Loaders', icon: '📄', color: '#FF9800' },
  { id: 'memory', label: 'Memory', icon: '🧠', color: '#E91E63' },
  { id: 'agents', label: 'Agents', icon: '🤖', color: '#00BCD4' },
  { id: 'chains', label: 'Chains', icon: '⛓️', color: '#795548' },
  { id: 'tools', label: 'Tools', icon: '🔧', color: '#607D8B' },
  { id: 'owlAgent', label: 'OwlAgent', icon: '🦉', color: '#FF5722' },
];

// ============================================
// Flow Control (Start/End)
// ============================================
export const FLOW_CONTROL_NODES: NodeTypeDefinition[] = [
  {
    type: 'start',
    label: 'Start',
    category: 'flowControl',
    icon: '▶️',
    description: 'フローの開始地点。ユーザー入力を受け取り、後続のノードに渡します。',
    color: '#8BC34A',
    inputs: [
      { name: 'inputLabel', label: 'Input Label', type: 'string', default: 'question', description: '入力フィールドのラベル' },
      { name: 'inputPlaceholder', label: 'Placeholder', type: 'string', default: 'Enter your question...', description: '入力フィールドのプレースホルダー' },
      { name: 'inputType', label: 'Input Type', type: 'select', default: 'text', description: '入力の種類', options: [
        { label: 'Text', value: 'text' },
        { label: 'Textarea', value: 'textarea' },
        { label: 'File Upload', value: 'file' },
      ]},
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
    ],
  },
  {
    type: 'end',
    label: 'End',
    category: 'flowControl',
    icon: '⏹️',
    description: 'フローの終了地点。最終結果を出力します。',
    color: '#F44336',
    inputs: [
      { name: 'outputFormat', label: 'Output Format', type: 'select', default: 'text', description: '出力のフォーマット', options: [
        { label: 'Text', value: 'text' },
        { label: 'JSON', value: 'json' },
        { label: 'Markdown', value: 'markdown' },
      ]},
      { name: 'successMessage', label: 'Success Message', type: 'string', placeholder: 'Flow completed successfully', description: '成功時のメッセージ' },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
    ],
    outputHandles: [],
  },
  {
    type: 'condition',
    label: 'Condition',
    category: 'flowControl',
    icon: '🔀',
    description: '条件分岐。条件に基づいて異なる経路にフローを振り分けます。',
    color: '#FF9800',
    inputs: [
      { name: 'conditionType', label: 'Condition Type', type: 'select', default: 'contains', description: '条件の種類', options: [
        { label: 'Contains', value: 'contains' },
        { label: 'Equals', value: 'equals' },
        { label: 'Starts With', value: 'startsWith' },
        { label: 'Ends With', value: 'endsWith' },
        { label: 'Regex Match', value: 'regex' },
        { label: 'Is Empty', value: 'isEmpty' },
        { label: 'Custom JavaScript', value: 'custom' },
      ]},
      { name: 'conditionValue', label: 'Condition Value', type: 'string', description: '比較する値またはパターン' },
      { name: 'customCode', label: 'Custom Code', type: 'text', placeholder: 'return input.length > 10;', description: 'カスタム条件（JavaScriptコード）' },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'true', label: 'True', type: 'any', position: 'right' },
      { id: 'false', label: 'False', type: 'any', position: 'right' },
    ],
  },
  {
    type: 'loop',
    label: 'Loop',
    category: 'flowControl',
    icon: '🔄',
    description: 'ループ処理。配列の各要素に対して処理を繰り返します。',
    color: '#9C27B0',
    inputs: [
      { name: 'maxIterations', label: 'Max Iterations', type: 'number', default: 100, min: 1, max: 1000, description: '最大ループ回数' },
      { name: 'itemVariable', label: 'Item Variable', type: 'string', default: 'item', description: '各要素を格納する変数名' },
      { name: 'indexVariable', label: 'Index Variable', type: 'string', default: 'index', description: 'インデックスを格納する変数名' },
    ],
    inputHandles: [
      { id: 'array', label: 'Array', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'item', label: 'Each Item', type: 'any', position: 'right' },
      { id: 'complete', label: 'Complete', type: 'any', position: 'bottom' },
    ],
  },
];

// ============================================
// Chat Models
// ============================================
export const CHAT_MODEL_NODES: NodeTypeDefinition[] = [
  {
    type: 'azureChatOpenAI',
    label: 'Azure ChatOpenAI',
    category: 'chatModels',
    icon: '💬',
    description: 'Azure OpenAI Serviceを使用したチャットモデル。GPT-4、GPT-4o、GPT-3.5 Turboなどのモデルを利用可能。',
    color: '#4CAF50',
    inputs: [
      { name: 'deploymentName', label: 'Deployment Name', type: 'string', required: true, placeholder: 'gpt-4-deployment', description: 'Azure OpenAIでデプロイしたモデルの名前' },
      { name: 'modelName', label: 'Model Name', type: 'select', required: true, default: 'gpt-4', description: '使用するモデルの種類', options: [
        { label: 'GPT-4', value: 'gpt-4' },
        { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
        { label: 'GPT-4o', value: 'gpt-4o' },
        { label: 'GPT-4o mini', value: 'gpt-4o-mini' },
        { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
      ]},
      { name: 'systemMessage', label: 'System Message', type: 'text', placeholder: 'You are a helpful assistant...', description: 'AIの役割を定義するシステムメッセージ' },
      { name: 'temperature', label: 'Temperature', type: 'number', default: 0.7, min: 0, max: 2, step: 0.1, description: '応答のランダム性。0は決定論的、2は最もランダム' },
      { name: 'maxTokens', label: 'Max Tokens', type: 'number', default: 2000, min: 1, max: 128000, description: '生成する最大トークン数' },
      { name: 'topP', label: 'Top P', type: 'number', default: 1, min: 0, max: 1, step: 0.1, description: '核サンプリング。確率質量の上位P%からサンプリング' },
      { name: 'frequencyPenalty', label: 'Frequency Penalty', type: 'number', default: 0, min: 0, max: 2, step: 0.1, description: '頻度に基づくペナルティ。高いほど同じ単語の繰り返しを抑制' },
      { name: 'presencePenalty', label: 'Presence Penalty', type: 'number', default: 0, min: 0, max: 2, step: 0.1, description: '存在に基づくペナルティ。高いほど新しいトピックへの言及を促進' },
      { name: 'azureApiKey', label: 'Azure API Key', type: 'password', required: true, description: 'Azure OpenAIのAPIキー' },
      { name: 'azureEndpoint', label: 'Azure Endpoint', type: 'string', required: true, placeholder: 'https://xxx.openai.azure.com/', description: 'Azure OpenAIリソースのエンドポイントURL' },
      { name: 'apiVersion', label: 'API Version', type: 'select', default: '2024-02-15-preview', description: 'Azure OpenAI APIのバージョン', options: [
        { label: '2024-08-01-preview', value: '2024-08-01-preview' },
        { label: '2024-05-01-preview', value: '2024-05-01-preview' },
        { label: '2024-02-15-preview', value: '2024-02-15-preview' },
        { label: '2023-12-01-preview', value: '2023-12-01-preview' },
      ]},
      { name: 'timeout', label: 'Timeout', type: 'number', default: 60000, min: 1000, max: 300000, description: 'リクエストのタイムアウト時間（ミリ秒）' },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
      { id: 'chatModel', label: 'Chat Model', type: 'chatModel', position: 'bottom' },
    ],
  },
];

// ============================================
// Embeddings
// ============================================
export const EMBEDDING_NODES: NodeTypeDefinition[] = [
  {
    type: 'azureOpenAIEmbeddings',
    label: 'Azure OpenAI Embeddings',
    category: 'embeddings',
    icon: '🔤',
    description: 'Azure OpenAIの埋め込みモデルを使用してテキストをベクトルに変換。ベクトル検索やセマンティック検索に使用。',
    color: '#2196F3',
    inputs: [
      { name: 'deploymentName', label: 'Deployment Name', type: 'string', required: true, placeholder: 'text-embedding-ada-002', description: 'Azure OpenAIでデプロイした埋め込みモデルの名前' },
      { name: 'modelName', label: 'Model Name', type: 'select', required: true, default: 'text-embedding-ada-002', description: '使用する埋め込みモデル。text-embedding-3-largeが最高精度', options: [
        { label: 'text-embedding-ada-002', value: 'text-embedding-ada-002' },
        { label: 'text-embedding-3-small', value: 'text-embedding-3-small' },
        { label: 'text-embedding-3-large', value: 'text-embedding-3-large' },
      ]},
      { name: 'azureApiKey', label: 'Azure API Key', type: 'password', required: true, description: 'Azure OpenAIのAPIキー' },
      { name: 'azureEndpoint', label: 'Azure Endpoint', type: 'string', required: true, description: 'Azure OpenAIリソースのエンドポイントURL' },
      { name: 'apiVersion', label: 'API Version', type: 'string', default: '2024-02-15-preview', description: 'Azure OpenAI APIのバージョン' },
      { name: 'batchSize', label: 'Batch Size', type: 'number', default: 512, min: 1, max: 2048, description: '一度に処理するテキストの数' },
      { name: 'stripNewLines', label: 'Strip New Lines', type: 'boolean', default: true, description: 'テキストから改行を削除するか' },
      { name: 'dimensions', label: 'Dimensions', type: 'number', min: 1, max: 3072, description: 'text-embedding-3モデル用の埋め込み次元数（オプション）' },
    ],
    inputHandles: [
      { id: 'input', label: 'Text Input', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Vectors', type: 'any', position: 'right' },
      { id: 'embeddings', label: 'Embeddings', type: 'embeddings', position: 'bottom' },
    ],
  },
];

// ============================================
// Vector Stores
// ============================================
export const VECTOR_STORE_NODES: NodeTypeDefinition[] = [
  {
    type: 'weaviate',
    label: 'Weaviate',
    category: 'vectorStores',
    icon: '📚',
    description: 'Weaviateベクターデータベース。セマンティック検索、ハイブリッド検索、フィルタリング機能を提供。',
    color: '#9C27B0',
    inputs: [
      { name: 'scheme', label: 'Scheme', type: 'select', default: 'http', description: '接続プロトコル', options: [
        { label: 'HTTP', value: 'http' },
        { label: 'HTTPS', value: 'https' },
      ]},
      { name: 'host', label: 'Host', type: 'string', required: true, placeholder: 'localhost:8080', description: 'Weaviateサーバーのホストとポート' },
      { name: 'indexName', label: 'Index/Class Name', type: 'string', required: true, description: 'データを格納するクラス（コレクション）名' },
      { name: 'apiKey', label: 'API Key', type: 'password', description: 'Weaviate Cloud認証用のAPIキー（オプション）' },
      { name: 'textKey', label: 'Text Key', type: 'string', default: 'text', description: 'テキストコンテンツを格納するプロパティ名' },
      { name: 'metadataKeys', label: 'Metadata Keys', type: 'string', placeholder: 'key1,key2,key3', description: 'メタデータとして保存するキー（カンマ区切り）' },
      { name: 'topK', label: 'Top K', type: 'number', default: 4, min: 1, max: 100, description: '検索結果として返す上位K件' },
      { name: 'weaviateMetadataFilter', label: 'Metadata Filter', type: 'json', placeholder: '{"category": "技術"}', description: 'メタデータによるフィルタリング条件' },
    ],
    inputHandles: [
      { id: 'input', label: 'Query', type: 'any', position: 'left' },
      { id: 'embeddings', label: 'Embeddings', type: 'embeddings', position: 'top' },
      { id: 'document', label: 'Document', type: 'document', position: 'top', multiple: true },
    ],
    outputHandles: [
      { id: 'output', label: 'Results', type: 'any', position: 'right' },
      { id: 'retriever', label: 'Retriever', type: 'retriever', position: 'bottom' },
      { id: 'vectorStore', label: 'Vector Store', type: 'vectorStore', position: 'bottom' },
    ],
  },
];

// ============================================
// Document Loaders
// ============================================
export const DOCUMENT_LOADER_NODES: NodeTypeDefinition[] = [
  {
    type: 'pdfLoader',
    label: 'PDF Loader',
    category: 'documentLoaders',
    icon: '📄',
    description: 'PDFファイル読み込み',
    color: '#FF9800',
    inputs: [
      { name: 'file', label: 'PDF File', type: 'file', required: true },
      { name: 'splitPages', label: 'Split Pages', type: 'boolean', default: true },
    ],
    inputHandles: [
      { id: 'input', label: 'File Path', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Content', type: 'any', position: 'right' },
      { id: 'document', label: 'Document', type: 'document', position: 'bottom' },
    ],
  },
  {
    type: 'docxLoader',
    label: 'DOCX Loader',
    category: 'documentLoaders',
    icon: '📝',
    description: 'Microsoft Word読み込み',
    color: '#FF9800',
    inputs: [
      { name: 'file', label: 'DOCX File', type: 'file', required: true },
    ],
    inputHandles: [
      { id: 'input', label: 'File Path', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Content', type: 'any', position: 'right' },
      { id: 'document', label: 'Document', type: 'document', position: 'bottom' },
    ],
  },
  {
    type: 'excelLoader',
    label: 'Excel Loader',
    category: 'documentLoaders',
    icon: '📊',
    description: 'Microsoft Excel読み込み',
    color: '#FF9800',
    inputs: [
      { name: 'file', label: 'Excel File', type: 'file', required: true },
      { name: 'sheetName', label: 'Sheet Name', type: 'string', placeholder: 'Sheet1' },
    ],
    inputHandles: [
      { id: 'input', label: 'File Path', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Content', type: 'any', position: 'right' },
      { id: 'document', label: 'Document', type: 'document', position: 'bottom' },
    ],
  },
  {
    type: 'pptxLoader',
    label: 'PowerPoint Loader',
    category: 'documentLoaders',
    icon: '📽️',
    description: 'Microsoft PowerPoint読み込み',
    color: '#FF9800',
    inputs: [
      { name: 'file', label: 'PPTX File', type: 'file', required: true },
    ],
    inputHandles: [
      { id: 'input', label: 'File Path', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Content', type: 'any', position: 'right' },
      { id: 'document', label: 'Document', type: 'document', position: 'bottom' },
    ],
  },
  {
    type: 'csvLoader',
    label: 'CSV Loader',
    category: 'documentLoaders',
    icon: '📋',
    description: 'CSVファイル読み込み',
    color: '#FF9800',
    inputs: [
      { name: 'file', label: 'CSV File', type: 'file', required: true },
      { name: 'columnName', label: 'Column Name', type: 'string', placeholder: 'content' },
      { name: 'separator', label: 'Separator', type: 'string', default: ',' },
    ],
    inputHandles: [
      { id: 'input', label: 'File Path', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Content', type: 'any', position: 'right' },
      { id: 'document', label: 'Document', type: 'document', position: 'bottom' },
    ],
  },
  {
    type: 'jsonLoader',
    label: 'JSON Loader',
    category: 'documentLoaders',
    icon: '🔧',
    description: 'JSONファイル読み込み',
    color: '#FF9800',
    inputs: [
      { name: 'file', label: 'JSON File', type: 'file', required: true },
      { name: 'pointer', label: 'JSON Pointer', type: 'string', placeholder: '/data/items' },
    ],
    inputHandles: [
      { id: 'input', label: 'File Path', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Content', type: 'any', position: 'right' },
      { id: 'document', label: 'Document', type: 'document', position: 'bottom' },
    ],
  },
  {
    type: 'jsonlLoader',
    label: 'JSONL Loader',
    category: 'documentLoaders',
    icon: '📃',
    description: 'JSON Linesファイル読み込み',
    color: '#FF9800',
    inputs: [
      { name: 'file', label: 'JSONL File', type: 'file', required: true },
      { name: 'pointer', label: 'JSON Pointer', type: 'string' },
    ],
    inputHandles: [
      { id: 'input', label: 'File Path', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Content', type: 'any', position: 'right' },
      { id: 'document', label: 'Document', type: 'document', position: 'bottom' },
    ],
  },
  {
    type: 'textLoader',
    label: 'Plain Text Loader',
    category: 'documentLoaders',
    icon: '📰',
    description: 'テキストファイル読み込み',
    color: '#FF9800',
    inputs: [
      { name: 'file', label: 'Text File', type: 'file', required: true },
    ],
    inputHandles: [
      { id: 'input', label: 'File Path', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Content', type: 'any', position: 'right' },
      { id: 'document', label: 'Document', type: 'document', position: 'bottom' },
    ],
  },
];

// ============================================
// Memory
// ============================================
export const MEMORY_NODES: NodeTypeDefinition[] = [
  {
    type: 'redisMemory',
    label: 'Redis-Backed Chat Memory',
    category: 'memory',
    icon: '🧠',
    description: 'Redisに会話履歴を永続化。セッション間での会話継続、スケーラブルなメモリ管理を実現。',
    color: '#E91E63',
    inputs: [
      { name: 'redisUrl', label: 'Redis URL', type: 'string', required: true, placeholder: 'redis://localhost:6379', description: 'Redis接続URL（redis://host:port形式）' },
      { name: 'sessionId', label: 'Session ID', type: 'string', placeholder: 'auto-generated if empty', description: '会話セッションの識別子。空の場合は自動生成' },
      { name: 'sessionTTL', label: 'Session TTL', type: 'number', default: 3600, min: 0, description: 'セッションの有効期限（秒）。0は無期限' },
      { name: 'memoryKey', label: 'Memory Key', type: 'string', default: 'chat_history', description: '会話履歴を格納するキー名' },
      { name: 'windowSize', label: 'Window Size', type: 'number', default: 10, min: 1, max: 100, description: '保持する会話ターン数' },
      { name: 'inputKey', label: 'Input Key', type: 'string', default: 'input', description: 'ユーザー入力を格納するキー' },
      { name: 'outputKey', label: 'Output Key', type: 'string', default: 'output', description: 'AI応答を格納するキー' },
      { name: 'returnMessages', label: 'Return Messages', type: 'boolean', default: true, description: 'メッセージオブジェクトとして返すか' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'memory', label: 'Memory', type: 'memory', position: 'right' },
    ],
  },
  {
    type: 'bufferMemory',
    label: 'Buffer Memory',
    category: 'memory',
    icon: '📝',
    description: 'インメモリの会話履歴。シンプルで高速だが、サーバー再起動で消失。',
    color: '#E91E63',
    inputs: [
      { name: 'sessionId', label: 'Session ID', type: 'string', placeholder: 'auto-generated if empty', description: '会話セッションの識別子' },
      { name: 'memoryKey', label: 'Memory Key', type: 'string', default: 'chat_history', description: '会話履歴を格納するキー名' },
      { name: 'inputKey', label: 'Input Key', type: 'string', default: 'input', description: 'ユーザー入力を格納するキー' },
      { name: 'outputKey', label: 'Output Key', type: 'string', default: 'output', description: 'AI応答を格納するキー' },
      { name: 'returnMessages', label: 'Return Messages', type: 'boolean', default: true, description: 'メッセージオブジェクトとして返すか' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'memory', label: 'Memory', type: 'memory', position: 'right' },
    ],
  },
  {
    type: 'bufferWindowMemory',
    label: 'Buffer Window Memory',
    category: 'memory',
    icon: '🪟',
    description: '直近K回の会話のみを保持するメモリ。長い会話でもトークン数を制限可能。',
    color: '#E91E63',
    inputs: [
      { name: 'sessionId', label: 'Session ID', type: 'string', placeholder: 'auto-generated if empty', description: '会話セッションの識別子' },
      { name: 'k', label: 'Window Size (K)', type: 'number', default: 5, min: 1, max: 50, description: '保持する会話ターン数' },
      { name: 'memoryKey', label: 'Memory Key', type: 'string', default: 'chat_history', description: '会話履歴を格納するキー名' },
      { name: 'returnMessages', label: 'Return Messages', type: 'boolean', default: true, description: 'メッセージオブジェクトとして返すか' },
    ],
    inputHandles: [],
    outputHandles: [
      { id: 'memory', label: 'Memory', type: 'memory', position: 'right' },
    ],
  },
];

// ============================================
// Agents
// ============================================
export const AGENT_NODES: NodeTypeDefinition[] = [
  {
    type: 'conversationalAgent',
    label: 'Conversational Agent',
    category: 'agents',
    icon: '💬',
    description: '対話型エージェント',
    color: '#00BCD4',
    inputs: [
      { name: 'systemMessage', label: 'System Message', type: 'text', placeholder: 'You are a helpful assistant...' },
      { name: 'maxIterations', label: 'Max Iterations', type: 'number', default: 10, min: 1, max: 50 },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
      { id: 'chatModel', label: 'Chat Model', type: 'chatModel', position: 'top' },
      { id: 'tools', label: 'Tools', type: 'tool', position: 'top', multiple: true },
      { id: 'memory', label: 'Memory', type: 'memory', position: 'bottom' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
      { id: 'agent', label: 'Agent', type: 'agent', position: 'bottom' },
    ],
  },
  {
    type: 'conversationalRetrievalAgent',
    label: 'Conversational Retrieval Agent',
    category: 'agents',
    icon: '🔍',
    description: '対話+検索エージェント',
    color: '#00BCD4',
    inputs: [
      { name: 'systemMessage', label: 'System Message', type: 'text' },
      { name: 'maxIterations', label: 'Max Iterations', type: 'number', default: 10, min: 1, max: 50 },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
      { id: 'chatModel', label: 'Chat Model', type: 'chatModel', position: 'top' },
      { id: 'retriever', label: 'Retriever', type: 'retriever', position: 'top' },
      { id: 'tools', label: 'Tools', type: 'tool', position: 'top', multiple: true },
      { id: 'memory', label: 'Memory', type: 'memory', position: 'bottom' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
      { id: 'agent', label: 'Agent', type: 'agent', position: 'bottom' },
    ],
  },
  {
    type: 'openAIAssistant',
    label: 'OpenAI Assistant',
    category: 'agents',
    icon: '🎓',
    description: 'OpenAI Assistant API連携',
    color: '#00BCD4',
    inputs: [
      { name: 'assistantId', label: 'Assistant ID', type: 'string', required: true },
      { name: 'openAIApiKey', label: 'OpenAI API Key', type: 'password', required: true },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
      { id: 'agent', label: 'Agent', type: 'agent', position: 'bottom' },
    ],
  },
  {
    type: 'openAIFunctionAgent',
    label: 'OpenAI Function Agent',
    category: 'agents',
    icon: '⚙️',
    description: 'OpenAI Function Calling対応',
    color: '#00BCD4',
    inputs: [
      { name: 'systemMessage', label: 'System Message', type: 'text' },
      { name: 'maxIterations', label: 'Max Iterations', type: 'number', default: 10 },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
      { id: 'chatModel', label: 'Chat Model', type: 'chatModel', position: 'top' },
      { id: 'tools', label: 'Tools', type: 'tool', position: 'top', multiple: true },
      { id: 'memory', label: 'Memory', type: 'memory', position: 'bottom' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
      { id: 'agent', label: 'Agent', type: 'agent', position: 'bottom' },
    ],
  },
  {
    type: 'openAIToolAgent',
    label: 'OpenAI Tool Agent',
    category: 'agents',
    icon: '🛠️',
    description: 'OpenAI Tool Use対応',
    color: '#00BCD4',
    inputs: [
      { name: 'systemMessage', label: 'System Message', type: 'text' },
      { name: 'maxIterations', label: 'Max Iterations', type: 'number', default: 10 },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
      { id: 'chatModel', label: 'Chat Model', type: 'chatModel', position: 'top' },
      { id: 'tools', label: 'Tools', type: 'tool', position: 'top', multiple: true },
      { id: 'memory', label: 'Memory', type: 'memory', position: 'bottom' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
      { id: 'agent', label: 'Agent', type: 'agent', position: 'bottom' },
    ],
  },
  {
    type: 'reactAgentChat',
    label: 'ReAct Agent Chat',
    category: 'agents',
    icon: '🧠',
    description: 'ReAct推論（チャット形式）',
    color: '#00BCD4',
    inputs: [
      { name: 'systemMessage', label: 'System Message', type: 'text' },
      { name: 'maxIterations', label: 'Max Iterations', type: 'number', default: 10 },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
      { id: 'chatModel', label: 'Chat Model', type: 'chatModel', position: 'top' },
      { id: 'tools', label: 'Tools', type: 'tool', position: 'top', multiple: true },
      { id: 'memory', label: 'Memory', type: 'memory', position: 'bottom' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
      { id: 'agent', label: 'Agent', type: 'agent', position: 'bottom' },
    ],
  },
  {
    type: 'toolAgent',
    label: 'Tool Agent',
    category: 'agents',
    icon: '🔧',
    description: '汎用ツールエージェント',
    color: '#00BCD4',
    inputs: [
      { name: 'systemMessage', label: 'System Message', type: 'text' },
      { name: 'maxIterations', label: 'Max Iterations', type: 'number', default: 10 },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
      { id: 'chatModel', label: 'Chat Model', type: 'chatModel', position: 'top' },
      { id: 'tools', label: 'Tools', type: 'tool', position: 'top', multiple: true },
      { id: 'memory', label: 'Memory', type: 'memory', position: 'bottom' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
      { id: 'agent', label: 'Agent', type: 'agent', position: 'bottom' },
    ],
  },
];

// ============================================
// Chains
// ============================================
export const CHAIN_NODES: NodeTypeDefinition[] = [
  {
    type: 'llmChain',
    label: 'LLM Chain',
    category: 'chains',
    icon: '⛓️',
    description: '基本LLMチェーン',
    color: '#795548',
    inputs: [
      { name: 'promptTemplate', label: 'Prompt Template', type: 'text', required: true, placeholder: 'You are a helpful assistant. {input}' },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
      { id: 'chatModel', label: 'Chat Model', type: 'chatModel', position: 'top' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
      { id: 'chain', label: 'Chain', type: 'chain', position: 'bottom' },
    ],
  },
  {
    type: 'conversationChain',
    label: 'Conversation Chain',
    category: 'chains',
    icon: '💬',
    description: '対話管理チェーン',
    color: '#795548',
    inputs: [
      { name: 'systemMessage', label: 'System Message', type: 'text' },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
      { id: 'chatModel', label: 'Chat Model', type: 'chatModel', position: 'top' },
      { id: 'memory', label: 'Memory', type: 'memory', position: 'bottom' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
      { id: 'chain', label: 'Chain', type: 'chain', position: 'bottom' },
    ],
  },
  {
    type: 'retrievalQAChain',
    label: 'Retrieval QA Chain',
    category: 'chains',
    icon: '🔎',
    description: '検索QAチェーン',
    color: '#795548',
    inputs: [
      { name: 'returnSourceDocuments', label: 'Return Source Documents', type: 'boolean', default: true },
      { name: 'topK', label: 'Top K', type: 'number', default: 4, min: 1, max: 20 },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
      { id: 'chatModel', label: 'Chat Model', type: 'chatModel', position: 'top' },
      { id: 'retriever', label: 'Retriever', type: 'retriever', position: 'top' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
      { id: 'chain', label: 'Chain', type: 'chain', position: 'bottom' },
    ],
  },
  {
    type: 'conversationalRetrievalQAChain',
    label: 'Conversational Retrieval QA Chain',
    category: 'chains',
    icon: '🔍',
    description: '対話+検索QAチェーン',
    color: '#795548',
    inputs: [
      { name: 'returnSourceDocuments', label: 'Return Source Documents', type: 'boolean', default: true },
      { name: 'topK', label: 'Top K', type: 'number', default: 4 },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
      { id: 'chatModel', label: 'Chat Model', type: 'chatModel', position: 'top' },
      { id: 'retriever', label: 'Retriever', type: 'retriever', position: 'top' },
      { id: 'memory', label: 'Memory', type: 'memory', position: 'bottom' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
      { id: 'chain', label: 'Chain', type: 'chain', position: 'bottom' },
    ],
  },
  {
    type: 'apiChainGet',
    label: 'GET API Chain',
    category: 'chains',
    icon: '🌐',
    description: 'GET APIリクエストチェーン',
    color: '#795548',
    inputs: [
      { name: 'apiUrl', label: 'API URL', type: 'string', required: true },
      { name: 'headers', label: 'Headers', type: 'json', placeholder: '{"Authorization": "Bearer xxx"}' },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
      { id: 'chatModel', label: 'Chat Model', type: 'chatModel', position: 'top' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
      { id: 'chain', label: 'Chain', type: 'chain', position: 'bottom' },
    ],
  },
  {
    type: 'apiChainPost',
    label: 'POST API Chain',
    category: 'chains',
    icon: '📮',
    description: 'POST APIリクエストチェーン',
    color: '#795548',
    inputs: [
      { name: 'apiUrl', label: 'API URL', type: 'string', required: true },
      { name: 'headers', label: 'Headers', type: 'json' },
      { name: 'body', label: 'Request Body', type: 'json' },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
      { id: 'chatModel', label: 'Chat Model', type: 'chatModel', position: 'top' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
      { id: 'chain', label: 'Chain', type: 'chain', position: 'bottom' },
    ],
  },
  {
    type: 'sqlDatabaseChain',
    label: 'SQL Database Chain',
    category: 'chains',
    icon: '🗄️',
    description: 'SQLデータベースチェーン',
    color: '#795548',
    inputs: [
      { name: 'connectionString', label: 'Connection String', type: 'password', required: true },
      { name: 'includeTables', label: 'Include Tables', type: 'string', placeholder: 'table1,table2' },
      { name: 'excludeTables', label: 'Exclude Tables', type: 'string' },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
      { id: 'chatModel', label: 'Chat Model', type: 'chatModel', position: 'top' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
      { id: 'chain', label: 'Chain', type: 'chain', position: 'bottom' },
    ],
  },
];

// ============================================
// Tools
// ============================================
export const TOOL_NODES: NodeTypeDefinition[] = [
  // 検索ツール
  {
    type: 'serper',
    label: 'Serper',
    category: 'tools',
    icon: '🔍',
    description: 'Serper検索',
    color: '#607D8B',
    inputs: [
      { name: 'apiKey', label: 'Serper API Key', type: 'password', required: true },
      { name: 'numResults', label: 'Number of Results', type: 'number', default: 10, min: 1, max: 100 },
    ],
    inputHandles: [
      { id: 'input', label: 'Query', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Results', type: 'any', position: 'right' },
      { id: 'tool', label: 'Tool', type: 'tool', position: 'bottom' },
    ],
  },
  {
    type: 'tavily',
    label: 'Tavily',
    category: 'tools',
    icon: '🔎',
    description: 'Tavily AI検索',
    color: '#607D8B',
    inputs: [
      { name: 'apiKey', label: 'Tavily API Key', type: 'password', required: true },
      { name: 'maxResults', label: 'Max Results', type: 'number', default: 5, min: 1, max: 20 },
    ],
    inputHandles: [
      { id: 'input', label: 'Query', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Results', type: 'any', position: 'right' },
      { id: 'tool', label: 'Tool', type: 'tool', position: 'bottom' },
    ],
  },
  {
    type: 'braveSearch',
    label: 'BraveSearch API',
    category: 'tools',
    icon: '🔍',
    description: 'Brave Search検索',
    color: '#607D8B',
    inputs: [
      { name: 'apiKey', label: 'Brave Search API Key', type: 'password', required: true },
      { name: 'count', label: 'Result Count', type: 'number', default: 10 },
    ],
    inputHandles: [
      { id: 'input', label: 'Query', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Results', type: 'any', position: 'right' },
      { id: 'tool', label: 'Tool', type: 'tool', position: 'bottom' },
    ],
  },
  {
    type: 'googleCustomSearch',
    label: 'Google Custom Search',
    category: 'tools',
    icon: '🔍',
    description: 'Google Custom Search',
    color: '#607D8B',
    inputs: [
      { name: 'apiKey', label: 'Google API Key', type: 'password', required: true },
      { name: 'searchEngineId', label: 'Search Engine ID', type: 'string', required: true },
    ],
    inputHandles: [
      { id: 'input', label: 'Query', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Results', type: 'any', position: 'right' },
      { id: 'tool', label: 'Tool', type: 'tool', position: 'bottom' },
    ],
  },
  {
    type: 'webBrowser',
    label: 'Web Browser',
    category: 'tools',
    icon: '🌐',
    description: 'Webブラウザ操作',
    color: '#607D8B',
    inputs: [],
    inputHandles: [
      { id: 'input', label: 'URL', type: 'any', position: 'left' },
      { id: 'chatModel', label: 'Chat Model', type: 'chatModel', position: 'top' },
      { id: 'embeddings', label: 'Embeddings', type: 'embeddings', position: 'top' },
    ],
    outputHandles: [
      { id: 'output', label: 'Content', type: 'any', position: 'right' },
      { id: 'tool', label: 'Tool', type: 'tool', position: 'bottom' },
    ],
  },
  // ユーティリティツール
  {
    type: 'calculator',
    label: 'Calculator',
    category: 'tools',
    icon: '🧮',
    description: '計算ツール',
    color: '#607D8B',
    inputs: [],
    inputHandles: [
      { id: 'input', label: 'Expression', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Result', type: 'any', position: 'right' },
      { id: 'tool', label: 'Tool', type: 'tool', position: 'bottom' },
    ],
  },
  {
    type: 'customTool',
    label: 'Custom Tool',
    category: 'tools',
    icon: '🛠️',
    description: 'カスタムツール定義',
    color: '#607D8B',
    inputs: [
      { name: 'toolName', label: 'Tool Name', type: 'string', required: true },
      { name: 'toolDescription', label: 'Tool Description', type: 'text', required: true },
      { name: 'jsCode', label: 'JavaScript Code', type: 'text', required: true, placeholder: 'return "Hello " + input;' },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
      { id: 'tool', label: 'Tool', type: 'tool', position: 'bottom' },
    ],
  },
  {
    type: 'chainTool',
    label: 'Chain Tool',
    category: 'tools',
    icon: '⛓️',
    description: 'チェーンをツール化',
    color: '#607D8B',
    inputs: [
      { name: 'toolName', label: 'Tool Name', type: 'string', required: true },
      { name: 'toolDescription', label: 'Tool Description', type: 'text', required: true },
    ],
    inputHandles: [
      { id: 'input', label: 'Input', type: 'any', position: 'left' },
      { id: 'chain', label: 'Chain', type: 'chain', position: 'top' },
    ],
    outputHandles: [
      { id: 'output', label: 'Output', type: 'any', position: 'right' },
      { id: 'tool', label: 'Tool', type: 'tool', position: 'bottom' },
    ],
  },
  {
    type: 'retrieverTool',
    label: 'Retriever Tool',
    category: 'tools',
    icon: '🔍',
    description: '検索をツール化',
    color: '#607D8B',
    inputs: [
      { name: 'toolName', label: 'Tool Name', type: 'string', required: true },
      { name: 'toolDescription', label: 'Tool Description', type: 'text', required: true },
    ],
    inputHandles: [
      { id: 'input', label: 'Query', type: 'any', position: 'left' },
      { id: 'retriever', label: 'Retriever', type: 'retriever', position: 'top' },
    ],
    outputHandles: [
      { id: 'output', label: 'Results', type: 'any', position: 'right' },
      { id: 'tool', label: 'Tool', type: 'tool', position: 'bottom' },
    ],
  },
  {
    type: 'requestGet',
    label: 'Request Get',
    category: 'tools',
    icon: '🌐',
    description: 'HTTP GETリクエスト',
    color: '#607D8B',
    inputs: [
      { name: 'url', label: 'URL', type: 'string', required: true },
      { name: 'headers', label: 'Headers', type: 'json' },
      { name: 'description', label: 'Description', type: 'string' },
    ],
    inputHandles: [
      { id: 'input', label: 'URL/Params', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Response', type: 'any', position: 'right' },
      { id: 'tool', label: 'Tool', type: 'tool', position: 'bottom' },
    ],
  },
  {
    type: 'requestPost',
    label: 'Request Post',
    category: 'tools',
    icon: '📮',
    description: 'HTTP POSTリクエスト',
    color: '#607D8B',
    inputs: [
      { name: 'url', label: 'URL', type: 'string', required: true },
      { name: 'headers', label: 'Headers', type: 'json' },
      { name: 'body', label: 'Body', type: 'json' },
      { name: 'description', label: 'Description', type: 'string' },
    ],
    inputHandles: [
      { id: 'input', label: 'Body/Params', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Response', type: 'any', position: 'right' },
      { id: 'tool', label: 'Tool', type: 'tool', position: 'bottom' },
    ],
  },
  {
    type: 'readFile',
    label: 'Read File',
    category: 'tools',
    icon: '📖',
    description: 'ファイル読み取り',
    color: '#607D8B',
    inputs: [
      { name: 'basePath', label: 'Base Path', type: 'string' },
    ],
    inputHandles: [
      { id: 'input', label: 'File Path', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Content', type: 'any', position: 'right' },
      { id: 'tool', label: 'Tool', type: 'tool', position: 'bottom' },
    ],
  },
  {
    type: 'writeFile',
    label: 'Write File',
    category: 'tools',
    icon: '✍️',
    description: 'ファイル書き込み',
    color: '#607D8B',
    inputs: [
      { name: 'basePath', label: 'Base Path', type: 'string' },
    ],
    inputHandles: [
      { id: 'input', label: 'Content', type: 'any', position: 'left' },
    ],
    outputHandles: [
      { id: 'output', label: 'Result', type: 'any', position: 'right' },
      { id: 'tool', label: 'Tool', type: 'tool', position: 'bottom' },
    ],
  },
];

// ============================================
// OwlAgent Node
// ============================================
export const OWL_AGENT_NODE: NodeTypeDefinition = {
  type: 'owlAgentReference',
  label: 'OwlAgent Reference',
  category: 'owlAgent',
  icon: '🦉',
  description: '保存済みOwlAgentを参照',
  color: '#FF5722',
  inputs: [
    { name: 'agentId', label: 'Agent', type: 'select', required: true, options: [] }, // 動的に設定
    { name: 'inputMapping', label: 'Input Mapping', type: 'json' },
    { name: 'outputMapping', label: 'Output Mapping', type: 'json' },
  ],
  inputHandles: [
    { id: 'input', label: 'Input', type: 'any', position: 'left' },
  ],
  outputHandles: [
    { id: 'output', label: 'Output', type: 'any', position: 'right' },
  ],
};

// ============================================
// 全ノード定義の統合
// ============================================
export const ALL_NODE_DEFINITIONS: NodeTypeDefinition[] = [
  ...FLOW_CONTROL_NODES,
  ...CHAT_MODEL_NODES,
  ...EMBEDDING_NODES,
  ...VECTOR_STORE_NODES,
  ...DOCUMENT_LOADER_NODES,
  ...MEMORY_NODES,
  ...AGENT_NODES,
  ...CHAIN_NODES,
  ...TOOL_NODES,
  OWL_AGENT_NODE,
];

// カテゴリ別にノードをグループ化
export const getNodesByCategory = (category: NodeCategory): NodeTypeDefinition[] => {
  return ALL_NODE_DEFINITIONS.filter((node) => node.category === category);
};

// ノードタイプからノード定義を取得
export const getNodeDefinition = (type: string): NodeTypeDefinition | undefined => {
  return ALL_NODE_DEFINITIONS.find((node) => node.type === type);
};
