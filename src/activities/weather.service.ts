import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  conditions: string;
  forecast: string;
}

export interface SoilData {
  moisture: number;
  ph: number;
  temperature: number;
  conditions: string;
}

export interface FieldConditions {
  weather: WeatherData;
  soil: SoilData;
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
      throw new Error('Weather API key not configured');
    }

    try {
      this.logger.log(`Fetching weather data for coordinates: ${latitude}, ${longitude}`);
      
      // Get current weather
      const currentWeatherResponse = await this.httpClient.get('/weather', {
        params: {
          lat: latitude,
          lon: longitude,
          appid: this.apiKey,
          units: 'metric',
        },
      });

      // Get 5-day forecast
      const forecastResponse = await this.httpClient.get('/forecast', {
        params: {
          lat: latitude,
          lon: longitude,
          appid: this.apiKey,
          units: 'metric',
        },
      });

      const current = currentWeatherResponse.data;
      const forecast = forecastResponse.data;

      // Extract forecast summary
      const forecastSummary = this.generateForecastSummary(forecast.list);

      return {
        temperature: Math.round(current.main.temp),
        humidity: current.main.humidity,
        windSpeed: current.wind.speed,
        conditions: current.weather[0].description,
        forecast: forecastSummary,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch weather data: ${error.message}`);
      throw new Error(`Weather API request failed: ${error.message}`);
    }
  }

  async getSoilData(latitude: number, longitude: number): Promise<SoilData> {
    // For now, we'll use mock soil data since most weather APIs don't provide soil data
    // In a real implementation, this would integrate with soil monitoring services
    // or IoT sensors on the farm
    
    this.logger.log(`Generating soil data for coordinates: ${latitude}, ${longitude}`);
    
    // Simulate soil data based on weather conditions
    const weather = await this.getWeatherData(latitude, longitude);
    
    // Basic soil moisture estimation based on recent weather
    const baseMoisture = 40;
    const weatherAdjustment = this.calculateSoilMoistureAdjustment(weather);
    const moisture = Math.max(0, Math.min(100, baseMoisture + weatherAdjustment));
    
    // Soil pH typically ranges from 6.0 to 7.5 for most crops
    const ph = 6.5 + (Math.random() - 0.5) * 0.5;
    
    // Soil temperature is usually 2-3°C cooler than air temperature
    const soilTemp = Math.max(0, weather.temperature - 2.5);
    
    // Determine soil conditions based on moisture and temperature
    let conditions = 'Good';
    if (moisture < 30) conditions = 'Dry - needs irrigation';
    else if (moisture > 70) conditions = 'Wet - risk of waterlogging';
    else if (soilTemp < 10) conditions = 'Cold - slow growth expected';
    else if (soilTemp > 30) conditions = 'Hot - monitor for stress';

    return {
      moisture: Math.round(moisture),
      ph: Math.round(ph * 10) / 10,
      temperature: Math.round(soilTemp),
      conditions,
    };
  }

  async getFieldConditions(latitude: number, longitude: number): Promise<FieldConditions> {
    try {
      const [weather, soil] = await Promise.all([
        this.getWeatherData(latitude, longitude),
        this.getSoilData(latitude, longitude),
      ]);

      const recommendations = this.generateRecommendations(weather, soil);

      return {
        weather,
        soil,
        recommendations,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get field conditions: ${error.message}`);
      throw error;
    }
  }

  private generateForecastSummary(forecastList: any[]): string {
    if (!forecastList || forecastList.length === 0) {
      return 'No forecast data available';
    }

    // Analyze next 3 days
    const next3Days = forecastList.slice(0, 8); // 8 * 3-hour intervals = 24 hours
    const conditions = next3Days.map(item => item.weather[0].main);
    const temperatures = next3Days.map(item => item.main.temp);

    const avgTemp = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
    const dominantCondition = this.getMostFrequentCondition(conditions);

    return `Next 3 days: ${dominantCondition} conditions, average temperature ${Math.round(avgTemp)}°C`;
  }

  private getMostFrequentCondition(conditions: string[]): string {
    const counts = conditions.reduce((acc, condition) => {
      acc[condition] = (acc[condition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  private calculateSoilMoistureAdjustment(weather: WeatherData): number {
    let adjustment = 0;
    
    // Adjust based on recent weather conditions
    if (weather.conditions.toLowerCase().includes('rain')) {
      adjustment += 20;
    } else if (weather.conditions.toLowerCase().includes('clear') || weather.conditions.toLowerCase().includes('sunny')) {
      adjustment -= 5;
    }
    
    // Adjust based on temperature
    if (weather.temperature > 30) {
      adjustment -= 10; // Hot weather dries soil
    } else if (weather.temperature < 10) {
      adjustment += 5; // Cold weather retains moisture
    }
    
    // Adjust based on humidity
    if (weather.humidity > 80) {
      adjustment += 10;
    } else if (weather.humidity < 40) {
      adjustment -= 15;
    }

    return adjustment;
  }

  private generateRecommendations(weather: WeatherData, soil: SoilData): string[] {
    const recommendations: string[] = [];

    // Weather-based recommendations
    if (weather.temperature < 5) {
      recommendations.push('Frost risk - protect sensitive crops');
    } else if (weather.temperature > 35) {
      recommendations.push('Heat stress risk - increase irrigation frequency');
    }

    if (weather.windSpeed > 15) {
      recommendations.push('High winds - avoid spraying operations');
    }

    if (weather.conditions.toLowerCase().includes('rain')) {
      recommendations.push('Wet conditions - avoid field operations');
    }

    // Soil-based recommendations
    if (soil.moisture < 30) {
      recommendations.push('Soil too dry - irrigation recommended');
    } else if (soil.moisture > 70) {
      recommendations.push('Soil too wet - avoid field operations');
    }

    if (soil.ph < 6.0) {
      recommendations.push('Soil pH too low - consider liming');
    } else if (soil.ph > 7.5) {
      recommendations.push('Soil pH too high - consider acidification');
    }

    if (soil.temperature < 10) {
      recommendations.push('Soil temperature low - delayed germination expected');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Ideal conditions for field operations');
    }

    return recommendations;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
