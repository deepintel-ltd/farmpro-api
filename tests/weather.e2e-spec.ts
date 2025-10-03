import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';
import axios from 'axios';

// Mock axios for weather API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Weather E2E Tests', () => {
  let testContext: TestContext;
  let accessToken: string;
  let organizationId: string;
  let farmId: string;

  // Mock weather API responses
  const mockOpenWeatherResponse = {
    lat: 40.7128,
    lon: -74.0060,
    timezone: 'America/New_York',
    timezone_offset: -18000,
    current: {
      dt: 1640995200,
      sunrise: 1640952000,
      sunset: 1640991600,
      temp: 15.5,
      feels_like: 14.2,
      pressure: 1013,
      humidity: 65,
      dew_point: 8.5,
      uvi: 3.2,
      clouds: 20,
      visibility: 10000,
      wind_speed: 3.5,
      wind_deg: 180,
      weather: [
        {
          id: 800,
          main: 'Clear',
          description: 'clear sky',
          icon: '01d'
        }
      ],
      rain: { '1h': 0 },
      snow: { '1h': 0 }
    },
    daily: [
      {
        dt: 1640995200,
        sunrise: 1640952000,
        sunset: 1640991600,
        moonrise: 1640955000,
        moonset: 1640998000,
        moon_phase: 0.5,
        temp: {
          day: 18.5,
          min: 12.0,
          max: 20.0,
          night: 14.0,
          eve: 16.0,
          morn: 13.0
        },
        feels_like: {
          day: 17.0,
          night: 13.0,
          eve: 15.0,
          morn: 12.0
        },
        pressure: 1013,
        humidity: 60,
        dew_point: 10.0,
        wind_speed: 4.0,
        wind_deg: 200,
        weather: [
          {
            id: 800,
            main: 'Clear',
            description: 'clear sky',
            icon: '01d'
          }
        ],
        clouds: 10,
        pop: 0.1,
        uvi: 4.0
      }
    ],
    hourly: [
      {
        dt: 1640995200,
        temp: 15.5,
        feels_like: 14.2,
        pressure: 1013,
        humidity: 65,
        dew_point: 8.5,
        uvi: 3.2,
        clouds: 20,
        visibility: 10000,
        wind_speed: 3.5,
        wind_deg: 180,
        weather: [
          {
            id: 800,
            main: 'Clear',
            description: 'clear sky',
            icon: '01d'
          }
        ],
        pop: 0.1
      }
    ],
    alerts: [
      {
        sender_name: 'National Weather Service',
        event: 'Heat Advisory',
        start: 1640995200,
        end: 1641081600,
        description: 'High temperatures expected. Stay hydrated and avoid prolonged outdoor activities.',
        tags: ['heat', 'advisory']
      }
    ]
  };

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  });

  afterAll(async () => {
    await testContext.teardown();
  });

  beforeEach(async () => {
    await testContext.resetDatabase();

    // Create test organization
    const organization = await testContext.createOrganization({
      name: 'Test Weather Organization',
      type: 'FARM_OPERATION',
      email: 'weather@farmpro.app',
      phone: '+1-555-0123',
      address: {
        street: '123 Weather Farm Road',
        city: 'Weatherville',
        state: 'CA',
        zipCode: '90210',
        country: 'US'
      },
      plan: 'enterprise',
      maxUsers: 100,
      maxFarms: 50,
      features: ['all_features'],
      allowCustomRoles: true,
      isVerified: true,
      isActive: true
    });

    organizationId = organization.id;

    // Create test user
    const hashedPassword = await hash('TestPassword123!');
    await testContext.createUser({
      email: 'weather@farmpro.app',
      name: 'Weather Test User',
      hashedPassword,
      organizationId,
      isActive: true,
      emailVerified: true
    });

    // Create test farm with location
    const farm = await testContext.createFarm({
      organization: { connect: { id: organizationId } },
      name: 'Weather Test Farm',
      totalArea: 100.5,
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Weather Farm Road, Weatherville, CA 90210'
      },
      timezone: 'America/New_York',
      cropTypes: ['corn', 'wheat'],
      establishedDate: new Date('2020-01-01'),
      certifications: ['organic'],
      isPublic: false,
      isActive: true
    });

    farmId = farm.id;

    // Login to get access token
    const loginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'weather@farmpro.app',
        password: 'TestPassword123!'
      })
      .expect(200);

    accessToken = loginResponse.body.data.attributes.tokens.accessToken;

    // Reset axios mocks
    mockedAxios.create.mockReturnValue(mockedAxios);
  });

  describe('GET /weather/current', () => {
    it('should return current weather data for a farm', async () => {
      // Mock successful weather API response
      mockedAxios.get.mockResolvedValueOnce({
        data: mockOpenWeatherResponse
      });

      const response = await testContext
        .request()
        .get('/weather/current')
        .query({ farmId })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('weather-current');
      expect(response.body.data.attributes.temperature).toBe(16); // Rounded from 15.5
      expect(response.body.data.attributes.feelsLike).toBe(14); // Rounded from 14.2
      expect(response.body.data.attributes.condition).toBe('clear');
      expect(response.body.data.attributes.humidity).toBe(65);
      expect(response.body.data.attributes.windSpeed).toBe(13); // Converted from m/s to km/h
      expect(response.body.data.attributes.location).toBeDefined();
      expect(response.body.data.attributes.agMetrics).toBeDefined();
      expect(response.body.meta.source).toBe('OpenWeather API 3.0');
    });

    it('should return current weather with agricultural metrics', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockOpenWeatherResponse
      });

      const response = await testContext
        .request()
        .get('/weather/current')
        .query({ farmId, includeAgMetrics: true })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.attributes.agMetrics).toBeDefined();
      expect(response.body.data.attributes.agMetrics.growingDegreeDays).toBeDefined();
      expect(response.body.data.attributes.agMetrics.soilMoisture).toBeDefined();
      expect(response.body.data.attributes.agMetrics.evapotranspiration).toBeDefined();
    });

    it('should return 404 for non-existent farm', async () => {
      const nonExistentFarmId = 'non-existent-farm-id';

      await testContext
        .request()
        .get('/weather/current')
        .query({ farmId: nonExistentFarmId })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 400 for farm without location', async () => {
      // Create farm without location
      const farmWithoutLocation = await testContext.createFarm({
        organization: { connect: { id: organizationId } },
        name: 'Farm Without Location',
        totalArea: 50.0,
        location: null,
        timezone: 'UTC',
        cropTypes: ['corn'],
        establishedDate: new Date('2020-01-01'),
        certifications: [],
        isPublic: false,
        isActive: true
      });

      await testContext
        .request()
        .get('/weather/current')
        .query({ farmId: farmWithoutLocation.id })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should handle weather API failure gracefully', async () => {
      // Mock weather API failure
      mockedAxios.get.mockRejectedValueOnce(new Error('Weather API unavailable'));

      await testContext
        .request()
        .get('/weather/current')
        .query({ farmId })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('GET /weather/forecast', () => {
    it('should return weather forecast for a farm', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockOpenWeatherResponse
      });

      const response = await testContext
        .request()
        .get('/weather/forecast')
        .query({ farmId, days: 7 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('weather-forecast');
      expect(response.body.data.attributes.daily).toHaveLength(1); // Only 1 day in mock
      expect(response.body.data.attributes.daily[0].temperature.high).toBe(20);
      expect(response.body.data.attributes.daily[0].temperature.low).toBe(12);
      expect(response.body.data.attributes.daily[0].condition).toBe('clear');
      expect(response.body.data.attributes.daily[0].precipitationProbability).toBe(10);
      expect(response.body.meta.forecastDays).toBe(7);
    });

    it('should return hourly forecast when requested', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockOpenWeatherResponse
      });

      const response = await testContext
        .request()
        .get('/weather/forecast')
        .query({ farmId, days: 7, includeHourly: true })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.attributes.hourly).toBeDefined();
      expect(response.body.data.attributes.hourly).toHaveLength(1); // Only 1 hour in mock
      expect(response.body.data.attributes.hourly[0].temperature).toBe(16);
      expect(response.body.data.attributes.hourly[0].condition).toBe('clear');
    });

    it('should validate days parameter', async () => {
      await testContext
        .request()
        .get('/weather/forecast')
        .query({ farmId, days: 15 }) // More than max 14 days
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('GET /weather/alerts', () => {
    it('should return weather alerts for a farm', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockOpenWeatherResponse
      });

      const response = await testContext
        .request()
        .get('/weather/alerts')
        .query({ farmId })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('weather-alert');
      expect(response.body.data[0].attributes.title).toBe('Heat Advisory');
      expect(response.body.data[0].attributes.severity).toBe('medium');
      expect(response.body.data[0].attributes.type).toBe('heat');
      expect(response.body.data[0].attributes.isActive).toBe(true);
      expect(response.body.meta.count).toBe(1);
      expect(response.body.meta.activeCount).toBe(1);
    });

    it('should filter alerts by severity', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockOpenWeatherResponse
      });

      const response = await testContext
        .request()
        .get('/weather/alerts')
        .query({ farmId, severity: 'high' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0); // No high severity alerts in mock
    });

    it('should filter alerts by type', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockOpenWeatherResponse
      });

      const response = await testContext
        .request()
        .get('/weather/alerts')
        .query({ farmId, type: 'heat' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].attributes.type).toBe('heat');
    });

    it('should return empty array when no alerts', async () => {
      const responseWithoutAlerts = {
        ...mockOpenWeatherResponse,
        alerts: []
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: responseWithoutAlerts
      });

      const response = await testContext
        .request()
        .get('/weather/alerts')
        .query({ farmId })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.meta.count).toBe(0);
      expect(response.body.meta.activeCount).toBe(0);
    });
  });

  describe('GET /weather/history', () => {
    it('should return historical weather data for a farm', async () => {
      // Mock historical weather API response
      const mockHistoricalResponse = {
        data: [
          {
            dt: 1640908800, // Previous day
            temp: {
              day: 16.0,
              min: 10.0,
              max: 22.0
            },
            weather: [
              {
                id: 801,
                main: 'Clouds',
                description: 'few clouds'
              }
            ],
            rain: { '1h': 2.5 },
            snow: { '1h': 0 }
          }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: mockHistoricalResponse
      });

      const response = await testContext
        .request()
        .get('/weather/history')
        .query({ 
          farmId, 
          startDate: '2022-01-01', 
          endDate: '2022-01-02' 
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('weather-history');
      expect(response.body.data.attributes.records).toHaveLength(1);
      expect(response.body.data.attributes.records[0].temperature.high).toBe(22);
      expect(response.body.data.attributes.records[0].temperature.low).toBe(10);
      expect(response.body.data.attributes.records[0].condition).toBe('cloudy');
      expect(response.body.data.attributes.records[0].precipitation).toBe(2.5);
    });

    it('should validate date range', async () => {
      await testContext
        .request()
        .get('/weather/history')
        .query({ 
          farmId, 
          startDate: 'invalid-date', 
          endDate: '2022-01-02' 
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('GET /weather/ag-insights', () => {
    it('should return agricultural weather insights for a farm', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockOpenWeatherResponse
      });

      const response = await testContext
        .request()
        .get('/weather/ag-insights')
        .query({ farmId })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('ag-weather-insights');
      expect(response.body.data.attributes.insights).toBeDefined();
      expect(Array.isArray(response.body.data.attributes.insights)).toBe(true);
      expect(response.body.data.attributes.weatherSummary).toBeDefined();
      expect(response.body.data.attributes.weatherSummary.frostRisk).toBeDefined();
      expect(response.body.data.attributes.weatherSummary.heatStressDays).toBeDefined();
    });

    it('should return insights with crop type and growth stage', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: mockOpenWeatherResponse
      });

      const response = await testContext
        .request()
        .get('/weather/ag-insights')
        .query({ 
          farmId, 
          cropType: 'corn', 
          growthStage: 'vegetative' 
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('ag-weather-insights');
      expect(response.body.data.attributes.insights).toBeDefined();
    });

    it('should return 404 for non-existent farm', async () => {
      const nonExistentFarmId = 'non-existent-farm-id';

      await testContext
        .request()
        .get('/weather/ag-insights')
        .query({ farmId: nonExistentFarmId })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all weather endpoints', async () => {
      await testContext
        .request()
        .get('/weather/current')
        .query({ farmId })
        .expect(401);

      await testContext
        .request()
        .get('/weather/forecast')
        .query({ farmId })
        .expect(401);

      await testContext
        .request()
        .get('/weather/alerts')
        .query({ farmId })
        .expect(401);

      await testContext
        .request()
        .get('/weather/history')
        .query({ farmId, startDate: '2022-01-01', endDate: '2022-01-02' })
        .expect(401);

      await testContext
        .request()
        .get('/weather/ag-insights')
        .query({ farmId })
        .expect(401);
    });

    it('should require valid farmId for all endpoints', async () => {
      await testContext
        .request()
        .get('/weather/current')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      await testContext
        .request()
        .get('/weather/forecast')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      await testContext
        .request()
        .get('/weather/alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      await testContext
        .request()
        .get('/weather/history')
        .query({ startDate: '2022-01-01', endDate: '2022-01-02' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      await testContext
        .request()
        .get('/weather/ag-insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed farmId', async () => {
      await testContext
        .request()
        .get('/weather/current')
        .query({ farmId: 'invalid-uuid' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should handle missing required parameters', async () => {
      await testContext
        .request()
        .get('/weather/history')
        .query({ farmId })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400); // Missing startDate and endDate
    });
  });
});
