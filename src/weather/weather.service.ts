import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import {
  CurrentWeather,
  DailyForecast,
  HourlyForecast,
  WeatherAlert,
  WeatherLocation,
  AgWeatherMetrics,
  WeatherCondition,
  WeatherAlertType,
  AlertSeverity,
} from '../../contracts/weather.contract';

interface OpenWeatherOneCallResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current: {
    dt: number;
    sunrise: number;
    sunset: number;
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    dew_point: number;
    uvi: number;
    clouds: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    rain?: { '1h': number };
    snow?: { '1h': number };
  };
  daily: Array<{
    dt: number;
    sunrise: number;
    sunset: number;
    moonrise: number;
    moonset: number;
    moon_phase: number;
    temp: {
      day: number;
      min: number;
      max: number;
      night: number;
      eve: number;
      morn: number;
    };
    feels_like: {
      day: number;
      night: number;
      eve: number;
      morn: number;
    };
    pressure: number;
    humidity: number;
    dew_point: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    clouds: number;
    pop: number;
    rain?: number;
    snow?: number;
    uvi: number;
  }>;
  hourly: Array<{
    dt: number;
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    dew_point: number;
    uvi: number;
    clouds: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    pop: number;
    rain?: { '1h': number };
    snow?: { '1h': number };
  }>;
  alerts?: Array<{
    sender_name: string;
    event: string;
    start: number;
    end: number;
    description: string;
    tags: string[];
  }>;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly httpClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('WEATHER_API_KEY');
    this.apiUrl = this.configService.get<string>('WEATHER_API_URL', 'https://api.openweathermap.org/data/3.0/onecall');
    
    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getCurrentWeather(
    farmId?: string,
    latitude?: number,
    longitude?: number,
    includeAgMetrics: boolean = true,
  ) {
    const coords = await this.resolveCoordinates(farmId, latitude, longitude);
    
    if (!this.apiKey) {
      this.logger.warn('Weather API key not configured, returning default weather data');
      return this.getDefaultCurrentWeather(coords);
    }

    try {
      const response = await this.httpClient.get('', {
        params: {
          lat: coords.latitude,
          lon: coords.longitude,
          appid: this.apiKey,
          units: 'metric',
          exclude: 'minutely',
        },
      });

      const data = response.data as OpenWeatherOneCallResponse;
      const location = await this.getLocationInfo(coords.latitude, coords.longitude);
      
      const currentWeather: CurrentWeather = {
        temperature: Math.round(data.current.temp),
        feelsLike: Math.round(data.current.feels_like),
        condition: this.mapWeatherCondition(data.current.weather[0].main),
        humidity: data.current.humidity,
        windSpeed: Math.round(data.current.wind_speed * 3.6), // Convert m/s to km/h
        windDirection: this.getWindDirection(data.current.wind_deg),
        precipitation: (data.current.rain?.['1h'] || 0) + (data.current.snow?.['1h'] || 0),
        pressure: data.current.pressure,
        visibility: data.current.visibility ? data.current.visibility / 1000 : undefined, // Convert m to km
        uvIndex: Math.round(data.current.uvi),
        timestamp: new Date(data.current.dt * 1000).toISOString(),
      };

      const agMetrics = includeAgMetrics ? await this.calculateAgMetrics(data, coords) : undefined;

      return {
        data: {
          type: 'weather-current' as const,
          id: `current-${coords.latitude}-${coords.longitude}`,
          attributes: {
            ...currentWeather,
            location,
            agMetrics,
          },
        },
        meta: {
          source: 'OpenWeather API 3.0',
          lastUpdated: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch current weather: ${error.message}`);
      throw new BadRequestException('Unable to fetch weather data');
    }
  }

  async getWeatherForecast(
    farmId?: string,
    latitude?: number,
    longitude?: number,
    days: number = 7,
    includeHourly: boolean = false,
    includeAgMetrics: boolean = true,
  ) {
    const coords = await this.resolveCoordinates(farmId, latitude, longitude);
    
    if (!this.apiKey) {
      this.logger.warn('Weather API key not configured, returning default forecast');
      return this.getDefaultForecast(coords, days);
    }

    try {
      const response = await this.httpClient.get('', {
        params: {
          lat: coords.latitude,
          lon: coords.longitude,
          appid: this.apiKey,
          units: 'metric',
          exclude: 'minutely',
        },
      });

      const data = response.data as OpenWeatherOneCallResponse;
      const location = await this.getLocationInfo(coords.latitude, coords.longitude);
      
      const dailyForecasts: DailyForecast[] = data.daily.slice(0, days).map((day) => ({
        date: new Date(day.dt * 1000).toISOString().split('T')[0],
        day: new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
        temperature: {
          high: Math.round(day.temp.max),
          low: Math.round(day.temp.min),
          avg: Math.round(day.temp.day),
        },
        condition: this.mapWeatherCondition(day.weather[0].main),
        precipitation: day.rain || day.snow || 0,
        precipitationProbability: Math.round(day.pop * 100),
        humidity: day.humidity,
        windSpeed: Math.round(day.wind_speed * 3.6),
        icon: day.weather[0].icon,
      }));

      const hourlyForecasts: HourlyForecast[] = includeHourly 
        ? data.hourly.slice(0, 24).map((hour) => ({
            timestamp: new Date(hour.dt * 1000).toISOString(),
            hour: new Date(hour.dt * 1000).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              hour12: true 
            }),
            temperature: Math.round(hour.temp),
            condition: this.mapWeatherCondition(hour.weather[0].main),
            precipitation: (hour.rain?.['1h'] || 0) + (hour.snow?.['1h'] || 0),
            precipitationProbability: Math.round(hour.pop * 100),
            humidity: hour.humidity,
            windSpeed: Math.round(hour.wind_speed * 3.6),
          }))
        : [];

      const agMetrics = includeAgMetrics ? await this.calculateAgMetrics(data, coords) : undefined;

      return {
        data: {
          type: 'weather-forecast' as const,
          id: `forecast-${coords.latitude}-${coords.longitude}`,
          attributes: {
            location,
            daily: dailyForecasts,
            hourly: includeHourly ? hourlyForecasts : undefined,
            agMetrics,
          },
        },
        meta: {
          source: 'OpenWeather API 3.0',
          forecastDays: days,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch weather forecast: ${error.message}`);
      throw new BadRequestException('Unable to fetch weather forecast');
    }
  }

  async getWeatherAlerts(
    farmId?: string,
    latitude?: number,
    longitude?: number,
    activeOnly: boolean = true,
    severity?: AlertSeverity,
    type?: WeatherAlertType,
  ) {
    const coords = await this.resolveCoordinates(farmId, latitude, longitude);
    
    if (!this.apiKey) {
      this.logger.warn('Weather API key not configured, returning empty alerts');
      return { data: [], meta: { count: 0, activeCount: 0 } };
    }

    try {
      const response = await this.httpClient.get('', {
        params: {
          lat: coords.latitude,
          lon: coords.longitude,
          appid: this.apiKey,
          units: 'metric',
        },
      });

      const data = response.data as OpenWeatherOneCallResponse;
      const alerts: WeatherAlert[] = (data.alerts || []).map((alert, index) => ({
        id: `alert-${coords.latitude}-${coords.longitude}-${index}`,
        type: this.mapAlertType(alert.event),
        severity: this.mapAlertSeverity(alert.event),
        title: alert.event,
        description: alert.description,
        startTime: new Date(alert.start * 1000).toISOString(),
        endTime: new Date(alert.end * 1000).toISOString(),
        affectedAreas: [alert.sender_name],
        recommendations: this.generateAlertRecommendations(alert.event),
        isActive: new Date() >= new Date(alert.start * 1000) && new Date() <= new Date(alert.end * 1000),
      }));

      let filteredAlerts = alerts;
      if (activeOnly) {
        filteredAlerts = alerts.filter(alert => alert.isActive);
      }
      if (severity) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
      }
      if (type) {
        filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
      }

      return {
        data: filteredAlerts.map(alert => ({
          type: 'weather-alert' as const,
          id: alert.id,
          attributes: alert,
        })),
        meta: {
          count: filteredAlerts.length,
          activeCount: filteredAlerts.filter(alert => alert.isActive).length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch weather alerts: ${error.message}`);
      throw new BadRequestException('Unable to fetch weather alerts');
    }
  }

  async getWeatherHistory(
    startDate: string,
    endDate: string,
    farmId?: string,
    latitude?: number,
    longitude?: number,
    includeAgMetrics: boolean = false,
  ) {
    const coords = await this.resolveCoordinates(farmId, latitude, longitude);
    
    if (!this.apiKey) {
      this.logger.warn('Weather API key not configured, returning empty history');
      return this.getDefaultHistory(coords, startDate, endDate);
    }

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const records = [];

      // OpenWeather API 3.0 historical data requires individual calls for each day
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        try {
          const response = await this.httpClient.get('/timemachine', {
            params: {
              lat: coords.latitude,
              lon: coords.longitude,
              dt: Math.floor(d.getTime() / 1000),
              appid: this.apiKey,
              units: 'metric',
            },
          });

          const data = response.data;
          records.push({
            date: d.toISOString().split('T')[0],
            temperature: {
              high: Math.round(data.data[0].temp.max),
              low: Math.round(data.data[0].temp.min),
              avg: Math.round(data.data[0].temp.day),
            },
            precipitation: data.data[0].rain?.['1h'] || data.data[0].snow?.['1h'] || 0,
            condition: this.mapWeatherCondition(data.data[0].weather[0].main),
          });
        } catch (dayError) {
          this.logger.warn(`Failed to fetch historical data for ${d.toISOString().split('T')[0]}: ${dayError.message}`);
        }
      }

      const location = await this.getLocationInfo(coords.latitude, coords.longitude);
      const summary = records.length > 0 ? {
        avgTemperature: Math.round(records.reduce((sum, r) => sum + r.temperature.avg, 0) / records.length),
        totalPrecipitation: records.reduce((sum, r) => sum + r.precipitation, 0),
        mostCommonCondition: this.getMostCommonCondition(records.map(r => r.condition)),
      } : undefined;

      return {
        data: {
          type: 'weather-history' as const,
          id: `history-${coords.latitude}-${coords.longitude}`,
          attributes: {
            location,
            startDate,
            endDate,
            records,
            summary,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch weather history: ${error.message}`);
      throw new BadRequestException('Unable to fetch weather history');
    }
  }

  async getAgWeatherInsights(farmId: string, cropType?: string, growthStage?: string) {
    // This would integrate with AI service for agricultural insights
    // For now, return basic insights based on current weather
    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
    });

    if (!farm) {
      throw new NotFoundException('Farm not found');
    }

    const location = farm.location as { latitude: number; longitude: number } | null;
    if (!location) {
      throw new BadRequestException('Farm location not configured');
    }

    const currentWeather = await this.getCurrentWeather(farmId, location.latitude, location.longitude, true);
    const weather = currentWeather.data.attributes;

    const insights = [];
    
    // Basic irrigation insights
    if (weather.precipitation < 5 && weather.humidity < 40) {
      insights.push({
        type: 'irrigation' as const,
        priority: 'high' as const,
        title: 'Irrigation Recommended',
        description: 'Low precipitation and humidity indicate irrigation may be needed',
        recommendation: 'Consider scheduling irrigation for optimal crop health',
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // Heat stress insights
    if (weather.temperature > 35) {
      insights.push({
        type: 'heat_risk' as const,
        priority: 'medium' as const,
        title: 'Heat Stress Risk',
        description: 'High temperatures may cause heat stress in crops',
        recommendation: 'Monitor crop health and consider shade or cooling measures',
        validUntil: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      });
    }

    // Frost risk insights
    if (weather.temperature < 5) {
      insights.push({
        type: 'frost_risk' as const,
        priority: 'high' as const,
        title: 'Frost Risk Alert',
        description: 'Low temperatures pose frost risk to sensitive crops',
        recommendation: 'Consider protective measures like row covers or irrigation',
        validUntil: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      });
    }

    return {
      data: {
        type: 'ag-weather-insights' as const,
        id: `insights-${farmId}`,
        attributes: {
          insights,
          weatherSummary: {
            nextRain: undefined, // Would need forecast data
            consecutiveDryDays: 0, // Would need historical analysis
            heatStressDays: weather.temperature > 30 ? 1 : 0,
            frostRisk: weather.temperature < 5,
          },
        },
      },
    };
  }

  private async resolveCoordinates(farmId?: string, latitude?: number, longitude?: number) {
    if (farmId) {
      const farm = await this.prisma.farm.findUnique({
        where: { id: farmId },
        select: { location: true },
      });
      
      if (!farm) {
        throw new NotFoundException('Farm not found');
      }
      
      const location = farm.location as { latitude: number; longitude: number } | null;
      if (!location) {
        throw new BadRequestException('Farm location not configured');
      }
      
      return { latitude: location.latitude, longitude: location.longitude };
    }
    
    if (latitude && longitude) {
      return { latitude, longitude };
    }
    
    throw new BadRequestException('Either farmId or latitude/longitude must be provided');
  }

  private async getLocationInfo(latitude: number, longitude: number): Promise<WeatherLocation> {
    // In a real implementation, you might use a geocoding service
    return {
      name: `Location ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      country: 'Unknown',
      coordinates: { latitude, longitude },
      timezone: 'UTC',
    };
  }

  private mapWeatherCondition(condition: string): WeatherCondition {
    const conditionMap: Record<string, WeatherCondition> = {
      'Clear': 'clear',
      'Clouds': 'cloudy',
      'Rain': 'rainy',
      'Drizzle': 'rainy',
      'Thunderstorm': 'stormy',
      'Snow': 'snowy',
      'Mist': 'foggy',
      'Fog': 'foggy',
      'Haze': 'foggy',
      'Dust': 'foggy',
      'Sand': 'foggy',
      'Ash': 'foggy',
      'Squall': 'windy',
      'Tornado': 'stormy',
    };
    
    return conditionMap[condition] || 'clear';
  }

  private mapAlertType(event: string): WeatherAlertType {
    const alertMap: Record<string, WeatherAlertType> = {
      'Frost': 'frost',
      'Heat': 'heat',
      'Heavy Rain': 'heavy_rain',
      'Drought': 'drought',
      'Storm': 'storm',
      'Wind': 'wind',
      'Hail': 'hail',
      'Flood': 'flood',
    };
    
    return alertMap[event] || 'storm';
  }

  private mapAlertSeverity(event: string): AlertSeverity {
    // Simple mapping based on event type
    if (event.includes('Warning') || event.includes('Advisory')) return 'medium';
    if (event.includes('Watch')) return 'high';
    if (event.includes('Emergency') || event.includes('Critical')) return 'critical';
    return 'low';
  }

  private getWindDirection(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  private generateAlertRecommendations(event: string): string[] {
    const recommendations: Record<string, string[]> = {
      'Frost': ['Cover sensitive crops', 'Use row covers or cloths', 'Consider irrigation for frost protection'],
      'Heat': ['Increase irrigation frequency', 'Provide shade for sensitive crops', 'Monitor soil moisture'],
      'Heavy Rain': ['Check drainage systems', 'Avoid field operations', 'Monitor for flooding'],
      'Storm': ['Secure equipment and structures', 'Avoid field operations', 'Monitor for damage'],
      'Wind': ['Secure loose items', 'Avoid spraying operations', 'Check for wind damage'],
    };
    
    return recommendations[event] || ['Monitor conditions closely', 'Take appropriate precautions'];
  }

  private async calculateAgMetrics(data: OpenWeatherOneCallResponse, coords: { latitude: number; longitude: number }): Promise<AgWeatherMetrics> {
    // Basic agricultural metrics calculation
    const current = data.current;
    const daily = data.daily[0];
    
    // Growing Degree Days (simplified calculation)
    const baseTemp = 10; // Base temperature for most crops
    const gdd = Math.max(0, (current.temp - baseTemp));
    
    // Soil moisture estimation (simplified)
    const soilMoisture = Math.max(0, Math.min(100, 
      50 + (current.humidity - 50) + (daily.rain || 0) * 5 - (current.temp - 20) * 2
    ));
    
    // Evapotranspiration (simplified)
    const et = Math.max(0, (current.temp - 5) * 0.1 * (1 - current.humidity / 100));
    
    // Chill hours (hours below 7°C)
    const chillHours = current.temp < 7 ? 1 : 0;
    
    return {
      growingDegreeDays: Math.round(gdd),
      soilMoisture: Math.round(soilMoisture),
      evapotranspiration: Math.round(et * 100) / 100,
      chillHours,
      heatStress: current.temp > 35,
      frostRisk: current.temp < 2,
    };
  }

  private getMostCommonCondition(conditions: WeatherCondition[]): WeatherCondition {
    const counts = conditions.reduce((acc, condition) => {
      acc[condition] = (acc[condition] || 0) + 1;
      return acc;
    }, {} as Record<WeatherCondition, number>);
    
    return Object.entries(counts).reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b)[0] as WeatherCondition;
  }

  // Default/fallback methods
  private getDefaultCurrentWeather(coords: { latitude: number; longitude: number }) {
    return {
      data: {
        type: 'weather-current' as const,
        id: `current-${coords.latitude}-${coords.longitude}`,
        attributes: {
          temperature: 20,
          feelsLike: 22,
          condition: 'clear' as WeatherCondition,
          humidity: 60,
          windSpeed: 5,
          windDirection: 'N',
          precipitation: 0,
          pressure: 1013,
          visibility: 10,
          uvIndex: 5,
          timestamp: new Date().toISOString(),
          location: {
            name: `Location ${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`,
            country: 'Unknown',
            coordinates: coords,
            timezone: 'UTC',
          },
        },
      },
      meta: {
        source: 'Default',
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  private getDefaultForecast(coords: { latitude: number; longitude: number }, days: number) {
    const daily = Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      day: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
      temperature: { high: 25, low: 15, avg: 20 },
      condition: 'clear' as WeatherCondition,
      precipitation: 0,
      precipitationProbability: 10,
      humidity: 60,
      windSpeed: 5,
    }));

    return {
      data: {
        type: 'weather-forecast' as const,
        id: `forecast-${coords.latitude}-${coords.longitude}`,
        attributes: {
          location: {
            name: `Location ${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`,
            country: 'Unknown',
            coordinates: coords,
            timezone: 'UTC',
          },
          daily,
        },
      },
      meta: {
        source: 'Default',
        forecastDays: days,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private getDefaultHistory(coords: { latitude: number; longitude: number }, startDate: string, endDate: string) {
    return {
      data: {
        type: 'weather-history' as const,
        id: `history-${coords.latitude}-${coords.longitude}`,
        attributes: {
          location: {
            name: `Location ${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`,
            country: 'Unknown',
            coordinates: coords,
            timezone: 'UTC',
          },
          startDate,
          endDate,
          records: [],
        },
      },
    };
  }

  // =============================================================================
  // Activities/Field Work Methods (for backward compatibility)
  // =============================================================================

  /**
   * Get basic weather data for activities/field work
   * This method provides a simplified interface for activities that need basic weather info
   */
  async getWeatherData(latitude: number, longitude: number): Promise<{
    temperature: number;
    humidity: number;
    windSpeed: number;
    conditions: string;
    isGoodForFieldWork: boolean;
  }> {
    try {
      const currentWeather = await this.getCurrentWeather(
        undefined, // farmId
        latitude,
        longitude,
        false // includeAgMetrics
      );

      const weather = currentWeather.data.attributes;
      
      return {
        temperature: weather.temperature,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        conditions: weather.condition,
        isGoodForFieldWork: this.isGoodForFieldWork({
          temperature: weather.temperature,
          windSpeed: weather.windSpeed,
          condition: weather.condition,
        }),
      };
    } catch (error) {
      this.logger.error(`Failed to get weather data for activities: ${error.message}`);
      return this.getDefaultWeatherData();
    }
  }

  /**
   * Get field conditions with recommendations for activities
   */
  async getFieldConditions(latitude: number, longitude: number): Promise<{
    weather: {
      temperature: number;
      humidity: number;
      windSpeed: number;
      conditions: string;
      isGoodForFieldWork: boolean;
    };
    recommendations: string[];
    lastUpdated: string;
  }> {
    try {
      const weather = await this.getWeatherData(latitude, longitude);
      const recommendations = this.generateBasicRecommendations(weather);

      return {
        weather,
        recommendations,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get field conditions: ${error.message}`);
      throw error;
    }
  }

  private isGoodForFieldWork(weather: {
    temperature: number;
    windSpeed: number;
    condition: string;
  }): boolean {
    const temp = weather.temperature;
    const windSpeed = weather.windSpeed;
    const conditions = weather.condition.toLowerCase();
    
    // Basic criteria for field work
    if (temp < 0 || temp > 40) return false; // Too cold or hot
    if (windSpeed > 15) return false; // Too windy
    if (conditions.includes('rain') || conditions.includes('storm')) return false;
    
    return true;
  }

  private generateBasicRecommendations(weather: {
    temperature: number;
    windSpeed: number;
    conditions: string;
    isGoodForFieldWork: boolean;
  }): string[] {
    const recommendations: string[] = [];

    if (!weather.isGoodForFieldWork) {
      if (weather.temperature < 0) {
        recommendations.push('Frost conditions - avoid field operations');
      } else if (weather.temperature > 40) {
        recommendations.push('Extreme heat - avoid field operations');
      } else if (weather.windSpeed > 15) {
        recommendations.push('High winds - avoid spraying and field operations');
      } else if (weather.conditions.toLowerCase().includes('rain')) {
        recommendations.push('Wet conditions - postpone field operations');
      }
    } else {
      recommendations.push('Good conditions for field operations');
    }

    return recommendations;
  }

  private getDefaultWeatherData(): {
    temperature: number;
    humidity: number;
    windSpeed: number;
    conditions: string;
    isGoodForFieldWork: boolean;
  } {
    return {
      temperature: 20,
      humidity: 60,
      windSpeed: 5,
      conditions: 'Unknown - Weather service unavailable',
      isGoodForFieldWork: true,
    };
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
