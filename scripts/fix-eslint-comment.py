with open('app/lib/native-execution-engine.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_text = '''        // pdf-parseでPDFを解析
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require('pdf-parse');'''

new_text = '''        // pdf-parseでPDFを解析
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const pdfParse = require('pdf-parse');'''

if old_text in content:
    content = content.replace(old_text, new_text, 1)
    with open('app/lib/native-execution-engine.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Fixed eslint comment')
else:
    print('ERROR: Pattern not found')
