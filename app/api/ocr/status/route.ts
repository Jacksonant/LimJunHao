import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL = process.env.BACKEND_API_BASE_URL || 'http://localhost:8000';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const jobId = req.nextUrl.searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const response = await fetch(`${BACKEND_API_BASE_URL}/ocr/status/${encodeURIComponent(jobId)}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const raw = await response.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { error: raw || 'Non-JSON response from backend' };
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.detail || data?.error || `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('OCR status API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to read OCR job status' },
      { status: 500 }
    );
  }
}
