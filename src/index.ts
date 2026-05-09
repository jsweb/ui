import { reactive, watch } from './reactivity'
import { createScope } from './parser'

export { reactive, watch, createScope }

if (typeof window !== 'undefined') {
  const w = window as any
  w.jsweb = w.jsweb || {}
  w.jsweb.ui = { createScope, reactive, watch }
}
