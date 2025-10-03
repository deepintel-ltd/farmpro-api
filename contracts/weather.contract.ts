import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { JsonApiQuerySchema, JsonApiErrorResponseSchema } from './schemas';

const c = initContract();

// =============================================================================
// Weather Schemas
// =============================================================================

/**
 * Weather condition types
 */
export const WeatherConditionSchema = z.enum([
  'clear',
  'cloudy',
  'partly_cloudy',
  'rainy',
  'stormy',
  'snowy',
  'foggy',
  'windy',
]);

/**
 * Current weather data
 */
export const CurrentWeatherSchema = z.object({
  temperature: z.number().describe('Temperature in Celsius'),
  feelsLike: z.number().describe('Feels like temperature in Celsius'),
  condition: WeatherConditionSchema,
  humidity: z.number().min(0).max(100).describe('Humidity percentage'),
  windSpeed: z.number().min(0).describe('Wind speed in km/h'),
  windDirection: z.string().optional().describe('Wind direction (N, NE, E, etc.)'),
  precipitation: z.number().min(0).describe('Precipitation in mm'),
  pressure: z.number().optional().describe('Atmospheric pressure in hPa'),
  visibility: z.number().optional().describe('Visibility in km'),
  uvIndex: z.number().min(0).max(11).optional().describe('UV index'),
  timestamp: z.string().datetime(),
});

/**
 * Daily forecast
 */
export const DailyForecastSchema = z.object({
  date: z.string().date(),
  day: z.string().describe('Day name (Mon, Tue, etc.)'),
  temperature: z.object({
    high: z.number(),
    low: z.number(),
    avg: z.number().optional(),
  }),
  condition: WeatherConditionSchema,
  precipitation: z.number().min(0).describe('Expected precipitation in mm'),
  precipitationProbability: z.number().min(0).max(100).describe('Chance of rain %'),
  humidity: z.number().min(0).max(100).optional(),
  windSpeed: z.number().min(0).optional(),
  icon: z.string().optional().describe('Weather icon code'),
});

/**
 * Hourly forecast
 */
export const HourlyForecastSchema = z.object({
  timestamp: z.string().datetime(),
  hour: z.string().describe('Hour (12am, 1am, etc.)'),
  temperature: z.number(),
  condition: WeatherConditionSchema,
  precipitation: z.number().min(0),
  precipitationProbability: z.number().min(0).max(100),
  humidity: z.number().min(0).max(100).optional(),
  windSpeed: z.number().min(0).optional(),
});

/**
 * Weather alert types
 */
export const WeatherAlertTypeSchema = z.enum([
  'frost',
  'heat',
  'heavy_rain',
  'drought',
  'storm',
  'wind',
  'hail',
  'flood',
]);

/**
 * Weather alert severity
 */
export const AlertSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

/**
 * Weather alert
 */
export const WeatherAlertSchema = z.object({
  id: z.string().uuid(),
  type: WeatherAlertTypeSchema,
  severity: AlertSeveritySchema,
  title: z.string(),
  description: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  affectedAreas: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  isActive: z.boolean(),
});

/**
 * Location data
 */
