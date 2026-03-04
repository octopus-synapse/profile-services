/**
 * Stub Email Sender
 *
 * Test double for email operations with verification helpers.
 */

import type { PasswordResetEmailPort } from '../../../password-management/ports/outbound/email-sender.port';

export interface SentEmail {
  email: string;
  userName: string | null;
  resetToken: string;
  sentAt: Date;
}

export class StubEmailSender implements PasswordResetEmailPort {
  private sentEmails: SentEmail[] = [];
  private shouldFail = false;

  async sendResetEmail(email: string, userName: string | null, resetToken: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Email sending failed');
    }
    this.sentEmails.push({
      email,
      userName,
      resetToken,
      sentAt: new Date(),
    });
  }

  // Test helpers
  setShouldFail(value: boolean): void {
    this.shouldFail = value;
  }

  getSentEmails(): SentEmail[] {
    return [...this.sentEmails];
  }

  getLastEmail(): SentEmail | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  getEmailsSentTo(email: string): SentEmail[] {
    return this.sentEmails.filter((e) => e.email === email);
  }

  wasSentTo(email: string): boolean {
    return this.sentEmails.some((e) => e.email === email);
  }

  clear(): void {
    this.sentEmails = [];
    this.shouldFail = false;
  }
}
