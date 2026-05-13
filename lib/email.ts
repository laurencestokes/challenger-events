import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailData {
  to: string;
  subject: string;
  html: string;
}

export const subscribeContact = async (email: string, name: string) => {
  const trimmed = name.trim();
  const spaceIdx = trimmed.indexOf(' ');
  const firstName = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
  const lastName = spaceIdx === -1 ? undefined : trimmed.slice(spaceIdx + 1).trim() || undefined;

  try {
    const { error } = await resend.contacts.create({
      email,
      firstName: firstName || undefined,
      lastName,
      unsubscribed: false,
    });
    if (error) {
      // Resend returns an error if the contact already exists — that's expected and safe.
      console.warn(`Resend contact subscribe returned an error for ${email}:`, error.message);
    }
  } catch (err) {
    console.error(`Resend contact subscribe threw for ${email}:`, err);
  }
};

export const sendEmail = async (emailData: EmailData) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@challenger-events.com',
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const sendTeamInvitation = async (
  toEmail: string,
  teamName: string,
  invitationCode: string,
  invitedBy: string,
) => {
  const subject = `You've been invited to join ${teamName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Team Invitation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .code { background: #e8f5e8; border: 2px solid #4caf50; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0; font-family: monospace; font-size: 18px; font-weight: bold; color: #2e7d32; }
        .button { display: inline-block; background: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏆 Team Invitation</h1>
          <p>You've been invited to join a team on Challenger Events!</p>
        </div>
        <div class="content">
          <h2>Hello!</h2>
          <p>You've been invited by <strong>${invitedBy}</strong> to join the team:</p>
          <h3 style="color: #667eea; margin: 20px 0;">${teamName}</h3>
          
          <p>To join this team, use the invitation code below:</p>
          
          <div class="code">
            ${invitationCode}
          </div>
          
          <p><strong>How to join:</strong></p>
          <ol>
            <li>Go to the Teams page in Challenger Events</li>
            <li>Click "Join by Code"</li>
            <li>Enter the code above</li>
            <li>You'll be automatically added to the team!</li>
          </ol>
          
          <p><strong>Important:</strong></p>
          <ul>
            <li>This invitation expires in 7 days</li>
            <li>Only you can use this code (it's tied to your email)</li>
            <li>If you don't have an account, you'll need to sign up first</li>
          </ul>
          
          <p style="margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://challenger-events.com'}/teams" class="button">
              Go to Teams Page
            </a>
          </p>
        </div>
        <div class="footer">
          <p>This invitation was sent from Challenger Events</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: toEmail,
    subject,
    html,
  });
};

export const sendGuestWelcome = async (toEmail: string, guestName: string, eventName: string) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://challenger-events.com';
  const subject = `You've been added to ${eventName} on Challenger Events`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to ${eventName}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f97316 0%, #c2410c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .event { background: #fff7ed; border: 2px solid #f97316; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0; font-size: 18px; font-weight: bold; color: #9a3412; }
        .button { display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏆 You're In!</h1>
          <p>You've been added as a competitor on Challenger Events</p>
        </div>
        <div class="content">
          <h2>Hi ${guestName},</h2>
          <p>An admin has added you as a competitor in:</p>

          <div class="event">${eventName}</div>

          <p>Your scores will be recorded against this email address. You can register
          a full account at any time using <strong>${toEmail}</strong> to claim your
          results — your past scores will automatically be linked to your new account.</p>

          <p style="margin-top: 30px;">
            <a href="${appUrl}/auth/signin" class="button">Create your account</a>
          </p>

          <p><strong>What happens next:</strong></p>
          <ul>
            <li>Compete in the event and submit scores as usual</li>
            <li>Register an account whenever you're ready</li>
            <li>Your competition history follows you across events</li>
          </ul>
        </div>
        <div class="footer">
          <p>This email was sent from Challenger Events.</p>
          <p>If you didn't expect this, you can safely ignore it.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: toEmail,
    subject,
    html,
  });
};
