import { Injectable, Logger } from '@nestjs/common';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorMetrics {
  error: string;
  operation: string;
  timestamp: Date;
  userId?: string;
  organizationId?: string;
  stack?: string;
  metadata?: Record<string, any>;
}

export interface BusinessMetrics {
  metric: string;
  value: number;
  timestamp: Date;
  userId?: string;
  organizationId?: string;
  farmId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly metrics: PerformanceMetrics[] = [];
  private readonly errors: ErrorMetrics[] = [];
  private readonly businessMetrics: BusinessMetrics[] = [];

  /**
   * Track performance metrics for operations
   */
  trackPerformance(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    const fullMetrics: PerformanceMetrics = {
      ...metrics,
      timestamp: new Date(),
    };

    this.metrics.push(fullMetrics);
    this.logger.debug(`Performance tracked: ${metrics.operation} took ${metrics.duration}ms`, {
      userId: metrics.userId,
      organizationId: metrics.organizationId,
      duration: metrics.duration,
    });

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics.splice(0, this.metrics.length - 1000);
    }
  }

  /**
   * Track error metrics
   */
  trackError(error: Omit<ErrorMetrics, 'timestamp'>): void {
    const fullError: ErrorMetrics = {
      ...error,
      timestamp: new Date(),
    };

    this.errors.push(fullError);
    this.logger.error(`Error tracked: ${error.error} in ${error.operation}`, {
      userId: error.userId,
      organizationId: error.organizationId,
      error: error.error,
      stack: error.stack,
    });

    // Keep only last 500 errors to prevent memory leaks
    if (this.errors.length > 500) {
      this.errors.splice(0, this.errors.length - 500);
    }
  }

  /**
   * Track business metrics
   */
  trackBusinessMetric(metric: Omit<BusinessMetrics, 'timestamp'>): void {
    const fullMetric: BusinessMetrics = {
      ...metric,
      timestamp: new Date(),
    };

    this.businessMetrics.push(fullMetric);
    this.logger.debug(`Business metric tracked: ${metric.metric} = ${metric.value}`, {
      userId: metric.userId,
      organizationId: metric.organizationId,
      farmId: metric.farmId,
      value: metric.value,
    });

    // Keep only last 1000 business metrics to prevent memory leaks
    if (this.businessMetrics.length > 1000) {
      this.businessMetrics.splice(0, this.businessMetrics.length - 1000);
    }
  }

  /**
   * Get performance metrics for a time range
   */
  getPerformanceMetrics(startDate?: Date, endDate?: Date): PerformanceMetrics[] {
    if (!startDate && !endDate) {
      return [...this.metrics];
    }

    return this.metrics.filter(metric => {
      if (startDate && metric.timestamp < startDate) return false;
      if (endDate && metric.timestamp > endDate) return false;
      return true;
    });
  }

  /**
   * Get error metrics for a time range
   */
  getErrorMetrics(startDate?: Date, endDate?: Date): ErrorMetrics[] {
    if (!startDate && !endDate) {
      return [...this.errors];
    }

    return this.errors.filter(error => {
      if (startDate && error.timestamp < startDate) return false;
      if (endDate && error.timestamp > endDate) return false;
      return true;
    });
  }

  /**
   * Get business metrics for a time range
   */
  getBusinessMetrics(startDate?: Date, endDate?: Date): BusinessMetrics[] {
    if (!startDate && !endDate) {
      return [...this.businessMetrics];
    }

    return this.businessMetrics.filter(metric => {
      if (startDate && metric.timestamp < startDate) return false;
      if (endDate && metric.timestamp > endDate) return false;
      return true;
    });
  }

  /**
   * Get performance summary for an operation
   */
  getPerformanceSummary(operation: string, startDate?: Date, endDate?: Date): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
  } {
    const metrics = this.getPerformanceMetrics(startDate, endDate)
      .filter(m => m.operation === operation);

    if (metrics.length === 0) {
      return { count: 0, avgDuration: 0, minDuration: 0, maxDuration: 0, p95Duration: 0 };
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = durations[0];
    const maxDuration = durations[durations.length - 1];
    const p95Index = Math.floor(durations.length * 0.95);
    const p95Duration = durations[p95Index] || maxDuration;

    return {
      count: metrics.length,
      avgDuration: Math.round(avgDuration * 100) / 100,
      minDuration,
      maxDuration,
      p95Duration,
    };
  }

  /**
   * Get error summary
   */
  getErrorSummary(startDate?: Date, endDate?: Date): {
    totalErrors: number;
    errorsByOperation: Record<string, number>;
    errorsByType: Record<string, number>;
  } {
    const errors = this.getErrorMetrics(startDate, endDate);
    
    const errorsByOperation: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};

    errors.forEach(error => {
      errorsByOperation[error.operation] = (errorsByOperation[error.operation] || 0) + 1;
      errorsByType[error.error] = (errorsByType[error.error] || 0) + 1;
    });

    return {
      totalErrors: errors.length,
      errorsByOperation,
      errorsByType,
    };
  }

  /**
   * Get business metrics summary
   */
  getBusinessMetricsSummary(metricName: string, startDate?: Date, endDate?: Date): {
    count: number;
    total: number;
    average: number;
    min: number;
    max: number;
  } {
    const metrics = this.getBusinessMetrics(startDate, endDate)
      .filter(m => m.metric === metricName);

    if (metrics.length === 0) {
      return { count: 0, total: 0, average: 0, min: 0, max: 0 };
    }

    const values = metrics.map(m => m.value);
    const total = values.reduce((sum, v) => sum + v, 0);
    const average = total / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      count: metrics.length,
      total: Math.round(total * 100) / 100,
      average: Math.round(average * 100) / 100,
      min,
      max,
    };
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.metrics.length = 0;
    this.errors.length = 0;
    this.businessMetrics.length = 0;
    this.logger.debug('All metrics cleared');
  }
}
