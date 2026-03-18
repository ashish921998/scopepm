import { beforeEach, describe, expect, it, vi } from 'vitest'
import { configureLogger, logger } from '../lib/logger'

describe('logger', () => {
  beforeEach(() => {
    configureLogger({ isProduction: true, minLevel: 'info' })
    vi.restoreAllMocks()
  })

  it('does not throw on unserializable payloads in production mode', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const circular: Record<string, unknown> = {}
    circular.self = circular

    expect(() => {
      logger.error('Failed to serialize', circular)
    }).not.toThrow()

    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy.mock.calls[0][0]).toContain('"unserializable_data":true')
  })

  it('respects runtime production configuration', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    configureLogger({ isProduction: false })
    logger.info('Readable log', { feature: 'projects' })

    expect(infoSpy).toHaveBeenCalledTimes(1)
    expect(infoSpy.mock.calls[0][0]).toContain('[INFO] Readable log')
  })
})
