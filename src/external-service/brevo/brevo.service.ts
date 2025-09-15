import { TransactionalEmailsApi, SendSmtpEmail, TransactionalEmailsApiApiKeys } from '@getbrevo/brevo';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
 * Email parameters interface
 */
export interface EmailParams {
  to: string;
  templateId: number;
  params:
    | VerificationEmailParams
    | WelcomeEmailParams
    | PasswordResetEmailParams
    | InvitationEmailParams
    | Record<string, string | number>;
}

/**
 * Email template parameters with strong typing
 */
export interface VerificationEmailParams {
  verificationUrl: string;
  firstName: string;
  lastName?: string;
  year: number;
  appName?: string;
  supportEmail?: string;
}

export interface WelcomeEmailParams {
  loginUrl: string;
  firstName: string;
  lastName?: string;
  year: number;
  appName?: string;
  supportEmail?: string;
}

export interface PasswordResetEmailParams {
  resetUrl: string;
  firstName: string;
  lastName?: string;
  year: number;
  appName?: string;
  supportEmail?: string;
}

export interface InvitationEmailParams {
  invitationUrl: string;
  firstName: string;
  lastName?: string;
  year: number;
  companyName?: string;
  inviterName?: string;
  roleName?: string;
  message?: string;
  appName?: string;
  supportEmail?: string;
}

@Injectable()
export class BrevoService {
  private readonly logger = new Logger(BrevoService.name);
  private readonly apiInstance: TransactionalEmailsApi | null;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const brevoApiKey = this.configService.get<string>('BREVO_API_KEY');

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
  }

  /**
   * Get configured email sender details
   * @returns Email sender configuration
   */
  private getSender(): EmailSender {
    return {
      name: this.configService.get<string>('BREVO_SENDER_NAME') ?? 'YourApp',
      email: this.configService.get<string>('BREVO_SENDER_EMAIL') ?? 'no-reply@yourapp.com',
    };
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
      ? 'https://buildlink.io' // Production fallback
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
   * Send a templated email using Brevo
   * @param params Email parameters
   * @returns Promise resolving on success
   */
  public async sendEmail({ to, templateId, params }: EmailParams): Promise<void> {
    // In development or when not configured, log the email instead of sending
    if (!this.isConfigured || !this.apiInstance) {
      this.logger.log(`[SIMULATED EMAIL] Template ${templateId} to ${to}`, {
        params,
        note: 'Email would be sent in production with proper Brevo configuration',
      });
      return;
    }

    try {
      const message = new SendSmtpEmail();
      message.to = [{ email: to }];
      message.templateId = templateId;
      message.params = params;
      message.sender = this.getSender();

      await this.apiInstance.sendTransacEmail(message);
      this.logger.log(`Email sent using template ${templateId} to ${to}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = error instanceof Error ? error : { error: String(error) };

      this.logger.error(`Failed to send email to ${to}. Error: ${errorMessage}`, {
        error: errorDetails,
        templateId,
        params,
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
   * @param userData Additional user data
   * @returns Promise resolving on success
   */
  public async sendEmailVerification(
    email: string,
    verificationUrl: string,
    userData: UserMetadata = {}
  ): Promise<void> {
    const currentYear = new Date().getFullYear();
    // const verificationUrl = this.generateUrl('/verify', { token });

    const params: VerificationEmailParams = {
      verificationUrl,
      firstName: userData.firstName ?? email.split('@')[0] ?? 'User',
      year: currentYear,
      ...userData,
    };

    const templateIdStr = this.configService.get<string>('BREVO_EMAIL_VERIFICATION_TEMPLATE_ID');
    if (!templateIdStr) {
      this.logger.warn('BREVO_EMAIL_VERIFICATION_TEMPLATE_ID not configured');
      return;
    }

    return this.sendEmail({
      to: email,
      templateId: Number(templateIdStr),
      params,
    });
  }

  /**
   * Send welcome email to a user
   * @param email User email
   * @param userData Additional user data
   * @returns Promise resolving on success
   */
  public async sendWelcomeEmail(email: string, userData: UserMetadata = {}): Promise<void> {
    const currentYear = new Date().getFullYear();
    const loginUrl = this.generateUrl('/login');

    const params: WelcomeEmailParams = {
      loginUrl,
      firstName: userData.firstName ?? email.split('@')[0] ?? 'User',
      year: currentYear,
      ...userData,
    };

    const templateIdStr = this.configService.get<string>('BREVO_WELCOME_TEMPLATE_ID');
    if (!templateIdStr) {
      this.logger.warn('BREVO_WELCOME_TEMPLATE_ID not configured');
      return;
    }

    return this.sendEmail({
      to: email,
      templateId: Number(templateIdStr),
      params,
    });
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
    const currentYear = new Date().getFullYear();
    const resetUrl = this.generateUrl('/reset-password', { token });

    const params: PasswordResetEmailParams = {
      resetUrl,
      firstName: userData.firstName ?? email.split('@')[0] ?? 'User',
      year: currentYear,
      ...userData,
    };

    const templateIdStr = this.configService.get<string>('BREVO_PASSWORD_RESET_TEMPLATE_ID');
    if (!templateIdStr) {
      this.logger.warn('BREVO_PASSWORD_RESET_TEMPLATE_ID not configured');
      return;
    }

    return this.sendEmail({
      to: email,
      templateId: Number(templateIdStr),
      params,
    });
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
    const currentYear = new Date().getFullYear();

    const params = {
      inviteUrl,
      firstName: userData.firstName ?? email.split('@')[0] ?? 'User',
      companyName: userData.companyName ?? 'Your Company',
      roleName: userData.roleName ?? 'Team Member',
      inviterName: userData.inviterName ?? 'Your Team',
      message: userData.message ?? '',
      year: currentYear,
      ...userData,
    };

    const templateIdStr = this.configService.get<string>('BREVO_INVITATION_TEMPLATE_ID');
    if (!templateIdStr) {
      this.logger.warn('BREVO_INVITATION_TEMPLATE_ID not configured');
      return;
    }

    return this.sendEmail({
      to: email,
      templateId: Number(templateIdStr),
      params,
    });
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
    } = {}
  ): Promise<void> {
    const currentYear = new Date().getFullYear();
    const dashboardUrl = this.generateUrl('/dashboard');

    const params = {
      dashboardUrl,
      companyName: userData.companyName ?? 'Your Company',
      userEmail: userData.userEmail ?? 'New User',
      userName:
        (`${userData.firstName ?? ''} ${userData.lastName ?? ''}`.trim() || userData.userEmail) ??
        'New User',
      userRole: userData.userRole ?? 'Team Member',
      year: currentYear,
      ...userData,
    };

    const templateIdStr = this.configService.get<string>('BREVO_NEW_USER_NOTIFICATION_TEMPLATE_ID');
    if (!templateIdStr) {
      this.logger.warn('BREVO_NEW_USER_NOTIFICATION_TEMPLATE_ID not configured');
      return;
    }

    return this.sendEmail({
      to: adminEmail,
      templateId: Number(templateIdStr),
      params,
    });
  }
}
