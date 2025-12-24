/**
 * PPTX Generation API
 * OwliaFabricaからPPTX生成サービスを呼び出すエンドポイント
 */

import { NextRequest, NextResponse } from 'next/server';

const PPTX_SERVICE_URL = process.env.PPTX_SERVICE_URL || 'http://localhost:8100';

// スライドコンテンツの型定義
interface SlideContent {
  layout_index?: number;
  title?: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  notes?: string;
  image_path?: string;
  placeholders?: Record<number, string>;
}

interface GenerateRequest {
  action: 'list_templates' | 'analyze_template' | 'generate' | 'fill_template' | 'status';
  template_id?: string;
  slides?: SlideContent[];
  output_filename?: string;
  metadata?: {
    author?: string;
    title?: string;
    subject?: string;
  };
}

/**
 * GET: サービス状態確認とテンプレート一覧取得
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'status';
  const templateId = searchParams.get('template_id');

  try {
    switch (action) {
      case 'status': {
        const response = await fetch(`${PPTX_SERVICE_URL}/`);
        const data = await response.json();
        return NextResponse.json({
          connected: true,
          service: data
        });
      }

      case 'list_templates': {
        const response = await fetch(`${PPTX_SERVICE_URL}/templates`);
        const data = await response.json();
        return NextResponse.json(data);
      }

      case 'analyze_template': {
        if (!templateId) {
          return NextResponse.json(
            { error: 'template_id is required' },
            { status: 400 }
          );
        }
        const response = await fetch(`${PPTX_SERVICE_URL}/templates/${templateId}/analyze`);
        const data = await response.json();
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        connected: false,
        error: `Failed to connect to PPTX service: ${message}`,
        serviceUrl: PPTX_SERVICE_URL
      },
      { status: 503 }
    );
  }
}

/**
 * POST: プレゼンテーション生成
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { action, template_id, slides, output_filename, metadata } = body;

    switch (action) {
      case 'generate': {
        if (!slides || slides.length === 0) {
          return NextResponse.json(
            { error: 'slides array is required' },
            { status: 400 }
          );
        }

        const response = await fetch(`${PPTX_SERVICE_URL}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template_id,
            slides,
            output_filename,
            metadata
          })
        });

        const data = await response.json();

        if (!response.ok) {
          return NextResponse.json(data, { status: response.status });
        }

        // ダウンロードURLをプロキシURLに変換
        if (data.download_url) {
          data.download_url = `/api/pptx/download?filename=${data.filename}`;
        }

        return NextResponse.json(data);
      }

      case 'fill_template': {
        if (!template_id) {
          return NextResponse.json(
            { error: 'template_id is required' },
            { status: 400 }
          );
        }

        if (!slides || slides.length === 0) {
          return NextResponse.json(
            { error: 'slides array is required' },
            { status: 400 }
          );
        }

        const response = await fetch(`${PPTX_SERVICE_URL}/templates/${template_id}/fill`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slides,
            output_filename
          })
        });

        const data = await response.json();

        if (!response.ok) {
          return NextResponse.json(data, { status: response.status });
        }

        // ダウンロードURLをプロキシURLに変換
        if (data.download_url) {
          data.download_url = `/api/pptx/download?filename=${data.filename}`;
        }

        return NextResponse.json(data);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate presentation: ${message}` },
      { status: 500 }
    );
  }
}
