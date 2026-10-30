import { describe, expect, it } from 'vitest'
import { reactive } from '../src/index'
import { mount } from './helpers/mount'

describe('ui-cloak', () => {
  it('oculta a raiz e remove o marcador após parsear a subárvore', () => {
    const state = reactive({ msg: 'hello' })
    const { host } = mount(
      `<div id="root" ui-cloak>
        <span id="text" :text="msg"></span>
      </div>`,
      state,
    )

    const root = host.querySelector<HTMLElement>('#root')!

    expect(root.hasAttribute('ui-cloak')).toBe(false)
    expect(host.querySelector('#text')?.textContent).toBe('hello')
  })

  it('remove o marcador em elementos aninhados', () => {
    const { host } = mount(
      `<div id="outer" ui-cloak>
        <section id="inner" ui-cloak>
          <span id="text" :text="'ok'"></span>
        </section>
      </div>`,
    )

    expect(host.querySelector('#outer')?.hasAttribute('ui-cloak')).toBe(false)
    expect(host.querySelector('#inner')?.hasAttribute('ui-cloak')).toBe(false)
    expect(host.querySelector('#text')?.textContent).toBe('ok')
  })

  it('trata o marcador como presença, mesmo com valor', () => {
    const { host } = mount(
      `<div id="empty" ui-cloak=""></div>
       <div id="valued" ui-cloak="true"></div>`,
    )

    expect(host.querySelector('#empty')?.hasAttribute('ui-cloak')).toBe(false)
    expect(host.querySelector('#valued')?.hasAttribute('ui-cloak')).toBe(false)
  })

  it('mantém o marcador quando :scope avalia falsy', () => {
    const { host } = mount(
      `<div id="scope" ui-cloak :scope="false">
        <span id="text" :text="'não parseado'"></span>
      </div>`,
    )
    const scope = host.querySelector<HTMLElement>('#scope')!

    expect(scope.hasAttribute('ui-cloak')).toBe(true)
    expect(scope.hasAttribute(':scope')).toBe(true)
    expect(host.querySelector('#text')?.textContent).toBe('')
  })

  it('funciona com :if ao montar e desmontar o elemento', () => {
    const state = reactive({ show: false })
    const { host } = mount(
      `<div>
        <p id="target" ui-cloak :if="show">
          <span id="text" :text="'visível'"></span>
        </p>
      </div>`,
      state,
    )

    expect(host.querySelector('#target')).toBeNull()

    state.show = true

    const target = host.querySelector<HTMLElement>('#target')!
    expect(target.hasAttribute('ui-cloak')).toBe(false)
    expect(host.querySelector('#text')?.textContent).toBe('visível')

    state.show = false
    expect(host.querySelector('#target')).toBeNull()
  })

  it('funciona com :for, incluindo itens criados depois', () => {
    const state = reactive({
      items: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
    })
    const { host } = mount(
      `<ul>
        <li class="row" ui-cloak :for="item of items" :key="item.id">
          <span :text="item.name"></span>
        </li>
      </ul>`,
      state,
    )

    const rows = () => Array.from(host.querySelectorAll('.row'))

    expect(rows()).toHaveLength(2)
    expect(rows().map((row) => row.hasAttribute('ui-cloak'))).toEqual([
      false,
      false,
    ])
    expect(host.querySelectorAll('[ui-cloak]')).toHaveLength(0)

    state.items.push({ id: 3, name: 'c' })

    expect(rows()).toHaveLength(3)
    expect(rows().at(-1)?.hasAttribute('ui-cloak')).toBe(false)
    expect(host.querySelectorAll('[ui-cloak]')).toHaveLength(0)
  })
})