export const WeatherLocationSchema = z.object({
  name: z.string(),
  region: z.string().optional(),
  country: z.string(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  timezone: z.string().optional(),
});

/**
 * Agricultural weather metrics
 */
export const AgWeatherMetricsSchema = z.object({
  growingDegreeDays: z.number().optional().describe('GDD for crop growth'),
  soilMoisture: z.number().min(0).max(100).optional().describe('Estimated soil moisture %'),
  evapotranspiration: z.number().optional().describe('ET in mm'),
  chillHours: z.number().optional().describe('Hours below 7°C'),
  heatStress: z.boolean().optional(),
  frostRisk: z.boolean().optional(),
});

// =============================================================================
// Response Schemas
// =============================================================================

export const CurrentWeatherResponseSchema = z.object({
  data: z.object({
    type: z.literal('weather-current'),
    id: z.string(),
    attributes: CurrentWeatherSchema.extend({
      location: WeatherLocationSchema,
      agMetrics: AgWeatherMetricsSchema.optional(),
    }),
  }),
  meta: z
    .object({
      source: z.string().optional(),
      lastUpdated: z.string().datetime(),
    })
    .optional(),
});

export const WeatherForecastResponseSchema = z.object({
  data: z.object({
    type: z.literal('weather-forecast'),
    id: z.string(),
    attributes: z.object({
      location: WeatherLocationSchema,
      daily: z.array(DailyForecastSchema),
      hourly: z.array(HourlyForecastSchema).optional(),
      agMetrics: AgWeatherMetricsSchema.optional(),
    }),
  }),
  meta: z
    .object({
      source: z.string().optional(),
      forecastDays: z.number(),
      generatedAt: z.string().datetime(),
    })
    .optional(),
});

export const WeatherAlertsResponseSchema = z.object({
  data: z.array(
    z.object({
      type: z.literal('weather-alert'),
      id: z.string(),
      attributes: WeatherAlertSchema,
    }),
  ),
  meta: z
    .object({
      count: z.number(),
      activeCount: z.number(),
    })
    .optional(),
});

export const WeatherHistoryResponseSchema = z.object({
  data: z.object({
    type: z.literal('weather-history'),
    id: z.string(),
    attributes: z.object({
      location: WeatherLocationSchema,
      startDate: z.string().date(),
      endDate: z.string().date(),
      records: z.array(
        z.object({
          date: z.string().date(),
          temperature: z.object({
            high: z.number(),
            low: z.number(),
            avg: z.number(),
          }),
          precipitation: z.number(),
          condition: WeatherConditionSchema,
        }),
      ),
      summary: z
        .object({
          avgTemperature: z.number(),
          totalPrecipitation: z.number(),
          mostCommonCondition: WeatherConditionSchema,
        })
        .optional(),
    }),
  }),
});

// =============================================================================
// Weather Contract
// =============================================================================

export const weatherContract = c.router({
  /**
   * Get current weather for a farm
   */
  getCurrentWeather: {
    method: 'GET',
    path: '/weather/current',
    query: z.object({
      farmId: z.string().uuid(),
      includeAgMetrics: z.coerce.boolean().optional().default(true),
    }),
    responses: {
      200: CurrentWeatherResponseSchema,
      400: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
    },
    summary: 'Get current weather conditions for a farm',
    description:
      'Retrieve current weather data for a farm using its stored location coordinates. Includes agricultural metrics when available.',
  },

  /**
   * Get weather forecast for a farm
   */
  getWeatherForecast: {
    method: 'GET',
    path: '/weather/forecast',
    query: z.object({
      farmId: z.string().uuid(),
      days: z.coerce.number().min(1).max(14).optional().default(7),
      includeHourly: z.coerce.boolean().optional().default(false),
      includeAgMetrics: z.coerce.boolean().optional().default(true),
    }),
    responses: {
      200: WeatherForecastResponseSchema,
      400: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
    },
    summary: 'Get weather forecast for a farm',
    description:
      'Retrieve weather forecast for up to 14 days for a farm using its stored location coordinates. Optionally include hourly forecast and agricultural metrics.',
  },

  /**
   * Get weather alerts for a farm
   */
  getWeatherAlerts: {
    method: 'GET',
    path: '/weather/alerts',
    query: z.object({
      farmId: z.string().uuid(),
      activeOnly: z.coerce.boolean().optional().default(true),
      severity: AlertSeveritySchema.optional(),
      type: WeatherAlertTypeSchema.optional(),
    }),
    responses: {
      200: WeatherAlertsResponseSchema,
      400: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
    },
    summary: 'Get weather alerts for a farm',
    description:
      'Retrieve weather alerts for a farm using its stored location coordinates. Filter by severity, type, and active status.',
  },

  /**
   * Get historical weather data for a farm
   */
  getWeatherHistory: {
    method: 'GET',
    path: '/weather/history',
    query: z.object({
      farmId: z.string().uuid(),
      startDate: z.string().date(),
      endDate: z.string().date(),
      includeAgMetrics: z.coerce.boolean().optional().default(false),
    }),
    responses: {
      200: WeatherHistoryResponseSchema,
      400: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
    },
    summary: 'Get historical weather data for a farm',
    description: 'Retrieve historical weather data for a farm using its stored location coordinates within a date range.',
  },

  /**
   * Get agricultural weather insights
   */
  getAgWeatherInsights: {
    method: 'GET',
    path: '/weather/ag-insights',
    query: z.object({
      farmId: z.string().uuid(),
      cropType: z.string().optional(),
      growthStage: z.string().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('ag-weather-insights'),
          id: z.string(),
          attributes: z.object({
            insights: z.array(
              z.object({
                type: z.enum([
                  'irrigation',
                  'pest_risk',
                  'disease_risk',
                  'harvest_window',
                  'planting_window',
                ]),
                priority: z.enum(['low', 'medium', 'high']),
                title: z.string(),
                description: z.string(),
                recommendation: z.string(),
                validUntil: z.string().datetime().optional(),
              }),
            ),
            weatherSummary: z.object({
              nextRain: z.string().datetime().optional(),
              consecutiveDryDays: z.number(),
              heatStressDays: z.number(),
              frostRisk: z.boolean(),
            }),
          }),
        }),
      }),
      400: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
    },
    summary: 'Get agricultural weather insights',
    description:
      'Get AI-powered agricultural insights based on weather conditions and crop requirements.',
  },
});

// =============================================================================
// Type Exports
// =============================================================================

export type WeatherContract = typeof weatherContract;
export type CurrentWeather = z.infer<typeof CurrentWeatherSchema>;
export type DailyForecast = z.infer<typeof DailyForecastSchema>;
export type HourlyForecast = z.infer<typeof HourlyForecastSchema>;
export type WeatherAlert = z.infer<typeof WeatherAlertSchema>;
export type WeatherLocation = z.infer<typeof WeatherLocationSchema>;
export type AgWeatherMetrics = z.infer<typeof AgWeatherMetricsSchema>;
export type WeatherCondition = z.infer<typeof WeatherConditionSchema>;
export type WeatherAlertType = z.infer<typeof WeatherAlertTypeSchema>;
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;
