import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { db } from '@/lib/db';

export async function POST(request) {
  try {
    const { email, subject, html } = await request.json();

    const setting = await db.setting.findUnique({ where: { id: 1 } });
    if (!setting || !setting.host) {
      return NextResponse.json({ error: 'SMTP settings not configured' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: setting.host,
      port: setting.port,
      secure: setting.port === 465,
      auth: {
        user: setting.user,
        pass: setting.pass,
      },
    });

    try {
      await transporter.sendMail({
        from: setting.user,
        to: email,
        subject: subject,
        html: html,
      });

      await db.emailLog.create({
        data: {
          email,
          status: 'Sent',
          message: 'OK',
        },
      });

      return NextResponse.json({ success: true });
    } catch (sendError) {
      console.error('SMTP Send Error:', sendError);
      await db.emailLog.create({
        data: {
          email,
          status: 'Failed',
          message: sendError.message,
        },
      });
      return NextResponse.json({ error: sendError.message }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to process send request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
