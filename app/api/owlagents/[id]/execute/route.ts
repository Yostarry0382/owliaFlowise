import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { OwlAgent, ExecutionResult } from '@/app/types/flowise';
import { FlowiseClient } from '@/app/lib/flowise-client';

const STORAGE_DIR = path.join(process.cwd(), 'data', 'owlagents');
const flowiseClient = new FlowiseClient();

// Execute OwlAgent using Flowise
async function executeOwlAgent(agent: OwlAgent, input: any): Promise<ExecutionResult> {
  const startTime = Date.now();
  const logs: string[] = [];

  try {
    logs.push(`Starting execution of agent: ${agent.name}`);
    logs.push(`Input: ${JSON.stringify(input)}`);

    // Check if agent has a Flowise chatflow ID
    if (!agent.flowiseChatflowId) {
      return {
        success: false,
        output: null,
        executionTime: Date.now() - startTime,
        logs: [...logs, 'Error: Agent does not have a Flowise chatflow ID. Please sync the agent to Flowise first.'],
        error: 'Agent does not have a Flowise chatflow ID',
      };
    }

    logs.push(`Executing via Flowise chatflow: ${agent.flowiseChatflowId}`);

    const flowiseResponse = await flowiseClient.predict(
      agent.flowiseChatflowId,
      typeof input === 'string' ? input : JSON.stringify(input)
    );

    const executionTime = Date.now() - startTime;
    logs.push(`Execution completed in ${executionTime}ms`);

    return {
      success: true,
      output: flowiseResponse.text || flowiseResponse.json || flowiseResponse,
      executionTime,
      logs,
      flowiseResponse,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logs.push(`Execution failed: ${error}`);

    return {
      success: false,
      output: null,
      executionTime,
      logs,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { input } = body;

    // Load the agent
    const filePath = path.join(STORAGE_DIR, `${id}.json`);
    let agent: OwlAgent;

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      agent = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: `Agent with id ${id} not found` },
        { status: 404 }
      );
    }

    // Execute the agent via Flowise
    const result = await executeOwlAgent(agent, input);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error executing agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
