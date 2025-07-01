
'use server';

import { Resend } from 'resend';
import { z } from 'zod';

const feedbackSchema = z.string().min(10, { message: 'Feedback must be at least 10 characters long.' }).max(2000, { message: 'Feedback must be less than 2000 characters.' });

export async function sendFeedback(formData: FormData) {
  const feedback = formData.get('feedback') as string;

  const validation = feedbackSchema.safeParse(feedback);

  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.FEEDBACK_EMAIL_TO;

  if (!apiKey) {
    console.error("RESEND_API_KEY environment variable is not set.");
    return { error: 'Server configuration error: Feedback is currently disabled.' };
  }

  if (!toEmail) {
      console.error("FEEDBACK_EMAIL_TO environment variable is not set.");
      return { error: 'Server configuration error: Feedback is currently disabled.' };
  }
  
  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      // NOTE: For the free tier, the 'from' address MUST be 'onboarding@resend.dev'
      from: 'onboarding@resend.dev',
      to: toEmail,
      subject: 'New Feedback from ChainDoctor',
      text: validation.data,
    });

    if (error) {
      console.error({ error });
      return { error: 'Failed to send feedback.' };
    }

    return { success: 'Thank you for your feedback!' };
  } catch (e: any) {
    console.error(e);
    return { error: 'An unexpected error occurred.' };
  }
}
