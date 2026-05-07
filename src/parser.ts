import { effect, reactive } from './reactivity'
import { evaluate, evaluateEvent } from './evaluator'

export type Context = Record<string, any>

export function createContext(scopeData: any, parentContext: Context | null = null): Context {
  const reactiveScope = scopeData.__isReactive ? scopeData : reactive(scopeData)
  
  return new Proxy(reactiveScope, {
    get(target, prop) {
      if (prop === '__isContext') return true
      if (prop in target) return Reflect.get(target, prop, target)
      if (parentContext && prop in parentContext) {
        return Reflect.get(parentContext, prop, parentContext)
      }
      return Reflect.get(target, prop, target)
    },
    set(target, prop, value) {
      if (prop in target) return Reflect.set(target, prop, value, target)
      if (parentContext && prop in parentContext) {
        return Reflect.set(parentContext, prop, value, parentContext)
      }
      return Reflect.set(target, prop, value, target)
    },
    has(target, prop) {
      if (prop in target) return true
      if (parentContext && prop in parentContext) return true
      return false
    }
  })
}

export function parseNode(node: Node, context: Context) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement

    // 1. Check for scope
    let currentContext = context
    const scopeAttr = el.getAttribute('ui:scope') || el.getAttribute(':scope')
    if (scopeAttr) {
      const scopeData = evaluate(scopeAttr, context) || {}
      currentContext = createContext(scopeData, context)
      el.removeAttribute('ui:scope')
      el.removeAttribute(':scope')
    }

    // 2. Check for ui:for (must be processed before children and other directives on same element)
    const forAttr = el.getAttribute('ui:for') || el.getAttribute(':for')
    if (forAttr) {
      el.removeAttribute('ui:for')
      el.removeAttribute(':for')
      processFor(el, forAttr, currentContext)
      return // Stop processing this node further, processFor handles clones
    }

    // 3. Check for ui:if
    const ifAttr = el.getAttribute('ui:if') || el.getAttribute(':if')
    if (ifAttr) {
      el.removeAttribute('ui:if')
      el.removeAttribute(':if')
      processIf(el, ifAttr, currentContext)
      // We continue processing children because the element might be shown
    }

    // 4. Other directives
    const attrs = Array.from(el.attributes)
    for (const attr of attrs) {
      const { name, value } = attr
      const isText = ['ui:text', ':text'].includes(name)
      const isTwoWayBind = ['ui:bind', ':bind'].includes(name)
      const isAttrBind = name.startsWith('ui:') || name.startsWith(':') 
      const isEvent = name.startsWith('ui@') || name.startsWith('@')

      if (isText) {
        el.removeAttribute(name)
        effect(() => {
          const val = evaluate(value, currentContext)
          el.textContent = val !== undefined && val !== null ? String(val) : ''
        })
      } else if (isTwoWayBind) {
        el.removeAttribute(name)
        processTwoWayBinding(el, value, currentContext)
      } else if (isAttrBind) {
        const boundAttr = name.split(':').pop()! 
        el.removeAttribute(name)
        effect(() => {
          const val = evaluate(value, currentContext)
          if (val === null || val === undefined || val === false) {
            el.removeAttribute(boundAttr)
          } else if (val === true) {
            el.setAttribute(boundAttr, '')
          } else {
            el.setAttribute(boundAttr, String(val))
          }
        })
      } else if (isEvent) {
        const eventName = name.split('@').pop()!
        el.removeAttribute(name)
        el.addEventListener(eventName, ($event) => {
          evaluateEvent(value, currentContext, $event)
        })
      }
    }

    // Process children
    // Need to convert to array because childNodes might mutate if elements are added/removed
    const children = Array.from(el.childNodes)
    for (const child of children) {
      parseNode(child, currentContext)
    }
  }
}

function processIf(el: HTMLElement, expr: string, context: Context) {
  const parent = el.parentNode
  if (!parent) return

  const uuid = crypto.randomUUID()
  const comment = document.createComment(` ui:if ${uuid} `)
  parent.insertBefore(comment, el)

  effect(() => {
    const val = evaluate(expr, context)
    if (val) {
      if (!el.parentNode) {
        comment.parentNode?.insertBefore(el, comment.nextSibling)
      }
    } else {
      if (el.parentNode) {
        el.parentNode.removeChild(el)
      }
    }
  })
}

function processFor(el: HTMLElement, expr: string, context: Context) {
  const parent = el.parentNode
  if (!parent) return
  
  const match = expr.match(/^\s*(.+)\s+(?:in|of)\s+(.+)\s*$/)
  if (!match) {
    console.warn(`[jsweb/ui] Invalid ui:for expression: ${expr}`)
    return
  }
  const [, itemName, listName] = match
  
  const keyExpr = el.getAttribute('ui:key') || el.getAttribute(':key')
  el.removeAttribute('ui:key')
  el.removeAttribute(':key')
  
  const uuid = crypto.randomUUID()
  const comment = document.createComment(` ui:for ${uuid} `)
  parent.replaceChild(comment, el)
  
  type RenderedNode = {
    key: any
    el: HTMLElement
    scope: any
  }
  let renderedNodes: RenderedNode[] = []

  effect(() => {
    const list = evaluate(listName, context)

    if (!Array.isArray(list)) {
      renderedNodes.forEach(node => node.el.parentNode?.removeChild(node.el))
      renderedNodes = []
      return
    }

    const newNodes: RenderedNode[] = []
    const oldNodesByKey = new Map<any, RenderedNode>()
    renderedNodes.forEach(node => oldNodesByKey.set(node.key, node))

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
    oldNodesByKey.forEach(node => {
      node.el.parentNode?.removeChild(node.el)
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
    console.warn(`[jsweb/ui] Element not found: ${selectorOrElement}`)
  }
}

function processTwoWayBinding(el: HTMLElement, expr: string, context: Context) {
  const isCheckbox = el instanceof HTMLInputElement && el.type === 'checkbox'
  const isRadio = el instanceof HTMLInputElement && el.type === 'radio'
  
  // 1. Reactive state to DOM
  effect(() => {
    const val = evaluate(expr, context)
    if (isCheckbox) {
      const target = el as HTMLInputElement
      target.checked = !!val
    } else if (isRadio) {
      const target = el as HTMLInputElement
      target.checked = target.value === String(val)
    } else {
      const target = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
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
