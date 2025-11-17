import { NextRequest, NextResponse } from 'next/server';
import { OwlAgent } from '@/app/types/flowise';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Storage directory for Owl Agents (using file system for now)
const STORAGE_DIR = path.join(process.cwd(), 'data', 'owlagents');

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.access(STORAGE_DIR);
  } catch {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}

// Helper function to get all Owl Agents
async function getAllOwlAgents(): Promise<OwlAgent[]> {
  await ensureStorageDir();

  try {
    const files = await fs.readdir(STORAGE_DIR);
    const owlAgents: OwlAgent[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(STORAGE_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        try {
          const owlAgent = JSON.parse(content);
          owlAgents.push(owlAgent);
        } catch (error) {
          console.error(`Error parsing Owl Agent file ${file}:`, error);
        }
      }
    }

    return owlAgents.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA; // Sort by most recent first
    });
  } catch (error) {
    console.error('Error reading Owl Agents:', error);
    return [];
  }
}

// Helper function to save an Owl Agent
async function saveOwlAgent(owlAgent: OwlAgent): Promise<void> {
  await ensureStorageDir();
  const filePath = path.join(STORAGE_DIR, `${owlAgent.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(owlAgent, null, 2));
}

// Helper function to delete an Owl Agent
async function deleteOwlAgent(id: string): Promise<boolean> {
  try {
    const filePath = path.join(STORAGE_DIR, `${id}.json`);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error(`Error deleting Owl Agent ${id}:`, error);
    return false;
  }
}

// GET: Retrieve all Owl Agents or a specific one
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Get specific Owl Agent
      const filePath = path.join(STORAGE_DIR, `${id}.json`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const owlAgent = JSON.parse(content);
        return NextResponse.json(owlAgent);
      } catch (error) {
        return NextResponse.json(
          { error: `Owl Agent with id ${id} not found` },
          { status: 404 }
        );
      }
    } else {
      // Get all Owl Agents
      const owlAgents = await getAllOwlAgents();
      return NextResponse.json(owlAgents);
    }
  } catch (error) {
    console.error('Error in GET /api/owlagents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create a new Owl Agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.description || !body.flow) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, or flow' },
        { status: 400 }
      );
    }

    // Create new Owl Agent
    const owlAgent: OwlAgent = {
      id: uuidv4(),
      name: body.name,
      description: body.description,
      iconStyle: body.iconStyle || 'default',
      inputSchema: body.inputSchema,
      outputSchema: body.outputSchema,
      version: body.version || '1.0.0',
      flow: body.flow,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: body.author,
      tags: body.tags,
    };

    // Save to file system
    await saveOwlAgent(owlAgent);

    return NextResponse.json(owlAgent, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/owlagents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update an existing Owl Agent
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing Owl Agent ID' },
        { status: 400 }
      );
    }

    // Check if Owl Agent exists
    const filePath = path.join(STORAGE_DIR, `${body.id}.json`);
    let existingOwlAgent: OwlAgent;

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      existingOwlAgent = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: `Owl Agent with id ${body.id} not found` },
        { status: 404 }
      );
    }

    // Update Owl Agent
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
    console.error('Error in PUT /api/owlagents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete an Owl Agent
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing Owl Agent ID' },
        { status: 400 }
      );
    }

    const deleted = await deleteOwlAgent(id);

    if (deleted) {
      return NextResponse.json({ message: 'Owl Agent deleted successfully' });
    } else {
      return NextResponse.json(
        { error: `Owl Agent with id ${id} not found` },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error in DELETE /api/owlagents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}