import re

with open('app/lib/native-execution-engine.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. systemMessageにdocumentContextを追加
old_text1 = '''    // メッセージ履歴（ツール呼び出しループ用）
    const messages: Array<{ role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string; name?: string }> = [
      ...(systemMessage ? [{ role: 'system', content: systemMessage }] : []),
      { role: 'user', content: String(userMessage) },
    ];'''

new_text1 = '''    // メッセージ履歴（ツール呼び出しループ用）
    // ドキュメントコンテキストをシステムメッセージに追加
    const fullSystemMessage = documentContext
      ? `${systemMessage}\\n\\n以下のドキュメントを参照してください:${documentContext}`
      : systemMessage;

    const messages: Array<{ role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string; name?: string }> = [
      ...(fullSystemMessage ? [{ role: 'system', content: fullSystemMessage }] : []),
      { role: 'user', content: String(userMessage) },
    ];'''

if old_text1 in content:
    content = content.replace(old_text1, new_text1, 1)
    with open('app/lib/native-execution-engine.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Document context added to messages')
else:
    print('ERROR: Pattern not found')
