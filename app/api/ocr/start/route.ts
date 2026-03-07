import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL = process.env.BACKEND_API_BASE_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(`${BACKEND_API_BASE_URL}/ocr/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000), // 10s timeout for start request
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.detail || data?.error || `Backend error: ${response.status}`);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('OCR start API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to start OCR job' },
      { status: 500 }
    );
  }
}
