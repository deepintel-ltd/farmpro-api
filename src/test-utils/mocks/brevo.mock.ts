import { Logger } from '@nestjs/common';
import {
  EmailParams, 
  UserMetadata, 
  EmailSender 
} from '../../external-service/brevo/brevo.service';

export interface MockEmailRecord {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  metadata?: UserMetadata;
  timestamp: Date;
  templateName?: string;
}

export class MockBrevoService {
  private readonly logger = new Logger(MockBrevoService.name);
  private readonly sentEmails: MockEmailRecord[] = [];
  private readonly templateCache: Map<string, string> = new Map();

  constructor() {
    this.logger.log('MockBrevoService initialized - emails will be logged instead of sent');
  }

  /**
   * Get all emails that were "sent" during the test
   */
  getSentEmails(): MockEmailRecord[] {
    return [...this.sentEmails];
  }

  /**
   * Get emails sent to a specific recipient
   */
  getEmailsTo(recipient: string): MockEmailRecord[] {
    return this.sentEmails.filter(email => email.to === recipient);
  }

  /**
   * Get emails with a specific subject
   */
  getEmailsWithSubject(subject: string): MockEmailRecord[] {
    return this.sentEmails.filter(email => email.subject.includes(subject));
  }

  /**
   * Get emails using a specific template
   */
  getEmailsWithTemplate(templateName: string): MockEmailRecord[] {
    return this.sentEmails.filter(email => email.templateName === templateName);
  }

  /**
   * Clear all sent emails (useful for test cleanup)
   */
  clearSentEmails(): void {
    this.sentEmails.length = 0;
  }

  /**
   * Check if any emails were sent
   */
  hasSentEmails(): boolean {
    return this.sentEmails.length > 0;
  }

  /**
   * Get the count of sent emails
   */
  getEmailCount(): number {
    return this.sentEmails.length;
  }

  /**
   * Mock implementation of sendEmail
   */
  async sendEmail({ to, subject, htmlContent, textContent }: EmailParams): Promise<void> {
    const emailRecord: MockEmailRecord = {
      to,
      subject,
      htmlContent,
      textContent,
      timestamp: new Date(),
    };

    this.sentEmails.push(emailRecord);

    this.logger.log(`[MOCK EMAIL SENT] "${subject}" to ${to}`, {
      htmlLength: htmlContent.length,
      textLength: textContent?.length ?? 0,
      totalEmailsSent: this.sentEmails.length,
    });
  }

