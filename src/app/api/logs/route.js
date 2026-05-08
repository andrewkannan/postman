export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

export async function DELETE() {
  try {
    await db.emailLog.deleteMany({});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to clear logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
