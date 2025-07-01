
'use server';

import { createTransport } from 'nodemailer';
import { headers } from 'next/headers';

interface FailureReport {
  rpcUrl: string;
  errorContext: string;
  errorMessage: string;
}

export async function sendFailureReport({ rpcUrl, errorContext, errorMessage }: FailureReport) {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_TO } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !EMAIL_TO) {
    console.error("Failure report email could not be sent. Missing GMAIL_USER, GMAIL_APP_PASSWORD, or EMAIL_TO environment variables.");
    return;
  }
  
  const headersList = headers();
  const userAgent = headersList.get('user-agent') || 'Unknown';
  const timestamp = new Date().toUTCString();

  const transporter = createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  const emailBody = `An RPC check failed on ChainDoctor.

Details:
- Timestamp: ${timestamp}
- RPC Endpoint: ${rpcUrl}
- Failing Function: ${errorContext}
- Error Message: ${errorMessage}
- User Agent: ${userAgent}
  `;

  const emailSubject = `ChainDoctor Alert: RPC Failure for ${rpcUrl}`;

  try {
    await transporter.sendMail({
      from: `"ChainDoctor Alert" <${GMAIL_USER}>`,
      to: EMAIL_TO,
      subject: emailSubject,
      text: emailBody,
    });
  } catch (e: any) {
    console.error(`Failed to send failure report email for ${rpcUrl}:`, e.message);
  }
}
