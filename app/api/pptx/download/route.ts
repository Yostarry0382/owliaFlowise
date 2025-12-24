/**
 * PPTX Download Proxy API
 * PPTXサービスからファイルをプロキシダウンロード
 */

import { NextRequest, NextResponse } from 'next/server';

const PPTX_SERVICE_URL = process.env.PPTX_SERVICE_URL || 'http://localhost:8100';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json(
      { error: 'filename is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${PPTX_SERVICE_URL}/download/${filename}`);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to download file: ${message}` },
      { status: 500 }
    );
  }
}
