import { Test, TestingModule } from '@nestjs/testing';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health status', () => {
      const result = controller.check();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('uptime');
    });

    it('should return valid timestamp', () => {
      const result = controller.check();
      const timestamp = new Date(result.timestamp);

      expect(timestamp instanceof Date).toBe(true);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });
  });

  describe('version', () => {
    it('should return version info', () => {
      const result = controller.version();

      expect(result).toHaveProperty('version');
      expect(typeof result.version).toBe('string');
    });
  });
});
