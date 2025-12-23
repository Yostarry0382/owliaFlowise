import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { OwlAgent, ExecutionResult } from '@/app/types/flowise';
import { FlowiseClient } from '@/app/lib/flowise-client';
import { executeFlow } from '@/app/lib/native-execution-engine';

const STORAGE_DIR = path.join(process.cwd(), 'data', 'owlagents');
const flowiseClient = new FlowiseClient();

// Execute OwlAgent using native engine or Flowise
async function executeOwlAgent(agent: OwlAgent, input: any, useNative: boolean = true): Promise<ExecutionResult> {
  const startTime = Date.now();
  const logs: string[] = [];

  try {
    logs.push(`Starting execution of agent: ${agent.name}`);
    logs.push(`Input: ${JSON.stringify(input)}`);
    logs.push(`Execution mode: ${useNative ? 'Native Engine' : 'Flowise'}`);

    // Option 1: Use Flowise if chatflow ID exists and not forcing native
    if (!useNative && agent.flowiseChatflowId) {
      try {
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
      } catch (flowiseError) {
        logs.push(`Flowise execution failed: ${flowiseError}`);
        logs.push('Falling back to native execution...');
      }
    }

    // Option 2: Use native execution engine
    logs.push(`Executing with Native Engine: ${agent.flow.nodes.length} nodes`);

    const nativeResult = await executeFlow(
      agent.flow.nodes,
      agent.flow.edges,
      input
    );

    // Merge logs
    nativeResult.logs.forEach(log => logs.push(log));

    return {
      ...nativeResult,
      logs,
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
    const { input, useNative = true, useFlowise = false } = body;

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

    // Execute the agent (useNative=true by default, useFlowise overrides)
    const result = await executeOwlAgent(agent, input, !useFlowise && useNative);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error executing agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
