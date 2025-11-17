import { NextRequest, NextResponse } from 'next/server';
import { OwlAgent } from '@/app/types/flowise';
import { promises as fs } from 'fs';
import path from 'path';

// Storage directory for Owl Agents
const STORAGE_DIR = path.join(process.cwd(), 'data', 'owlagents');

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.access(STORAGE_DIR);
  } catch {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}

// Helper function to save an Owl Agent
async function saveOwlAgent(owlAgent: OwlAgent): Promise<void> {
  await ensureStorageDir();
  const filePath = path.join(STORAGE_DIR, `${owlAgent.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(owlAgent, null, 2));
}

// GET: Retrieve a specific Owl Agent by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing Owl Agent ID' },
        { status: 400 }
      );
    }

    await ensureStorageDir();
    const filePath = path.join(STORAGE_DIR, `${id}.json`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const owlAgent: OwlAgent = JSON.parse(content);
      return NextResponse.json(owlAgent);
    } catch (error) {
      return NextResponse.json(
        { error: `Owl Agent with id ${id} not found` },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error in GET /api/owlagents/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update a specific Owl Agent by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Missing Owl Agent ID' },
        { status: 400 }
      );
    }

    await ensureStorageDir();
    const filePath = path.join(STORAGE_DIR, `${id}.json`);

    // Check if Owl Agent exists
    let existingOwlAgent: OwlAgent;
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      existingOwlAgent = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: `Owl Agent with id ${id} not found` },
        { status: 404 }
      );
    }

    // Update Owl Agent (preserve id and createdAt)
    const updatedOwlAgent: OwlAgent = {
      ...existingOwlAgent,
      ...body,
      id: existingOwlAgent.id, // Preserve original ID
      createdAt: existingOwlAgent.createdAt, // Preserve creation date
      updatedAt: new Date(),
    };

    // Save updated Owl Agent
    await saveOwlAgent(updatedOwlAgent);

    return NextResponse.json(updatedOwlAgent);
  } catch (error) {
    console.error('Error in PUT /api/owlagents/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a specific Owl Agent by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing Owl Agent ID' },
        { status: 400 }
      );
    }

    const filePath = path.join(STORAGE_DIR, `${id}.json`);

    try {
      await fs.unlink(filePath);
      return NextResponse.json({ message: 'Owl Agent deleted successfully' });
    } catch (error) {
      return NextResponse.json(
        { error: `Owl Agent with id ${id} not found` },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error in DELETE /api/owlagents/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
