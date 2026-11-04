import { lastDays } from './dashboard.service.js';

describe('lastDays', () => {
  it('lists the days ending today, oldest first, across a month end', () => {
    expect(lastDays('2026-03-02', 4)).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
  });
});
