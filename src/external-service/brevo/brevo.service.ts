import { TransactionalEmailsApi, SendSmtpEmail, TransactionalEmailsApiApiKeys } from '@getbrevo/brevo';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface UserMetadata {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  roleName?: string;
  inviterName?: string;
  message?: string;
}

/**
 * Email sender interface
 */
export interface EmailSender {
  name: string;
  email: string;
}

/**
 * Email parameters interface for HTML emails
 */
export interface EmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string; // Plain text fallback
}


@Injectable()
export class BrevoService {
  private readonly logger = new Logger(BrevoService.name);
  private readonly apiInstance: TransactionalEmailsApi | null;
  private readonly isConfigured: boolean;
  private readonly templateCache: Map<string, string> = new Map();
  private readonly templatesPath: string;

  constructor(private readonly configService: ConfigService) {
    const brevoApiKey = this.configService.get<string>('BREVO_API_KEY');

    // Set templates path - configurable or default
    this.templatesPath = this.configService.get<string>('EMAIL_TEMPLATES_PATH') ?? 
      path.join(process.cwd(), 'src', 'email-templates');

    if (!brevoApiKey) {
      this.logger.warn(
        'Brevo API key not provided. Email functionality will be simulated in development.'
      );
      this.isConfigured = false;
      this.apiInstance = null;
    } else {
      try {
        this.apiInstance = new TransactionalEmailsApi();
        this.apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, brevoApiKey);
        this.isConfigured = true;
        this.logger.log('Brevo service initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize Brevo service', error);
        this.isConfigured = false;
        this.apiInstance = null;
      }
    }

