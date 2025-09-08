import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { HealthCheckSchema } from '@contracts/schemas';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

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
