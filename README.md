# @jsweb/ui

## Introdução

O `@jsweb/ui` é um micro-framework frontend escrito em TypeScript, projetado para ser uma ferramenta leve, rápida e flexível para o desenvolvimento de interfaces de usuário. Ele combina a reatividade moderna de frameworks como Vue 3 (Composition API) com a simplicidade de uso direto no HTML, semelhante ao Alpine.js.

### Pilares Arquiteturais

- **Sem Virtual DOM**: Utiliza reatividade de grão fino (Fine-grained reactivity) via `Proxy` para atualizações diretas no DOM real.
- **Distribuição Dupla**:
  - **Standalone**: Arquivo único (IIFE/UMD) para inclusão via `<script src="...">`.
  - **Module**: Pacote ESM com exports nomeados para suporte a Tree-Shaking.
- **Contexto Híbrido**: Suporta definição de estado via Objetos Literais (POJOs) ou Classes TypeScript.
- **Template Engine**: Baseado em atributos customizados no HTML (`ui:*` para diretivas e `ui@*` para eventos, com shorthands `@`, `:`).
  - Suporte completo a **modificadores de eventos** encadeados (`.prevent`, `.stop`, `.self`, `.outside`).

## Instalação

### NPM

```bash
npm i @jsweb/ui
```

### CDN

```html
<script src="https://unpkg.com/@jsweb/ui@latest/dist/index.umd.js"></script>
```

## Diretivas Disponíveis (v0.1.0)

O framework utiliza um sistema de atributos customizados para declaratividade no HTML.

| Diretiva   | Descrição                                                            | Exemplo                           |
| :--------- | :------------------------------------------------------------------- | :-------------------------------- |
| `ui:scope` | Define o objeto de estado para o elemento e seus filhos.             | `<div ui:scope="{ count: 0 }">`   |
| `ui:text`  | Sincroniza o `textContent` com uma variável.                         | `<span ui:text="count"></span>`   |
| `:attr`    | Shorthand para bind de atributos HTML nativos (Binding Condicional). | `<button :disabled="count > 10">` |
| `@event`   | Shorthand para event listeners (suporta modificadores encadeados).   | `<button @click.prevent="save">`  |
| `:bind`    | Two-way data binding para inputs, checkboxes, radios e selects.      | `<input :bind="name">`            |
| `ui:if`    | Adiciona/Remove o elemento do DOM (via Comment Node placeholder).    | `<div ui:if="count > 0">`         |
| `ui:for`   | Renderiza uma lista de elementos a partir de um array.               | `<li ui:for="item in items">`     |

## Exemplo de Uso

### HTML

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>JS Web UI</title>
    <script src="https://unpkg.com/@jsweb/ui@latest/dist/ui.umd.js"></script>
    <script>
      const scope = {
        count: 0,
        inc: 'Incremento',
        dec: 'Decremento',
        increment() {
          this.count++
        },
        decrement() {
          this.count--
        },
      }

      jsweb.ui.createComponent('body', { scope })
    </script>
  </head>
  <body>
    <div ui:scope="scope">
      <h1>JS Web UI</h1>
      <p>Contador: <span ui:text="count"></span></p>
      <button ui:text="inc" @click="increment()"></button>
      <button ui:text="dec" @click="decrement()"></button>
    </div>
  </body>
</html>
```

### TypeScript / ESM

```typescript
import { createComponent } from '@jsweb/ui'

const scope = {
  count: 0,
  inc: 'Incremento',
  dec: 'Decremento',
  increment() {
    this.count++
  },
  decrement() {
    this.count--
  },
}

createComponent('#container', { scope })
```
