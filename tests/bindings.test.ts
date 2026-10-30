import { describe, expect, it } from 'vitest'
import { reactive } from '../src/index'
import { mount } from './helpers/mount'

describe('two-way binding (:bind)', () => {
  it('sincroniza input de texto nos dois sentidos', () => {
    const state = reactive({ name: 'Ada' })
    const { host } = mount(
      `<input id="input" type="text" :bind="name" />`,
      state,
    )
    const input = host.querySelector<HTMLInputElement>('#input')!

    expect(input.value).toBe('Ada')
    expect(input.hasAttribute(':bind')).toBe(false)

    input.value = 'Grace'
    input.dispatchEvent(new Event('input'))
    expect(state.name).toBe('Grace')

    state.name = 'Lin'
    expect(input.value).toBe('Lin')
  })

  it('sincroniza textarea', () => {
    const state = reactive({ bio: 'hello' })
    const { host } = mount(
      `<textarea id="textarea" ui:bind="bio"></textarea>`,
      state,
    )
    const textarea = host.querySelector<HTMLTextAreaElement>('#textarea')!

    expect(textarea.value).toBe('hello')

    textarea.value = 'world'
    textarea.dispatchEvent(new Event('input'))

    expect(state.bio).toBe('world')
  })

  it('sincroniza checkbox como booleano no evento change', () => {
    const state = reactive({ accepted: false })
    const { host } = mount(
      `<input id="checkbox" type="checkbox" :bind="accepted" />`,
      state,
    )
    const checkbox = host.querySelector<HTMLInputElement>('#checkbox')!

    expect(checkbox.checked).toBe(false)

    checkbox.checked = true
    checkbox.dispatchEvent(new Event('change'))
    expect(state.accepted).toBe(true)

    state.accepted = false
    expect(checkbox.checked).toBe(false)
  })

  it('sincroniza radios comparando o value com o estado', () => {
    const state = reactive({ plan: 'pro' })
    const { host } = mount(
      `<input id="free" type="radio" name="plan" value="free" :bind="plan" />
       <input id="pro" type="radio" name="plan" value="pro" :bind="plan" />`,
      state,
    )
    const free = host.querySelector<HTMLInputElement>('#free')!
    const pro = host.querySelector<HTMLInputElement>('#pro')!

    expect(free.checked).toBe(false)
    expect(pro.checked).toBe(true)

    free.checked = true
    free.dispatchEvent(new Event('change'))

    expect(state.plan).toBe('free')
    expect(free.checked).toBe(true)
    expect(pro.checked).toBe(false)
  })

  it('sincroniza select no evento change', () => {
    const state = reactive({ country: 'BR' })
    const { host } = mount(
      `<select id="select" :bind="country">
        <option value="BR">Brasil</option>
        <option value="US">EUA</option>
      </select>`,
      state,
    )
    const select = host.querySelector<HTMLSelectElement>('#select')!

    expect(select.value).toBe('BR')

    select.value = 'US'
    select.dispatchEvent(new Event('change'))
    expect(state.country).toBe('US')

    state.country = 'BR'
    expect(select.value).toBe('BR')
  })
})
