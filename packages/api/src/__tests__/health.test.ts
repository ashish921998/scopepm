import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'

describe('GET / — health check', () => {
  it('returns 200 with status ok', async () => {
    const app = new Hono()
    app.get('/', (c) => c.json({ status: 'ok', service: 'scopepm-api' }))

    const res = await app.request('/')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.service).toBe('scopepm-api')
  })
})
