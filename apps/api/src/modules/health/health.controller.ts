import { Controller, Get } from '@nestjs/common';

interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  uptime: number;
}

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
      uptime: process.uptime(),
    };
  }

  @Get('version')
  version(): { version: string } {
    return {
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }
}
