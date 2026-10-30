import { describe, expect, it } from 'vitest'
import { effect, reactive, Scope, watch } from '../src/reactivity'

describe('reatividade', () => {
  it('cria proxy profundo e reage a propriedades aninhadas', () => {
    const state = reactive({ user: { name: 'Ada' } })
    const seen: string[] = []
    const stop = watch(
      () => state.user.name,
      (value) => seen.push(value),
    )

    state.user.name = 'Grace'

    expect(seen).toEqual(['Grace'])
    stop()
  })

  it('suporta propriedades computadas via getters nativos', () => {
    const state = reactive({
      count: 1,
      get double() {
        return this.count * 2
      },
    })
    const seen: number[] = []
    const stop = watch(
      () => state.double,
      (value) => seen.push(value),
    )

    state.count = 4

    expect(seen).toEqual([8])
    stop()
  })

  it('observa profundamente quando recebe o objeto reativo diretamente', () => {
    const state = reactive({ nested: { value: 1 } })
    const seen: number[] = []
    const stop = watch(state, (value) => seen.push(value.nested.value))

    state.nested.value = 2

    expect(seen).toEqual([2])
    stop()
  })

  it('suporta immediate e retorna uma função de cancelamento', () => {
    const state = reactive({ count: 0 })
    const calls: Array<[number, number | undefined]> = []
    const stop = watch(
      () => state.count,
      (value, oldValue) => calls.push([value, oldValue]),
      { immediate: true },
    )

    expect(calls).toEqual([[0, undefined]])

    state.count = 1
    stop()
    state.count = 2

    expect(calls).toEqual([
      [0, undefined],
      [1, 0],
    ])
  })

  it('stop encerra um efeito e limpa suas dependências', () => {
    const state = reactive({ count: 0 })
    let calls = 0
    const runner = effect(() => {
      state.count
      calls++
    })

    state.count = 1
    expect(calls).toBe(2)

    runner.stop()
    state.count = 2
    expect(calls).toBe(2)
  })

  it('agrupa mutações de array e notifica apenas o estado final', () => {
    const state = reactive({ items: [1, 2, 3] })
    const snapshots: number[][] = []
    const stop = watch(
      () => state.items.map((value) => value * 2),
      (values) => snapshots.push([...values]),
    )

    state.items.splice(0, 1)
    state.items.push(4)

    expect(snapshots).toEqual([
      [4, 6],
      [4, 6, 8],
    ])
    stop()
  })

  it('preserva o rastreamento do efeito externo após efeitos aninhados', () => {
    const state = reactive({ first: 0, second: 0, inner: 0 })
    let outerRuns = 0
    let innerStop: { stop: () => void } | undefined

    const outerStop = effect(() => {
      outerRuns++
      state.first
      innerStop?.stop()
      innerStop = effect(() => {
        state.inner
      })
      state.second
    })

    expect(outerRuns).toBe(1)

    state.second = 1
    expect(outerRuns).toBe(2)

    outerStop.stop()
    innerStop?.stop()
  })

  it('ignora e retorna os mesmos valores para tipos não reativos', () => {
    const map = new Map()
    const set = new Set()
    const date = new Date()
    const node = document.createElement('div')

    expect(reactive(map)).toBe(map)
    expect(reactive(set)).toBe(set)
    expect(reactive(date)).toBe(date)
    expect(reactive(node)).toBe(node)
  })

  it('reaproveita o proxy do mesmo alvo', () => {
    const raw = { value: 1 }
    const proxy = reactive(raw)

    expect(reactive(raw)).toBe(proxy)
    expect((proxy as any)._isReactive).toBe(true)
  })

  it('não dispara quando o valor não muda e dispara para novas chaves', () => {
    const state = reactive<{ count: number; next?: string }>({ count: 0 })
    let countCalls = 0
    let nextCalls = 0

    const stopCount = watch(
      () => state.count,
      () => countCalls++,
    )
    const stopNext = watch(
      () => state.next,
      () => nextCalls++,
    )

    state.count = 0
    expect(countCalls).toBe(0)

    state.next = 'first'
    expect(nextCalls).toBe(1)

    stopCount()
    stopNext()
  })

  it('suporta classes que estendem Scope', () => {
    class Counter extends Scope {
      count = 0

      get double() {
        return this.count * 2
      }

      increment() {
        this.count++
      }
    }

    const state = reactive(new Counter())

    expect(state).toBeInstanceOf(Counter)
    expect(state.double).toBe(0)

    state.increment()

    expect(state.count).toBe(1)
    expect(state.double).toBe(2)
  })
})
