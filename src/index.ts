import { reactive, effect, track, trigger } from './reactivity'
import { evaluate, evaluateEvent } from './evaluator'
import { createComponent, parseNode } from './parser'

export {
  reactive,
  effect,
  track,
  trigger,
  evaluate,
  evaluateEvent,
  createComponent,
  parseNode,
}

if (typeof window !== 'undefined') {
  const w = window as any
  w.jsweb = w.jsweb || {}
  w.jsweb.ui = {
    createComponent,
    reactive,
    effect,
    track,
    trigger,
    evaluate,
    evaluateEvent,
    parseNode,
  }
}
