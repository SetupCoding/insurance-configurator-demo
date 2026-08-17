import { describe, expect, it } from 'vitest';

import { flowSchema } from '@/lib/schema/flow';

import { GET } from './route';

describe('GET /api/flow', () => {
  it('returns the validated flow as JSON', async () => {
    const response = GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(() => flowSchema.parse(body)).not.toThrow();
  });
});
