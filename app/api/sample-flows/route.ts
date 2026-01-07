import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const SAMPLE_FLOWS_DIR = path.join(process.cwd(), 'data', 'sample-flows');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const flowName = searchParams.get('name');

    // 特定のフローを取得
    if (flowName) {
      const filePath = path.join(SAMPLE_FLOWS_DIR, `${flowName}.json`);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const flow = JSON.parse(content);
        return NextResponse.json(flow);
      } catch {
        return NextResponse.json(
          { error: `Sample flow '${flowName}' not found` },
          { status: 404 }
        );
      }
    }

    // すべてのサンプルフロー一覧を取得
    const files = await fs.readdir(SAMPLE_FLOWS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const samples = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(SAMPLE_FLOWS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const flow = JSON.parse(content);

        return {
          id: file.replace('.json', ''),
          name: flow.name,
          description: flow.description,
          nodeCount: flow.nodes?.length || 0,
          edgeCount: flow.edges?.length || 0,
        };
      })
    );

    return NextResponse.json({
      samples,
      total: samples.length,
    });
  } catch (error) {
    console.error('Error loading sample flows:', error);
    return NextResponse.json(
      { error: 'Failed to load sample flows' },
      { status: 500 }
    );
  }
}
