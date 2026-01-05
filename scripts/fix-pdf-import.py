with open('app/lib/native-execution-engine.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_text = '''        // pdf-parseでPDFを解析
        try {
          const pdfParse = (await import('pdf-parse')).default;
          const pdfData = await pdfParse(pdfBuffer);'''

new_text = '''        // pdf-parseでPDFを解析
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(pdfBuffer);'''

if old_text in content:
    content = content.replace(old_text, new_text, 1)
    with open('app/lib/native-execution-engine.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Fixed pdf-parse import')
else:
    print('ERROR: Pattern not found')
