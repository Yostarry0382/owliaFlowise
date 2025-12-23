/**
 * ローカルテキスト処理ライブラリ
 * Flowise不要で動作するテキスト処理機能を提供
 */

// 基本的な文字統計
export interface TextStatistics {
  charCount: number;
  charCountWithoutSpaces: number;
  wordCount: number;
  lineCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageWordLength: number;
  averageSentenceLength: number;
}

// 感情分析結果
export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // -1.0 〜 1.0
  confidence: number; // 0.0 〜 1.0
  keywords: {
    positive: string[];
    negative: string[];
  };
}

// キーワード抽出結果
export interface KeywordExtractionResult {
  keywords: Array<{
    word: string;
    frequency: number;
    importance: number;
  }>;
  phrases: string[];
}

// 要約結果
export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  originalLength: number;
  summaryLength: number;
  compressionRatio: number;
}

// 処理結果全体
export interface TextProcessingResult {
  statistics: TextStatistics;
  sentiment: SentimentResult;
  keywords: KeywordExtractionResult;
  summary: SummaryResult;
  processedAt: string;
}

// 日本語のポジティブ・ネガティブワード辞書
const POSITIVE_WORDS_JA = [
  '良い', 'よい', 'いい', '素晴らしい', 'すばらしい', '最高', '優れた', '優秀',
  '美しい', 'うつくしい', '幸せ', 'しあわせ', '楽しい', 'たのしい', '嬉しい', 'うれしい',
  '好き', 'すき', '愛', '感謝', 'ありがとう', '成功', '達成', '満足',
  '素敵', 'すてき', '快適', '安心', '希望', '期待', '喜び', 'よろこび',
  '明るい', 'あかるい', '元気', 'げんき', '健康', 'けんこう', '幸運', 'こううん',
  '便利', 'べんり', '効果的', 'こうかてき', '有益', 'ゆうえき', '価値', 'かち'
];

const NEGATIVE_WORDS_JA = [
  '悪い', 'わるい', '最悪', 'ひどい', '酷い', '嫌い', 'きらい', '不満',
  '悲しい', 'かなしい', '辛い', 'つらい', '苦しい', 'くるしい', '怒り', 'いかり',
  '失敗', 'しっぱい', '問題', 'もんだい', '困難', 'こんなん', '不安', 'ふあん',
  '心配', 'しんぱい', '恐怖', 'きょうふ', '危険', 'きけん', '損害', 'そんがい',
  '残念', 'ざんねん', '不便', 'ふべん', '無駄', 'むだ', '欠点', 'けってん',
  'ダメ', 'だめ', '駄目', '間違い', 'まちがい', '誤り', 'あやまり', 'エラー'
];

// 英語のポジティブ・ネガティブワード辞書
const POSITIVE_WORDS_EN = [
  'good', 'great', 'excellent', 'wonderful', 'amazing', 'fantastic', 'beautiful',
  'happy', 'joy', 'love', 'like', 'best', 'perfect', 'awesome', 'brilliant',
  'success', 'successful', 'win', 'winning', 'positive', 'hope', 'hopeful',
  'thank', 'thanks', 'grateful', 'appreciate', 'enjoy', 'excited', 'exciting'
];

const NEGATIVE_WORDS_EN = [
  'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'dislike', 'ugly',
  'sad', 'unhappy', 'angry', 'fear', 'afraid', 'worry', 'worried', 'problem',
  'fail', 'failure', 'lose', 'losing', 'negative', 'wrong', 'mistake', 'error',
  'difficult', 'hard', 'trouble', 'issue', 'bug', 'broken', 'damage', 'risk'
];

// 日本語ストップワード
const STOP_WORDS_JA = [
  'の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ',
  'ある', 'いる', 'も', 'する', 'から', 'な', 'こと', 'として', 'い', 'や',
  'など', 'なっ', 'ない', 'この', 'ため', 'その', 'あっ', 'よう', 'また',
  'もの', 'という', 'あり', 'まで', 'られ', 'なる', 'へ', 'か', 'だ', 'これ',
  'それ', 'あれ', 'どれ', 'ここ', 'そこ', 'あそこ', 'どこ', 'です', 'ます'
];

// 英語ストップワード
const STOP_WORDS_EN = [
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who'
];

/**
 * テキストの基本統計を計算
 */