  /**
   * Mock implementation of sendEmailVerification
   */
  async sendEmailVerification(
    email: string,
    token: string,
    verificationUrl?: string,
    userData?: UserMetadata
  ): Promise<void> {
    const subject = 'Verify your FarmPro account';
    const htmlContent = `
      <h1>Welcome to FarmPro!</h1>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl || `https://farmpro.app/verify-email?token=${token}`}">
        Verify Email Address
      </a>
      <p>This link will expire in 24 hours.</p>
      ${userData?.firstName ? `<p>Welcome, ${userData.firstName}!</p>` : ''}
    `;

    const emailRecord: MockEmailRecord = {
      to: email,
      subject,
      htmlContent,
      textContent: `Verify your FarmPro account: ${verificationUrl || `https://farmpro.app/verify-email?token=${token}`}`,
      metadata: userData,
      timestamp: new Date(),
      templateName: 'email-verification',
    };

    this.sentEmails.push(emailRecord);

    this.logger.log(`[MOCK EMAIL VERIFICATION] Sent to ${email}`, {
      token: token.substring(0, 8) + '...',
      userData,
      totalEmailsSent: this.sentEmails.length,
    });
  }

  /**
   * Mock implementation of sendPasswordResetEmail (matches actual BrevoService)
   */
  async sendPasswordResetEmail(
    email: string,
    token: string,
    userData: UserMetadata = {}
  ): Promise<void> {
    const subject = 'Reset Your FarmPro Password';
    const resetUrl = `https://farmpro.app/reset-password?token=${token}`;
    const name = userData.firstName && userData.lastName 
      ? `${userData.firstName} ${userData.lastName}`
      : userData.firstName ?? email.split('@')[0] ?? 'User';

    const htmlContent = `
      <h1>Password Reset Request</h1>
      <p>Hello ${name},</p>
      <p>You requested to reset your password. Click the link below to create a new password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    const emailRecord: MockEmailRecord = {
      to: email,
      subject,
      htmlContent,
      textContent: `Reset your FarmPro password: ${resetUrl}`,
      metadata: userData,
      timestamp: new Date(),
      templateName: 'password-reset',
    };

    this.sentEmails.push(emailRecord);

    this.logger.log(`[MOCK PASSWORD RESET EMAIL] Sent to ${email}`, {
      token: token.substring(0, 8) + '...',
      userData,
      totalEmailsSent: this.sentEmails.length,
    });
  }

  /**
   * Mock implementation of sendPasswordReset (legacy method)
   */
  async sendPasswordReset(
    email: string,
    token: string,
    resetUrl?: string,
    userData?: UserMetadata
  ): Promise<void> {
    const subject = 'Reset your FarmPro password';
    const htmlContent = `
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password. Click the link below to create a new password:</p>
      <a href="${resetUrl || `https://farmpro.app/reset-password?token=${token}`}">
        Reset Password
      </a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      ${userData?.firstName ? `<p>Hello, ${userData.firstName}!</p>` : ''}
    `;

    const emailRecord: MockEmailRecord = {
      to: email,
      subject,
      htmlContent,
      textContent: `Reset your FarmPro password: ${resetUrl || `https://farmpro.app/reset-password?token=${token}`}`,
      metadata: userData,
      timestamp: new Date(),
      templateName: 'password-reset',
    };

    this.sentEmails.push(emailRecord);

    this.logger.log(`[MOCK PASSWORD RESET] Sent to ${email}`, {
      token: token.substring(0, 8) + '...',
      userData,
      totalEmailsSent: this.sentEmails.length,
    });
  }

  /**
   * Mock implementation of sendWelcomeEmail
   */
  async sendWelcomeEmail(
    email: string,
    userData: UserMetadata,
    loginUrl?: string
  ): Promise<void> {
    const subject = 'Welcome to FarmPro!';
    const htmlContent = `
      <h1>Welcome to FarmPro, ${userData.firstName || 'there'}!</h1>
      <p>Your account has been successfully created.</p>
      ${userData.companyName ? `<p>Organization: ${userData.companyName}</p>` : ''}
      ${userData.roleName ? `<p>Role: ${userData.roleName}</p>` : ''}
      <p>You can now log in and start managing your farm operations:</p>
      <a href="${loginUrl || 'https://farmpro.app/login'}">Log In to FarmPro</a>
      <p>If you have any questions, feel free to reach out to our support team.</p>
    `;

    const emailRecord: MockEmailRecord = {
      to: email,
      subject,
      htmlContent,
      textContent: `Welcome to FarmPro! Log in at: ${loginUrl || 'https://farmpro.app/login'}`,
      metadata: userData,
      timestamp: new Date(),
      templateName: 'welcome',
    };

    this.sentEmails.push(emailRecord);

    this.logger.log(`[MOCK WELCOME EMAIL] Sent to ${email}`, {
      userData,
      totalEmailsSent: this.sentEmails.length,
    });
  }

  /**
   * Mock implementation of sendInvitationEmail
   */
  async sendInvitationEmail(
    email: string,
    inviterData: UserMetadata,
    organizationName: string,
    invitationUrl?: string,
    message?: string
  ): Promise<void> {
    const subject = `You're invited to join ${organizationName} on FarmPro`;
    const htmlContent = `
      <h1>You're invited to join ${organizationName}!</h1>
      <p>${inviterData.inviterName || 'A team member'} has invited you to join their organization on FarmPro.</p>
      ${message ? `<p>Message: ${message}</p>` : ''}
      <p>Click the link below to accept the invitation:</p>
      <a href="${invitationUrl || 'https://farmpro.app/invitation'}">Accept Invitation</a>
      <p>If you don't have an account yet, you'll be able to create one during the invitation process.</p>
    `;

    const emailRecord: MockEmailRecord = {
      to: email,
      subject,
      htmlContent,
      textContent: `You're invited to join ${organizationName} on FarmPro. Accept at: ${invitationUrl || 'https://farmpro.app/invitation'}`,
      metadata: inviterData,
      timestamp: new Date(),
      templateName: 'invitation',
    };

    this.sentEmails.push(emailRecord);

    this.logger.log(`[MOCK INVITATION EMAIL] Sent to ${email}`, {
      organizationName,
      inviterData,
      message,
      totalEmailsSent: this.sentEmails.length,
    });
  }

  /**
   * Mock implementation of sendOrderNotification
   */
  async sendOrderNotification(
    email: string,
    orderData: any,
    notificationType: 'created' | 'updated' | 'cancelled' | 'completed',
    userData?: UserMetadata
  ): Promise<void> {
    const subjects = {
      created: 'New Order Created',
      updated: 'Order Updated',
      cancelled: 'Order Cancelled',
      completed: 'Order Completed',
    };

    const subject = `${subjects[notificationType]} - Order #${orderData.id || 'N/A'}`;
    const htmlContent = `
      <h1>Order ${notificationType.charAt(0).toUpperCase() + notificationType.slice(1)}</h1>
      <p>Your order has been ${notificationType}.</p>
      <p>Order ID: ${orderData.id || 'N/A'}</p>
      ${orderData.commodity ? `<p>Commodity: ${orderData.commodity}</p>` : ''}
      ${orderData.quantity ? `<p>Quantity: ${orderData.quantity}</p>` : ''}
      ${orderData.price ? `<p>Price: $${orderData.price}</p>` : ''}
      <p>You can view more details in your FarmPro dashboard.</p>
    `;

    const emailRecord: MockEmailRecord = {
      to: email,
      subject,
      htmlContent,
      textContent: `Order ${notificationType}: ${orderData.id || 'N/A'}`,
      metadata: userData,
      timestamp: new Date(),
      templateName: `order-${notificationType}`,
    };

    this.sentEmails.push(emailRecord);

    this.logger.log(`[MOCK ORDER NOTIFICATION] ${notificationType} sent to ${email}`, {
      orderId: orderData.id,
      notificationType,
      userData,
      totalEmailsSent: this.sentEmails.length,
    });
  }

