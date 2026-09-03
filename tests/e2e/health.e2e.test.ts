import { describe, expect, it } from 'vitest'

import type { HealthResponse } from '../../src/shared/dto'
import { app, testEnv } from '../helpers/setup'

describe('GET /api/health', () => {
  it('responde 200 com o banco no ar', async () => {
    const response = await app.request('/api/health', {}, testEnv)

    expect(response.status).toBe(200)

    const body = (await response.json()) as HealthResponse
    expect(body.status).toBe('ok')
    expect(body.database.connected).toBe(true)
    expect(body.database.latencyMs).toBeGreaterThanOrEqual(0)
  })
})
