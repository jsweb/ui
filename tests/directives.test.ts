import { describe, expect, it } from 'vitest'
import { reactive } from '../src/index'
import { mount } from './helpers/mount'

describe('diretivas básicas', () => {
  it('resolve escopo local com herança e sombreamento do contexto pai', () => {
    const state = reactive({ outer: 'parent', value: 'context' })
    const { host } = mount(
      `<div :scope="{ outer: 'child', local: 'local' }">
        <span id="text" :text="outer + ':' + local + ':' + value"></span>
      </div>`,
      state,
    )

    expect(host.querySelector('#text')?.textContent).toBe('child:local:context')
  })

  it('permite que o escopo filho atribua propriedades do contexto pai', () => {
    const state = reactive({ value: 'parent' })
    const { host } = mount(
      `<div :scope="{ local: 'child' }">
        <button id="change" @click="value = 'changed'"></button>
      </div>
      <span id="outside" :text="value"></span>`,
      state,
    )

    host.querySelector<HTMLButtonElement>('#change')?.click()

    expect(state.value).toBe('changed')
    expect(host.querySelector('#outside')?.textContent).toBe('changed')
  })

  it('sincroniza textContent e trata null/undefined como vazio', () => {
    const state = reactive<{ value: unknown }>({ value: 'hello' })
    const { host } = mount(
      `<span id="short" :text="value"></span>
       <span id="long" ui:text="value"></span>`,
      state,
    )

    expect(host.querySelector('#short')?.textContent).toBe('hello')
    expect(host.querySelector('#long')?.textContent).toBe('hello')

    state.value = null
    expect(host.querySelector('#short')?.textContent).toBe('')

    state.value = undefined
    expect(host.querySelector('#long')?.textContent).toBe('')

    state.value = 0
    expect(host.querySelector('#short')?.textContent).toBe('0')
  })

  it('monta e desmonta elementos com :if', () => {
    const state = reactive({ show: false })
    const { host } = mount(
      `<div><p id="target" :if="show" :text="show ? 'visible' : 'hidden'"></p></div>`,
      state,
    )

    expect(host.querySelector('#target')).toBeNull()

    state.show = true
    const target = host.querySelector('#target')
    expect(target).not.toBeNull()
    expect(target?.textContent).toBe('visible')

    state.show = false
    expect(host.querySelector('#target')).toBeNull()
  })

  it('aplica classes por objeto, array e string preservando classes estáticas', () => {
    const state = reactive({
      active: false,
      kind: 'primary',
      label: 'badge',
    })
    const { host } = mount(
      `<div id="object" class="base" :class="{ active, 'is-primary': kind === 'primary' }"></div>
       <span id="array" :class="['tag', active ? 'on' : 'off']"></span>
       <b id="string" :class="label"></b>`,
      state,
    )

    const object = host.querySelector('#object')!
    const array = host.querySelector('#array')!
    const string = host.querySelector('#string')!

    expect(object.classList.contains('base')).toBe(true)
    expect(object.classList.contains('is-primary')).toBe(true)
    expect(object.classList.contains('active')).toBe(false)
    expect(array.classList.contains('tag')).toBe(true)
    expect(array.classList.contains('off')).toBe(true)
    expect(string.classList.contains('badge')).toBe(true)

    state.active = true
    state.kind = 'secondary'
    state.label = 'label'

    expect(object.classList.contains('active')).toBe(true)
    expect(object.classList.contains('is-primary')).toBe(false)
    expect(array.classList.contains('on')).toBe(true)
    expect(array.classList.contains('off')).toBe(false)
    expect(string.classList.contains('badge')).toBe(false)
    expect(string.classList.contains('label')).toBe(true)
  })

  it('aplica estilos inline e remove chaves antigas', () => {
    const state = reactive<{ styles: Record<string, string> }>({
      styles: { backgroundColor: 'red', width: '10px' },
    })
    const { host } = mount(`<div id="box" :style="styles"></div>`, state)
    const box = host.querySelector<HTMLElement>('#box')!

    expect(box.style.backgroundColor).toBe('red')
    expect(box.style.width).toBe('10px')

    state.styles = { backgroundColor: 'blue' }

    expect(box.style.backgroundColor).toBe('blue')
    expect(box.style.width).toBe('')
  })

  it('faz bind de atributos nativos com valores booleanos e nulos', () => {
    const state = reactive<{
      disabled: boolean
      href: string | null
      active: boolean
    }>({
      disabled: false,
      href: '/inicio',
      active: true,
    })
    const { host } = mount(
      `<button id="button" :disabled="disabled" :href="href" :data-active="active"></button>`,
      state,
    )
    const button = host.querySelector<HTMLButtonElement>('#button')!

    expect(button.hasAttribute('disabled')).toBe(false)
    expect(button.getAttribute('href')).toBe('/inicio')
    expect(button.getAttribute('data-active')).toBe('')

    state.disabled = true
    state.href = null
    state.active = false

    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.getAttribute('href')).toBeNull()
    expect(button.getAttribute('data-active')).toBeNull()
  })

  it('remove os atributos de diretiva depois do parsing', () => {
    const { host } = mount(
      `<div id="scope" :scope="{ msg: 'hello' }">
        <span id="text" ui:text="msg"></span>
        <input id="input" :bind="msg" />
        <div id="conditional" :if="true"></div>
      </div>`,
    )

    expect(host.querySelector('#scope')?.hasAttribute(':scope')).toBe(false)
    expect(host.querySelector('#text')?.hasAttribute('ui:text')).toBe(false)
    expect(host.querySelector('#input')?.hasAttribute(':bind')).toBe(false)
    expect(host.querySelector('#conditional')?.hasAttribute(':if')).toBe(false)
  })
})
