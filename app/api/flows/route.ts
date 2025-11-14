import { NextRequest, NextResponse } from 'next/server';

// フローデータを保存するためのメモリストレージ（実際の環境ではデータベースを使用）
const flows = new Map();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (id) {
      const flow = flows.get(id);
      if (!flow) {
        return NextResponse.json(
          { error: 'Flow not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(flow);
    }

    // すべてのフローを返す
    const allFlows = Array.from(flows.entries()).map(([id, flow]) => ({
      id,
      ...flow,
    }));

    return NextResponse.json(allFlows);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch flows' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, nodes, edges } = body;

    const id = Date.now().toString();
    const flow = {
      id,
      name: name || 'Untitled Flow',
      description: description || '',
      nodes: nodes || [],
      edges: edges || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    flows.set(id, flow);

    return NextResponse.json(flow, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create flow' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, nodes, edges } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Flow ID is required' },
        { status: 400 }
      );
    }

    const existingFlow = flows.get(id);
    if (!existingFlow) {
      return NextResponse.json(
        { error: 'Flow not found' },
        { status: 404 }
      );
    }

    const updatedFlow = {
      ...existingFlow,
      name: name || existingFlow.name,
      description: description || existingFlow.description,
      nodes: nodes || existingFlow.nodes,
      edges: edges || existingFlow.edges,
      updatedAt: new Date().toISOString(),
    };

    flows.set(id, updatedFlow);

    return NextResponse.json(updatedFlow);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update flow' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Flow ID is required' },
        { status: 400 }
      );
    }

    if (!flows.has(id)) {
      return NextResponse.json(
        { error: 'Flow not found' },
        { status: 404 }
      );
    }

    flows.delete(id);

    return NextResponse.json(
      { message: 'Flow deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete flow' },
      { status: 500 }
    );
  }
}