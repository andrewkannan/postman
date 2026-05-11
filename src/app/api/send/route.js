export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { db } from '@/lib/db';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const email = formData.get('email');
    const subject = formData.get('subject');
    const html = formData.get('html');
    const attachment = formData.get('attachment');

    const setting = await db.setting.findUnique({ where: { id: 1 } });
    if (!setting || !setting.host) {
      await db.emailLog.create({
        data: { email, status: 'Failed', message: 'SMTP settings not configured' }
      });
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
      const mailOptions = {
        from: setting.user,
        to: email,
        subject: subject,
        html: html,
      };

      if (attachment && attachment.name) {
        const bytes = await attachment.arrayBuffer();
        const buffer = Buffer.from(bytes);
        mailOptions.attachments = [
          {
            filename: attachment.name,
            content: buffer,
          },
        ];
      }

      await transporter.sendMail(mailOptions);

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
