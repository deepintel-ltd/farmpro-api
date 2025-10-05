import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionService } from './subscription.service';

/**
 * Background job service for subscription processing
 *
 * Handles:
 * - Subscription renewals
 * - Subscription expirations
 * - Trial period expirations
 * - Downgrading expired subscriptions to FREE plan
 */
@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * Process subscription renewals and expirations
   * Runs every day at 2:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleSubscriptionRenewals() {
    this.logger.log('Starting subscription renewal cron job...');

    try {
      const stats = await this.subscriptionService.processSubscriptionRenewals();

      this.logger.log(
        `Subscription renewal cron job completed: ${JSON.stringify(stats)}`,
      );

      // Log warnings if there were errors
      if (stats.errors > 0) {
        this.logger.warn(
          `Subscription renewal completed with ${stats.errors} errors`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Subscription renewal cron job failed:',
        error,
      );
    }
  }

  /**
   * Process trial expirations
   * Runs every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async handleTrialExpirations() {
    this.logger.log('Starting trial expiration check...');

    try {
      const stats = await this.subscriptionService.processTrialExpirations();

      this.logger.log(
        `Trial expiration check completed: ${JSON.stringify(stats)}`,
      );

      // Log warnings if there were errors
      if (stats.errors > 0) {
        this.logger.warn(
          `Trial expiration completed with ${stats.errors} errors`,
        );
      }
    } catch (error) {
      this.logger.error('Trial expiration check failed:', error);
    }
  }

  /**
   * Send renewal reminders
   * Runs every day at 9:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendRenewalReminders() {
    this.logger.log('Starting renewal reminder cron job...');

    try {
      const stats = await this.subscriptionService.sendRenewalReminders();

      this.logger.log(
        `Renewal reminder cron job completed: ${JSON.stringify(stats)}`,
      );

      // Log warnings if there were errors
      if (stats.errors > 0) {
        this.logger.warn(
          `Renewal reminders sent with ${stats.errors} errors`,
        );
      }
    } catch (error) {
      this.logger.error('Renewal reminder cron job failed:', error);
    }
  }
}
