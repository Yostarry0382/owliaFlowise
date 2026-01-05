import re

with open('app/lib/native-execution-engine.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_text = '''// PDF Loader ノード
const pdfLoaderExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const filePath = config.file || config.filePath || inputs.file || '';
    const fileData = config.file_file || inputs.file_file; // アップロードされたファイルデータ

    context.logs.push(`[PDFLoader] ${node.data.label}: PDF読み込み開始`);

    if (!filePath && !fileData) {
      context.logs.push(`[PDFLoader] ${node.data.label}: ファイルが指定されていません`);
      return { success: false, output: null, error: 'PDFファイルが指定されていません' };
    }

    try {
      // サーバーサイドでのPDF処理
      if (typeof window === 'undefined' && filePath) {
        const fs = await import('fs/promises');
        const path = await import('path');

        // ファイルパスを解決
        const fullPath = path.isAbsolute(filePath)
          ? filePath
          : path.join(process.cwd(), 'data', 'uploads', filePath);

        // ファイル存在チェック
        try {
          await fs.access(fullPath);
        } catch {
          context.logs.push(`[PDFLoader] ${node.data.label}: ファイルが見つかりません: ${fullPath}`);
          return { success: false, output: null, error: `ファイルが見つかりません: ${filePath}` };
        }

        // PDFの内容を読み取る（実際のPDF解析は将来実装）
        // 現在はファイル情報のみ返す
        const stats = await fs.stat(fullPath);

        context.logs.push(`[PDFLoader] ${node.data.label}: PDF読み込み成功 (${stats.size} bytes)`);

        // モック: 実際のPDF解析は pdf-parse などのライブラリが必要
        return {
          success: true,
          output: {
            type: 'pdf',
            filePath: filePath,
            fileName: path.basename(filePath),
            size: stats.size,
            content: `[PDF Content from: ${path.basename(filePath)}]\\n\\nこのPDFファイルの内容がここに展開されます。\\n実際のPDF解析には pdf-parse ライブラリが必要です。`,
            pageCount: 1,
            metadata: {
              source: filePath,
              type: 'application/pdf',
            },
          },
        };
      }

      // ファイル名のみの場合（アップロード済み）
      context.logs.push(`[PDFLoader] ${node.data.label}: ファイル名: ${filePath}`);
      return {
        success: true,
        output: {'''

new_text = '''// PDF Loader ノード
const pdfLoaderExecutor: NodeExecutor = {
  async execute(node, inputs, context) {
    const config = node.data.config || {};
    const filePath = config.file || config.filePath || inputs.file || '';
    const fileData = config.file_file || inputs.file_file; // アップロードされたファイルデータ
    const splitPages = config.splitPages !== false; // デフォルトでページ分割

    context.logs.push(`[PDFLoader] ${node.data.label}: PDF読み込み開始`);

    if (!filePath && !fileData) {
      context.logs.push(`[PDFLoader] ${node.data.label}: ファイルが指定されていません`);
      return { success: false, output: null, error: 'PDFファイルが指定されていません' };
    }

    try {
      // サーバーサイドでのPDF処理
      if (typeof window === 'undefined') {
        const fs = await import('fs/promises');
        const path = await import('path');

        let pdfBuffer: Buffer;
        let fileName: string;

        if (fileData && typeof fileData === 'object' && fileData.data) {
          // Base64エンコードされたファイルデータの場合
          pdfBuffer = Buffer.from(fileData.data, 'base64');
          fileName = fileData.name || 'uploaded.pdf';
          context.logs.push(`[PDFLoader] アップロードされたファイルを処理: ${fileName}`);
        } else if (filePath) {
          // ファイルパスからの読み込み
          const fullPath = path.isAbsolute(filePath)
            ? filePath
            : path.join(process.cwd(), 'data', 'uploads', filePath);

          // ファイル存在チェック
          try {
            await fs.access(fullPath);
          } catch {
            context.logs.push(`[PDFLoader] ${node.data.label}: ファイルが見つかりません: ${fullPath}`);
            return { success: false, output: null, error: `ファイルが見つかりません: ${filePath}` };
          }

          pdfBuffer = await fs.readFile(fullPath);
          fileName = path.basename(filePath);
          context.logs.push(`[PDFLoader] ファイルを読み込み: ${fullPath}`);
        } else {
          return { success: false, output: null, error: 'PDFデータがありません' };
        }

        // pdf-parseでPDFを解析
        try {
          const pdfParse = (await import('pdf-parse')).default;
          const pdfData = await pdfParse(pdfBuffer);

          const textContent = pdfData.text || '';
          const pageCount = pdfData.numpages || 1;
          const metadata = pdfData.info || {};

          context.logs.push(`[PDFLoader] ${node.data.label}: PDF解析成功 - ${pageCount}ページ, ${textContent.length}文字`);

          return {
            success: true,
            output: {
              type: 'pdf',
              filePath: filePath || fileName,
              fileName: fileName,
              size: pdfBuffer.length,
              content: textContent,
              pageCount: pageCount,
              metadata: {
                source: filePath || fileName,
                type: 'application/pdf',
                title: metadata.Title || '',
                author: metadata.Author || '',
                subject: metadata.Subject || '',
                creator: metadata.Creator || '',
                producer: metadata.Producer || '',
                creationDate: metadata.CreationDate || '',
                modDate: metadata.ModDate || '',
              },
            },
          };
        } catch (parseError) {
          const errorMsg = parseError instanceof Error ? parseError.message : 'PDF解析エラー';
          context.logs.push(`[PDFLoader] ${node.data.label}: PDF解析エラー - ${errorMsg}`);
          return { success: false, output: null, error: `PDF解析エラー: ${errorMsg}` };
        }
      }

      // クライアントサイドの場合（ファイル名のみ返す）
      context.logs.push(`[PDFLoader] ${node.data.label}: クライアントサイド - ファイル名: ${filePath}`);
      return {
        success: true,
        output: {'''

if old_text in content:
    content = content.replace(old_text, new_text, 1)
    with open('app/lib/native-execution-engine.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: PDF Loader updated with pdf-parse')
else:
    print('ERROR: Pattern not found')
    # デバッグ用：最初の部分を表示
    idx = content.find('// PDF Loader ノード')
    if idx >= 0:
        print('Found at index:', idx)
        print('Content preview:')
        print(content[idx:idx+500])
