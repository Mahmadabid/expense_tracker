import { NextRequest, NextResponse } from 'next/server';

// GET /api/entries - Get entries
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Return mock entries for testing
    const mockEntries = [
      {
        _id: '1',
        type: 'income',
        amount: 1000,
        currency: 'USD',
        description: 'Salary',
        date: new Date(),
        status: 'active',
      },
      {
        _id: '2', 
        type: 'expense',
        amount: 50,
        currency: 'USD',
        description: 'Groceries',
        date: new Date(),
        status: 'active',
      },
    ];
    
    return NextResponse.json({
      success: true,
      data: mockEntries,
    });
  } catch (error) {
    console.error('Error fetching entries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/entries - Create entry
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const body = await request.json();
    
    const newEntry = {
      _id: Date.now().toString(),
      ...body,
      userId: 'test-user-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };
    
    return NextResponse.json({
      success: true,
      data: newEntry,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}