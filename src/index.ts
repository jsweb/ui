import { reactive, effect, track, trigger } from './reactivity'
import { evaluate, evaluateEvent } from './evaluator'
import { createScope, parseNode } from './parser'

export {
  reactive,
  effect,
  track,
  trigger,
  evaluate,
  evaluateEvent,
  createScope,
  parseNode,
}

if (typeof window !== 'undefined') {
  const w = window as any
  w.jsweb = w.jsweb || {}
  w.jsweb.ui = {
    createScope,
    reactive,
    effect,
    track,
    trigger,
    evaluate,
    evaluateEvent,
    parseNode,
  }
}
