import { describe, expect, it, vi } from 'vitest'
import { reactive } from '../src/index'
import { mount } from './helpers/mount'

describe('eventos', () => {
  it('chama uma referência direta como função recebendo $event', () => {
    const handler = vi.fn()
    const state = reactive({ handler })
    const { host } = mount(
      `<button id="short" @click="handler"></button>
       <button id="long" ui@click="handler"></button>`,
      state,
    )

    host.querySelector<HTMLButtonElement>('#short')?.click()
    host.querySelector<HTMLButtonElement>('#long')?.click()

    expect(handler).toHaveBeenCalledTimes(2)
    expect(handler.mock.calls[0][0]).toBeInstanceOf(Event)
  })

  it('executa expressões inline e expõe $event', () => {
    const handler = vi.fn()
    const state = reactive({ count: 0, handler })
    const { host } = mount(
      `<button id="increment" @click="count++"></button>
       <button id="inspect" @click="handler($event)"></button>
       <span id="output" :text="count"></span>`,
      state,
    )

    host.querySelector<HTMLButtonElement>('#increment')?.click()
    host.querySelector<HTMLButtonElement>('#increment')?.click()
    host.querySelector<HTMLButtonElement>('#inspect')?.click()

    expect(state.count).toBe(2)
    expect(host.querySelector('#output')?.textContent).toBe('2')
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0]).toBeInstanceOf(Event)
  })

  it('aplica .prevent', () => {
    const handler = vi.fn()
    const state = reactive({ handler })
    const { host } = mount(
      `<a id="link" href="#destino" @click.prevent="handler">link</a>`,
      state,
    )
    const link = host.querySelector<HTMLAnchorElement>('#link')!
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    })

    link.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('aplica .stop', () => {
    const handler = vi.fn()
    const parent = vi.fn()
    const state = reactive({ handler })
    const { host } = mount(
      `<button id="button" @click.stop="handler"></button>`,
      state,
    )

    host.addEventListener('click', parent)
    host.querySelector<HTMLButtonElement>('#button')?.click()

    expect(handler).toHaveBeenCalledTimes(1)
    expect(parent).not.toHaveBeenCalled()
  })

  it('aplica .self', () => {
    const handler = vi.fn()
    const state = reactive({ handler })
    const { host } = mount(
      `<div id="self" @click.self="handler">
        <button id="child">child</button>
      </div>`,
      state,
    )
    const wrapper = host.querySelector<HTMLElement>('#self')!

    host.querySelector<HTMLButtonElement>('#child')?.click()
    expect(handler).not.toHaveBeenCalled()

    wrapper.click()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('aplica .outside e remove o listener ao desmontar', () => {
    const handler = vi.fn()
    const state = reactive({ handler })
    const { host, dispose } = mount(
      `<div id="dropdown" @click.outside="handler">
        <button id="inside">inside</button>
      </div>`,
      state,
    )
    const dropdown = host.querySelector<HTMLElement>('#dropdown')!
    const outside = document.createElement('button')
    document.body.append(outside)

    document.body.click()
    expect(handler).toHaveBeenCalledTimes(1)

    dropdown.click()
    expect(handler).toHaveBeenCalledTimes(1)

    outside.click()
    expect(handler).toHaveBeenCalledTimes(2)

    dispose()
    outside.click()
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('dispara eventos customizados com $emit', () => {
    const state = reactive({})
    const { host } = mount(
      `<button id="emit" @click="$emit('saved', { id: 1 })"></button>`,
      state,
    )
    const listener = vi.fn()

    host.addEventListener('saved', listener)
    host.querySelector<HTMLButtonElement>('#emit')?.click()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0]).toBeInstanceOf(CustomEvent)
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ id: 1 })
  })

  it('ignora handlers de elementos desconectados', () => {
    const handler = vi.fn()
    const state = reactive({ handler })
    const { host } = mount(
      `<button id="button" @click="handler"></button>`,
      state,
    )
    const button = host.querySelector<HTMLButtonElement>('#button')!

    host.remove()
    button.click()

    expect(handler).not.toHaveBeenCalled()
  })
})
