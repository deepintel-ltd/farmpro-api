import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { HealthCheckSchema } from '@contracts/schemas';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ 
    summary: 'Get API welcome message',
    description: 'Returns a welcome message for the FarmPro API'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Welcome message returned successfully',
    schema: { type: 'string', example: 'FarmPro API is running!' }
  })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiOperation({ 
    summary: 'Health check',
    description: 'Check the health status of the API service'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Health status returned successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
        service: { type: 'string', example: 'farmpro-api' }
      }
    }
  })
  @Get('health')
  getHealth() {
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'farmpro-api',
    };
    
    // Validate response with contract schema
    return HealthCheckSchema.parse(healthData);
  }
}
