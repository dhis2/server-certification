import {
  baseTemplate,
  heading,
  paragraph,
  button,
  alertBox,
  escapeHtml,
  escapeUrl,
  escapeEmail,
} from './base.template';

export interface WelcomeEmailData {
  firstName?: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
}

export function welcomeEmail(data: WelcomeEmailData): string {
  const greeting = data.firstName
    ? `Hello ${escapeHtml(data.firstName)},`
    : 'Hello,';

  const content = `
    ${heading('Welcome to DHIS2 Server Certification')}
    ${paragraph(greeting)}
    ${paragraph('Your account has been created. Use the credentials below to sign in:')}
    
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0; background-color: #f5f5f5; border-radius: 4px; width: 100%;">
      <tr>
        <td style="padding: 16px;">
          <p style="margin: 0 0 8px 0; color: #757575; font-size: 12px;">Email</p>
          <p style="margin: 0 0 16px 0; color: #212121; font-size: 14px; font-weight: 500;">${escapeHtml(data.email)}</p>
          <p style="margin: 0 0 8px 0; color: #757575; font-size: 12px;">Temporary Password</p>
          <p style="margin: 0; color: #212121; font-size: 14px; font-family: monospace; font-weight: 500;">${escapeHtml(data.temporaryPassword)}</p>
        </td>
      </tr>
    </table>
    
    ${alertBox('You will be required to change your password upon first login.', 'warning')}
    
    <div style="text-align: center; margin: 24px 0;">
      ${button('Sign In', data.loginUrl)}
    </div>
    
    ${paragraph('If you did not expect this account, please contact your administrator.')}
  `;

  return baseTemplate(
    content,
    'Your DHIS2 Server Certification account is ready',
  );
}

export interface PasswordResetEmailData {
  firstName?: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export function passwordResetEmail(data: PasswordResetEmailData): string {
  const greeting = data.firstName
    ? `Hello ${escapeHtml(data.firstName)},`
    : 'Hello,';

  const content = `
    ${heading('Password Reset Request')}
    ${paragraph(greeting)}
    ${paragraph('We received a request to reset your password. Click the button below to set a new password:')}
    
    <div style="text-align: center; margin: 24px 0;">
      ${button('Reset Password', data.resetUrl)}
    </div>
    
    ${alertBox(`This link expires in ${data.expiresInMinutes} minutes.`, 'info')}
    
    ${paragraph('If you did not request this reset, you can safely ignore this email. Your password will remain unchanged.')}
    
    <p style="margin: 16px 0 0 0; color: #757575; font-size: 12px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${escapeUrl(data.resetUrl)}" style="color: #1565c0; word-break: break-all;">${escapeHtml(data.resetUrl)}</a>
    </p>
  `;

  return baseTemplate(
    content,
    'Reset your DHIS2 Server Certification password',
  );
}

export interface AccountLockedEmailData {
  firstName?: string;
  email: string;
  lockReason: string;
}

export function accountLockedEmail(data: AccountLockedEmailData): string {
  const greeting = data.firstName
    ? `Hello ${escapeHtml(data.firstName)},`
    : 'Hello,';

  const content = `
    ${heading('Account Locked')}
    ${paragraph(greeting)}
    ${alertBox(`Your account (${escapeEmail(data.email)}) has been locked due to: ${escapeHtml(data.lockReason)}`, 'error')}
    ${paragraph('For security reasons, you cannot sign in until your account is unlocked by an administrator.')}
    ${paragraph('Please contact your administrator if you need assistance.')}
  `;

  return baseTemplate(content, 'Your account has been locked');
}

export interface AccountUnlockedEmailData {
  firstName?: string;
  email: string;
  loginUrl: string;
}

export function accountUnlockedEmail(data: AccountUnlockedEmailData): string {
  const greeting = data.firstName
    ? `Hello ${escapeHtml(data.firstName)},`
    : 'Hello,';

  const content = `
    ${heading('Account Unlocked')}
    ${paragraph(greeting)}
    ${alertBox('Your account has been unlocked.', 'success')}
    ${paragraph('You can now sign in to your account. If you have forgotten your password, please use the password reset option on the login page.')}
    
    <div style="text-align: center; margin: 24px 0;">
      ${button('Sign In', data.loginUrl)}
    </div>
  `;

  return baseTemplate(content, 'Your account has been unlocked');
}

export interface TfaEnabledEmailData {
  firstName?: string;
}

export function tfaEnabledEmail(data: TfaEnabledEmailData): string {
  const greeting = data.firstName
    ? `Hello ${escapeHtml(data.firstName)},`
    : 'Hello,';

  const content = `
    ${heading('Two-Factor Authentication Enabled')}
    ${paragraph(greeting)}
    ${alertBox('Two-factor authentication has been enabled on your account.', 'success')}
    ${paragraph('From now on, you will need to enter a verification code from your authenticator app each time you sign in.')}
    ${paragraph('Make sure to keep your recovery codes in a safe place. You can use them to regain access if you lose your authenticator device.')}
    ${alertBox('If you did not enable this, please contact your administrator immediately.', 'warning')}
  `;

  return baseTemplate(content, 'Two-factor authentication enabled');
}

export interface TfaDisabledEmailData {
  firstName?: string;
}

export function tfaDisabledEmail(data: TfaDisabledEmailData): string {
  const greeting = data.firstName
    ? `Hello ${escapeHtml(data.firstName)},`
    : 'Hello,';

  const content = `
    ${heading('Two-Factor Authentication Disabled')}
    ${paragraph(greeting)}
    ${alertBox('Two-factor authentication has been disabled on your account.', 'warning')}
    ${paragraph('Your account is now protected only by your password. We recommend re-enabling two-factor authentication to improve your account security.')}
    ${alertBox('If you did not make this change, please contact your administrator immediately and change your password.', 'error')}
  `;

  return baseTemplate(content, 'Two-factor authentication disabled');
}
