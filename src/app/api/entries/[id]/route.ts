import { NextRequest, NextResponse } from 'next/server';

// GET /api/entries/[id] - Get specific entry
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { id } = await context.params;

    // Return mock entry for testing
    const mockEntry = {
      _id: id,
      type: 'expense',
      amount: 25.99,
      currency: 'USD',
      description: 'Coffee',
      date: new Date(),
      status: 'active',
      category: 'Food & Drink',
      userId: 'test-user-id',
    };
    
    return NextResponse.json({
      success: true,
      data: mockEntry,
    });
  } catch (error) {
    console.error('Error fetching entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/entries/[id] - Update entry
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    
    // Return updated mock entry
    const updatedEntry = {
      _id: id,
      ...body,
      userId: 'test-user-id',
      updatedAt: new Date(),
      version: 2,
    };
    
    return NextResponse.json({
      success: true,
      data: updatedEntry,
      message: 'Entry updated successfully',
    });
  } catch (error) {
    console.error('Error updating entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/entries/[id] - Delete entry
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Entry deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}