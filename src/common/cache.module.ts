import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './services/cache.service';
const redisStore = require('cache-manager-redis-store');

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        
        if (redisUrl) {
          // Use Redis for caching in production
          return {
            store: redisStore,
            url: redisUrl,
            ttl: 300, // 5 minutes default TTL
            max: 1000, // Maximum number of items in cache
            isGlobal: true,
          };
        } else {
          // Use in-memory cache for development
          return {
            ttl: 300, // 5 minutes default TTL
            max: 1000, // Maximum number of items in cache
            isGlobal: true,
          };
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class AppCacheModule {}
