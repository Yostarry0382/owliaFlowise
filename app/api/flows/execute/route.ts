import { NextRequest, NextResponse } from 'next/server';
import { FlowNode, FlowEdge } from '@/app/types/flowise';
import { FlowiseClient } from '@/app/lib/flowise-client';

// Flowise設定
const FLOWISE_API_URL = process.env.FLOWISE_API_URL || 'http://localhost:3000';
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nodes,
      edges,
      input,
      sessionId,
      chatflowId, // 既存のchatflowを使用する場合
    } = body;

    // chatflowIdが指定されている場合はFlowise直接実行
    if (chatflowId) {
      console.log('[API] Executing with Flowise chatflow:', chatflowId);
      return await executeWithFlowiseChatflow(chatflowId, input, sessionId);
    }

    if (!nodes || !Array.isArray(nodes)) {
      return NextResponse.json(
        { error: 'Nodes array is required' },
        { status: 400 }
      );
    }

    if (!edges || !Array.isArray(edges)) {
      return NextResponse.json(
        { error: 'Edges array is required' },
        { status: 400 }
      );
    }

    // Flowiseバックエンドで実行（フォールバックなし）
    console.log('[API] Executing flow with Flowise backend');
    console.log('[API] Input:', input);
    console.log('[API] Nodes count:', nodes.length);

    const flowiseResult = await executeWithFlowiseBackend(
      nodes as FlowNode[],
      edges as FlowEdge[],
      input,
      sessionId
    );

    return NextResponse.json(flowiseResult);
  } catch (error) {
    console.error('Error executing flow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        logs: [`[ERROR] ${error instanceof Error ? error.message : 'Unknown error'}`],
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// ============================================
// Flowise実行ヘルパー関数
// ============================================

/**
 * 既存のFlowise chatflowを使用して実行
 */
async function executeWithFlowiseChatflow(
  chatflowId: string,
  input: string,
  sessionId?: string
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const flowiseClient = new FlowiseClient({
      apiUrl: FLOWISE_API_URL,
      apiKey: FLOWISE_API_KEY,
    });

    // Flowiseサーバーの接続確認
    const isHealthy = await flowiseClient.healthCheck();
    if (!isHealthy) {
      return NextResponse.json({
        success: false,
        error: `Flowiseサーバー (${FLOWISE_API_URL}) に接続できません。サーバーが起動しているか確認してください。`,
        executionMode: 'flowise',
      }, { status: 503 });
    }

    // Flowise prediction APIを呼び出し
    const response = await flowiseClient.predict(chatflowId, input, {
      sessionId,
    });

    return NextResponse.json({
      success: true,
      output: response.text || response.json || response,
      text: response.text,
      executionTime: Date.now() - startTime,
      executionMode: 'flowise',
      chatflowId,
      sourceDocuments: response.sourceDocuments || [],
      usedTools: response.usedTools || [],
      agentReasoning: response.agentReasoning || [],
      logs: [`[Flowise] Executed chatflow ${chatflowId}`],
    });
  } catch (error) {
    console.error('[Flowise] Execution error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Flowise execution failed',
      executionTime: Date.now() - startTime,
      executionMode: 'flowise',
    }, { status: 500 });
  }
}

/**
 * フローをFlowise形式に変換して一時chatflowとして実行
 */
