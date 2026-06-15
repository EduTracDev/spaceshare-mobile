import dotenv from 'dotenv';
import { BrevoClient } from '@getbrevo/brevo';

dotenv.config();

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY as string,
});

export const sendVerificationEmail = async (
  toEmail: string,
  code: string
) => {
  await brevo.transactionalEmails.sendTransacEmail({
    to: [{ email: toEmail }],
    sender: {
      email: process.env.SENDER_EMAIL as string,
      name: 'SpaceShare',
    },
    subject: 'Verify your SpaceShare account',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6200EE;">Verify your email</h2>
        <p>Your verification code is:</p>
        <h1 style="color: #6200EE; letter-spacing: 8px;">${code}</h1>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p>If you didn't create a SpaceShare account, ignore this email.</p>
      </div>
    `,
  });
};