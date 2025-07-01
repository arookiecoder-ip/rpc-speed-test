
'use server';

import { createTransport } from 'nodemailer';
import { z } from 'zod';

const feedbackSchema = z.string().min(10, { message: 'Feedback must be at least 10 characters long.' }).max(2000, { message: 'Feedback must be less than 2000 characters.' });

export async function sendFeedback(formData: FormData) {
  const feedback = formData.get('feedback') as string;

  const validation = feedbackSchema.safeParse(feedback);

  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const { GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_TO } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error("Gmail credentials are not set in environment variables.");
    return { error: 'Server configuration error: Feedback is currently disabled.' };
  }
  
  if (!EMAIL_TO) {
    console.error("EMAIL_TO environment variable is not set.");
    return { error: 'Server configuration error: Feedback is currently disabled.' };
  }

  const transporter = createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: `"ChainDoctor Feedback" <${GMAIL_USER}>`,
      to: EMAIL_TO,
      subject: 'New Feedback from ChainDoctor',
      text: validation.data,
    });

    return { success: 'Thank you for your feedback!' };
  } catch (e: any) {
    console.error(e);
    return { error: 'Failed to send feedback. Please check server configuration or App Password.' };
  }
}