async function executeWithFlowiseBackend(
  nodes: FlowNode[],
  edges: FlowEdge[],
  input: string,
  sessionId?: string
): Promise<any> {
  const startTime = Date.now();

  const flowiseClient = new FlowiseClient({
    apiUrl: FLOWISE_API_URL,
    apiKey: FLOWISE_API_KEY,
  });

  // Flowiseサーバーの接続確認
  const isHealthy = await flowiseClient.healthCheck();
  if (!isHealthy) {
    return {
      success: false,
      error: `Flowiseサーバー (${FLOWISE_API_URL}) に接続できません。サーバーが起動しているか確認してください。`,
      executionTime: Date.now() - startTime,
      executionMode: 'flowise',
    };
  }

  // フローをFlowise形式に変換
  const flowiseFlowData = convertToFlowiseFormat(nodes, edges);
  const flowDataString = JSON.stringify(flowiseFlowData);

  console.log('[Flowise] Creating temporary chatflow...');
  console.log('[Flowise] Flow data:', flowDataString);

  // 一時chatflowを作成
  const chatflow = await flowiseClient.createChatflow({
    name: `temp-owlia-${Date.now()}`,
    flowData: flowDataString,
    deployed: true,
    type: 'CHATFLOW',
  });

  const chatflowId = chatflow.id;
  console.log('[Flowise] Created chatflow:', chatflowId);

  try {
    // chatflowを実行
    const response = await flowiseClient.predict(chatflowId, input, {
      sessionId,
    });

    return {
      success: true,
      output: response.text || response.json || response,
      text: response.text,
      executionTime: Date.now() - startTime,
      executionMode: 'flowise',
      chatflowId,
      sourceDocuments: response.sourceDocuments || [],
      usedTools: response.usedTools || [],
      agentReasoning: response.agentReasoning || [],
      logs: [
        `[Flowise] Created temporary chatflow: ${chatflowId}`,
        `[Flowise] Executed with input: ${input.substring(0, 100)}...`,
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Flowise] Execution error:', errorMessage);
    return {
      success: false,
      error: `Flowise実行エラー: ${errorMessage}`,
      executionTime: Date.now() - startTime,
      executionMode: 'flowise',
    };
  } finally {
    // 一時chatflowを削除
    try {
      await flowiseClient.deleteChatflow(chatflowId);
      console.log('[Flowise] Deleted temporary chatflow:', chatflowId);
    } catch (deleteError) {
      console.warn('[Flowise] Failed to delete temporary chatflow:', deleteError);
    }
  }
}

/**
 * OwliaFabricaのノード/エッジをFlowise形式に変換
 */
function convertToFlowiseFormat(
  nodes: FlowNode[],
  edges: FlowEdge[]
): { nodes: any[]; edges: any[] } {
  // Flowise互換ノードタイプのマッピング（すべてのサポートノード）
  const NODE_TYPE_MAP: Record<string, { name: string; baseClasses: string[]; category: string }> = {
    // ============================================
    // Chat Models
    // ============================================
    chatOpenAI: { name: 'chatOpenAI', baseClasses: ['ChatOpenAI', 'BaseChatModel', 'BaseLanguageModel'], category: 'Chat Models' },
    azureChatOpenAI: { name: 'azureChatOpenAI', baseClasses: ['AzureChatOpenAI', 'BaseChatModel', 'BaseLanguageModel'], category: 'Chat Models' },
    chatAnthropic: { name: 'chatAnthropic', baseClasses: ['ChatAnthropic', 'BaseChatModel', 'BaseLanguageModel'], category: 'Chat Models' },
    chatGoogleGenerativeAI: { name: 'chatGoogleGenerativeAI', baseClasses: ['ChatGoogleGenerativeAI', 'BaseChatModel', 'BaseLanguageModel'], category: 'Chat Models' },
    chatOllama: { name: 'chatOllama', baseClasses: ['ChatOllama', 'BaseChatModel', 'BaseLanguageModel'], category: 'Chat Models' },
    chatMistralAI: { name: 'chatMistralAI', baseClasses: ['ChatMistralAI', 'BaseChatModel', 'BaseLanguageModel'], category: 'Chat Models' },
    chatCohere: { name: 'chatCohere', baseClasses: ['ChatCohere', 'BaseChatModel', 'BaseLanguageModel'], category: 'Chat Models' },
    chatGroq: { name: 'chatGroq', baseClasses: ['ChatGroq', 'BaseChatModel', 'BaseLanguageModel'], category: 'Chat Models' },
    chatHuggingFace: { name: 'chatHuggingFace', baseClasses: ['ChatHuggingFace', 'BaseChatModel', 'BaseLanguageModel'], category: 'Chat Models' },
    awsChatBedrock: { name: 'awsChatBedrock', baseClasses: ['AWSChatBedrock', 'BaseChatModel', 'BaseLanguageModel'], category: 'Chat Models' },

    // ============================================
    // LLMs (Completion Models)
    // ============================================
    openAI: { name: 'openAI', baseClasses: ['OpenAI', 'BaseLLM', 'BaseLanguageModel'], category: 'LLMs' },
    azureOpenAI: { name: 'azureOpenAI', baseClasses: ['AzureOpenAI', 'BaseLLM', 'BaseLanguageModel'], category: 'LLMs' },
    ollama: { name: 'ollama', baseClasses: ['Ollama', 'BaseLLM', 'BaseLanguageModel'], category: 'LLMs' },
    huggingFaceInference: { name: 'huggingFaceInference', baseClasses: ['HuggingFaceInference', 'BaseLLM', 'BaseLanguageModel'], category: 'LLMs' },
    replicate: { name: 'replicate', baseClasses: ['Replicate', 'BaseLLM', 'BaseLanguageModel'], category: 'LLMs' },

    // ============================================
    // Embeddings
    // ============================================
    openAIEmbeddings: { name: 'openAIEmbeddings', baseClasses: ['OpenAIEmbeddings', 'Embeddings'], category: 'Embeddings' },
    azureOpenAIEmbeddings: { name: 'azureOpenAIEmbeddings', baseClasses: ['AzureOpenAIEmbeddings', 'Embeddings'], category: 'Embeddings' },
    cohereEmbeddings: { name: 'cohereEmbeddings', baseClasses: ['CohereEmbeddings', 'Embeddings'], category: 'Embeddings' },
    googleGenerativeAIEmbeddings: { name: 'googleGenerativeAIEmbeddings', baseClasses: ['GoogleGenerativeAIEmbeddings', 'Embeddings'], category: 'Embeddings' },
    huggingFaceInferenceEmbeddings: { name: 'huggingFaceInferenceEmbeddings', baseClasses: ['HuggingFaceInferenceEmbeddings', 'Embeddings'], category: 'Embeddings' },
    ollamaEmbeddings: { name: 'ollamaEmbeddings', baseClasses: ['OllamaEmbeddings', 'Embeddings'], category: 'Embeddings' },
    voyageAIEmbeddings: { name: 'voyageAIEmbeddings', baseClasses: ['VoyageAIEmbeddings', 'Embeddings'], category: 'Embeddings' },

    // ============================================
    // Vector Stores
    // ============================================
    pinecone: { name: 'pinecone', baseClasses: ['Pinecone', 'VectorStore', 'VectorStoreRetriever', 'BaseRetriever'], category: 'Vector Stores' },
    chroma: { name: 'chroma', baseClasses: ['Chroma', 'VectorStore', 'VectorStoreRetriever', 'BaseRetriever'], category: 'Vector Stores' },
    faiss: { name: 'faiss', baseClasses: ['FAISS', 'VectorStore', 'VectorStoreRetriever', 'BaseRetriever'], category: 'Vector Stores' },
    qdrant: { name: 'qdrant', baseClasses: ['Qdrant', 'VectorStore', 'VectorStoreRetriever', 'BaseRetriever'], category: 'Vector Stores' },
    weaviate: { name: 'weaviate', baseClasses: ['Weaviate', 'VectorStore', 'VectorStoreRetriever', 'BaseRetriever'], category: 'Vector Stores' },
    milvus: { name: 'milvus', baseClasses: ['Milvus', 'VectorStore', 'VectorStoreRetriever', 'BaseRetriever'], category: 'Vector Stores' },
    supabase: { name: 'supabase', baseClasses: ['Supabase', 'VectorStore', 'VectorStoreRetriever', 'BaseRetriever'], category: 'Vector Stores' },
    postgres: { name: 'postgres', baseClasses: ['Postgres', 'VectorStore', 'VectorStoreRetriever', 'BaseRetriever'], category: 'Vector Stores' },
    redis: { name: 'redis', baseClasses: ['Redis', 'VectorStore', 'VectorStoreRetriever', 'BaseRetriever'], category: 'Vector Stores' },
    inMemoryVectorStore: { name: 'inMemoryVectorStore', baseClasses: ['MemoryVectorStore', 'VectorStore', 'VectorStoreRetriever', 'BaseRetriever'], category: 'Vector Stores' },

    // ============================================
    // Document Loaders
    // ============================================
    pdfLoader: { name: 'pdfLoader', baseClasses: ['PDFLoader', 'Document'], category: 'Document Loaders' },
    docxLoader: { name: 'docxLoader', baseClasses: ['DocxLoader', 'Document'], category: 'Document Loaders' },
    csvLoader: { name: 'csvLoader', baseClasses: ['CSVLoader', 'Document'], category: 'Document Loaders' },
    textLoader: { name: 'textLoader', baseClasses: ['TextLoader', 'Document'], category: 'Document Loaders' },
    jsonLoader: { name: 'jsonLoader', baseClasses: ['JSONLoader', 'Document'], category: 'Document Loaders' },
    markdownLoader: { name: 'markdownLoader', baseClasses: ['MarkdownLoader', 'Document'], category: 'Document Loaders' },
    webLoader: { name: 'webLoader', baseClasses: ['CheerioWebBaseLoader', 'Document'], category: 'Document Loaders' },
    playwrightWebLoader: { name: 'playwrightWebLoader', baseClasses: ['PlaywrightWebBaseLoader', 'Document'], category: 'Document Loaders' },
    githubLoader: { name: 'githubLoader', baseClasses: ['GithubRepoLoader', 'Document'], category: 'Document Loaders' },
    notionLoader: { name: 'notionLoader', baseClasses: ['NotionLoader', 'Document'], category: 'Document Loaders' },
    confluenceLoader: { name: 'confluenceLoader', baseClasses: ['ConfluenceLoader', 'Document'], category: 'Document Loaders' },
    s3Loader: { name: 's3Loader', baseClasses: ['S3Loader', 'Document'], category: 'Document Loaders' },
    apiLoader: { name: 'apiLoader', baseClasses: ['ApiLoader', 'Document'], category: 'Document Loaders' },

    // ============================================
    // Text Splitters
    // ============================================
    recursiveCharacterTextSplitter: { name: 'recursiveCharacterTextSplitter', baseClasses: ['RecursiveCharacterTextSplitter', 'TextSplitter'], category: 'Text Splitters' },
    characterTextSplitter: { name: 'characterTextSplitter', baseClasses: ['CharacterTextSplitter', 'TextSplitter'], category: 'Text Splitters' },
    tokenTextSplitter: { name: 'tokenTextSplitter', baseClasses: ['TokenTextSplitter', 'TextSplitter'], category: 'Text Splitters' },
    markdownTextSplitter: { name: 'markdownTextSplitter', baseClasses: ['MarkdownTextSplitter', 'TextSplitter'], category: 'Text Splitters' },
    codeTextSplitter: { name: 'codeTextSplitter', baseClasses: ['CodeTextSplitter', 'TextSplitter'], category: 'Text Splitters' },
    htmlTextSplitter: { name: 'htmlTextSplitter', baseClasses: ['HTMLTextSplitter', 'TextSplitter'], category: 'Text Splitters' },

    // ============================================
    // Tools
    // ============================================
    calculator: { name: 'calculator', baseClasses: ['Calculator', 'Tool'], category: 'Tools' },
    serpAPI: { name: 'serpAPI', baseClasses: ['SerpAPI', 'Tool'], category: 'Tools' },
    googleCustomSearch: { name: 'googleCustomSearch', baseClasses: ['GoogleCustomSearch', 'Tool'], category: 'Tools' },
    braveSearch: { name: 'braveSearch', baseClasses: ['BraveSearch', 'Tool'], category: 'Tools' },
    webBrowser: { name: 'webBrowser', baseClasses: ['WebBrowser', 'Tool'], category: 'Tools' },
    wikipediaAPI: { name: 'wikipediaAPI', baseClasses: ['WikipediaQueryRun', 'Tool'], category: 'Tools' },
    wolframAlpha: { name: 'wolframAlpha', baseClasses: ['WolframAlphaTool', 'Tool'], category: 'Tools' },
    requestsGet: { name: 'requestsGet', baseClasses: ['RequestsGet', 'Tool'], category: 'Tools' },
    requestsPost: { name: 'requestsPost', baseClasses: ['RequestsPost', 'Tool'], category: 'Tools' },
    customTool: { name: 'customTool', baseClasses: ['CustomTool', 'Tool'], category: 'Tools' },
    chainTool: { name: 'chainTool', baseClasses: ['ChainTool', 'Tool'], category: 'Tools' },
    retrieverTool: { name: 'retrieverTool', baseClasses: ['RetrieverTool', 'Tool'], category: 'Tools' },
    sqlDatabaseTool: { name: 'sqlDatabaseTool', baseClasses: ['SqlDatabaseTool', 'Tool'], category: 'Tools' },
    readFile: { name: 'readFile', baseClasses: ['ReadFileTool', 'Tool'], category: 'Tools' },
    writeFile: { name: 'writeFile', baseClasses: ['WriteFileTool', 'Tool'], category: 'Tools' },

    // ============================================
    // Agents
    // ============================================
    openAIFunctionAgent: { name: 'openAIFunctionAgent', baseClasses: ['OpenAIFunctionAgent', 'AgentExecutor', 'BaseChain'], category: 'Agents' },
    conversationalAgent: { name: 'conversationalAgent', baseClasses: ['ConversationalAgent', 'AgentExecutor', 'BaseChain'], category: 'Agents' },
    mrklAgent: { name: 'mrklAgent', baseClasses: ['MRKLAgent', 'AgentExecutor', 'BaseChain'], category: 'Agents' },
    reactAgent: { name: 'reactAgent', baseClasses: ['ReActAgent', 'AgentExecutor', 'BaseChain'], category: 'Agents' },
    conversationalRetrievalAgent: { name: 'conversationalRetrievalAgent', baseClasses: ['ConversationalRetrievalAgent', 'AgentExecutor', 'BaseChain'], category: 'Agents' },
    toolAgent: { name: 'toolAgent', baseClasses: ['ToolAgent', 'AgentExecutor', 'BaseChain'], category: 'Agents' },
    autoGPT: { name: 'autoGPT', baseClasses: ['AutoGPT', 'AgentExecutor', 'BaseChain'], category: 'Agents' },
    babyAGI: { name: 'babyAGI', baseClasses: ['BabyAGI', 'AgentExecutor', 'BaseChain'], category: 'Agents' },

    // ============================================
    // Chains
    // ============================================
    llmChain: { name: 'llmChain', baseClasses: ['LLMChain', 'BaseChain'], category: 'Chains' },
    conversationChain: { name: 'conversationChain', baseClasses: ['ConversationChain', 'LLMChain', 'BaseChain'], category: 'Chains' },
    conversationalRetrievalQAChain: { name: 'conversationalRetrievalQAChain', baseClasses: ['ConversationalRetrievalQAChain', 'BaseChain'], category: 'Chains' },
    retrievalQAChain: { name: 'retrievalQAChain', baseClasses: ['RetrievalQAChain', 'BaseChain'], category: 'Chains' },
    sqlDatabaseChain: { name: 'sqlDatabaseChain', baseClasses: ['SqlDatabaseChain', 'BaseChain'], category: 'Chains' },
    apiChain: { name: 'apiChain', baseClasses: ['APIChain', 'BaseChain'], category: 'Chains' },
    vectaraQAChain: { name: 'vectaraQAChain', baseClasses: ['VectaraQAChain', 'BaseChain'], category: 'Chains' },
    multiPromptChain: { name: 'multiPromptChain', baseClasses: ['MultiPromptChain', 'BaseChain'], category: 'Chains' },
    multiRetrievalQAChain: { name: 'multiRetrievalQAChain', baseClasses: ['MultiRetrievalQAChain', 'BaseChain'], category: 'Chains' },

    // ============================================
    // Memory
    // ============================================
    bufferMemory: { name: 'bufferMemory', baseClasses: ['BufferMemory', 'BaseChatMemory', 'BaseMemory'], category: 'Memory' },
    bufferWindowMemory: { name: 'bufferWindowMemory', baseClasses: ['BufferWindowMemory', 'BaseChatMemory', 'BaseMemory'], category: 'Memory' },
    conversationSummaryMemory: { name: 'conversationSummaryMemory', baseClasses: ['ConversationSummaryMemory', 'BaseChatMemory', 'BaseMemory'], category: 'Memory' },
    conversationSummaryBufferMemory: { name: 'conversationSummaryBufferMemory', baseClasses: ['ConversationSummaryBufferMemory', 'BaseChatMemory', 'BaseMemory'], category: 'Memory' },
    entityMemory: { name: 'entityMemory', baseClasses: ['EntityMemory', 'BaseChatMemory', 'BaseMemory'], category: 'Memory' },
    redisBackedChatMemory: { name: 'redisBackedChatMemory', baseClasses: ['RedisBackedChatMemory', 'BaseChatMemory', 'BaseMemory'], category: 'Memory' },
    upstashRedisBackedChatMemory: { name: 'upstashRedisBackedChatMemory', baseClasses: ['UpstashRedisBackedChatMemory', 'BaseChatMemory', 'BaseMemory'], category: 'Memory' },
    dynamoDbChatMemory: { name: 'dynamoDbChatMemory', baseClasses: ['DynamoDBChatMemory', 'BaseChatMemory', 'BaseMemory'], category: 'Memory' },
    mongoDbChatMemory: { name: 'mongoDbChatMemory', baseClasses: ['MongoDBChatMemory', 'BaseChatMemory', 'BaseMemory'], category: 'Memory' },
    zepMemory: { name: 'zepMemory', baseClasses: ['ZepMemory', 'BaseChatMemory', 'BaseMemory'], category: 'Memory' },

    // ============================================
    // Prompts
    // ============================================
    promptTemplate: { name: 'promptTemplate', baseClasses: ['PromptTemplate', 'BaseStringPromptTemplate'], category: 'Prompts' },
    chatPromptTemplate: { name: 'chatPromptTemplate', baseClasses: ['ChatPromptTemplate', 'BaseChatPromptTemplate'], category: 'Prompts' },
    fewShotPromptTemplate: { name: 'fewShotPromptTemplate', baseClasses: ['FewShotPromptTemplate', 'BaseStringPromptTemplate'], category: 'Prompts' },

    // ============================================
    // Output Parsers
    // ============================================
    structuredOutputParser: { name: 'structuredOutputParser', baseClasses: ['StructuredOutputParser', 'BaseOutputParser'], category: 'Output Parsers' },
    csvOutputParser: { name: 'csvOutputParser', baseClasses: ['CSVOutputParser', 'BaseOutputParser'], category: 'Output Parsers' },
    customListOutputParser: { name: 'customListOutputParser', baseClasses: ['CustomListOutputParser', 'BaseOutputParser'], category: 'Output Parsers' },
    autoFixOutputParser: { name: 'autoFixOutputParser', baseClasses: ['AutoFixOutputParser', 'BaseOutputParser'], category: 'Output Parsers' },

    // ============================================
    // Utilities / Misc
    // ============================================
    getVariable: { name: 'getVariable', baseClasses: ['GetVariable', 'Utility'], category: 'Utilities' },
    setVariable: { name: 'setVariable', baseClasses: ['SetVariable', 'Utility'], category: 'Utilities' },
    ifElse: { name: 'ifElse', baseClasses: ['IfElse', 'Utility'], category: 'Utilities' },
    stickyNote: { name: 'stickyNote', baseClasses: ['StickyNote'], category: 'Utilities' },
  };

  const flowiseNodes = nodes.map((node) => {
    const nodeType = node.data?.type || node.type || 'custom';
    const mapping = NODE_TYPE_MAP[nodeType];

    if (!mapping) {
      console.warn(`[Flowise] Unknown node type: ${nodeType}, skipping...`);
      return null;
    }

    const config = node.data?.config || {};

    // Flowise形式のノードを構築
    const flowiseNode: any = {
      id: node.id,
      position: node.position,
      type: 'customNode',
      data: {
        id: node.id,
        label: node.data?.label || nodeType,
        name: mapping.name,
        type: mapping.name,
        baseClasses: mapping.baseClasses,
        category: mapping.category,
        inputs: {},
        outputs: {},
        inputAnchors: [],
        outputAnchors: [{ name: 'output', label: 'Output', type: mapping.baseClasses[0] }],
      },
      width: 300,
      height: 150,
    };

    // ノードタイプ別の設定（すべてのノードタイプに対応）
    configureNodeByType(flowiseNode, nodeType, config);

    return flowiseNode;
  }).filter(Boolean); // nullを除外

  // エッジの変換（Flowise形式のハンドル名に対応）
  const flowiseEdges = edges.map((edge) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    // ソースとターゲットのノードタイプを確認
    const sourceType = sourceNode?.data?.type || sourceNode?.type;
    const targetType = targetNode?.data?.type || targetNode?.type;

    // ハンドル名の決定
    let sourceHandle = 'output';
    let targetHandle = determineTargetHandle(sourceType, targetType);

    return {
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle || sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle || targetHandle,
      type: 'buttonedge',
    };
  });

  return { nodes: flowiseNodes, edges: flowiseEdges };
}