  /**
   * Mock implementation of sendNewUserNotification (matches actual BrevoService)
   */
  async sendNewUserNotification(
    adminEmail: string,
    userData: UserMetadata & {
      companyName?: string;
      userEmail?: string;
      userRole?: string;
      totalUsers?: number;
      activeUsers?: number;
      newRegistrations?: number;
      companyUsers?: number;
      registrationDate?: string;
    } = {}
  ): Promise<void> {
    const subject = `New team member joined ${userData.companyName ?? 'your company'}`;
    const userName = userData.firstName && userData.lastName 
      ? `${userData.firstName} ${userData.lastName}`
      : userData.userEmail ?? 'New User';

    const htmlContent = `
      <h1>New Team Member Notification</h1>
      <p>Hello ${userData.companyName ?? 'Admin'},</p>
      <p>A new team member has joined your organization:</p>
      <ul>
        <li><strong>Name:</strong> ${userName}</li>
        <li><strong>Email:</strong> ${userData.userEmail ?? 'N/A'}</li>
        <li><strong>Role:</strong> ${userData.userRole ?? 'Team Member'}</li>
        <li><strong>Registration Date:</strong> ${userData.registrationDate ?? new Date().toLocaleDateString()}</li>
      </ul>
      <p>Organization Statistics:</p>
      <ul>
        <li>Total Users: ${userData.totalUsers ?? 0}</li>
        <li>Active Users: ${userData.activeUsers ?? 0}</li>
        <li>New Registrations: ${userData.newRegistrations ?? 0}</li>
      </ul>
      <p>You can manage your team in the FarmPro dashboard.</p>
    `;

    const emailRecord: MockEmailRecord = {
      to: adminEmail,
      subject,
      htmlContent,
      textContent: `New team member ${userName} (${userData.userEmail}) joined ${userData.companyName ?? 'your company'}`,
      metadata: userData,
      timestamp: new Date(),
      templateName: 'new-user-notification',
    };

    this.sentEmails.push(emailRecord);

    this.logger.log(`[MOCK NEW USER NOTIFICATION] Sent to ${adminEmail}`, {
      userData,
      totalEmailsSent: this.sentEmails.length,
    });
  }

  /**
   * Mock implementation of sendBillingNotification
   */
  async sendBillingNotification(
    email: string,
    billingData: any,
    notificationType: 'invoice' | 'payment_success' | 'payment_failed' | 'subscription_expired',
    userData?: UserMetadata
  ): Promise<void> {
    const subjects = {
      invoice: 'New Invoice Available',
      payment_success: 'Payment Successful',
      payment_failed: 'Payment Failed',
      subscription_expired: 'Subscription Expired',
    };

    const subject = `${subjects[notificationType]} - FarmPro`;
    const htmlContent = `
      <h1>Billing Notification</h1>
      <p>${subjects[notificationType]}</p>
      ${billingData.amount ? `<p>Amount: $${billingData.amount}</p>` : ''}
      ${billingData.invoiceId ? `<p>Invoice ID: ${billingData.invoiceId}</p>` : ''}
      ${billingData.dueDate ? `<p>Due Date: ${billingData.dueDate}</p>` : ''}
      <p>You can view your billing details in your FarmPro dashboard.</p>
    `;

    const emailRecord: MockEmailRecord = {
      to: email,
      subject,
      htmlContent,
      textContent: `${subjects[notificationType]}: ${billingData.amount ? `$${billingData.amount}` : 'See details in dashboard'}`,
      metadata: userData,
      timestamp: new Date(),
      templateName: `billing-${notificationType}`,
    };

    this.sentEmails.push(emailRecord);

    this.logger.log(`[MOCK BILLING NOTIFICATION] ${notificationType} sent to ${email}`, {
      billingData,
      notificationType,
      userData,
      totalEmailsSent: this.sentEmails.length,
    });
  }

  /**
   * Mock implementation of loadTemplate
   */
  async loadTemplate(templateName: string): Promise<string> {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    // Return a mock template
    const mockTemplate = `
      <html>
        <body>
          <h1>Mock Template: ${templateName}</h1>
          <p>This is a mock email template for testing purposes.</p>
          <p>Template variables would be replaced here in a real implementation.</p>
        </body>
      </html>
    `;

    this.templateCache.set(templateName, mockTemplate);
    return mockTemplate;
  }

  /**
   * Mock implementation of getSender
   */
  getSender(): EmailSender {
    return {
      name: 'FarmPro (Test)',
      email: 'noreply@farmpro.app',
    };
  }

  /**
   * Mock implementation of healthCheck
   */
  async healthCheck(): Promise<{ status: string; configured: boolean }> {
    return {
      status: 'healthy',
      configured: true,
    };
  }

  /**
   * Mock implementation of isConfigured
   */
  get isConfigured(): boolean {
    return true; // Always configured in tests
  }
}
