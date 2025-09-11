// MonitoringService is used in the decorator logic

/**
 * Decorator to automatically track method performance
 */
export function TrackPerformance(operationName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const operation = operationName || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let userId: string | undefined;
      let organizationId: string | undefined;
      let farmId: string | undefined;

      // Try to extract user context from arguments
      if (args.length > 0) {
        const firstArg = args[0];
        if (typeof firstArg === 'string') {
          // If first argument is a string, it might be an ID
          userId = firstArg;
        } else if (firstArg && typeof firstArg === 'object') {
          userId = firstArg.userId || firstArg.id;
          organizationId = firstArg.organizationId;
          farmId = firstArg.farmId;
        }
      }

      // Try to extract from second argument if it's an object
      if (args.length > 1 && typeof args[1] === 'object' && args[1] !== null) {
        const secondArg = args[1];
        if (!userId) userId = secondArg.userId || secondArg.id;
        if (!organizationId) organizationId = secondArg.organizationId;
        if (!farmId) farmId = secondArg.farmId;
      }

      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;

        // Track performance if monitoring service is available
        if (this.monitoringService) {
          this.monitoringService.trackPerformance({
            operation,
            duration,
            userId,
            organizationId,
            metadata: { farmId },
          });
        }

        return result;
      } catch (error) {

        // Track error if monitoring service is available
        if (this.monitoringService) {
          this.monitoringService.trackError({
            error: error.message || 'Unknown error',
            operation,
            userId,
            organizationId,
            stack: error.stack,
            metadata: { farmId },
          });
        }

        throw error;
      }
    };
  };
}

/**
 * Decorator to track business metrics
 */
export function TrackBusinessMetric(metricName: string, valueExtractor?: (result: any) => number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let userId: string | undefined;
      let organizationId: string | undefined;
      let farmId: string | undefined;

      // Try to extract user context from arguments
      if (args.length > 0) {
        const firstArg = args[0];
        if (typeof firstArg === 'string') {
          userId = firstArg;
        } else if (firstArg && typeof firstArg === 'object') {
          userId = firstArg.userId || firstArg.id;
          organizationId = firstArg.organizationId;
          farmId = firstArg.farmId;
        }
      }

      if (args.length > 1 && typeof args[1] === 'object' && args[1] !== null) {
        const secondArg = args[1];
        if (!userId) userId = secondArg.userId || secondArg.id;
        if (!organizationId) organizationId = secondArg.organizationId;
        if (!farmId) farmId = secondArg.farmId;
      }

      const result = await method.apply(this, args);

      // Track business metric if monitoring service is available
      if (this.monitoringService) {
        const value = valueExtractor ? valueExtractor(result) : 1;
        this.monitoringService.trackBusinessMetric({
          metric: metricName,
          value,
          userId,
          organizationId,
          farmId,
        });
      }

      return result;
    };
  };
}
