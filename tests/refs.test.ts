import { describe, expect, it } from 'vitest'
import { reactive } from '../src/index'
import { mount } from './helpers/mount'

describe('referências ($refs)', () => {
  it('registra um ref simples e remove o atributo da diretiva', () => {
    const state = reactive({})
    const { host, dispose } = mount(
      `<input id="name" :ref="'name'" />
       <span id="long" ui:ref="'long'"></span>`,
      state,
    )

    expect(state.$refs.get('name')).toBe(host.querySelector('#name'))
    expect(state.$refs.get('long')).toBe(host.querySelector('#long'))
    expect(host.querySelector('#name')?.hasAttribute(':ref')).toBe(false)
    expect(host.querySelector('#long')?.hasAttribute('ui:ref')).toBe(false)

    dispose()
    expect(state.$refs.has('name')).toBe(false)
    expect(state.$refs.has('long')).toBe(false)
  })

  it('agrupa refs de listas em um Map por chave', () => {
    const state = reactive({
      items: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
    })
    const { host } = mount(
      `<ul>
        <li :for="item of items" :key="item.id">
          <input class="field" :ref="'field'" />
          <span :text="item.name"></span>
        </li>
      </ul>`,
      state,
    )
    const fields = host.querySelectorAll<HTMLInputElement>('.field')
    const group = state.$refs.get('field')

    expect(group).toBeInstanceOf(Map)
    expect(group.get(1)).toBe(fields[0])
    expect(group.get(2)).toBe(fields[1])

    state.items.splice(0, 1)

    expect(group.get(1)).toBeUndefined()
    expect(group.get(2)).toBe(host.querySelector('.field'))
  })

  it('limpa refs de listas quando todos os itens são removidos', () => {
    const state = reactive({ items: [{ id: 1 }, { id: 2 }] })
    const { dispose } = mount(
      `<div :for="item of items" :key="item.id" :ref="'row'"></div>`,
      state,
    )

    expect(state.$refs.get('row')).toBeInstanceOf(Map)
    expect(state.$refs.get('row').size).toBe(2)

    state.items.splice(0, 2)

    expect(state.$refs.has('row')).toBe(false)

    dispose()
  })
})
