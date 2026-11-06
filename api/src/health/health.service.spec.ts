import { Test } from '@nestjs/testing';
import { healthResponseSchema } from '@repo/shared';
import { DATABASE } from '../db/database.module.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  const db = { execute: vi.fn() };
  let service: HealthService;

  beforeEach(async () => {
    db.execute.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [HealthService, { provide: DATABASE, useValue: db }],
    }).compile();

    service = moduleRef.get(HealthService);
  });

  it('reports ok when the database responds', async () => {
    db.execute.mockResolvedValue({ rows: [{ '?column?': 1 }] });

    const result = await service.check();

    expect(healthResponseSchema.parse(result)).toEqual(result);
    expect(result.status).toBe('ok');
    expect(result.checks['database']?.status).toBe('up');
  });

  it('reports error when the database is unreachable', async () => {
    db.execute.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const result = await service.check();

    expect(result.status).toBe('error');
    expect(result.checks['database']?.status).toBe('down');
  });
});
