# Email Setup with Resend

This guide explains how to set up email functionality for team invitations using Resend.

## 1. Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

## 2. Get API Key

1. In your Resend dashboard, go to the API Keys section
2. Create a new API key
3. Copy the API key (starts with `re_`)

## 3. Configure Domain (Optional but Recommended)

For production, you should verify your domain:

1. In Resend dashboard, go to Domains
2. Add your domain (e.g., `yourdomain.com`)
3. Follow the DNS verification steps
4. Once verified, you can send from `noreply@yourdomain.com`

For development/testing, you can use Resend's sandbox domain:
- From: `onboarding@resend.dev`

## 4. Environment Variables

Add these to your `.env.local` file:

```env
# Email Configuration (Resend)
RESEND_API_KEY="re_your_actual_api_key_here"
FROM_EMAIL="noreply@yourdomain.com"  # or "onboarding@resend.dev" for testing
NEXT_PUBLIC_APP_URL="https://yourdomain.com"  # or "http://localhost:3000" for development
```

## 5. Test Email Functionality

1. Start your development server
2. Go to a team detail page
3. Click "Invite User"
4. Enter your email address
5. Check your inbox for the invitation email

## 6. Email Features

The invitation emails include:
- Beautiful HTML template with styling
- Team name and invitation code
- Step-by-step instructions
- Direct link to teams page
- Security information (expiration, email-specific)

## 7. Troubleshooting

### Email not sending?
- Check your API key is correct
- Verify the FROM_EMAIL is valid
- Check browser console for errors
- Verify Resend account is active

### Email going to spam?
- Verify your domain with Resend
- Use a proper FROM_EMAIL address
- Consider setting up SPF/DKIM records

### Development vs Production
- Development: Use `onboarding@resend.dev` as FROM_EMAIL
- Production: Use your verified domain

## 8. Resend Limits

Free tier includes:
- 3,000 emails per month
- 100 emails per day
- Perfect for development and small teams

## 9. Security Notes

- API keys are server-side only
- Emails are tied to specific email addresses
- Invitation codes expire after 7 days
- Failed email sends don't break the invitation process 