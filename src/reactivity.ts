let activeEffect: (() => void) | null = null
const targetMap = new WeakMap<object, Map<string | symbol, Set<() => void>>>()

export function effect(fn: () => void) {
  const effectFn = () => {
    // cleanup old deps could be added here
    activeEffect = effectFn
    fn()
    activeEffect = null
  }
  effectFn()
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
    dep.add(activeEffect)
  }
}

export function trigger(target: object, key: string | symbol) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  const dep = depsMap.get(key)
  if (dep) {
    dep.forEach((effectFn) => effectFn())
  }
}

export function reactive<T extends object>(target: T): T {
  if (typeof target !== 'object' || target === null) return target
  if ((target as any).__isReactive) return target

  return new Proxy(target, {
    get(obj, key, receiver) {
      if (key === '__isReactive') return true
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
      const hadKey = isArray && String(Number(key)) === key 
        ? Number(key) < obj.length 
        : Object.prototype.hasOwnProperty.call(obj, key)

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
}
