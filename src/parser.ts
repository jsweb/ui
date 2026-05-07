import { effect, reactive } from './reactivity'
import { evaluate, evaluateEvent } from './evaluator'

export type Context = Record<string, any>

interface BoundNode extends Node {
  _effects?: Array<() => void>
}

export function cleanupTree(node: Node) {
  const bNode = node as BoundNode
  if (bNode._effects) {
    bNode._effects.forEach((stop) => stop())
    bNode._effects = []
  }
  const children = Array.from(node.childNodes)
  for (const child of children) {
    cleanupTree(child)
  }
}

export function createContext(
  scope: any,
  context: Context | null = null,
): Context {
  const reactiveScope = scope._isReactive ? scope : reactive(scope)

  return new Proxy(reactiveScope, {
    get(target, prop) {
      if (prop === '_isContext') return true
      if (prop in target) return Reflect.get(target, prop, target)
      if (context && prop in context) {
        return Reflect.get(context, prop, context)
      }
      return Reflect.get(target, prop, target)
    },
    set(target, prop, value) {
      if (prop in target) return Reflect.set(target, prop, value, target)
      if (context && prop in context) {
        return Reflect.set(context, prop, value, context)
      }
      return Reflect.set(target, prop, value, target)
    },
    has(target, prop) {
      if (prop in target) return true
      if (context && prop in context) return true
      return false
    },
  })
}

export function parseNode(node: Node, context: Context) {
  if (node.nodeType !== Node.ELEMENT_NODE) return

  const el = node as HTMLElement
  const currentContext = processScope(el, context)

  const forAttr = getDirectiveValue(el, ['ui:for', ':for'])
  if (forAttr) {
    removeDirectiveAttributes(el, ['ui:for', ':for'])
    processFor(el, forAttr, currentContext)
    return
  }

  const ifAttr = getDirectiveValue(el, ['ui:if', ':if'])
  if (ifAttr) {
    removeDirectiveAttributes(el, ['ui:if', ':if'])
    processIf(el, ifAttr, currentContext)
  }

  processAttributes(el, currentContext)

  const children = Array.from(el.childNodes)
  for (const child of children) {
    parseNode(child, currentContext)
  }
}

export function createComponent(
  selectorOrElement: string | HTMLElement,
  rootContext: Context = {},
) {
  const el =
    typeof selectorOrElement === 'string'
      ? document.querySelector(selectorOrElement)
      : selectorOrElement

  if (el) {
    parseNode(el, rootContext)
  } else {
    console.warn('[jsweb/ui] Element not found:', selectorOrElement)
  }
}

function bindEffect(node: Node, fn: () => void) {
  const e = effect(fn)
  const bNode = node as BoundNode
  bNode._effects ??= []
  bNode._effects.push(e.stop)
}

function getDirectiveValue(el: HTMLElement, names: string[]) {
  for (const name of names) {
    const value = el.getAttribute(name)
    if (value !== null) return value
  }
  return null
}

function removeDirectiveAttributes(el: HTMLElement, names: string[]) {
  for (const name of names) {
    el.removeAttribute(name)
  }
}

function processScope(el: HTMLElement, context: Context) {
  const attrs = ['ui:scope', ':scope']
  const directive = getDirectiveValue(el, attrs)
  if (!directive) return context

  const scope = evaluate(directive, context) || {}
  removeDirectiveAttributes(el, attrs)
  return createContext(scope, context)
}

function processFor(el: HTMLElement, expr: string, context: Context) {
  const parent = el.parentNode
  if (!parent) return

  const match = /^\s*(.+)\s+(?:in|of)\s+(.+)\s*$/.exec(expr)
  if (!match) {
    return console.warn(`[jsweb/ui] Invalid ui:for expression: ${expr}`)
  }
  const [, itemName, listName] = match

  const keyAttr = ['ui:key', ':key']
  const keyExpr = getDirectiveValue(el, keyAttr)
  removeDirectiveAttributes(el, keyAttr)

  const uuid = crypto.randomUUID()
  const comment = document.createComment(` ui:for ${uuid} `)
  el.replaceWith(comment)

  interface RenderedNode {
    key: any
    el: HTMLElement
    scope: any
  }
  let renderedNodes: RenderedNode[] = []

  bindEffect(comment, () => {
    const list = evaluate(listName, context)

    if (!Array.isArray(list)) {
      renderedNodes.forEach((node) => {
        node.el.remove()
        cleanupTree(node.el)
      })
      renderedNodes = []
      return
    }

    const newNodes: RenderedNode[] = []
    const oldNodesByKey = new Map<any, RenderedNode>()
    renderedNodes.forEach((node) => oldNodesByKey.set(node.key, node))

    list.forEach((item, index) => {
      const scope = { [itemName]: item, $index: index }
      let key: any = index

      if (keyExpr) {
        const tempContext = createContext(scope, context)
        key = evaluate(keyExpr, tempContext)
      }

      let node = oldNodesByKey.get(key)
      if (node) {
        // Reuse node
        node.scope[itemName] = item
        node.scope.$index = index
        oldNodesByKey.delete(key)
      } else {
        // Create new node
        const clone = el.cloneNode(true) as HTMLElement
        const reactiveScope = reactive(scope)
        const localContext = createContext(reactiveScope, context)
        parseNode(clone, localContext)
        node = { key, el: clone, scope: reactiveScope }
      }

      newNodes.push(node)
    })

    // Remove un-reused nodes
    oldNodesByKey.forEach((node) => {
      node.el.remove()
      cleanupTree(node.el)
    })

    // Reorder and insert new DOM nodes
    let currentAnchor = comment.nextSibling
    newNodes.forEach((node) => {
      if (currentAnchor === node.el) {
        currentAnchor = currentAnchor.nextSibling
      } else {
        comment.parentNode?.insertBefore(node.el, currentAnchor)
      }
    })

    renderedNodes = newNodes
  })
}