/**
 * ソースノードとターゲットノードのタイプに基づいてターゲットハンドル名を決定
 */
function determineTargetHandle(sourceType: string | undefined, targetType: string | undefined): string {
  if (!sourceType || !targetType) return 'input';

  // Chat Models / LLMs のカテゴリ
  const chatModels = [
    'chatOpenAI', 'azureChatOpenAI', 'chatAnthropic', 'chatGoogleGenerativeAI',
    'chatOllama', 'chatMistralAI', 'chatCohere', 'chatGroq', 'chatHuggingFace', 'awsChatBedrock'
  ];
  const llmModels = [
    'openAI', 'azureOpenAI', 'ollama', 'huggingFaceInference', 'replicate'
  ];
  const allLanguageModels = [...chatModels, ...llmModels];

  // Memory のカテゴリ
  const memoryTypes = [
    'bufferMemory', 'bufferWindowMemory', 'conversationSummaryMemory',
    'conversationSummaryBufferMemory', 'entityMemory', 'redisBackedChatMemory',
    'upstashRedisBackedChatMemory', 'dynamoDbChatMemory', 'mongoDbChatMemory', 'zepMemory'
  ];

  // Embeddings のカテゴリ
  const embeddingTypes = [
    'openAIEmbeddings', 'azureOpenAIEmbeddings', 'cohereEmbeddings',
    'googleGenerativeAIEmbeddings', 'huggingFaceInferenceEmbeddings',
    'ollamaEmbeddings', 'voyageAIEmbeddings'
  ];

  // Vector Stores のカテゴリ
  const vectorStoreTypes = [
    'pinecone', 'chroma', 'faiss', 'qdrant', 'weaviate', 'milvus',
    'supabase', 'postgres', 'redis', 'inMemoryVectorStore'
  ];

  // Document Loaders のカテゴリ
  const documentLoaderTypes = [
    'pdfLoader', 'docxLoader', 'csvLoader', 'textLoader', 'jsonLoader',
    'markdownLoader', 'webLoader', 'playwrightWebLoader', 'githubLoader',
    'notionLoader', 'confluenceLoader', 's3Loader', 'apiLoader'
  ];

  // Text Splitters のカテゴリ
  const textSplitterTypes = [
    'recursiveCharacterTextSplitter', 'characterTextSplitter', 'tokenTextSplitter',
    'markdownTextSplitter', 'codeTextSplitter', 'htmlTextSplitter'
  ];

  // Tools のカテゴリ
  const toolTypes = [
    'calculator', 'serpAPI', 'googleCustomSearch', 'braveSearch', 'webBrowser',
    'wikipediaAPI', 'wolframAlpha', 'requestsGet', 'requestsPost', 'customTool',
    'chainTool', 'retrieverTool', 'sqlDatabaseTool', 'readFile', 'writeFile'
  ];

  // Chains のカテゴリ
  const chainTypes = [
    'llmChain', 'conversationChain', 'conversationalRetrievalQAChain',
    'retrievalQAChain', 'sqlDatabaseChain', 'apiChain', 'vectaraQAChain',
    'multiPromptChain', 'multiRetrievalQAChain'
  ];

  // Agents のカテゴリ
  const agentTypes = [
    'openAIFunctionAgent', 'conversationalAgent', 'mrklAgent', 'reactAgent',
    'conversationalRetrievalAgent', 'toolAgent', 'autoGPT', 'babyAGI'
  ];

  // Prompts のカテゴリ
  const promptTypes = [
    'promptTemplate', 'chatPromptTemplate', 'fewShotPromptTemplate'
  ];

  // Output Parsers のカテゴリ
  const outputParserTypes = [
    'structuredOutputParser', 'csvOutputParser', 'customListOutputParser', 'autoFixOutputParser'
  ];

  // ============================================
  // ターゲットハンドルの決定ロジック
  // ============================================

  // Language Model -> Chain/Agent の接続
  if (allLanguageModels.includes(sourceType)) {
    if (chainTypes.includes(targetType) || agentTypes.includes(targetType)) {
      return 'model';
    }
    // WebBrowser ツールへの接続
    if (targetType === 'webBrowser') {
      return 'model';
    }
    // Memory（Summary系）への接続
    if (['conversationSummaryMemory', 'conversationSummaryBufferMemory', 'entityMemory'].includes(targetType)) {
      return 'model';
    }
    // AutoFix Output Parser への接続
    if (targetType === 'autoFixOutputParser') {
      return 'model';
    }
  }

  // Memory -> Chain/Agent の接続
  if (memoryTypes.includes(sourceType)) {
    if (chainTypes.includes(targetType) || agentTypes.includes(targetType)) {
      return 'memory';
    }
  }

  // Embeddings -> Vector Store / WebBrowser の接続
  if (embeddingTypes.includes(sourceType)) {
    if (vectorStoreTypes.includes(targetType)) {
      return 'embeddings';
    }
    if (targetType === 'webBrowser') {
      return 'embeddings';
    }
  }

  // Vector Store -> Chain/Agent の接続
  if (vectorStoreTypes.includes(sourceType)) {
    if (['conversationalRetrievalQAChain', 'retrievalQAChain'].includes(targetType)) {
      return 'vectorStore';
    }
    if (['autoGPT', 'babyAGI', 'conversationalRetrievalAgent'].includes(targetType)) {
      return 'vectorStore';
    }
    // Retriever Tool への接続
    if (targetType === 'retrieverTool') {
      return 'retriever';
    }
  }

  // Document Loader -> Text Splitter / Vector Store の接続
  if (documentLoaderTypes.includes(sourceType)) {
    if (textSplitterTypes.includes(targetType)) {
      return 'document';
    }
    if (vectorStoreTypes.includes(targetType)) {
      return 'document';
    }
  }

  // Text Splitter -> Vector Store の接続
  if (textSplitterTypes.includes(sourceType)) {
    if (vectorStoreTypes.includes(targetType)) {
      return 'document';
    }
  }

  // Prompt -> Chain の接続
  if (promptTypes.includes(sourceType)) {
    if (targetType === 'llmChain') {
      return 'prompt';
    }
    if (targetType === 'multiPromptChain') {
      return 'promptTemplates';
    }
  }

  // Tool -> Agent の接続
  if (toolTypes.includes(sourceType)) {
    if (agentTypes.includes(targetType)) {
      return 'tools';
    }
  }

  // Chain -> Chain Tool の接続
  if (chainTypes.includes(sourceType)) {
    if (targetType === 'chainTool') {
      return 'chain';
    }
  }

  // Output Parser -> AutoFix Output Parser の接続
  if (outputParserTypes.includes(sourceType) && sourceType !== 'autoFixOutputParser') {
    if (targetType === 'autoFixOutputParser') {
      return 'outputParser';
    }
  }

  // Multi Retrieval QA Chain への Retriever 接続
  if (vectorStoreTypes.includes(sourceType)) {
    if (targetType === 'multiRetrievalQAChain') {
      return 'retrievers';
    }
  }

  // デフォルト
  return 'input';
}

