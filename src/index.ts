import { reactive, watch, Scope, type ScopeContext } from './reactivity'
import { createScope, type Context } from './parser'

export { reactive, watch, createScope, Scope }
export type { ScopeContext, Context }

if (typeof window !== 'undefined') {
  const w = window as any
  w.jsweb = w.jsweb || {}
  w.jsweb.ui = { createScope, reactive, watch, Scope }
}
