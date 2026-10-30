import { describe, expect, it } from 'vitest'
import { reactive } from '../src/index'
import { mount } from './helpers/mount'

interface Item {
  id: number
  name: string
}

const a: Item = { id: 1, name: 'a' }
const b: Item = { id: 2, name: 'b' }
const c: Item = { id: 3, name: 'c' }

function setup(items: Item[]) {
  const state = reactive({ items: items.map((item) => ({ ...item })) })
  const result = mount(
    `<ul>
      <li class="row" :for="item of items" :key="item.id">
        <span class="name" :text="item.name"></span>
        <span class="index" :text="$index"></span>
        <span class="key" :text="$key"></span>
      </li>
    </ul>`,
    state,
  )

  const rows = () => Array.from(result.host.querySelectorAll('.row'))
  const names = () =>
    rows().map((row) => row.querySelector('.name')?.textContent)
  const indexes = () =>
    rows().map((row) => row.querySelector('.index')?.textContent)
  const keys = () => rows().map((row) => row.querySelector('.key')?.textContent)

  return { ...result, state, rows, names, indexes, keys }
}

describe('listas (:for)', () => {
  it('renderiza a lista inicial com $index e $key', () => {
    const { names, indexes, keys } = setup([a, b])

    expect(names()).toEqual(['a', 'b'])
    expect(indexes()).toEqual(['0', '1'])
    expect(keys()).toEqual(['1', '2'])
  })

  it('aceita as sintaxes "of" e "in"', () => {
    const ofState = reactive({ items: [a, b] })
    const ofResult = mount(
      `<ul><li class="row" :for="item of items" :text="item.name"></li></ul>`,
      ofState,
    )
    expect(
      Array.from(ofResult.host.querySelectorAll('.row')).map(
        (row) => row.textContent,
      ),
    ).toEqual(['a', 'b'])

    const inState = reactive({ items: [c] })
    const inResult = mount(
      `<ul><li class="row" ui:for="item in items" :text="item.name"></li></ul>`,
      inState,
    )
    expect(
      Array.from(inResult.host.querySelectorAll('.row')).map(
        (row) => row.textContent,
      ),
    ).toEqual(['c'])
  })

  it('atualiza apenas o item alterado', () => {
    const { state, names } = setup([a, b])

    state.items[1].name = 'B'

    expect(names()).toEqual(['a', 'B'])
  })

  it('reaproveita os nós ao reordenar pelo :key', () => {
    const { state, rows, names, indexes, keys } = setup([a, b, c])
    const first = rows()[0]
    const third = rows()[2]

    state.items.reverse()

    expect(names()).toEqual(['c', 'b', 'a'])
    expect(indexes()).toEqual(['0', '1', '2'])
    expect(keys()).toEqual(['3', '2', '1'])
    expect(rows()[0]).toBe(third)
    expect(rows()[2]).toBe(first)
  })

  it('adiciona e remove itens com push e pop', () => {
    const { state, names, keys } = setup([a, b])

    state.items.push({ id: 4, name: 'd' })
    expect(names()).toEqual(['a', 'b', 'd'])
    expect(keys()).toEqual(['1', '2', '4'])

    state.items.pop()
    expect(names()).toEqual(['a', 'b'])
  })

  it.each([
    [
      'splice(0, 1)',
      [a, b, c],
      (items: Item[]) => items.splice(0, 1),
      ['b', 'c'],
    ],
    ['shift()', [a, b, c], (items: Item[]) => items.shift(), ['b', 'c']],
    [
      'unshift(a)',
      [b, c],
      (items: Item[]) => items.unshift(a),
      ['a', 'b', 'c'],
    ],
    [
      'sort(por id)',
      [c, a, b],
      (items: Item[]) => items.sort((left, right) => left.id - right.id),
      ['a', 'b', 'c'],
    ],
    [
      'reverse()',
      [a, b, c],
      (items: Item[]) => items.reverse(),
      ['c', 'b', 'a'],
    ],
  ])('reconcilia mutadores de array: %s', (_label, input, mutate, expected) => {
    const { state, names } = setup(input.map((item) => ({ ...item })))

    mutate(state.items)

    expect(names()).toEqual(expected)
    expect(names()).toHaveLength(expected.length)
  })

  it('reconcilia fill e copyWithin sem deixar nós órfãos', () => {
    const fill = setup([a, b, c].map((item) => ({ ...item })))
    fill.state.items.fill({ id: 9, name: 'x' }, 1)

    expect(fill.names()).toEqual(['a', 'x', 'x'])
    expect(fill.names()).toHaveLength(3)

    const copy = setup(
      [a, b, c, { id: 4, name: 'd' }].map((item) => ({ ...item })),
    )
    copy.state.items.copyWithin(0, 2)

    expect(copy.names()).toEqual(['c', 'd', 'c', 'd'])
    expect(copy.names()).toHaveLength(4)
  })

  it('tolera chaves duplicadas transitórias e remove nós órfãos', () => {
    const { state, names } = setup([
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ])

    state.items[1] = { id: 1, name: 'a2' }
    expect(names()).toEqual(['a', 'a2'])

    state.items[1] = { id: 2, name: 'b' }
    expect(names()).toEqual(['a', 'b'])
  })

  it('encerra os efeitos dos itens removidos', () => {
    const { state, rows, names } = setup([
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ])
    const removed = state.items[1]
    const removedRow = rows()[1]

    state.items.splice(1, 1)
    expect(names()).toEqual(['a'])

    removed.name = 'alterado'

    expect(removedRow.querySelector('.name')?.textContent).toBe('b')
  })

  it('limpa a lista quando o valor não é um array', () => {
    const { state, names } = setup([a, b])

    ;(state as Record<string, any>).items = null
    expect(names()).toEqual([])
    ;(state as Record<string, any>).items = [c]
    expect(names()).toEqual(['c'])
  })
})
