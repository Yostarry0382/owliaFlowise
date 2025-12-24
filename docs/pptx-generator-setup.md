# PowerPoint Generator Agent セットアップガイド

会社テンプレートを使用してPowerPointスライドを自動生成するエージェントのセットアップ手順です。

## アーキテクチャ概要

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   OwliaFabrica  │────▶│     Flowise     │────▶│  PPTX Service   │
│   (Next.js)     │     │   (LLM Agent)   │     │   (Python)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        │              ┌─────────────────┐              │
        └─────────────▶│  PPTX API       │◀─────────────┘
                       │  (Next.js API)  │
                       └─────────────────┘
```

## 必要な環境

- Python 3.9以上
- Node.js 18以上
- Flowise（オプション：Flowiseと連携する場合）

## 1. Python PPTXサービスのセットアップ

### 1.1 依存関係のインストール

```bash
cd tools/pptx-generator
pip install -r requirements.txt
```

### 1.2 サービスの起動

```bash
# 開発モード
python pptx_service.py

# または uvicorn を使用（本番推奨）
uvicorn pptx_service:app --host 0.0.0.0 --port 8100 --reload
```

サービスが起動すると、以下のエンドポイントが利用可能になります：
- http://localhost:8100/ - ヘルスチェック
- http://localhost:8100/docs - Swagger UIドキュメント

### 1.3 テンプレートの登録

会社のPowerPointテンプレート（.pptx）を `tools/pptx-generator/templates/` ディレクトリに配置します。

```bash
# テンプレートディレクトリにファイルをコピー
cp /path/to/company-template.pptx tools/pptx-generator/templates/
```

または、APIを使用してアップロード：

```bash
curl -X POST "http://localhost:8100/templates/upload" \
  -F "file=@/path/to/company-template.pptx" \
  -F "template_id=company-template"
```

## 2. 環境変数の設定

`.env.local` に以下を追加：

```env
# PPTX Service URL
PPTX_SERVICE_URL=http://localhost:8100

# Azure OpenAI（スライド内容生成用）
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

## 3. OwliaFabricaの起動

```bash
npm run dev
```

## 4. 使用方法

### 4.1 API経由でスライド生成

```bash
# テンプレート一覧を取得
curl http://localhost:3000/api/pptx?action=list_templates

# テンプレート構造を解析
curl "http://localhost:3000/api/pptx?action=analyze_template&template_id=company-template"

# スライドを生成
curl -X POST http://localhost:3000/api/pptx \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "template_id": "company-template",
    "slides": [
      {
        "layout_index": 0,
        "title": "新製品発表",
        "subtitle": "2024年冬モデル"
      },
      {
        "layout_index": 1,
        "title": "製品の特徴",
        "bullets": [
          "高性能プロセッサ搭載",
          "省電力設計",
          "スタイリッシュなデザイン"
        ]
      }
    ],
    "output_filename": "new_product_2024.pptx"
  }'
```

### 4.2 OwlAgentを使用

1. OwliaFabricaの「Agent Canvas」を開く
2. 「PowerPoint Generator Agent」を選択
3. チャット欄にスライドの要望を入力

例：
```
新製品発表のプレゼンを5枚構成で作成してください。
内容：
- 表紙
- 製品概要
- 3つの特徴
- 技術仕様
- まとめ
```

### 4.3 テンプレートにコンテンツを埋め込み

既存テンプレートのスライド構造を維持したままコンテンツを埋め込む：

```bash
curl -X POST http://localhost:3000/api/pptx \
  -H "Content-Type: application/json" \
  -d '{
    "action": "fill_template",
    "template_id": "company-template",
    "slides": [
      { "title": "タイトルを置換" },
      { "title": "2枚目のタイトル", "bullets": ["項目1", "項目2"] }
    ]
  }'
```

## 5. Flowise連携（オプション）

### 5.1 カスタムツールの登録

`tools/pptx-generator/PPTXGeneratorTool.ts` をFlowiseの `packages/components/nodes/tools/` にコピーし、Flowiseを再起動します。

### 5.2 Flowiseフローの作成

1. Flowiseで新しいChatflowを作成
2. 「PPTX Generator」ツールノードを追加
3. Service URLを `http://localhost:8100` に設定
4. LLMノードと接続

## 6. テンプレート構造の理解

### 6.1 レイアウトインデックス

一般的なPowerPointテンプレートのレイアウト：

| Index | 名前 | 用途 |
|-------|------|------|
| 0 | タイトルスライド | 表紙 |
| 1 | タイトルとコンテンツ | 標準スライド |
| 2 | セクション見出し | 区切り |
| 3 | 2つのコンテンツ | 左右分割 |
| 4 | 比較 | 2項目比較 |
| 5 | タイトルのみ | 自由配置 |
| 6 | 白紙 | 空白 |

### 6.2 プレースホルダーインデックス

| Index | 通常の用途 |
|-------|----------|
| 0 | タイトル |
| 1 | サブタイトル/本文 |
| 2以上 | 追加コンテンツ |

## 7. トラブルシューティング

### PPTXサービスに接続できない

```bash
# サービスの状態確認
curl http://localhost:8100/

# ポートが使用されているか確認
netstat -an | grep 8100
```

### テンプレートが見つからない

```bash
# テンプレート一覧を確認
curl http://localhost:8100/templates

# ディレクトリを確認
ls -la tools/pptx-generator/templates/
```

### 日本語が文字化けする

- テンプレートに日本語フォント（メイリオ、游ゴシック等）が設定されているか確認
- Python環境のエンコーディングを確認

### 生成されたファイルが開けない

```bash
# ファイルが正しく生成されているか確認
ls -la tools/pptx-generator/output/

# ファイルサイズが0でないか確認
```

## 8. API リファレンス

### GET /api/pptx

| パラメータ | 説明 |
|-----------|------|
| action=status | サービス状態確認 |
| action=list_templates | テンプレート一覧 |
| action=analyze_template&template_id=xxx | テンプレート解析 |

### POST /api/pptx

| フィールド | 型 | 説明 |
|-----------|-----|------|
| action | string | "generate" または "fill_template" |
| template_id | string | テンプレートID |
| slides | array | スライドコンテンツ配列 |
| output_filename | string | 出力ファイル名 |
| metadata | object | author, title, subject |

### SlideContent オブジェクト

| フィールド | 型 | 説明 |
|-----------|-----|------|
| layout_index | number | レイアウトインデックス |
| title | string | タイトル |
| subtitle | string | サブタイトル |
| body | string | 本文 |
| bullets | string[] | 箇条書き |
| notes | string | 発表者ノート |
| placeholders | object | カスタムプレースホルダーマッピング |

## 9. 今後の拡張予定

- [ ] 画像挿入サポート
- [ ] グラフ/チャート生成
- [ ] SmartArt対応
- [ ] マルチテンプレート合成
- [ ] バッチ生成
- [ ] Webフック通知