function processIf(el: HTMLElement, expr: string, context: Context) {
  const parent = el.parentNode
  if (!parent) return

  const uuid = crypto.randomUUID()
  const comment = document.createComment(` ui:if ${uuid} `)
  el.before(comment)

  bindEffect(comment, () => {
    const val = evaluate(expr, context)
    if (val) {
      if (!el.parentNode) {
        comment.parentNode?.insertBefore(el, comment.nextSibling)
      }
    } else if (el.parentNode) {
      el.remove()
    }
  })
}

function processAttributes(el: HTMLElement, context: Context) {
  const attrs = Array.from(el.attributes)

  for (const attr of attrs) {
    const { name, value } = attr
    const isText = ['ui:text', ':text'].includes(name)
    const isTwoWayBind = ['ui:bind', ':bind'].includes(name)
    const isAttrBind = name.startsWith('ui:') || name.startsWith(':')
    const isEvent = name.startsWith('ui@') || name.startsWith('@')

    if (isText) {
      processTextBinding(el, value, context)
    } else if (isTwoWayBind) {
      processTwoWayBinding(el, value, context)
    } else if (isAttrBind) {
      const bound = name.split(':').pop()!
      processAttrBinding(el, bound, value, context)
    } else if (isEvent) {
      processEventBinding(el, name, value, context)
    }

    el.removeAttribute(name)
  }
}

function processTextBinding(el: HTMLElement, expr: string, context: Context) {
  bindEffect(el, () => {
    const val = evaluate(expr, context)
    el.textContent = val !== undefined && val !== null ? String(val) : ''
  })
}

function processTwoWayBinding(el: HTMLElement, expr: string, context: Context) {
  const isCheckbox = el instanceof HTMLInputElement && el.type === 'checkbox'
  const isRadio = el instanceof HTMLInputElement && el.type === 'radio'

  // 1. Reactive state to DOM
  bindEffect(el, () => {
    const val = evaluate(expr, context)
    if (isCheckbox) {
      el.checked = !!val
    } else if (isRadio) {
      el.checked = el.value === String(val)
    } else {
      const target = el as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
      target.value = val == null ? '' : String(val)
    }
  })

  // 2. DOM to Reactive state
  const isChange = isCheckbox || isRadio || el instanceof HTMLSelectElement
  const eventName = isChange ? 'change' : 'input'
  el.addEventListener(eventName, ($event) => {
    if (isCheckbox) {
      evaluateEvent(`${expr} = $event.target.checked`, context, $event)
    } else {
      evaluateEvent(`${expr} = $event.target.value`, context, $event)
    }
  })
}

function processAttrBinding(
  el: HTMLElement,
  attr: string,
  expr: string,
  context: Context,
) {
  bindEffect(el, () => {
    const val = evaluate(expr, context)
    if (val === null || val === undefined || val === false) {
      el.removeAttribute(attr)
    } else if (val === true) {
      el.setAttribute(attr, '')
    } else {
      el.setAttribute(attr, String(val))
    }
  })
}

function processEventBinding(
  el: HTMLElement,
  evt: string,
  expr: string,
  context: Context,
) {
  const refs = evt.split('@').pop()!
  const [name, ...modifiers] = refs.split('.')

  const isOutside = modifiers.includes('outside')
  const target = isOutside ? document : el

  const handler: EventListener = ($event: Event) => {
    if (!el.isConnected) return

    const isTargetNode = $event.target instanceof Node

    if (isOutside && isTargetNode && el.contains($event.target)) return
    if (modifiers.includes('self') && $event.target !== el) return

    if (modifiers.includes('prevent')) $event.preventDefault()
    if (modifiers.includes('stop')) $event.stopPropagation()

    evaluateEvent(expr, context, $event)
  }

  target.addEventListener(name, handler)

  if (isOutside) {
    const bNode = el as BoundNode
    bNode._effects ??= []
    bNode._effects.push(() => target.removeEventListener(name, handler))
  }
}
