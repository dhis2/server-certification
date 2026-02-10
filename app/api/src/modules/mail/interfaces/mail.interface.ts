export interface MailContext {
  [key: string]: unknown;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface PasswordResetToken {
  userId: string;
  email: string;
  createdAt: number;
}
