import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const SAMPLE_FLOWS_DIR = path.join(process.cwd(), 'data', 'sample-flows');
const OWLAGENTS_DIR = path.join(process.cwd(), 'data', 'owlagents');

/**
 * サンプルフローをOwlAgentとしてインポート
 * POST /api/sample-flows/import
 * body: { sampleId: string } または { importAll: true }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sampleId, importAll } = body;

    // owlagentsディレクトリが存在しない場合は作成
    try {
      await fs.access(OWLAGENTS_DIR);
    } catch {
      await fs.mkdir(OWLAGENTS_DIR, { recursive: true });
    }

    if (importAll) {
      // すべてのサンプルをインポート
      const files = await fs.readdir(SAMPLE_FLOWS_DIR);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      const importedAgents = [];

      for (const file of jsonFiles) {
        const filePath = path.join(SAMPLE_FLOWS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const sampleFlow = JSON.parse(content);

        const agent = await importSampleAsOwlAgent(sampleFlow, file.replace('.json', ''));
        importedAgents.push(agent);
      }

      return NextResponse.json({
        success: true,
        message: `${importedAgents.length} sample flows imported as OwlAgents`,
        agents: importedAgents,
      });
    }

    if (sampleId) {
      // 特定のサンプルをインポート
      const filePath = path.join(SAMPLE_FLOWS_DIR, `${sampleId}.json`);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const sampleFlow = JSON.parse(content);

        const agent = await importSampleAsOwlAgent(sampleFlow, sampleId);

        return NextResponse.json({
          success: true,
          message: `Sample flow '${sampleId}' imported as OwlAgent`,
          agent,
        });
      } catch {
        return NextResponse.json(
          { error: `Sample flow '${sampleId}' not found` },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Either sampleId or importAll is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error importing sample flow:', error);
    return NextResponse.json(
      { error: 'Failed to import sample flow' },
      { status: 500 }
    );
  }
}

/**
 * サンプルフローをOwlAgentとして保存
 */
async function importSampleAsOwlAgent(sampleFlow: any, sampleId: string) {
  const agentId = `sample-${sampleId}-${uuidv4().substring(0, 8)}`;

  // カテゴリからタグを生成
  const categories = new Set<string>();
  sampleFlow.nodes?.forEach((node: any) => {
    if (node.data?.category) {
      categories.add(node.data.category);
    }
  });

  const agent = {
    id: agentId,
    name: sampleFlow.name || sampleId,
    description: sampleFlow.description || `Imported from sample: ${sampleId}`,
    tags: ['sample', ...Array.from(categories)],
    icon: getSampleIcon(sampleId),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    flow: {
      nodes: sampleFlow.nodes || [],
      edges: sampleFlow.edges || [],
    },
    isSample: true,
    sampleId: sampleId,
  };

  // OwlAgentとして保存
  const agentPath = path.join(OWLAGENTS_DIR, `${agentId}.json`);
  await fs.writeFile(agentPath, JSON.stringify(agent, null, 2), 'utf-8');

  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    tags: agent.tags,
    nodeCount: agent.flow.nodes.length,
    edgeCount: agent.flow.edges.length,
  };
}

/**
 * サンプルIDに基づいてアイコンを決定
 */
function getSampleIcon(sampleId: string): string {
  const iconMap: Record<string, string> = {
    'basic-conversation-chain': '💬',
    'rag-qa-chain': '📚',
    'tool-agent': '🛠️',
    'conversational-retrieval-chain': '🔍',
    'llm-chain-with-prompt': '📝',
    'azure-openai-conversation': '☁️',
    'web-scraper-qa': '🌐',
  };

  return iconMap[sampleId] || '🦉';
}
