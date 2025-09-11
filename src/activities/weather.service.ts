import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  conditions: string;
  isGoodForFieldWork: boolean;
}

export interface FieldConditions {
  weather: WeatherData;
  recommendations: string[];
  lastUpdated: string;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly httpClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('WEATHER_API_KEY');
    this.apiUrl = this.configService.get<string>('WEATHER_API_URL', 'https://api.openweathermap.org/data/2.5');
    
    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getWeatherData(latitude: number, longitude: number): Promise<WeatherData> {
    if (!this.apiKey) {
      this.logger.warn('Weather API key not configured, returning default weather data');
      return this.getDefaultWeatherData();
    }

    try {
      this.logger.log(`Fetching weather data for coordinates: ${latitude}, ${longitude}`);
      
      const response = await this.httpClient.get('/weather', {
        params: {
          lat: latitude,
          lon: longitude,
          appid: this.apiKey,
          units: 'metric',
        },
      });

      const current = response.data;

      return {
        temperature: Math.round(current.main.temp),
        humidity: current.main.humidity,
        windSpeed: current.wind.speed,
        conditions: current.weather[0].description,
        isGoodForFieldWork: this.isGoodForFieldWork(current),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch weather data: ${error.message}`);
      return this.getDefaultWeatherData();
    }
  }

  private getDefaultWeatherData(): WeatherData {
    return {
      temperature: 20,
      humidity: 60,
      windSpeed: 5,
      conditions: 'Unknown - Weather service unavailable',
      isGoodForFieldWork: true,
    };
  }

  private isGoodForFieldWork(weatherData: any): boolean {
    const temp = weatherData.main.temp;
    const windSpeed = weatherData.wind.speed;
    const conditions = weatherData.weather[0].main.toLowerCase();
    
    // Basic criteria for field work
    if (temp < 0 || temp > 40) return false; // Too cold or hot
    if (windSpeed > 15) return false; // Too windy
    if (conditions.includes('rain') || conditions.includes('storm')) return false;
    
    return true;
  }

  async getFieldConditions(latitude: number, longitude: number): Promise<FieldConditions> {
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

  private generateBasicRecommendations(weather: WeatherData): string[] {
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

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
