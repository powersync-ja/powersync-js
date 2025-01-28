import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PowerSyncDatabase, SharedWebStreamingSyncImplementation, WebStreamingSyncImplementation } from '../../../src'
import { SSRStreamingSyncImplementation } from '../../../src/db/sync/SSRWebStreamingSyncImplementation'
import { testSchema } from '../../utils/testDb'

vi.mock('../../../src/db/sync/WebStreamingSyncImplementation')
vi.mock('../../../src/db/sync/SharedWebStreamingSyncImplementation')
vi.mock('../../../src/db/sync/SSRWebStreamingSyncImplementation')

describe('PowerSyncDatabase - generateSyncStreamImplementation', () => {
  const mockConnector = {
    uploadData: vi.fn(),
    fetchCredentials: vi.fn()
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('uses SSRStreamingSyncImplementation when ssrMode is true', async () => {
    // This is to prevent a false positive from the unhandled rejection
    // of using SSR in this test.
    const handler = (event: PromiseRejectionEvent) => {
      event.preventDefault()
    }
    window.addEventListener('unhandledrejection', handler)

    const db = new PowerSyncDatabase({
      schema: testSchema,
      database: {
        dbFilename: 'test.db'
      },
      flags: {
        ssrMode: true,
      },
      retryDelayMs: 1000,
      crudUploadThrottleMs: 2000
    })

    db['generateSyncStreamImplementation'](mockConnector, { retryDelayMs: 1000, crudUploadThrottleMs: 2000 })
    expect(SSRStreamingSyncImplementation).toHaveBeenCalled()

    await setTimeout(() => window.removeEventListener('unhandledrejection', handler), 1)
  })

  it('uses SharedWebStreamingSyncImplementation when enableMultiTabs is true', () => {
    const db = new PowerSyncDatabase({
      schema: testSchema,
      database: { dbFilename: 'test.db' },
      flags: { enableMultiTabs: true }
    })
    db['generateSyncStreamImplementation'](mockConnector, { retryDelayMs: 1000, crudUploadThrottleMs: 2000 })
    expect(SharedWebStreamingSyncImplementation).toHaveBeenCalled()
  })

  it('handles option overrides', () => {
    const db = new PowerSyncDatabase({
      schema: testSchema,
      database: {
        dbFilename: 'test.db'
      },
      flags: {
        ssrMode: false,
        enableMultiTabs: false,
      },
      retryDelayMs: 1000,
      crudUploadThrottleMs: 1000
    })

    db['generateSyncStreamImplementation'](mockConnector, { crudUploadThrottleMs: 20000, retryDelayMs: 50000 })
    expect(WebStreamingSyncImplementation).toHaveBeenCalledWith(
      expect.objectContaining({
        retryDelayMs: 50000,
        crudUploadThrottleMs: 20000
      })
    )
  })

  // This test can be removed once retryDelay is removed and entirely replaced with retryDelayMs
  it('works when using deprecated retryDelay instead of retryDelayMs', async () => {
    const db = new PowerSyncDatabase({
      schema: testSchema,
      database: {
        dbFilename: 'test.db'
      },
      flags: {
        ssrMode: false,
        enableMultiTabs: false,
      },
      retryDelay: 11100,
    })

    db['generateSyncStreamImplementation'](mockConnector, { crudUploadThrottleMs: 2000, retryDelayMs: 50000 })
    expect(WebStreamingSyncImplementation).toHaveBeenCalledWith(
      expect.objectContaining({
        retryDelay: 11100,
      })
    )
  })
})