export function calculateStatistics(text: string): TextStatistics {
  const charCount = text.length;
  const charCountWithoutSpaces = text.replace(/\s/g, '').length;

  // 単語数（日本語・英語混在対応）
  const englishWords = text.match(/[a-zA-Z]+/g) || [];
  const japaneseChars = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || [];
  const wordCount = englishWords.length + Math.ceil(japaneseChars.length / 2);

  // 行数
  const lines = text.split(/\r?\n/);
  const lineCount = lines.length;

  // 文の数（句点、ピリオド、感嘆符、疑問符で区切る）
  const sentences = text.split(/[。.!?！？]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length || 1;

  // 段落数（空行で区切られたブロック）
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const paragraphCount = paragraphs.length || 1;

  // 平均単語長
  const averageWordLength = englishWords.length > 0
    ? englishWords.reduce((sum, w) => sum + w.length, 0) / englishWords.length
    : 0;

  // 平均文長（文字数）
  const averageSentenceLength = charCountWithoutSpaces / sentenceCount;

  return {
    charCount,
    charCountWithoutSpaces,
    wordCount,
    lineCount,
    sentenceCount,
    paragraphCount,
    averageWordLength: Math.round(averageWordLength * 10) / 10,
    averageSentenceLength: Math.round(averageSentenceLength * 10) / 10
  };
}

/**
 * 感情分析を実行
 */
export function analyzeSentiment(text: string): SentimentResult {
  const lowerText = text.toLowerCase();

  // ポジティブ・ネガティブワードのマッチング
  const foundPositive: string[] = [];
  const foundNegative: string[] = [];

  // 日本語
  for (const word of POSITIVE_WORDS_JA) {
    if (text.includes(word)) {
      foundPositive.push(word);
    }
  }
  for (const word of NEGATIVE_WORDS_JA) {
    if (text.includes(word)) {
      foundNegative.push(word);
    }
  }

  // 英語
  for (const word of POSITIVE_WORDS_EN) {
    if (lowerText.includes(word)) {
      foundPositive.push(word);
    }
  }
  for (const word of NEGATIVE_WORDS_EN) {
    if (lowerText.includes(word)) {
      foundNegative.push(word);
    }
  }

  const positiveCount = foundPositive.length;
  const negativeCount = foundNegative.length;
  const total = positiveCount + negativeCount;

  let score: number;
  let sentiment: 'positive' | 'neutral' | 'negative';
  let confidence: number;

  if (total === 0) {
    score = 0;
    sentiment = 'neutral';
    confidence = 0.3; // キーワードがない場合は信頼度低
  } else {
    score = (positiveCount - negativeCount) / total;
    confidence = Math.min(1, total / 10); // 10個以上で信頼度1.0

    if (score > 0.2) {
      sentiment = 'positive';
    } else if (score < -0.2) {
      sentiment = 'negative';
    } else {
      sentiment = 'neutral';
    }
  }

  return {
    sentiment,
    score: Math.round(score * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    keywords: {
      positive: [...new Set(foundPositive)].slice(0, 5),
      negative: [...new Set(foundNegative)].slice(0, 5)
    }
  };
}

/**
 * キーワードを抽出
 */
export function extractKeywords(text: string): KeywordExtractionResult {
  // 単語に分割
  const words: string[] = [];

  // 英単語
  const englishWords = text.match(/[a-zA-Z]{3,}/g) || [];
  words.push(...englishWords.map(w => w.toLowerCase()));

  // 日本語（2文字以上の連続した漢字・カタカナ）
  const kanjiWords = text.match(/[\u4E00-\u9FAF]{2,}/g) || [];
  const katakanaWords = text.match(/[\u30A0-\u30FF]{2,}/g) || [];
  words.push(...kanjiWords, ...katakanaWords);

  // ストップワードを除去
  const stopWords = new Set([...STOP_WORDS_JA, ...STOP_WORDS_EN]);
  const filteredWords = words.filter(w => !stopWords.has(w));

  // 頻度カウント
  const frequency = new Map<string, number>();
  for (const word of filteredWords) {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  }

  // 重要度計算（頻度 * 文字数の重み）
  const keywords = Array.from(frequency.entries())
    .map(([word, freq]) => ({
      word,
      frequency: freq,
      importance: freq * (1 + Math.log(word.length))
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10);

  // フレーズ抽出（連続する名詞的な語句）
  const phrases: string[] = [];
  const phrasePattern = /[\u4E00-\u9FAF\u30A0-\u30FF]{4,}/g;
  const matches = text.match(phrasePattern) || [];
  phrases.push(...[...new Set(matches)].slice(0, 5));

  return {
    keywords,
    phrases
  };
}

/**
 * テキストを要約（抽出型要約）
 */
export function summarizeText(text: string, maxSentences: number = 3): SummaryResult {
  // 文に分割
  const sentences = text
    .split(/[。.!?！？]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10); // 短すぎる文を除外

  if (sentences.length === 0) {
    return {
      summary: text,
      keyPoints: [],
      originalLength: text.length,
      summaryLength: text.length,
      compressionRatio: 1
    };
  }

  // 各文のスコアを計算
  const keywordResult = extractKeywords(text);
  const importantWords = new Set(keywordResult.keywords.map(k => k.word));

  const scoredSentences = sentences.map((sentence, index) => {
    let score = 0;

    // 位置によるスコア（最初と最後の文は重要）
    if (index === 0) score += 2;
    if (index === sentences.length - 1) score += 1;

    // キーワード含有数
    for (const word of importantWords) {
      if (sentence.includes(word)) {
        score += 1;
      }
    }

    // 長さによるスコア（適度な長さが好ましい）
    const optimalLength = 80;
    const lengthScore = 1 - Math.abs(sentence.length - optimalLength) / optimalLength;
    score += Math.max(0, lengthScore);

    return { sentence, score, index };
  });

  // スコア順にソートして上位を選択
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index); // 元の順序に戻す

  const summary = topSentences.map(s => s.sentence).join('。') + '。';

  // キーポイントを抽出
  const keyPoints = topSentences
    .slice(0, 3)
    .map(s => {
      // 文が長すぎる場合は短縮
      if (s.sentence.length > 50) {
        return s.sentence.substring(0, 47) + '...';
      }
      return s.sentence;
    });

  return {
    summary,
    keyPoints,
    originalLength: text.length,
    summaryLength: summary.length,
    compressionRatio: Math.round((summary.length / text.length) * 100) / 100
  };
}

/**
 * テキストの完全な処理を実行
 */
export function processText(text: string): TextProcessingResult {
  return {
    statistics: calculateStatistics(text),
    sentiment: analyzeSentiment(text),
    keywords: extractKeywords(text),
    summary: summarizeText(text),
    processedAt: new Date().toISOString()
  };
}

/**
 * バッチ処理：複数テキストを一括処理
 */
export function processTextBatch(texts: string[]): {
  results: Array<{
    index: number;
    input: string;
    output: TextProcessingResult;
  }>;
  statistics: {
    total: number;
    sentiments: {
      positive: number;
      neutral: number;
      negative: number;
    };
    averageCharCount: number;
    totalCharCount: number;
  };
  completedAt: string;
} {
  const results = texts.map((text, index) => ({
    index,
    input: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    output: processText(text)
  }));

  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  let totalCharCount = 0;

  for (const result of results) {
    sentimentCounts[result.output.sentiment.sentiment]++;
    totalCharCount += result.output.statistics.charCount;
  }

  return {
    results,
    statistics: {
      total: texts.length,
      sentiments: sentimentCounts,
      averageCharCount: Math.round(totalCharCount / texts.length),
      totalCharCount
    },
    completedAt: new Date().toISOString()
  };
}

/**
 * 処理結果をマークダウンレポートに変換
 */
export function formatResultAsMarkdown(batchResult: ReturnType<typeof processTextBatch>): string {
  const { results, statistics, completedAt } = batchResult;

  let markdown = `# バッチテキスト処理レポート

## 処理統計
- **処理件数**: ${statistics.total}件
- **合計文字数**: ${statistics.totalCharCount.toLocaleString()}文字
- **平均文字数**: ${statistics.averageCharCount.toLocaleString()}文字/件
- **感情分析内訳**:
  - ポジティブ: ${statistics.sentiments.positive}件
  - ニュートラル: ${statistics.sentiments.neutral}件
  - ネガティブ: ${statistics.sentiments.negative}件
- **処理完了時刻**: ${new Date(completedAt).toLocaleString('ja-JP')}

## 各テキストの処理結果
`;

  for (const result of results) {
    const { index, input, output } = result;
    markdown += `
### テキスト ${index + 1}
**入力（抜粋）**: ${input}

**統計情報**:
- 文字数: ${output.statistics.charCount.toLocaleString()}
- 単語数: ${output.statistics.wordCount}
- 文数: ${output.statistics.sentenceCount}

**感情分析**: ${output.sentiment.sentiment} (スコア: ${output.sentiment.score}, 信頼度: ${output.sentiment.confidence})
${output.sentiment.keywords.positive.length > 0 ? `- ポジティブキーワード: ${output.sentiment.keywords.positive.join(', ')}` : ''}
${output.sentiment.keywords.negative.length > 0 ? `- ネガティブキーワード: ${output.sentiment.keywords.negative.join(', ')}` : ''}

**要約**: ${output.summary.summary}

**キーポイント**:
${output.summary.keyPoints.map(p => `- ${p}`).join('\n')}

---
`;
  }

  markdown += `
## まとめ
${statistics.sentiments.positive > statistics.sentiments.negative
  ? '全体的にポジティブな傾向が見られます。'
  : statistics.sentiments.positive < statistics.sentiments.negative
    ? '全体的にネガティブな傾向が見られます。'
    : '全体的にニュートラルな傾向です。'}

処理された${statistics.total}件のテキストの合計は${statistics.totalCharCount.toLocaleString()}文字で、平均${statistics.averageCharCount.toLocaleString()}文字でした。
`;

  return markdown;
}
