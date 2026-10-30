import { afterEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import { cleanupMounts } from './helpers/mount'

const cryptoObject = globalThis.crypto

if (cryptoObject && typeof cryptoObject.randomUUID !== 'function') {
  Object.defineProperty(cryptoObject, 'randomUUID', {
    configurable: true,
    value: randomUUID,
  })
} else if (!cryptoObject) {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { randomUUID },
  })
}

afterEach(() => {
  cleanupMounts()
})
