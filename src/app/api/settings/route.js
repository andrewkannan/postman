export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let setting = await db.setting.findUnique({ where: { id: 1 } });
    if (!setting) {
      setting = await db.setting.create({
        data: { host: '', port: 587, user: '', pass: '', interval: 5, subject: '', htmlTemplate: '<h1>Hello {name}</h1><p>This is a test email.</p>' },
      });
    }
    return NextResponse.json(setting);
  } catch (error) {
    console.error('Failed to get settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { host, port, user, pass, interval, subject, htmlTemplate } = data;

    const setting = await db.setting.upsert({
      where: { id: 1 },
      update: { host, port: parseInt(port, 10), user, pass, interval: parseInt(interval, 10), subject: subject || '', htmlTemplate: htmlTemplate || '<h1>Hello {name}</h1><p>This is a test email.</p>' },
      create: { host, port: parseInt(port, 10), user, pass, interval: parseInt(interval, 10), subject: subject || '', htmlTemplate: htmlTemplate || '<h1>Hello {name}</h1><p>This is a test email.</p>' },
    });

    return NextResponse.json(setting);
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
