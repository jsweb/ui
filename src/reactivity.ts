let activeEffect: symbol | null = null
const targetMap = new WeakMap<
  object,
  Map<string | symbol, Set<ReactiveEffect>>
>()
const proxyMap = new WeakMap<object, any>()
const effectMap = new WeakMap<symbol, ReactiveEffect>()

/**
 * Mutações de array executam vários `set` internos (ex.: `splice` desloca
 * índices e depois ajusta `length`). Sem agrupamento, os efeitos rodam em
 * estados intermediários, nos quais chaves podem aparecer duplicadas.
 * Durante um método mutador, os disparos são coletados e executados uma única
 * vez ao final, já com o array em seu estado final.
 */
let batchDepth = 0
const pendingTriggers = new Map<object, Set<string | symbol>>()

const ARRAY_MUTATORS = new Set([
  'copyWithin',
  'fill',
  'pop',
  'push',
  'reverse',
  'shift',
  'sort',
  'splice',
  'unshift',
])
const arrayMutatorCache = new Map<string, (...args: any[]) => any>()

function getArrayMutator(method: string) {
  let wrapped = arrayMutatorCache.get(method)

  if (!wrapped) {
    wrapped = function (this: any[], ...args: any[]) {
      batchDepth++

      try {
        return (Array.prototype as any)[method].apply(this, args)
      } finally {
        batchDepth--
        if (batchDepth === 0) flushTriggers()
      }
    }

    arrayMutatorCache.set(method, wrapped)
  }

  return wrapped
}

function flushTriggers() {
  if (pendingTriggers.size === 0) return

  const pending = Array.from(pendingTriggers)
  pendingTriggers.clear()

  // Um mesmo efeito pode depender de várias chaves alteradas pela mutação.
  // Coletar em um Set garante uma única execução por efeito, já com o estado
  // final do array.
  const effects = new Set<ReactiveEffect>()

  for (const [target, keys] of pending) {
    const depsMap = targetMap.get(target)
    if (!depsMap) continue

    keys.forEach((key) => {
      depsMap.get(key)?.forEach((effect) => effects.add(effect))
    })
  }

  effects.forEach((effect) => effect.run())
}

export class ReactiveEffect {
  active = true
  deps: Set<Set<ReactiveEffect>> = new Set()

  constructor(public fn: () => void) {}

  run() {
    if (!this.active) return this.fn()

    this.cleanup()

    // Efeitos podem ser aninhados (ex.: um `:for` que parseia filhos com
    // bindings próprios). Restaurar o efeito anterior ao final é essencial
    // para que o efeito externo continue rastreando as dependências lidas
    // depois da execução do efeito interno.
    const previousEffect = activeEffect
    const currentEffect = Symbol()
    activeEffect = currentEffect
    effectMap.set(currentEffect, this)

    try {
      return this.fn()
    } finally {
      effectMap.delete(currentEffect)
      activeEffect = previousEffect
    }
  }

  stop() {
    if (this.active) {
      this.cleanup()
      this.active = false
    }
  }

  cleanup() {
    this.deps.forEach((dep) => dep.delete(this))
    this.deps.clear()
  }

  effect() {
    return {
      run: () => this.run(),
      stop: () => this.stop(),
    }
  }
}

export function effect(fn: () => void) {
  const ref = new ReactiveEffect(fn)
  ref.run()
  return ref.effect()
}

export function track(target: object, key: string | symbol) {
  if (activeEffect) {
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      depsMap = new Map()
      targetMap.set(target, depsMap)
    }

    let dep = depsMap.get(key)
    if (!dep) {
      dep = new Set()
      depsMap.set(key, dep)
    }

    const active = effectMap.get(activeEffect)
    if (active) {
      dep.add(active)
      active.deps.add(dep)
    }
  }
}

export function trigger(target: object, key: string | symbol) {
  if (batchDepth > 0) {
    let keys = pendingTriggers.get(target)
    if (!keys) {
      keys = new Set()
      pendingTriggers.set(target, keys)
    }
    keys.add(key)
    return
  }

  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const dep = depsMap.get(key)
  if (dep) {
    const effects = new Set(dep)
    effects.forEach((effect) => effect.run())
  }
}

