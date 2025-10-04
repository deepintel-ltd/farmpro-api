import { Controller, UseGuards, Logger } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { weatherContract } from '../../contracts/weather.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';
import { OrganizationIsolationGuard } from '../common/guards/organization-isolation.guard';
import { FeatureAccessGuard } from '../common/guards/feature-access.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import {
  RequireFeature,
  RequirePermission,
} from '../common/decorators/authorization.decorators';
import { PERMISSIONS } from '../common/constants';

@ApiTags('weather')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, OrganizationIsolationGuard, FeatureAccessGuard, PermissionsGuard)
@RequireFeature('weather_data')
export class WeatherController {
  private readonly logger = new Logger(WeatherController.name);

  constructor(private readonly weatherService: WeatherService) {}

  @TsRestHandler(weatherContract.getCurrentWeather)
  @RequirePermission(...PERMISSIONS.FARMS.READ)
  public getCurrentWeather(
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(weatherContract.getCurrentWeather, async ({ query }) => {
      try {
        const result = await this.weatherService.getCurrentWeather(
          query.farmId,
          undefined, // latitude
          undefined, // longitude
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get current weather failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Farm not found or location not configured',
          notFoundCode: 'FARM_NOT_FOUND',
          badRequestMessage: 'Invalid farm data or weather service unavailable',
          badRequestCode: 'WEATHER_SERVICE_ERROR',
          internalErrorMessage: 'Failed to retrieve current weather',
          internalErrorCode: 'GET_CURRENT_WEATHER_FAILED',
        });
      }
    });
  }

  @TsRestHandler(weatherContract.getWeatherForecast)
  @RequirePermission(...PERMISSIONS.FARMS.READ)
  public getWeatherForecast(
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(weatherContract.getWeatherForecast, async ({ query }) => {
      try {
        const result = await this.weatherService.getWeatherForecast(
          query.farmId,
          undefined, // latitude
          undefined, // longitude
          query.days ?? 7,
          query.includeHourly ?? false,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get weather forecast failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Farm not found or location not configured',
          notFoundCode: 'FARM_NOT_FOUND',
          badRequestMessage: 'Invalid forecast parameters or weather service unavailable',
          badRequestCode: 'WEATHER_SERVICE_ERROR',
          internalErrorMessage: 'Failed to retrieve weather forecast',
          internalErrorCode: 'GET_WEATHER_FORECAST_FAILED',
        });
      }
    });
  }

  @TsRestHandler(weatherContract.getWeatherAlerts)
  @RequirePermission(...PERMISSIONS.FARMS.READ)
  public getWeatherAlerts(
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(weatherContract.getWeatherAlerts, async ({ query }) => {
      try {
        const result = await this.weatherService.getWeatherAlerts(
          query.farmId,
          undefined, // latitude
          undefined, // longitude
          query.activeOnly ?? true,
          query.severity,
          query.type,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get weather alerts failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Farm not found or location not configured',
          notFoundCode: 'FARM_NOT_FOUND',
          badRequestMessage: 'Invalid alert parameters or weather service unavailable',
          badRequestCode: 'WEATHER_SERVICE_ERROR',
          internalErrorMessage: 'Failed to retrieve weather alerts',
          internalErrorCode: 'GET_WEATHER_ALERTS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(weatherContract.getWeatherHistory)
  @RequirePermission(...PERMISSIONS.FARMS.READ)
  public getWeatherHistory(
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(weatherContract.getWeatherHistory, async ({ query }) => {
      try {
        const result = await this.weatherService.getWeatherHistory(
          query.startDate,
          query.endDate,
          query.farmId,
          undefined, // latitude
          undefined, // longitude
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get weather history failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Farm not found or location not configured',
          notFoundCode: 'FARM_NOT_FOUND',
          badRequestMessage: 'Invalid date range or weather service unavailable',
          badRequestCode: 'WEATHER_SERVICE_ERROR',
          internalErrorMessage: 'Failed to retrieve weather history',
          internalErrorCode: 'GET_WEATHER_HISTORY_FAILED',
        });
      }
    });
  }

  @TsRestHandler(weatherContract.getAgWeatherInsights)
  @RequirePermission(...PERMISSIONS.FARMS.READ)
  public getAgWeatherInsights(
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(weatherContract.getAgWeatherInsights, async ({ query }) => {
      try {
        const result = await this.weatherService.getAgWeatherInsights(
          query.farmId,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get agricultural weather insights failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Farm not found or location not configured',
          notFoundCode: 'FARM_NOT_FOUND',
          badRequestMessage: 'Invalid farm data or weather service unavailable',
          badRequestCode: 'WEATHER_SERVICE_ERROR',
          internalErrorMessage: 'Failed to retrieve agricultural weather insights',
          internalErrorCode: 'GET_AG_WEATHER_INSIGHTS_FAILED',
        });
      }
    });
  }
}
