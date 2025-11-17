import { NextRequest, NextResponse } from 'next/server';
import { MultiAgentFlow } from '@/app/types/multi-agent';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage (実際の実装ではデータベースを使用)
const multiAgentFlows: Map<string, MultiAgentFlow> = new Map();

// GET: フロー一覧の取得または特定のフロー取得
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const flowId = searchParams.get('id');

  if (flowId) {
    const flow = multiAgentFlows.get(flowId);
    if (flow) {
      return NextResponse.json(flow);
    } else {
      return NextResponse.json(
        { error: 'Multi-agent flow not found' },
        { status: 404 }
      );
    }
  }

  // 全フローを返す
  const flows = Array.from(multiAgentFlows.values());
  return NextResponse.json({ flows });
}

// POST: 新規フロー作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const flow: MultiAgentFlow = {
      ...body,
      id: body.id || uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    multiAgentFlows.set(flow.id, flow);

    return NextResponse.json(flow, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create multi-agent flow' },
      { status: 500 }
    );
  }
}

// PUT: フロー更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const flowId = body.id;

    if (!flowId) {
      return NextResponse.json(
        { error: 'Flow ID is required' },
        { status: 400 }
      );
    }

    const existingFlow = multiAgentFlows.get(flowId);
    if (!existingFlow) {
      return NextResponse.json(
        { error: 'Multi-agent flow not found' },
        { status: 404 }
      );
    }

    const updatedFlow: MultiAgentFlow = {
      ...existingFlow,
      ...body,
      updatedAt: new Date(),
    };

    multiAgentFlows.set(flowId, updatedFlow);

    return NextResponse.json(updatedFlow);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update multi-agent flow' },
      { status: 500 }
    );
  }
}

// DELETE: フロー削除
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const flowId = searchParams.get('id');

  if (!flowId) {
    return NextResponse.json(
      { error: 'Flow ID is required' },
      { status: 400 }
    );
  }

  const deleted = multiAgentFlows.delete(flowId);
  if (deleted) {
    return NextResponse.json({ message: 'Multi-agent flow deleted successfully' });
  } else {
    return NextResponse.json(
      { error: 'Multi-agent flow not found' },
      { status: 404 }
    );
  }
}