export interface ScopeContext {
  /** Elemento DOM raiz associado ao escopo (somente leitura) */
  readonly $el: HTMLElement
  /** Map nativo indexando elementos referenciados via ui:ref / :ref (somente leitura) */
  readonly $refs: Map<string, any>
  /** Despacha CustomEvents nativos (bubbles: true, composed: true) */
  $emit: (event: string, detail?: any) => void
  /** Índice numérico da iteração atual em loops ui:for / :for */
  $index?: number
  /** Chave de identificação da iteração em loops ui:for / :for */
  $key?: any
}

export class Scope {
  /** Elemento DOM raiz ao qual o escopo foi acoplado (somente leitura) */
  declare readonly $el: HTMLElement

  /** Map nativo indexando elementos referenciados via ui:ref / :ref (somente leitura) */
  protected readonly $refs: Map<string, any> = new Map<string, any>()

  /** Despacha CustomEvents nativos (bubbles: true, composed: true) */
  protected $emit(event: string, detail?: any): void {
    const target = this.$el || (typeof window !== 'undefined' ? window : null)
    target?.dispatchEvent(
      new CustomEvent(event, { detail, bubbles: true, composed: true }),
    )
  }

  declare $index?: number
  declare $key?: any

  constructor(init?: Record<string, any>) {
    if (init && typeof init === 'object') {
      Object.assign(this, init)
    }
  }
}

export function reactive<T extends any[]>(target: T): T
export function reactive<T extends object>(
  target: T & ThisType<T & ScopeContext>,
): T & ScopeContext
export function reactive<T extends object>(target: T): any {
  const notObject = typeof target !== 'object' || target === null
  if (notObject) return target

  if (
    target instanceof Map ||
    target instanceof Set ||
    target instanceof WeakMap ||
    target instanceof WeakSet ||
    target instanceof Date ||
    target instanceof RegExp ||
    (typeof Node === 'function' && target instanceof Node)
  ) {
    return target
  }

  const isReactive = Object.hasOwn(target, '_isReactive')
  if (isReactive) return target

  const existingProxy = proxyMap.get(target)
  if (existingProxy) return existingProxy

  const proxy = new Proxy(target, {
    get(obj, key, receiver) {
      if (key === '_isReactive') return true
      track(obj, key)

      if (
        Array.isArray(obj) &&
        typeof key === 'string' &&
        ARRAY_MUTATORS.has(key) &&
        !Object.hasOwn(obj, key)
      ) {
        return getArrayMutator(key)
      }

      const res = Reflect.get(obj, key, receiver)
      // deep reactivity
      return typeof res === 'object' && res !== null ? reactive(res) : res
    },
    set(obj, key, value, receiver) {
      const isArray = Array.isArray(obj)
      const oldValue = Reflect.get(obj, key, receiver)
      const hadKey =
        isArray && String(Number(key)) === key
          ? Number(key) < obj.length
          : Object.hasOwn(obj, key)

      const result = Reflect.set(obj, key, value, receiver)

      if (!hadKey) {
        trigger(obj, key)
        if (isArray && key !== 'length') {
          trigger(obj, 'length')
        }
      } else if (oldValue !== value) {
        trigger(obj, key)
      }

      return result
    },
  })

  proxyMap.set(target, proxy)
  return proxy
}

export function traverse(value: any, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return value
  }
  seen.add(value)
  for (const key in value) {
    traverse(value[key], seen)
  }
  return value
}

export function watch<T>(
  source: (() => T) | any,
  cb: (newValue: T, oldValue: T | undefined) => void,
  options?: { immediate?: boolean },
): () => void {
  let oldValue: any
  let isFirstRun = true

  const getter = source instanceof Function ? source : () => traverse(source)

  const runner = effect(() => {
    const newValue = getter()

    if (isFirstRun) {
      isFirstRun = false
      oldValue = newValue
      if (options?.immediate) {
        cb(newValue, undefined)
      }
    } else {
      cb(newValue, oldValue)
      oldValue = newValue
    }
  })

  return runner.stop
}
