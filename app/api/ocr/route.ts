import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL = process.env.BACKEND_API_BASE_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(`${BACKEND_API_BASE_URL}/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Backend error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    const message = error?.message || 'Failed to run OCR request';
    console.error('OCR API error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
