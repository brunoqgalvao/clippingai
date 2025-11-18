import { Resend } from 'resend';

let resendInstance: Resend | null = null;

function getResendInstance(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured in environment variables');
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@clipping.ai';
const FROM_NAME = process.env.FROM_NAME || 'Clipping.AI';

interface SendReportEmailParams {
  to: string[];
  reportUrl: string;
  companyName: string;
  reportTitle: string;
}

/**
 * Send a report via email to multiple recipients using Resend
 */
export async function sendReportEmail({
  to,
  reportUrl,
  companyName,
  reportTitle,
}: SendReportEmailParams) {
  try {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #00a8e8 0%, #0095d1 100%);
      padding: 40px 32px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 32px;
    }
    .content h2 {
      color: #1a1a1a;
      font-size: 22px;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .content p {
      color: #4a4a4a;
      margin-bottom: 20px;
      font-size: 16px;
    }
    .company-name {
      color: #00a8e8;
      font-weight: 600;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #00a8e8 0%, #0095d1 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 24px 0;
      box-shadow: 0 4px 12px rgba(0, 168, 232, 0.3);
      transition: all 0.3s ease;
    }
    .cta-button:hover {
      box-shadow: 0 6px 16px rgba(0, 168, 232, 0.4);
    }
    .footer {
      background-color: #f8f9fa;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #e5e5e5;
    }
    .footer p {
      color: #6a6a6a;
      font-size: 14px;
      margin: 8px 0;
    }
    .divider {
      height: 1px;
      background-color: #e5e5e5;
      margin: 24px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${reportTitle}</h1>
    </div>

    <div class="content">
      <h2>Competitive Intelligence Report Ready</h2>

      <p>A new competitive intelligence report for <span class="company-name">${companyName}</span> has been shared with you.</p>

      <p>This AI-powered report includes:</p>
      <ul style="color: #4a4a4a; margin: 16px 0; padding-left: 24px;">
        <li>Market trends and insights</li>
        <li>Competitive landscape analysis</li>
        <li>Key industry developments</li>
        <li>Curated news and articles</li>
      </ul>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${reportUrl}" class="cta-button">View Report</a>
      </div>

      <p style="font-size: 14px; color: #6a6a6a;">
        Or copy and paste this link into your browser:<br>
        <a href="${reportUrl}" style="color: #00a8e8; word-break: break-all;">${reportUrl}</a>
      </p>
    </div>

    <div class="footer">
      <p><strong>Clipping.AI</strong></p>
      <p>AI-powered competitive intelligence at your fingertips</p>
      <p style="font-size: 12px; color: #999999; margin-top: 16px;">
        You received this email because someone shared a report with you.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
${reportTitle}

A new competitive intelligence report for ${companyName} has been shared with you.

This AI-powered report includes:
- Market trends and insights
- Competitive landscape analysis
- Key industry developments
- Curated news and articles

View the report here: ${reportUrl}

---
Clipping.AI
AI-powered competitive intelligence at your fingertips

You received this email because someone shared a report with you.
    `;

    const resend = getResendInstance();

    const response = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject: `${reportTitle} - ${companyName}`,
      html: htmlContent,
      text: textContent,
    });

    console.log('Email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