    // Preload templates in production for better performance
    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'development';
    if (nodeEnv === 'production') {
      this.preloadTemplates();
    }
  }

  /**
   * Preload all email templates into cache
   */
  private preloadTemplates(): void {
    try {
      const templates = [
        'verification.html',
        'welcome.html',
        'password-reset.html',
        'invitation.html',
        'new-user-notification.html'
      ];

      templates.forEach(template => {
        try {
          this.loadTemplate(template);
          this.logger.log(`Preloaded template: ${template}`);
        } catch (error) {
          this.logger.warn(`Failed to preload template ${template}:`, error);
        }
      });
    } catch (error) {
      this.logger.warn('Failed to preload templates:', error);
    }
  }

  /**
   * Load email template from file
   * @param templateName Template file name
   * @returns HTML content
   */
  private loadTemplate(templateName: string): string {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    try {
      const templatePath = path.join(this.templatesPath, templateName);
      const template = fs.readFileSync(templatePath, 'utf-8');
      
      // Cache the template
      this.templateCache.set(templateName, template);
      
      return template;
    } catch (error) {
      this.logger.error(`Failed to load template ${templateName}:`, error);
      throw new Error(`Email template ${templateName} not found`);
    }
  }

  /**
   * Get configured email sender details
   * @returns Email sender configuration
   */
  private getSender(): EmailSender {
    return {
      name: this.configService.get<string>('BREVO_SENDER_NAME') ?? 'FarmPro',
      email: this.configService.get<string>('BREVO_SENDER_EMAIL') ?? 'no-reply@farmpro.app',
    };
  }

  /**
   * Get organization address for email footer
   * @returns Organization address string
   */
  private getOrganizationAddress(): string {
    return this.configService.get<string>('ORGANIZATION_ADDRESS') ?? 
      'FarmPro Inc., 123 Agricultural Way, Farm City, FC 12345';
  }

  /**
   * Get the base URL based on the environment
   * Automatically detects the hosting domain if configured
   * @returns Base URL for application links
   */
  private getBaseUrl(): string {
    // First, try to get the dynamically set host URL if available
    const dynamicHost = this.configService.get<string>('BASE_URL');
    if (dynamicHost) {
      return dynamicHost;
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'development';
    const port = this.configService.get<number>('PORT') ?? 3000;

    return nodeEnv === 'production'
      ? 'https://farmpro.app' // Production fallback
      : `http://localhost:${port}`; // Development fallback
  }

  /**
   * Generate a full URL for a specific path
   * @param path The path to append to the base URL
   * @param queryParams Optional query parameters to add
   * @returns Full URL with path and optional query parameters
   */
  public generateUrl(path: string, queryParams?: Record<string, string>): string {
    const baseUrl = this.getBaseUrl();
    const url = new URL(path, baseUrl);

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    return url.toString();
  }

  /**
   * Generate a 6-digit verification code from token
   * @param token Full verification token
   * @returns 6-digit numeric code
   */
  private generateVerificationCode(token: string): string {
    // Create a numeric code from token hash
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) - hash) + token.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to positive 6-digit number
    return Math.abs(hash).toString().padStart(6, '0').slice(0, 6);
  }

  /**
   * Replace template variables in HTML content
   * @param template HTML template string
   * @param variables Object with variable values
   * @returns HTML with replaced variables
   */
  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    });
    return result;
  }

  /**
   * Convert HTML to plain text for email fallback
   * @param html HTML content
   * @returns Plain text version
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  /**
   * Send an HTML email using Brevo
   * @param params Email parameters
   * @returns Promise resolving on success
   */
  public async sendEmail({ to, subject, htmlContent, textContent }: EmailParams): Promise<void> {
    // In development or when not configured, log the email instead of sending
    if (!this.isConfigured || !this.apiInstance) {
      this.logger.log(`[SIMULATED EMAIL] "${subject}" to ${to}`, {
        htmlLength: htmlContent.length,
        textLength: textContent?.length ?? 0,
        note: 'Email would be sent in production with proper Brevo configuration',
      });
      return;
    }

    try {
      const message = new SendSmtpEmail();
      message.to = [{ email: to }];
      message.subject = subject;
      message.htmlContent = htmlContent;
      message.textContent = textContent ?? this.htmlToText(htmlContent);
      message.sender = this.getSender();

      await this.apiInstance.sendTransacEmail(message);
      this.logger.log(`Email "${subject}" sent to ${to}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = error instanceof Error ? error : { error: String(error) };

      this.logger.error(`Failed to send email to ${to}. Error: ${errorMessage}`, {
        error: errorDetails,
        subject,
      });

      // In development, don't throw to allow the app to continue working
      const nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'development';
      if (nodeEnv === 'development') {
        this.logger.warn('Email sending failed in development - continuing execution');
        return;
      }

      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }

  /**
   * Send email verification to a user
   * @param email User email
   * @param token Verification token
   * @param verificationUrl Full verification URL (optional, will be generated if not provided)
   * @param userData Additional user data
   * @returns Promise resolving on success
   */
  public async sendEmailVerification(
    email: string,
    token: string,
    verificationUrl?: string,
    userData: UserMetadata = {}
  ): Promise<void> {
    // Load template
    const template = this.loadTemplate('verification.html');
    
    // Generate verification URL if not provided
    const finalVerificationUrl = verificationUrl ?? this.generateUrl('/verify-email', { token });
    
    // Generate 6-digit verification code from token
    const verificationCode = this.generateVerificationCode(token);
    
    // Get user's full name or use first name
    const name = userData.firstName && userData.lastName 
      ? `${userData.firstName} ${userData.lastName}`
      : userData.firstName ?? email.split('@')[0] ?? 'User';

    // Prepare variables
    const variables: Record<string, string> = {
      name,
      verificationUrl: finalVerificationUrl,
      verificationToken: verificationCode,
      organizationAddress: this.getOrganizationAddress(),
      unsubscribeUrl: this.generateUrl('/unsubscribe', { email }),
      year: new Date().getFullYear().toString(),
    };

    // Replace variables in template
    const htmlContent = this.replaceVariables(template, variables);

    return this.sendEmail({
      to: email,
      subject: 'Verify Your FarmPro Account',
      htmlContent,
    });
  }

  /**
   * Send welcome email to a user
   * @param email User email
   * @param userData Additional user data
   * @returns Promise resolving on success
   */
  public async sendWelcomeEmail(email: string, userData: UserMetadata = {}): Promise<void> {
    try {
      const template = this.loadTemplate('welcome.html');
      const loginUrl = this.generateUrl('/login');
      
      const name = userData.firstName && userData.lastName 
        ? `${userData.firstName} ${userData.lastName}`
        : userData.firstName ?? email.split('@')[0] ?? 'User';

      const variables: Record<string, string> = {
        name,
        loginUrl,
        organizationAddress: this.getOrganizationAddress(),
        year: new Date().getFullYear().toString(),
      };

      const htmlContent = this.replaceVariables(template, variables);

      return this.sendEmail({
        to: email,
        subject: 'Welcome to FarmPro!',
        htmlContent,
      });
    } catch (error) {
      this.logger.warn(`Welcome email template not found for ${email}`);
    }
  }

  /**
   * Send password reset email to a user
   * @param email User email
   * @param token Reset token
   * @param userData Additional user data
   * @returns Promise resolving on success
   */
  public async sendPasswordResetEmail(
    email: string,
    token: string,
    userData: UserMetadata = {}
  ): Promise<void> {
    try {
      const template = this.loadTemplate('password-reset.html');
      const resetUrl = this.generateUrl('/reset-password', { token });
      
      const name = userData.firstName && userData.lastName 
        ? `${userData.firstName} ${userData.lastName}`
        : userData.firstName ?? email.split('@')[0] ?? 'User';

      const variables: Record<string, string> = {
        name,
        resetUrl,
        organizationAddress: this.getOrganizationAddress(),
        year: new Date().getFullYear().toString(),
      };

      const htmlContent = this.replaceVariables(template, variables);

      return this.sendEmail({
        to: email,
        subject: 'Reset Your FarmPro Password',
        htmlContent,
      });
    } catch (error) {
      this.logger.warn(`Password reset email template not found for ${email}`);
    }
  }

  /**
   * Send company invitation email
   * @param email Invitee email
   * @param inviteUrl Invitation URL with token
   * @param userData Additional invitation data
   * @returns Promise resolving on success
   */
  public async sendInvitationEmail(
    email: string,
    inviteUrl: string,
    userData: UserMetadata & {
      companyName?: string;
      roleName?: string;
      inviterName?: string;
      message?: string;
    } = {}
  ): Promise<void> {
    try {
      const template = this.loadTemplate('invitation.html');
      
      const name = userData.firstName && userData.lastName 
        ? `${userData.firstName} ${userData.lastName}`
        : userData.firstName ?? email.split('@')[0] ?? 'User';

      const variables: Record<string, string> = {
        name,
        invitationUrl: inviteUrl,
        companyName: userData.companyName ?? 'Your Company',
        roleName: userData.roleName ?? 'Team Member',
        inviterName: userData.inviterName ?? 'Your Team',
        message: userData.message ?? '',
        organizationAddress: this.getOrganizationAddress(),
        year: new Date().getFullYear().toString(),
      };

      const htmlContent = this.replaceVariables(template, variables);

      return this.sendEmail({
        to: email,
        subject: `You've been invited to join ${userData.companyName ?? 'a company'} on FarmPro`,
        htmlContent,
      });
    } catch (error) {
      this.logger.warn(`Invitation email template not found for ${email}`);
    }
  }

  /**
   * Send notification when new user joins company
   * @param adminEmail Company admin email
   * @param userData New user and company data
   * @returns Promise resolving on success
   */
  public async sendNewUserNotification(
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
    try {
      const template = this.loadTemplate('new-user-notification.html');
      const dashboardUrl = this.generateUrl('/dashboard');

      const userName = userData.firstName && userData.lastName 
        ? `${userData.firstName} ${userData.lastName}`
        : userData.userEmail ?? 'New User';

      const variables: Record<string, string> = {
        dashboardUrl,
        companyName: userData.companyName ?? 'Your Company',
        userName,
        userEmail: userData.userEmail ?? '',
        userRole: userData.userRole ?? 'Team Member',
        totalUsers: (userData.totalUsers ?? 0).toString(),
        activeUsers: (userData.activeUsers ?? 0).toString(),
        newRegistrations: (userData.newRegistrations ?? 0).toString(),
        companyUsers: (userData.companyUsers ?? 0).toString(),
        registrationDate: userData.registrationDate ?? new Date().toLocaleDateString(),
        organizationAddress: this.getOrganizationAddress(),
        year: new Date().getFullYear().toString(),
      };

      const htmlContent = this.replaceVariables(template, variables);

      return this.sendEmail({
        to: adminEmail,
        subject: `New team member joined ${userData.companyName ?? 'your company'}`,
        htmlContent,
      });
    } catch (error) {
      this.logger.warn(`New user notification email template not found for ${adminEmail}`);
    }
  }

  /**
   * Verify a 6-digit code against a token
   * @param code 6-digit code entered by user
   * @param token Original token
   * @returns Whether the code matches
   */
  public verifyCode(code: string, token: string): boolean {
    const expectedCode = this.generateVerificationCode(token);
    return code === expectedCode;
  }

  /**
   * Clear template cache (useful for development)
   */
  public clearTemplateCache(): void {
    this.templateCache.clear();
    this.logger.log('Email template cache cleared');
  }
}
