let activeEffect: symbol | null = null
const targetMap = new WeakMap<
  object,
  Map<string | symbol, Set<ReactiveEffect>>
>()
const proxyMap = new WeakMap<object, any>()
const effectMap = new WeakMap<symbol, ReactiveEffect>()

export class ReactiveEffect {
  active = true
  deps: Set<Set<ReactiveEffect>> = new Set()

  constructor(public fn: () => void) {}

  run() {
    if (!this.active) return this.fn()

    this.cleanup()

    activeEffect = Symbol()
    effectMap.set(activeEffect, this)

    try {
      return this.fn()
    } finally {
      effectMap.delete(activeEffect)
      activeEffect = null
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

export function effect(fn: () => void): any {
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
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const dep = depsMap.get(key)
  if (dep) {
    const effects = new Set(dep)
    effects.forEach((effect) => effect.run())
  }
}

export function reactive<T extends object>(target: T): T {
  const notObject = typeof target !== 'object' || target === null
  if (notObject) return target

  const isReactive = Object.hasOwn(target, '_isReactive')
  if (isReactive) return target

  const existingProxy = proxyMap.get(target)
  if (existingProxy) return existingProxy

  const proxy = new Proxy(target, {
    get(obj, key, receiver) {
      if (key === '_isReactive') return true
      track(obj, key)
      const res = Reflect.get(obj, key, receiver)
      // deep reactivity
      if (typeof res === 'object' && res !== null) {
        return reactive(res)
      }
      return res
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