/**
 * ノードタイプに応じた設定を適用
 */
function configureNodeByType(flowiseNode: any, nodeType: string, config: Record<string, any>) {
  // ============================================
  // Chat Models
  // ============================================
  if (nodeType === 'chatOpenAI') {
    flowiseNode.data.inputs = {
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2000,
      modelName: config.modelName || 'gpt-3.5-turbo',
      openAIApiKey: config.openAIApiKey || process.env.OPENAI_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ChatOpenAI', type: 'ChatOpenAI|BaseChatModel|BaseLanguageModel' }
    ];
  }

  if (nodeType === 'azureChatOpenAI') {
    flowiseNode.data.inputs = {
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2000,
      azureOpenAIApiKey: config.azureOpenAIApiKey || process.env.AZURE_OPENAI_API_KEY || '',
      azureOpenAIApiInstanceName: config.azureOpenAIApiInstanceName || process.env.AZURE_OPENAI_ENDPOINT?.replace('https://', '').replace('.openai.azure.com/', '').replace('.openai.azure.com', '') || '',
      azureOpenAIApiDeploymentName: config.azureOpenAIApiDeploymentName || process.env.AZURE_OPENAI_DEPLOYMENT_NAME || '',
      azureOpenAIApiVersion: config.azureOpenAIApiVersion || process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'AzureChatOpenAI', type: 'AzureChatOpenAI|BaseChatModel|BaseLanguageModel' }
    ];
  }

  if (nodeType === 'chatAnthropic') {
    flowiseNode.data.inputs = {
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 4096,
      modelName: config.modelName || 'claude-3-sonnet-20240229',
      anthropicApiKey: config.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ChatAnthropic', type: 'ChatAnthropic|BaseChatModel|BaseLanguageModel' }
    ];
  }

  if (nodeType === 'chatGoogleGenerativeAI') {
    flowiseNode.data.inputs = {
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxOutputTokens ?? 2048,
      modelName: config.modelName || 'gemini-pro',
      googleApiKey: config.googleApiKey || process.env.GOOGLE_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ChatGoogleGenerativeAI', type: 'ChatGoogleGenerativeAI|BaseChatModel|BaseLanguageModel' }
    ];
  }

  if (nodeType === 'chatOllama') {
    flowiseNode.data.inputs = {
      temperature: config.temperature ?? 0.7,
      modelName: config.modelName || 'llama2',
      baseUrl: config.baseUrl || 'http://localhost:11434',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ChatOllama', type: 'ChatOllama|BaseChatModel|BaseLanguageModel' }
    ];
  }

  if (nodeType === 'chatMistralAI') {
    flowiseNode.data.inputs = {
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2000,
      modelName: config.modelName || 'mistral-small',
      mistralAIApiKey: config.mistralAIApiKey || process.env.MISTRAL_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ChatMistralAI', type: 'ChatMistralAI|BaseChatModel|BaseLanguageModel' }
    ];
  }

  if (nodeType === 'chatCohere') {
    flowiseNode.data.inputs = {
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2000,
      modelName: config.modelName || 'command',
      cohereApiKey: config.cohereApiKey || process.env.COHERE_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ChatCohere', type: 'ChatCohere|BaseChatModel|BaseLanguageModel' }
    ];
  }

  if (nodeType === 'chatGroq') {
    flowiseNode.data.inputs = {
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2000,
      modelName: config.modelName || 'mixtral-8x7b-32768',
      groqApiKey: config.groqApiKey || process.env.GROQ_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ChatGroq', type: 'ChatGroq|BaseChatModel|BaseLanguageModel' }
    ];
  }

  if (nodeType === 'chatHuggingFace') {
    flowiseNode.data.inputs = {
      temperature: config.temperature ?? 0.7,
      modelName: config.modelName || 'google/flan-t5-xxl',
      huggingFaceApiKey: config.huggingFaceApiKey || process.env.HUGGINGFACE_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ChatHuggingFace', type: 'ChatHuggingFace|BaseChatModel|BaseLanguageModel' }
    ];
  }

  if (nodeType === 'awsChatBedrock') {
    flowiseNode.data.inputs = {
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2000,
      model: config.model || 'anthropic.claude-v2',
      region: config.region || process.env.AWS_REGION || 'us-east-1',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'AWSChatBedrock', type: 'AWSChatBedrock|BaseChatModel|BaseLanguageModel' }
    ];
  }

  // ============================================
  // LLMs (Completion Models)
  // ============================================
  if (nodeType === 'openAI') {
    flowiseNode.data.inputs = {
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2000,
      modelName: config.modelName || 'gpt-3.5-turbo-instruct',
      openAIApiKey: config.openAIApiKey || process.env.OPENAI_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'OpenAI', type: 'OpenAI|BaseLLM|BaseLanguageModel' }
    ];
  }

  if (nodeType === 'azureOpenAI') {
    flowiseNode.data.inputs = {
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2000,
      azureOpenAIApiKey: config.azureOpenAIApiKey || process.env.AZURE_OPENAI_API_KEY || '',
      azureOpenAIApiInstanceName: config.azureOpenAIApiInstanceName || process.env.AZURE_OPENAI_ENDPOINT?.replace('https://', '').replace('.openai.azure.com/', '').replace('.openai.azure.com', '') || '',
      azureOpenAIApiDeploymentName: config.azureOpenAIApiDeploymentName || process.env.AZURE_OPENAI_DEPLOYMENT_NAME || '',
      azureOpenAIApiVersion: config.azureOpenAIApiVersion || process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'AzureOpenAI', type: 'AzureOpenAI|BaseLLM|BaseLanguageModel' }
    ];
  }

  if (nodeType === 'ollama') {
    flowiseNode.data.inputs = {
      temperature: config.temperature ?? 0.7,
      modelName: config.modelName || 'llama2',
      baseUrl: config.baseUrl || 'http://localhost:11434',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Ollama', type: 'Ollama|BaseLLM|BaseLanguageModel' }
    ];
  }

  if (nodeType === 'huggingFaceInference') {
    flowiseNode.data.inputs = {
      model: config.model || 'gpt2',
      huggingFaceApiKey: config.huggingFaceApiKey || process.env.HUGGINGFACE_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'HuggingFaceInference', type: 'HuggingFaceInference|BaseLLM|BaseLanguageModel' }
    ];
  }

  if (nodeType === 'replicate') {
    flowiseNode.data.inputs = {
      model: config.model || 'meta/llama-2-70b-chat',
      replicateApiKey: config.replicateApiKey || process.env.REPLICATE_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Replicate', type: 'Replicate|BaseLLM|BaseLanguageModel' }
    ];
  }

  // ============================================
  // Embeddings
  // ============================================
  if (nodeType === 'openAIEmbeddings') {
    flowiseNode.data.inputs = {
      modelName: config.modelName || 'text-embedding-ada-002',
      openAIApiKey: config.openAIApiKey || process.env.OPENAI_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'OpenAIEmbeddings', type: 'OpenAIEmbeddings|Embeddings' }
    ];
  }

  if (nodeType === 'azureOpenAIEmbeddings') {
    flowiseNode.data.inputs = {
      azureOpenAIApiKey: config.azureOpenAIApiKey || process.env.AZURE_OPENAI_API_KEY || '',
      azureOpenAIApiInstanceName: config.azureOpenAIApiInstanceName || process.env.AZURE_OPENAI_ENDPOINT?.replace('https://', '').replace('.openai.azure.com/', '').replace('.openai.azure.com', '') || '',
      azureOpenAIApiDeploymentName: config.azureOpenAIApiDeploymentName || process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME || '',
      azureOpenAIApiVersion: config.azureOpenAIApiVersion || process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'AzureOpenAIEmbeddings', type: 'AzureOpenAIEmbeddings|Embeddings' }
    ];
  }

  if (nodeType === 'cohereEmbeddings') {
    flowiseNode.data.inputs = {
      modelName: config.modelName || 'embed-english-v2.0',
      cohereApiKey: config.cohereApiKey || process.env.COHERE_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'CohereEmbeddings', type: 'CohereEmbeddings|Embeddings' }
    ];
  }

  if (nodeType === 'googleGenerativeAIEmbeddings') {
    flowiseNode.data.inputs = {
      modelName: config.modelName || 'embedding-001',
      googleApiKey: config.googleApiKey || process.env.GOOGLE_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'GoogleGenerativeAIEmbeddings', type: 'GoogleGenerativeAIEmbeddings|Embeddings' }
    ];
  }

  if (nodeType === 'huggingFaceInferenceEmbeddings') {
    flowiseNode.data.inputs = {
      modelName: config.modelName || 'sentence-transformers/all-MiniLM-L6-v2',
      huggingFaceApiKey: config.huggingFaceApiKey || process.env.HUGGINGFACE_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'HuggingFaceInferenceEmbeddings', type: 'HuggingFaceInferenceEmbeddings|Embeddings' }
    ];
  }

  if (nodeType === 'ollamaEmbeddings') {
    flowiseNode.data.inputs = {
      modelName: config.modelName || 'llama2',
      baseUrl: config.baseUrl || 'http://localhost:11434',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'OllamaEmbeddings', type: 'OllamaEmbeddings|Embeddings' }
    ];
  }

  if (nodeType === 'voyageAIEmbeddings') {
    flowiseNode.data.inputs = {
      modelName: config.modelName || 'voyage-01',
      voyageAIApiKey: config.voyageAIApiKey || process.env.VOYAGEAI_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'VoyageAIEmbeddings', type: 'VoyageAIEmbeddings|Embeddings' }
    ];
  }

  // ============================================
  // Vector Stores
  // ============================================
  if (nodeType === 'pinecone') {
    flowiseNode.data.inputs = {
      pineconeIndex: config.pineconeIndex || '',
      pineconeNamespace: config.pineconeNamespace || '',
      pineconeApiKey: config.pineconeApiKey || process.env.PINECONE_API_KEY || '',
      pineconeEnvironment: config.pineconeEnvironment || process.env.PINECONE_ENVIRONMENT || '',
      topK: config.topK ?? 4,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'embeddings', label: 'Embeddings', type: 'Embeddings' },
      { name: 'document', label: 'Document', type: 'Document', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Pinecone', type: 'Pinecone|VectorStore|VectorStoreRetriever|BaseRetriever' }
    ];
  }

  if (nodeType === 'chroma') {
    flowiseNode.data.inputs = {
      collectionName: config.collectionName || 'langchain',
      chromaUrl: config.chromaUrl || 'http://localhost:8000',
      topK: config.topK ?? 4,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'embeddings', label: 'Embeddings', type: 'Embeddings' },
      { name: 'document', label: 'Document', type: 'Document', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Chroma', type: 'Chroma|VectorStore|VectorStoreRetriever|BaseRetriever' }
    ];
  }

  if (nodeType === 'faiss') {
    flowiseNode.data.inputs = {
      basePath: config.basePath || './faiss_index',
      topK: config.topK ?? 4,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'embeddings', label: 'Embeddings', type: 'Embeddings' },
      { name: 'document', label: 'Document', type: 'Document', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'FAISS', type: 'FAISS|VectorStore|VectorStoreRetriever|BaseRetriever' }
    ];
  }

  if (nodeType === 'qdrant') {
    flowiseNode.data.inputs = {
      qdrantUrl: config.qdrantUrl || 'http://localhost:6333',
      collectionName: config.collectionName || 'langchain',
      topK: config.topK ?? 4,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'embeddings', label: 'Embeddings', type: 'Embeddings' },
      { name: 'document', label: 'Document', type: 'Document', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Qdrant', type: 'Qdrant|VectorStore|VectorStoreRetriever|BaseRetriever' }
    ];
  }

  if (nodeType === 'weaviate') {
    flowiseNode.data.inputs = {
      weaviateScheme: config.weaviateScheme || 'http',
      weaviateHost: config.weaviateHost || 'localhost:8080',
      weaviateIndex: config.weaviateIndex || 'Test',
      topK: config.topK ?? 4,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'embeddings', label: 'Embeddings', type: 'Embeddings' },
      { name: 'document', label: 'Document', type: 'Document', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Weaviate', type: 'Weaviate|VectorStore|VectorStoreRetriever|BaseRetriever' }
    ];
  }

  if (nodeType === 'milvus') {
    flowiseNode.data.inputs = {
      milvusAddress: config.milvusAddress || 'localhost:19530',
      collectionName: config.collectionName || 'langchain',
      topK: config.topK ?? 4,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'embeddings', label: 'Embeddings', type: 'Embeddings' },
      { name: 'document', label: 'Document', type: 'Document', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Milvus', type: 'Milvus|VectorStore|VectorStoreRetriever|BaseRetriever' }
    ];
  }

  if (nodeType === 'supabase') {
    flowiseNode.data.inputs = {
      supabaseUrl: config.supabaseUrl || process.env.SUPABASE_URL || '',
      supabaseKey: config.supabaseKey || process.env.SUPABASE_ANON_KEY || '',
      tableName: config.tableName || 'documents',
      topK: config.topK ?? 4,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'embeddings', label: 'Embeddings', type: 'Embeddings' },
      { name: 'document', label: 'Document', type: 'Document', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Supabase', type: 'Supabase|VectorStore|VectorStoreRetriever|BaseRetriever' }
    ];
  }

  if (nodeType === 'postgres') {
    flowiseNode.data.inputs = {
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database || 'postgres',
      user: config.user || 'postgres',
      password: config.password || '',
      tableName: config.tableName || 'documents',
      topK: config.topK ?? 4,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'embeddings', label: 'Embeddings', type: 'Embeddings' },
      { name: 'document', label: 'Document', type: 'Document', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Postgres', type: 'Postgres|VectorStore|VectorStoreRetriever|BaseRetriever' }
    ];
  }

  if (nodeType === 'redis') {
    flowiseNode.data.inputs = {
      redisUrl: config.redisUrl || 'redis://localhost:6379',
      indexName: config.indexName || 'langchain',
      topK: config.topK ?? 4,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'embeddings', label: 'Embeddings', type: 'Embeddings' },
      { name: 'document', label: 'Document', type: 'Document', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Redis', type: 'Redis|VectorStore|VectorStoreRetriever|BaseRetriever' }
    ];
  }

  if (nodeType === 'inMemoryVectorStore') {
    flowiseNode.data.inputs = {
      topK: config.topK ?? 4,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'embeddings', label: 'Embeddings', type: 'Embeddings' },
      { name: 'document', label: 'Document', type: 'Document', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'MemoryVectorStore', type: 'MemoryVectorStore|VectorStore|VectorStoreRetriever|BaseRetriever' }
    ];
  }

  // ============================================
  // Document Loaders
  // ============================================
  if (nodeType === 'pdfLoader') {
    flowiseNode.data.inputs = {
      pdfFile: config.pdfFile || '',
      usage: config.usage || 'perPage',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Document', type: 'Document' }
    ];
  }

  if (nodeType === 'docxLoader') {
    flowiseNode.data.inputs = {
      docxFile: config.docxFile || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Document', type: 'Document' }
    ];
  }

  if (nodeType === 'csvLoader') {
    flowiseNode.data.inputs = {
      csvFile: config.csvFile || '',
      column: config.column || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Document', type: 'Document' }
    ];
  }

  if (nodeType === 'textLoader') {
    flowiseNode.data.inputs = {
      textFile: config.textFile || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Document', type: 'Document' }
    ];
  }

  if (nodeType === 'jsonLoader') {
    flowiseNode.data.inputs = {
      jsonFile: config.jsonFile || '',
      jsonPointer: config.jsonPointer || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Document', type: 'Document' }
    ];
  }

  if (nodeType === 'markdownLoader') {
    flowiseNode.data.inputs = {
      markdownFile: config.markdownFile || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Document', type: 'Document' }
    ];
  }

  if (nodeType === 'webLoader') {
    flowiseNode.data.inputs = {
      url: config.url || '',
      selector: config.selector || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Document', type: 'Document' }
    ];
  }

  if (nodeType === 'playwrightWebLoader') {
    flowiseNode.data.inputs = {
      url: config.url || '',
      waitForSelector: config.waitForSelector || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Document', type: 'Document' }
    ];
  }

  if (nodeType === 'githubLoader') {
    flowiseNode.data.inputs = {
      repoUrl: config.repoUrl || '',
      branch: config.branch || 'main',
      githubAccessToken: config.githubAccessToken || process.env.GITHUB_ACCESS_TOKEN || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Document', type: 'Document' }
    ];
  }

  if (nodeType === 'notionLoader') {
    flowiseNode.data.inputs = {
      notionApiKey: config.notionApiKey || process.env.NOTION_API_KEY || '',
      databaseId: config.databaseId || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Document', type: 'Document' }
    ];
  }

  if (nodeType === 'confluenceLoader') {
    flowiseNode.data.inputs = {
      baseUrl: config.baseUrl || '',
      spaceKey: config.spaceKey || '',
      username: config.username || '',
      accessToken: config.accessToken || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Document', type: 'Document' }
    ];
  }

  if (nodeType === 's3Loader') {
    flowiseNode.data.inputs = {
      bucket: config.bucket || '',
      key: config.key || '',
      region: config.region || process.env.AWS_REGION || 'us-east-1',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Document', type: 'Document' }
    ];
  }

  if (nodeType === 'apiLoader') {
    flowiseNode.data.inputs = {
      url: config.url || '',
      method: config.method || 'GET',
      headers: config.headers || '{}',
      body: config.body || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Document', type: 'Document' }
    ];
  }

  // ============================================
  // Text Splitters
  // ============================================
  if (nodeType === 'recursiveCharacterTextSplitter') {
    flowiseNode.data.inputs = {
      chunkSize: config.chunkSize ?? 1000,
      chunkOverlap: config.chunkOverlap ?? 200,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'document', label: 'Document', type: 'Document' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'RecursiveCharacterTextSplitter', type: 'RecursiveCharacterTextSplitter|TextSplitter' }
    ];
  }

  if (nodeType === 'characterTextSplitter') {
    flowiseNode.data.inputs = {
      chunkSize: config.chunkSize ?? 1000,
      chunkOverlap: config.chunkOverlap ?? 200,
      separator: config.separator || '\n\n',
    };
    flowiseNode.data.inputAnchors = [
      { name: 'document', label: 'Document', type: 'Document' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'CharacterTextSplitter', type: 'CharacterTextSplitter|TextSplitter' }
    ];
  }

  if (nodeType === 'tokenTextSplitter') {
    flowiseNode.data.inputs = {
      chunkSize: config.chunkSize ?? 1000,
      chunkOverlap: config.chunkOverlap ?? 200,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'document', label: 'Document', type: 'Document' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'TokenTextSplitter', type: 'TokenTextSplitter|TextSplitter' }
    ];
  }

  if (nodeType === 'markdownTextSplitter') {
    flowiseNode.data.inputs = {
      chunkSize: config.chunkSize ?? 1000,
      chunkOverlap: config.chunkOverlap ?? 200,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'document', label: 'Document', type: 'Document' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'MarkdownTextSplitter', type: 'MarkdownTextSplitter|TextSplitter' }
    ];
  }

  if (nodeType === 'codeTextSplitter') {
    flowiseNode.data.inputs = {
      chunkSize: config.chunkSize ?? 1000,
      chunkOverlap: config.chunkOverlap ?? 200,
      language: config.language || 'javascript',
    };
    flowiseNode.data.inputAnchors = [
      { name: 'document', label: 'Document', type: 'Document' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'CodeTextSplitter', type: 'CodeTextSplitter|TextSplitter' }
    ];
  }

  if (nodeType === 'htmlTextSplitter') {
    flowiseNode.data.inputs = {
      chunkSize: config.chunkSize ?? 1000,
      chunkOverlap: config.chunkOverlap ?? 200,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'document', label: 'Document', type: 'Document' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'HTMLTextSplitter', type: 'HTMLTextSplitter|TextSplitter' }
    ];
  }

  // ============================================
  // Tools
  // ============================================
  if (nodeType === 'calculator') {
    flowiseNode.data.inputs = {};
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'Calculator', type: 'Calculator|Tool' }
    ];
  }

  if (nodeType === 'serpAPI') {
    flowiseNode.data.inputs = {
      serpApiKey: config.serpApiKey || process.env.SERPAPI_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'SerpAPI', type: 'SerpAPI|Tool' }
    ];
  }

  if (nodeType === 'googleCustomSearch') {
    flowiseNode.data.inputs = {
      googleApiKey: config.googleApiKey || process.env.GOOGLE_API_KEY || '',
      googleCseId: config.googleCseId || process.env.GOOGLE_CSE_ID || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'GoogleCustomSearch', type: 'GoogleCustomSearch|Tool' }
    ];
  }

  if (nodeType === 'braveSearch') {
    flowiseNode.data.inputs = {
      braveApiKey: config.braveApiKey || process.env.BRAVE_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'BraveSearch', type: 'BraveSearch|Tool' }
    ];
  }

  if (nodeType === 'webBrowser') {
    flowiseNode.data.inputs = {};
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Language Model', type: 'BaseLanguageModel' },
      { name: 'embeddings', label: 'Embeddings', type: 'Embeddings' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'WebBrowser', type: 'WebBrowser|Tool' }
    ];
  }

  if (nodeType === 'wikipediaAPI') {
    flowiseNode.data.inputs = {
      topKResults: config.topKResults ?? 3,
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'WikipediaQueryRun', type: 'WikipediaQueryRun|Tool' }
    ];
  }

  if (nodeType === 'wolframAlpha') {
    flowiseNode.data.inputs = {
      wolframAlphaAppId: config.wolframAlphaAppId || process.env.WOLFRAM_ALPHA_APP_ID || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'WolframAlphaTool', type: 'WolframAlphaTool|Tool' }
    ];
  }

  if (nodeType === 'requestsGet') {
    flowiseNode.data.inputs = {
      url: config.url || '',
      headers: config.headers || '{}',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'RequestsGet', type: 'RequestsGet|Tool' }
    ];
  }

  if (nodeType === 'requestsPost') {
    flowiseNode.data.inputs = {
      url: config.url || '',
      headers: config.headers || '{}',
      body: config.body || '{}',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'RequestsPost', type: 'RequestsPost|Tool' }
    ];
  }

  if (nodeType === 'customTool') {
    flowiseNode.data.inputs = {
      name: config.name || 'custom_tool',
      description: config.description || '',
      code: config.code || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'CustomTool', type: 'CustomTool|Tool' }
    ];
  }

  if (nodeType === 'chainTool') {
    flowiseNode.data.inputs = {
      name: config.name || 'chain_tool',
      description: config.description || '',
    };
    flowiseNode.data.inputAnchors = [
      { name: 'chain', label: 'Chain', type: 'BaseChain' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ChainTool', type: 'ChainTool|Tool' }
    ];
  }

  if (nodeType === 'retrieverTool') {
    flowiseNode.data.inputs = {
      name: config.name || 'retriever_tool',
      description: config.description || '',
    };
    flowiseNode.data.inputAnchors = [
      { name: 'retriever', label: 'Retriever', type: 'BaseRetriever' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'RetrieverTool', type: 'RetrieverTool|Tool' }
    ];
  }

  if (nodeType === 'sqlDatabaseTool') {
    flowiseNode.data.inputs = {
      database: config.database || 'sqlite',
      host: config.host || '',
      port: config.port || '',
      username: config.username || '',
      password: config.password || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'SqlDatabaseTool', type: 'SqlDatabaseTool|Tool' }
    ];
  }

  if (nodeType === 'readFile') {
    flowiseNode.data.inputs = {
      basePath: config.basePath || './',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ReadFileTool', type: 'ReadFileTool|Tool' }
    ];
  }

  if (nodeType === 'writeFile') {
    flowiseNode.data.inputs = {
      basePath: config.basePath || './',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'WriteFileTool', type: 'WriteFileTool|Tool' }
    ];
  }

  // ============================================
  // Agents
  // ============================================
  if (nodeType === 'openAIFunctionAgent') {
    flowiseNode.data.inputs = {
      systemMessage: config.systemMessage || '',
    };
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Chat Model', type: 'BaseChatModel' },
      { name: 'tools', label: 'Tools', type: 'Tool', list: true },
      { name: 'memory', label: 'Memory', type: 'BaseMemory', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'OpenAIFunctionAgent', type: 'OpenAIFunctionAgent|AgentExecutor|BaseChain' }
    ];
  }

  if (nodeType === 'conversationalAgent') {
    flowiseNode.data.inputs = {
      systemMessage: config.systemMessage || '',
    };
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Language Model', type: 'BaseLanguageModel' },
      { name: 'tools', label: 'Tools', type: 'Tool', list: true },
      { name: 'memory', label: 'Memory', type: 'BaseMemory', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ConversationalAgent', type: 'ConversationalAgent|AgentExecutor|BaseChain' }
    ];
  }

  if (nodeType === 'mrklAgent') {
    flowiseNode.data.inputs = {};
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Language Model', type: 'BaseLanguageModel' },
      { name: 'tools', label: 'Tools', type: 'Tool', list: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'MRKLAgent', type: 'MRKLAgent|AgentExecutor|BaseChain' }
    ];
  }

  if (nodeType === 'reactAgent') {
    flowiseNode.data.inputs = {};
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Chat Model', type: 'BaseChatModel' },
      { name: 'tools', label: 'Tools', type: 'Tool', list: true },
      { name: 'memory', label: 'Memory', type: 'BaseMemory', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ReActAgent', type: 'ReActAgent|AgentExecutor|BaseChain' }
    ];
  }

  if (nodeType === 'conversationalRetrievalAgent') {
    flowiseNode.data.inputs = {
      systemMessage: config.systemMessage || '',
    };
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Chat Model', type: 'BaseChatModel' },
      { name: 'retriever', label: 'Retriever', type: 'BaseRetriever' },
      { name: 'memory', label: 'Memory', type: 'BaseMemory', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ConversationalRetrievalAgent', type: 'ConversationalRetrievalAgent|AgentExecutor|BaseChain' }
    ];
  }

  if (nodeType === 'toolAgent') {
    flowiseNode.data.inputs = {
      systemMessage: config.systemMessage || '',
    };
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Chat Model', type: 'BaseChatModel' },
      { name: 'tools', label: 'Tools', type: 'Tool', list: true },
      { name: 'memory', label: 'Memory', type: 'BaseMemory', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ToolAgent', type: 'ToolAgent|AgentExecutor|BaseChain' }
    ];
  }

  if (nodeType === 'autoGPT') {
    flowiseNode.data.inputs = {
      aiName: config.aiName || 'AutoGPT',
      aiRole: config.aiRole || 'Assistant',
      maxIterations: config.maxIterations ?? 5,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Chat Model', type: 'BaseChatModel' },
      { name: 'tools', label: 'Tools', type: 'Tool', list: true },
      { name: 'vectorStore', label: 'Vector Store', type: 'VectorStore' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'AutoGPT', type: 'AutoGPT|AgentExecutor|BaseChain' }
    ];
  }

  if (nodeType === 'babyAGI') {
    flowiseNode.data.inputs = {
      maxIterations: config.maxIterations ?? 3,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Chat Model', type: 'BaseChatModel' },
      { name: 'vectorStore', label: 'Vector Store', type: 'VectorStore' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'BabyAGI', type: 'BabyAGI|AgentExecutor|BaseChain' }
    ];
  }

  // ============================================
  // Chains
  // ============================================
  if (nodeType === 'llmChain') {
    flowiseNode.data.inputs = {};
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Language Model', type: 'BaseLanguageModel' },
      { name: 'prompt', label: 'Prompt', type: 'BaseStringPromptTemplate', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'LLMChain', type: 'LLMChain|BaseChain' }
    ];
  }

  if (nodeType === 'conversationChain') {
    flowiseNode.data.inputs = {};
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Chat Model', type: 'BaseChatModel' },
      { name: 'memory', label: 'Memory', type: 'BaseMemory', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ConversationChain', type: 'ConversationChain|LLMChain|BaseChain' }
    ];
  }

  if (nodeType === 'conversationalRetrievalQAChain') {
    flowiseNode.data.inputs = {
      returnSourceDocuments: config.returnSourceDocuments ?? true,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Chat Model', type: 'BaseChatModel' },
      { name: 'vectorStore', label: 'Vector Store', type: 'VectorStore' },
      { name: 'memory', label: 'Memory', type: 'BaseMemory', optional: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ConversationalRetrievalQAChain', type: 'ConversationalRetrievalQAChain|BaseChain' }
    ];
  }

  if (nodeType === 'retrievalQAChain') {
    flowiseNode.data.inputs = {
      returnSourceDocuments: config.returnSourceDocuments ?? true,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Language Model', type: 'BaseLanguageModel' },
      { name: 'vectorStore', label: 'Vector Store', type: 'VectorStore' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'RetrievalQAChain', type: 'RetrievalQAChain|BaseChain' }
    ];
  }

  if (nodeType === 'sqlDatabaseChain') {
    flowiseNode.data.inputs = {
      database: config.database || '',
      topK: config.topK ?? 10,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Language Model', type: 'BaseLanguageModel' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'SqlDatabaseChain', type: 'SqlDatabaseChain|BaseChain' }
    ];
  }

  if (nodeType === 'apiChain') {
    flowiseNode.data.inputs = {
      apiDocs: config.apiDocs || '',
    };
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Language Model', type: 'BaseLanguageModel' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'APIChain', type: 'APIChain|BaseChain' }
    ];
  }

  if (nodeType === 'vectaraQAChain') {
    flowiseNode.data.inputs = {
      vectaraCustomerId: config.vectaraCustomerId || '',
      vectaraCorpusId: config.vectaraCorpusId || '',
      vectaraApiKey: config.vectaraApiKey || process.env.VECTARA_API_KEY || '',
    };
    flowiseNode.data.inputAnchors = [];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'VectaraQAChain', type: 'VectaraQAChain|BaseChain' }
    ];
  }

  if (nodeType === 'multiPromptChain') {
    flowiseNode.data.inputs = {};
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Language Model', type: 'BaseLanguageModel' },
      { name: 'promptTemplates', label: 'Prompt Templates', type: 'BaseStringPromptTemplate', list: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'MultiPromptChain', type: 'MultiPromptChain|BaseChain' }
    ];
  }

  if (nodeType === 'multiRetrievalQAChain') {
    flowiseNode.data.inputs = {};
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Language Model', type: 'BaseLanguageModel' },
      { name: 'retrievers', label: 'Retrievers', type: 'BaseRetriever', list: true },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'MultiRetrievalQAChain', type: 'MultiRetrievalQAChain|BaseChain' }
    ];
  }

  // ============================================
  // Memory
  // ============================================
  if (nodeType === 'bufferMemory') {
    flowiseNode.data.inputs = {
      sessionId: config.sessionId || '',
      memoryKey: config.memoryKey || 'chat_history',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'BufferMemory', type: 'BufferMemory|BaseChatMemory|BaseMemory' }
    ];
  }

  if (nodeType === 'bufferWindowMemory') {
    flowiseNode.data.inputs = {
      sessionId: config.sessionId || '',
      memoryKey: config.memoryKey || 'chat_history',
      k: config.k ?? 5,
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'BufferWindowMemory', type: 'BufferWindowMemory|BaseChatMemory|BaseMemory' }
    ];
  }

  if (nodeType === 'conversationSummaryMemory') {
    flowiseNode.data.inputs = {
      sessionId: config.sessionId || '',
      memoryKey: config.memoryKey || 'chat_history',
    };
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Language Model', type: 'BaseLanguageModel' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ConversationSummaryMemory', type: 'ConversationSummaryMemory|BaseChatMemory|BaseMemory' }
    ];
  }

  if (nodeType === 'conversationSummaryBufferMemory') {
    flowiseNode.data.inputs = {
      sessionId: config.sessionId || '',
      memoryKey: config.memoryKey || 'chat_history',
      maxTokenLimit: config.maxTokenLimit ?? 2000,
    };
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Language Model', type: 'BaseLanguageModel' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ConversationSummaryBufferMemory', type: 'ConversationSummaryBufferMemory|BaseChatMemory|BaseMemory' }
    ];
  }

  if (nodeType === 'entityMemory') {
    flowiseNode.data.inputs = {
      sessionId: config.sessionId || '',
    };
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Language Model', type: 'BaseLanguageModel' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'EntityMemory', type: 'EntityMemory|BaseChatMemory|BaseMemory' }
    ];
  }

  if (nodeType === 'redisBackedChatMemory') {
    flowiseNode.data.inputs = {
      sessionId: config.sessionId || '',
      redisUrl: config.redisUrl || 'redis://localhost:6379',
      sessionTTL: config.sessionTTL ?? 300,
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'RedisBackedChatMemory', type: 'RedisBackedChatMemory|BaseChatMemory|BaseMemory' }
    ];
  }

  if (nodeType === 'upstashRedisBackedChatMemory') {
    flowiseNode.data.inputs = {
      sessionId: config.sessionId || '',
      upstashRedisRestUrl: config.upstashRedisRestUrl || process.env.UPSTASH_REDIS_REST_URL || '',
      upstashRedisRestToken: config.upstashRedisRestToken || process.env.UPSTASH_REDIS_REST_TOKEN || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'UpstashRedisBackedChatMemory', type: 'UpstashRedisBackedChatMemory|BaseChatMemory|BaseMemory' }
    ];
  }

  if (nodeType === 'dynamoDbChatMemory') {
    flowiseNode.data.inputs = {
      sessionId: config.sessionId || '',
      tableName: config.tableName || 'langchain',
      region: config.region || process.env.AWS_REGION || 'us-east-1',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'DynamoDBChatMemory', type: 'DynamoDBChatMemory|BaseChatMemory|BaseMemory' }
    ];
  }

  if (nodeType === 'mongoDbChatMemory') {
    flowiseNode.data.inputs = {
      sessionId: config.sessionId || '',
      mongoUrl: config.mongoUrl || 'mongodb://localhost:27017',
      databaseName: config.databaseName || 'langchain',
      collectionName: config.collectionName || 'chat_history',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'MongoDBChatMemory', type: 'MongoDBChatMemory|BaseChatMemory|BaseMemory' }
    ];
  }

  if (nodeType === 'zepMemory') {
    flowiseNode.data.inputs = {
      sessionId: config.sessionId || '',
      zepUrl: config.zepUrl || 'http://localhost:8000',
      zepApiKey: config.zepApiKey || process.env.ZEP_API_KEY || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ZepMemory', type: 'ZepMemory|BaseChatMemory|BaseMemory' }
    ];
  }

  // ============================================
  // Prompts
  // ============================================
  if (nodeType === 'promptTemplate') {
    flowiseNode.data.inputs = {
      template: config.template || '{input}',
      inputVariables: config.inputVariables || ['input'],
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'PromptTemplate', type: 'PromptTemplate|BaseStringPromptTemplate' }
    ];
  }

  if (nodeType === 'chatPromptTemplate') {
    flowiseNode.data.inputs = {
      systemMessage: config.systemMessage || '',
      humanMessage: config.humanMessage || '{input}',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'ChatPromptTemplate', type: 'ChatPromptTemplate|BaseChatPromptTemplate' }
    ];
  }

  if (nodeType === 'fewShotPromptTemplate') {
    flowiseNode.data.inputs = {
      examples: config.examples || '[]',
      examplePrompt: config.examplePrompt || '',
      prefix: config.prefix || '',
      suffix: config.suffix || '{input}',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'FewShotPromptTemplate', type: 'FewShotPromptTemplate|BaseStringPromptTemplate' }
    ];
  }

  // ============================================
  // Output Parsers
  // ============================================
  if (nodeType === 'structuredOutputParser') {
    flowiseNode.data.inputs = {
      jsonSchema: config.jsonSchema || '{}',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'StructuredOutputParser', type: 'StructuredOutputParser|BaseOutputParser' }
    ];
  }

  if (nodeType === 'csvOutputParser') {
    flowiseNode.data.inputs = {
      fields: config.fields || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'CSVOutputParser', type: 'CSVOutputParser|BaseOutputParser' }
    ];
  }

  if (nodeType === 'customListOutputParser') {
    flowiseNode.data.inputs = {
      separator: config.separator || ',',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'CustomListOutputParser', type: 'CustomListOutputParser|BaseOutputParser' }
    ];
  }

  if (nodeType === 'autoFixOutputParser') {
    flowiseNode.data.inputs = {};
    flowiseNode.data.inputAnchors = [
      { name: 'model', label: 'Language Model', type: 'BaseLanguageModel' },
      { name: 'outputParser', label: 'Output Parser', type: 'BaseOutputParser' },
    ];
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'AutoFixOutputParser', type: 'AutoFixOutputParser|BaseOutputParser' }
    ];
  }

  // ============================================
  // Utilities
  // ============================================
  if (nodeType === 'getVariable') {
    flowiseNode.data.inputs = {
      variableName: config.variableName || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'GetVariable', type: 'GetVariable|Utility' }
    ];
  }

  if (nodeType === 'setVariable') {
    flowiseNode.data.inputs = {
      variableName: config.variableName || '',
      variableValue: config.variableValue || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'output', label: 'SetVariable', type: 'SetVariable|Utility' }
    ];
  }

  if (nodeType === 'ifElse') {
    flowiseNode.data.inputs = {
      condition: config.condition || '',
    };
    flowiseNode.data.outputAnchors = [
      { name: 'outputTrue', label: 'True', type: 'IfElse|Utility' },
      { name: 'outputFalse', label: 'False', type: 'IfElse|Utility' },
    ];
  }

  if (nodeType === 'stickyNote') {
    flowiseNode.data.inputs = {
      note: config.note || '',
    };
    flowiseNode.data.outputAnchors = [];
  }
}
