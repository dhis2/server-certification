/**
 * Base email template
 * Security: Uses the `entities` library for HTML escaping.
 * @see https://github.com/fb55/entities
 */

import { escapeHtml, escapeUrl } from '../utils';

const COLORS = {
  primary: '#0d47a1',
  primaryLight: '#1565c0',
  background: '#f5f5f5',
  surface: '#ffffff',
  text: '#212121',
  textSecondary: '#757575',
  border: '#e0e0e0',
  success: '#4caf50',
  error: '#d32f2f',
  warning: '#ff9800',
} as const;

export function baseTemplate(content: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>DHIS2 Server Certification</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    table { border-spacing: 0; }
    td { padding: 0; }
    img { border: 0; }
    .button { display: inline-block; padding: 12px 24px; background-color: ${COLORS.primary}; color: #ffffff !important; text-decoration: none; border-radius: 4px; font-weight: 500; }
    .button:hover { background-color: ${COLORS.primaryLight}; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .content { padding: 24px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.background};">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${escapeHtml(preheader)}</div>` : ''}
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.background};">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: ${COLORS.primary}; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                DHIS2 Server Certification
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="content" style="background-color: ${COLORS.surface}; padding: 32px; border: 1px solid ${COLORS.border}; border-top: none;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: ${COLORS.surface}; padding: 24px; border: 1px solid ${COLORS.border}; border-top: none; border-radius: 0 0 8px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; color: ${COLORS.textSecondary}; font-size: 12px;">
                    <p style="margin: 0 0 8px 0;">
                      This is an automated message from DHIS2 Server Certification.
                    </p>
                    <p style="margin: 0;">
                      &copy; ${new Date().getFullYear()} DHIS2. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function button(text: string, url: string): string {
  const safeUrl = escapeUrl(url);
  if (!safeUrl) {
    return `<span style="display: inline-block; padding: 12px 24px; background-color: ${COLORS.primary}; color: #ffffff; border-radius: 4px; font-weight: 500;">${escapeHtml(text)}</span>`;
  }
  return `<a href="${safeUrl}" class="button" style="display: inline-block; padding: 12px 24px; background-color: ${COLORS.primary}; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 500;">${escapeHtml(text)}</a>`;
}

export function heading(text: string): string {
  return `<h2 style="margin: 0 0 16px 0; color: ${COLORS.text}; font-size: 20px; font-weight: 600;">${escapeHtml(text)}</h2>`;
}

export function paragraph(text: string): string {
  return `<p style="margin: 0 0 16px 0; color: ${COLORS.text}; font-size: 14px; line-height: 1.6;">${text}</p>`;
}

export function alertBox(
  text: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info',
): string {
  const colors = {
    success: { bg: '#e8f5e9', border: COLORS.success, text: '#1b5e20' },
    error: { bg: '#ffebee', border: COLORS.error, text: '#b71c1c' },
    warning: { bg: '#fff3e0', border: COLORS.warning, text: '#e65100' },
    info: { bg: '#e3f2fd', border: COLORS.primary, text: COLORS.primary },
  };
  const c = colors[type];
  return `<div style="padding: 16px; background-color: ${c.bg}; border-left: 4px solid ${c.border}; border-radius: 4px; margin: 0 0 16px 0;">
    <p style="margin: 0; color: ${c.text}; font-size: 14px;">${text}</p>
  </div>`;
}

export { escapeHtml, escapeUrl, escapeEmail, safeMailtoHref } from '../utils';
export { COLORS };
