/**
 * ノードリファレンス情報
 * Flowise公式ドキュメントから取得した各ノードタイプの説明と使用方法
 */

export interface NodeReference {
  description: string;
  features: string[];
  useCases: string[];
  tips?: string[];
  docUrl?: string;
}

export const nodeReferences: Record<string, NodeReference> = {
  // ============================================
  // Chat Models
  // ============================================
  azureChatOpenAI: {
    description:
      'Azure OpenAI Serviceを使用したチャットモデルです。メッセージのリストを入力として受け取り、AIが生成したメッセージを出力します。以前の補完モデルよりも強力でコスト効率が高いです。',
    features: [
      'Azure OpenAI APIとの統合',
      'カスタムデプロイメント名のサポート',
      'Temperature、Top P、ペナルティなどのパラメータ調整',
      'システムメッセージによる挙動のカスタマイズ',
      'ストリーミングレスポンス対応',
    ],
    useCases: [
      'チャットボットの構築',
      '質問応答システム',
      'ドキュメント要約',
      'コンテンツ生成',
      'コード生成・レビュー',
    ],
    tips: [
      'Temperatureを下げると（0.2-0.3）一貫性のある出力が得られます',
      'Temperatureを上げると（0.7-1.0）創造的な出力が得られます',
      'システムメッセージでAIの役割と振る舞いを定義してください',
      'Max Tokensは応答の長さに影響します',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/chat-models',
  },

  // ============================================
  // Embeddings
  // ============================================
  azureOpenAIEmbeddings: {
    description:
      'Azure OpenAI Serviceを使用してテキストをベクトル表現に変換するノードです。セマンティック検索や類似性検索に使用されます。',
    features: [
      'テキストから高品質なベクトル埋め込みを生成',
      'text-embedding-ada-002モデルのサポート',
      'バッチ処理による効率的な埋め込み生成',
      'ストリップ改行オプション',
    ],
    useCases: [
      'ベクトルデータベースへのドキュメント保存',
      'セマンティック検索の実装',
      'RAG（検索拡張生成）パイプライン',
      'ドキュメント類似性の計算',
    ],
    tips: [
      'Azure OpenAIアカウントの承認には約10営業日かかります',
      'デプロイメント名は通常「text-embedding-ada-002」を使用',
      'バッチサイズを調整してパフォーマンスを最適化',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/embeddings',
  },

  // ============================================
  // Vector Stores
  // ============================================
  weaviate: {
    description:
      'スケーラブルなオープンソースのベクトルデータベースです。埋め込みデータのアップサートと類似性検索またはMMR検索を実行できます。',
    features: [
      '埋め込みデータのアップサート',
      '類似性検索機能',
      'MMR（Maximal Marginal Relevance）検索',
      'フィルタリングによる検索結果の絞り込み',
      'スケーラブルなアーキテクチャ',
    ],
    useCases: [
      '大規模ドキュメントの保存と検索',
      'セマンティック検索エンジン',
      '推薦システム',
      'ナレッジベースの構築',
    ],
    tips: [
      'Top Kを調整して返される結果の数を制御',
      'フィルタリングを使用して特定のフィールドで絞り込み',
      'インデックス名は小文字で始める必要があります',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/vector-stores',
  },

  // ============================================
  // Memory
  // ============================================
  memory: {
    description:
      'AIに以前の会話の記憶を持たせることができるノードです。会話は配列またはデータベースに保存され、LLMにコンテキストとして提供されます。',
    features: [
      '会話履歴の保存と管理',
      'セッションIDによるマルチユーザー対応',
      '複数のストレージバックエンド対応',
      'メモリウィンドウによる履歴制限',
    ],
    useCases: [
      '継続的な会話のサポート',
      'コンテキストを維持したチャットボット',
      'パーソナライズされた応答の生成',
    ],
    tips: [
      'sessionIdを使用してユーザーごとに会話を分離',
      'メモリキーはデフォルトで「chat_history」を使用',
      'Buffer Window Memoryで最近の会話のみを保持可能',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/memory',
  },

  redisMemory: {
    description:
      'Redisサーバーに会話を要約して保存する高性能メモリノードです。高速なアクセスとスケーラビリティを提供します。',
    features: [
      '会話の自動要約',
      'Redisサーバーへの永続化',
      '高速な読み書きアクセス',
      'スケーラブルなストレージ',
    ],
    useCases: [
      '大規模なユーザーベースのチャットアプリ',
      '分散システムでのメモリ共有',
      '永続的な会話履歴の保存',
    ],
    tips: [
      'Redis URLの形式: redis://[username:password@]host:port',
      'セッションIDでユーザーを識別',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/memory',
  },

  // ============================================
  // Agents
  // ============================================
  conversationalAgent: {
    description:
      'LLMを推論エンジンとして使用し、どのアクションを取るべきか、その入力は何かを決定するエージェントです。結果はエージェントにフィードバックされ、追加アクションが必要かどうかを評価します。',
    features: [
      '会話に特化したプロンプト',
      'ツールの選択と実行',
      '反復的な推論とアクション',
      'メモリとの統合',
    ],
    useCases: [
      '対話型アシスタント',
      'カスタマーサポートボット',
      '情報検索と処理',
    ],
    tips: [
      '適切なツールを接続して機能を拡張',
      'メモリを接続して会話の文脈を維持',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/agents',
  },

  openAIAssistant: {
    description:
      'OpenAI Assistant APIを使用してツールの選択と引数を決定するエージェントです。コード実行やファイル検索などの高度な機能をサポートします。',
    features: [
      'OpenAI Assistant APIとの統合',
      'コードインタープリター機能',
      'ファイル検索機能',
      'カスタム関数の呼び出し',
    ],
    useCases: [
      '高度なコード生成・実行',
      'ドキュメント分析',
      'データ処理タスク',
    ],
    tips: [
      'Assistant IDを事前にOpenAIで作成しておく必要があります',
      'ファイル検索を使用する場合はVector Storeを設定',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/agents',
  },

  openAIToolAgent: {
    description:
      '関数呼び出しを使用してツールとパラメータを選択するエージェントです。OpenAIのFunction Calling機能を活用します。',
    features: [
      'Function Calling APIの活用',
      '複数ツールの同時呼び出し',
      '構造化された引数の生成',
    ],
    useCases: [
      '複雑なワークフローの自動化',
      'APIの連携',
      'データ変換と処理',
    ],
    tips: [
      'ツールの説明を明確にすることで精度が向上',
      'JSON Schemaでパラメータを厳密に定義',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/agents',
  },

  toolAgent: {
    description:
      '関数呼び出しを使用してツールとパラメータを選択する汎用エージェントです。様々なLLMプロバイダーで使用できます。',
    features: [
      '複数のLLMプロバイダー対応',
      'ツールの動的選択',
      '柔軟なパラメータ処理',
    ],
    useCases: [
      'マルチプロバイダー対応アプリ',
      'カスタムツール統合',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/agents',
  },

  reactAgentChat: {
    description:
      'ReAct（Reasoning and Acting）パターンを使用するチャット指向のエージェントです。推論と行動を交互に行いながらタスクを完了します。',
    features: [
      'ReActパターンによる推論',
      'チャットモデルとの最適化',
      '透明な思考プロセス',
    ],
    useCases: [
      '複雑な問題解決',
      'ステップバイステップの推論',
      'デバッグ可能なAIアクション',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/agents',
  },

  // ============================================
  // Tools
  // ============================================
  tool: {
    description:
      '汎用ツールノード。API呼び出し、カスタムJavaScript関数、データベースクエリの3つのモードで動作します。',
    features: [
      'HTTP API呼び出し（GET/POST/PUT/DELETE）',
      'カスタムHTTPヘッダーのサポート',
      'カスタムJavaScript関数の実行',
      'SQLクエリの実行（SELECT文のみ）',
      'セキュリティ保護付き実行環境',
    ],
    useCases: [
      '外部APIとの連携',
      'データ変換・加工処理',
      'カスタムビジネスロジック',
      'データベースからの情報取得',
    ],
    tips: [
      'API Callモード: エンドポイントURLとHTTPメソッドを指定',
      'Custom Functionモード: input変数で入力値を参照可能',
      'Database Queryモード: SELECT文のみ実行可能（現在はモック）',
      'セキュリティ上、危険なコードやSQLコマンドはブロックされます',
    ],
  },

  calculator: {
    description:
      '数学的計算を実行するツールです。エージェントが数値計算を必要とする際に使用されます。',
    features: [
      '四則演算',
      '複雑な数式の評価',
      '数学関数のサポート',
    ],
    useCases: [
      '数値計算タスク',
      'データ分析',
      '財務計算',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/tools',
  },

  customTool: {
    description:
      'アプリケーション固有のカスタムツールを作成するノードです。JavaScriptコードで独自の機能を実装できます。',
    features: [
      'カスタムJavaScriptコード実行',
      '柔軟な入力/出力定義',
      'API連携',
    ],
    useCases: [
      '独自APIとの連携',
      'カスタム処理の実装',
      'データ変換',
    ],
    tips: [
      'ツールの説明を明確にしてエージェントの理解を助ける',
      'エラーハンドリングを適切に実装',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/tools',
  },

  retrieverTool: {
    description:
      'リトリーバーをエージェントのツールとして使用するノードです。ベクトルストアからの検索機能を提供します。',
    features: [
      'ベクトル検索の統合',
      'セマンティック検索',
      'ドキュメント取得',
    ],
    useCases: [
      'ナレッジベース検索',
      'ドキュメント参照',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/tools',
  },

  // ============================================
  // Document Loaders
  // ============================================
  pdfLoader: {
    description:
      'PDFファイルからテキストを抽出してドキュメントとしてロードするノードです。',
    features: [
      'PDFテキスト抽出',
      'ページ分割オプション',
      'メタデータの保持',
    ],
    useCases: [
      'PDF文書の分析',
      'レポート処理',
      '契約書の解析',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/document-loaders',
  },

  docxLoader: {
    description:
      'Microsoft Word（DOCX）ファイルからテキストを抽出するノードです。',
    features: [
      'DOCX形式のサポート',
      'フォーマット情報の抽出',
      'テーブル処理',
    ],
    useCases: [
      'Word文書の処理',
      'レポート分析',
      'ドキュメント変換',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/document-loaders',
  },

  excelLoader: {
    description:
      'Microsoft Excelスプレッドシートからデータを抽出するノードです。',
    features: [
      'Excel形式のサポート',
      '複数シートの処理',
      'セルデータの抽出',
    ],
    useCases: [
      'データ分析',
      'レポート処理',
      '表形式データの変換',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/document-loaders',
  },

  csvLoader: {
    description:
      'CSVファイルからデータをロードするノードです。構造化データの処理に最適です。',
    features: [
      'CSV形式のパース',
      'カラム選択',
      '大容量ファイル対応',
    ],
    useCases: [
      'データインポート',
      'CSV分析',
      'バルクデータ処理',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/document-loaders',
  },

  jsonLoader: {
    description:
      'JSONファイルからデータを抽出するノードです。構造化データの処理に使用されます。',
    features: [
      'JSON形式のパース',
      'ネストされた構造のサポート',
      'JSONPath対応',
    ],
    useCases: [
      'API応答の処理',
      '設定ファイルの読み込み',
      '構造化データの分析',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/document-loaders',
  },

  textLoader: {
    description:
      'プレーンテキストファイルをロードするノードです。シンプルなテキスト処理に最適です。',
    features: [
      'テキストファイルの読み込み',
      'エンコーディング対応',
      'シンプルな処理',
    ],
    useCases: [
      'ログファイル分析',
      'テキストドキュメント処理',
      'コード分析',
    ],
    docUrl: 'https://docs.flowiseai.com/integrations/langchain/document-loaders',
  },

  // ============================================
  // Flow Control
  // ============================================
  start: {
    description:
      'フローの開始ポイントを定義するノードです。入力フィールドを設定してフローへの入力を受け取ります。',
    features: [
      'フロー開始点の定義',
      '入力フィールドの設定',
      '初期パラメータの受け渡し',
    ],
    useCases: [
      'ワークフローの開始',
      'ユーザー入力の受付',
    ],
  },

  end: {
    description:
      'フローの終了ポイントを定義するノードです。最終出力を返します。',
    features: [
      'フロー終了点の定義',
      '出力の集約',
      '結果の返却',
    ],
    useCases: [
      'ワークフローの完了',
      '最終結果の出力',
    ],
  },

  // ============================================
  // OwlAgent Reference
  // ============================================
  owlAgentReference: {
    description:
      '別のOwlAgentをサブフローとして呼び出すノードです。複雑なワークフローをモジュール化して再利用できます。',
    features: [
      '既存OwlAgentの再利用',
      'モジュール化されたワークフロー',
      '入出力マッピング',
      'ネストされたエージェント構造',
    ],
    useCases: [
      '複雑なワークフローの分割',
      '再利用可能なコンポーネント',
      'チーム間での共有',
    ],
    tips: [
      '循環参照に注意（A→B→Aは不可）',
      '入出力マッピングを正しく設定',
    ],
  },

};

/**
 * ノードタイプに対応するリファレンス情報を取得
 */
export function getNodeReference(nodeType: string): NodeReference | undefined {
  return nodeReferences[nodeType];
}
