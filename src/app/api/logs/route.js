import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const logs = await db.emailLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100, // Fetch the last 100 logs for simplicity
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Failed to get logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
