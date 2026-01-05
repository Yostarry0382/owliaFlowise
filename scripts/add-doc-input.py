import re

with open('app/lib/native-execution-engine.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_text = '''    const toolSettings: Record<string, Record<string, any>> = config.toolSettings || {}; // ツールごとの詳細設定
    const userMessage = inputs.input || inputs.prompt || context.input;

    // ツール設定を取得するヘルパー関数'''

new_text = '''    const toolSettings: Record<string, Record<string, any>> = config.toolSettings || {}; // ツールごとの詳細設定

    // ドキュメント入力の処理
    const documentInputs = inputs.document || [];
    let documentContext = '';
    if (documentInputs && (Array.isArray(documentInputs) ? documentInputs.length > 0 : documentInputs)) {
      const docs = Array.isArray(documentInputs) ? documentInputs : [documentInputs];
      context.logs.push(`[LLM] ${node.data.label}: ${docs.length}個のドキュメントを読み込み中...`);

      for (const doc of docs) {
        if (doc && doc.content) {
          const fileName = doc.fileName || doc.filePath || 'unknown';
          documentContext += `\\n\\n--- ドキュメント: ${fileName} ---\\n${doc.content}`;
          context.logs.push(`[LLM] ドキュメント読み込み: ${fileName}`);
        } else if (typeof doc === 'string') {
          documentContext += `\\n\\n--- ドキュメント ---\\n${doc}`;
        }
      }
    }

    const userMessage = inputs.input || inputs.prompt || context.input;

    // ツール設定を取得するヘルパー関数'''

if old_text in content:
    content = content.replace(old_text, new_text, 1)
    with open('app/lib/native-execution-engine.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Document input handling added')
else:
    print('ERROR: Pattern not found')
