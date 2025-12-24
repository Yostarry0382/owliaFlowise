/**
 * PPTX Template Upload API
 * テンプレートファイルのアップロード
 */

import { NextRequest, NextResponse } from 'next/server';

const PPTX_SERVICE_URL = process.env.PPTX_SERVICE_URL || 'http://localhost:8100';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const templateId = formData.get('template_id') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'file is required' },
        { status: 400 }
      );
    }

    // ファイルをPythonサービスに転送
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    if (templateId) {
      uploadFormData.append('template_id', templateId);
    }
    if (description) {
      uploadFormData.append('description', description);
    }

    const response = await fetch(`${PPTX_SERVICE_URL}/templates/upload`, {
      method: 'POST',
      body: uploadFormData,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to upload template: ${message}` },
      { status: 500 }
    );
  }
}
