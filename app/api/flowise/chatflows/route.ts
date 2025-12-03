import { NextRequest, NextResponse } from 'next/server';
import { FlowiseClient, FlowiseAPIError } from '@/app/lib/flowise-client';
import { FlowiseChatflowCreate } from '@/app/types/flowise';

// Flowise クライアントの初期化
const flowiseClient = new FlowiseClient();

/**
 * GET /api/flowise/chatflows
 * Flowiseのchatflow一覧を取得、または特定のchatflowを取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // 接続確認
    const isConnected = await flowiseClient.healthCheck();
    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: 'Flowise server is not available',
          details: 'Please ensure Flowise is running and accessible',
        },
        { status: 503 }
      );
    }

    if (id) {
      // 特定のchatflowを取得
      const chatflow = await flowiseClient.getChatflow(id);

      return NextResponse.json({
        success: true,
        chatflow,
      });
    }

    // 全chatflowを取得
    const chatflows = await flowiseClient.getChatflows();

    return NextResponse.json(chatflows);
  } catch (error) {
    console.error('Error fetching chatflows:', error);

    if (error instanceof FlowiseAPIError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Flowise API error',
          details: error.message,
          statusCode: error.statusCode,
        },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch chatflows',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/flowise/chatflows
 * 新しいchatflowをFlowiseに作成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, flowData, deployed, isPublic, category, type } = body;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: name',
        },
        { status: 400 }
      );
    }

    // 接続確認
    const isConnected = await flowiseClient.healthCheck();
    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: 'Flowise server is not available',
        },
        { status: 503 }
      );
    }

    const chatflowData: FlowiseChatflowCreate = {
      name,
      flowData: flowData || '{"nodes":[],"edges":[]}',
      deployed: deployed ?? false,
      isPublic: isPublic ?? false,
      category: category || 'OwliaFabrica',
      type: type || 'CHATFLOW',
    };

    const chatflow = await flowiseClient.createChatflow(chatflowData);

    return NextResponse.json({
      success: true,
      chatflow,
      message: 'Chatflow created successfully',
    });
  } catch (error) {
    console.error('Error creating chatflow:', error);

    if (error instanceof FlowiseAPIError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Flowise API error',
          details: error.message,
        },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create chatflow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/flowise/chatflows
 * 既存のchatflowを更新
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, flowData, deployed, isPublic, category } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: id',
        },
        { status: 400 }
      );
    }

    // 接続確認
    const isConnected = await flowiseClient.healthCheck();
    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: 'Flowise server is not available',
        },
        { status: 503 }
      );
    }

    // 更新データの構築
    const updateData: Partial<FlowiseChatflowCreate> = {};

    if (name !== undefined) updateData.name = name;
    if (flowData !== undefined) updateData.flowData = flowData;
    if (deployed !== undefined) updateData.deployed = deployed;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (category !== undefined) updateData.category = category;

    const chatflow = await flowiseClient.updateChatflow(id, updateData);

    return NextResponse.json({
      success: true,
      chatflow,
      message: 'Chatflow updated successfully',
    });
  } catch (error) {
    console.error('Error updating chatflow:', error);

    if (error instanceof FlowiseAPIError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Flowise API error',
          details: error.message,
        },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update chatflow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/flowise/chatflows
 * chatflowを削除
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: id',
        },
        { status: 400 }
      );
    }

    // 接続確認
    const isConnected = await flowiseClient.healthCheck();
    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: 'Flowise server is not available',
        },
        { status: 503 }
      );
    }

    await flowiseClient.deleteChatflow(id);

    return NextResponse.json({
      success: true,
      message: `Chatflow ${id} deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting chatflow:', error);

    if (error instanceof FlowiseAPIError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Flowise API error',
          details: error.message,
        },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete chatflow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
