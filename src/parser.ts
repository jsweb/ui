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
  for (const child of children) cleanupTree(child)
}

export function createContext(scope: any, context: Context = {}): Context {
  const reactiveScope = scope._isReactive ? scope : reactive(scope)

  return new Proxy(reactiveScope, {
    get(target, prop) {
      if (prop === '_isContext') return true
      if (prop in target) return Reflect.get(target, prop, target)
      if (prop in context) {
        return Reflect.get(context, prop, context)
      }
      return Reflect.get(target, prop, target)
    },
    set(target, prop, value) {
      if (prop in target) return Reflect.set(target, prop, value, target)
      if (prop in context) {
        return Reflect.set(context, prop, value, context)
      }
      return Reflect.set(target, prop, value, target)
    },
    has(target, prop) {
      if (prop in target) return true
      if (prop in context) return true
      return false
    },
  })
}

export function parseNode(node: Node, context: Context) {
  if (node.nodeType !== Node.ELEMENT_NODE) return

  const el = node as HTMLElement
  const scope = processScope(el, context)
  if (!scope) return

  const forAttrs = ['ui:for', ':for']
  const forDirective = getDirectiveValue(el, forAttrs)
  if (forDirective) {
    removeDirectiveAttributes(el, forAttrs)
    processFor(el, forDirective, scope)
    return
  }

  const ifAttrs = ['ui:if', ':if']
  const ifDirective = getDirectiveValue(el, ifAttrs)
  if (ifDirective) {
    removeDirectiveAttributes(el, ifAttrs)
    processIf(el, ifDirective, scope)
  }

  processAttributes(el, scope)

  const children = Array.from(el.childNodes)
  for (const child of children) parseNode(child, scope)
}

export function createScope(
  selectorOrElement: string | HTMLElement,
  context: Context = {},
) {
  const el =
    typeof selectorOrElement === 'string'
      ? document.querySelector(selectorOrElement)
      : selectorOrElement

  if (el) {
    if (!context.$emit) {
      context.$emit = (eventName: string, detail?: any) => {
        el.dispatchEvent(
          new CustomEvent(eventName, { detail, bubbles: true, composed: true }),
        )
      }
    }

    parseNode(el, context)
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

  const scope = evaluate(directive, context)
  if (!scope) return undefined

  removeDirectiveAttributes(el, attrs)

  if (!scope.$emit) {
    scope.$emit = (event: string, detail?: any) => {
      el.dispatchEvent(
        new CustomEvent(event, { detail, bubbles: true, composed: true }),
      )
    }
  }

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
  const keyDirective = getDirectiveValue(el, keyAttr)
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

      if (keyDirective) {
        const tempContext = createContext(scope, context)
        key = evaluate(keyDirective, tempContext)
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
      el.removeAttribute(name)
    } else if (isTwoWayBind) {
      processTwoWayBinding(el, value, context)
      el.removeAttribute(name)
    } else if (isAttrBind) {
      const bound = name.split(':').pop()!
      if (bound === 'class') {
        processClassBinding(el, value, context)
      } else if (bound === 'style') {
        processStyleBinding(el, value, context)
      } else {
        processAttrBinding(el, bound, value, context)
      }
      el.removeAttribute(name)
    } else if (isEvent) {
      processEventBinding(el, name, value, context)
      el.removeAttribute(name)
    }
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
    const target = isCheckbox ? 'checked' : 'value'
    const value = `$event.target.${target}`
    evaluateEvent($event, `${expr} = ${value}`, context)
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

function processClassBinding(el: HTMLElement, expr: string, context: Context) {
  let oldClasses = new Set<string>()

  bindEffect(el, () => {
    const val = evaluate(expr, context)
    const newClasses = new Set<string>()
    const addClass = (c: string) => c && newClasses.add(c)
    const addClasses = (c: string) => c.split(/\s+/).forEach(addClass)

    if (typeof val === 'string') addClasses(val)
    else if (Array.isArray(val)) {
      val.flat().forEach((c: any) => {
        if (typeof c === 'string') addClasses(c)
      })
    } else if (typeof val === 'object' && val !== null) {
      Object.entries(val).forEach(([c, condition]: [string, any]) => {
        if (condition) addClasses(c)
      })
    }

    oldClasses.forEach((c) => {
      if (!newClasses.has(c)) el.classList.remove(c)
    })
    newClasses.forEach((c) => {
      if (!oldClasses.has(c)) el.classList.add(c)
    })

    oldClasses = newClasses
  })
}

function processStyleBinding(el: HTMLElement, expr: string, context: Context) {
  let oldStyles: Record<string, any> = {}

  bindEffect(el, () => {
    const val = evaluate(expr, context)
    const newStyles = typeof val === 'object' && val !== null ? val : {}

    for (const key in oldStyles) {
      if (!(key in newStyles)) {
        ;(el.style as any)[key] = ''
      }
    }

    for (const key in newStyles) {
      if (oldStyles[key] !== newStyles[key]) {
        ;(el.style as any)[key] = newStyles[key]
      }
    }

    oldStyles = { ...newStyles }
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

    evaluateEvent($event, expr, context)
  }

  target.addEventListener(name, handler)

  if (isOutside) {
    const bNode = el as BoundNode
    bNode._effects ??= []
    bNode._effects.push(() => target.removeEventListener(name, handler))
  }
}
