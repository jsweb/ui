import { createScope } from '../../src/index'
import { cleanupTree } from '../../src/parser'

let disposers: Array<() => void> = []

export interface MountResult {
  host: HTMLDivElement
  dispose: () => void
}

/**
 * Monta um fragmento HTML em um host isolado e registra a limpeza automática
 * dos efeitos entre os testes.
 */
export function mount(
  html: string,
  state: Record<string, any> = {},
): MountResult {
  const host = document.createElement('div')
  host.innerHTML = html
  document.body.append(host)

  createScope(host, state)

  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    cleanupTree(host)
    host.remove()
  }

  disposers.push(dispose)
  return { host, dispose }
}

export function cleanupMounts() {
  const pending = disposers
  disposers = []

  for (const dispose of pending.reverse()) {
    dispose()
  }

  document.body.innerHTML = ''
}
