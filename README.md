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
<script src="https://unpkg.com/@jsweb/ui"></script>
```

## Diretivas Disponíveis

O framework utiliza um sistema de atributos customizados para declaratividade no HTML, suportando tanto o prefixo completo (`ui:`, `ui@`) quanto a sintaxe simplificada (`:`, `@`).

| Diretiva     | Atalho     | Descrição                                                                         | Exemplo                                    |
| :----------- | :--------- | :-------------------------------------------------------------------------------- | :----------------------------------------- |
| `ui:scope`   | `:scope`   | Define o objeto de estado/contexto para o elemento e seus filhos.                 | `<div :scope="{ count: 0 }">`              |
| `ui:text`    | `:text`    | Sincroniza o `textContent` com uma variável ou expressão.                         | `<span :text="count"></span>`              |
| `ui:bind`    | `:bind`    | Two-way data binding para inputs, checkboxes, radios, selects e textarea.         | `<input :bind="name">`                     |
| `ui:if`      | `:if`      | Renderização condicional no DOM (via Comment Node placeholder).                   | `<div :if="count > 0">`                    |
| `ui:for`     | `:for`     | Renderiza listas com suporte a `in` e `of`, expondo `$index`.                     | `<li :for="item of items">`                |
| `ui:key`     | `:key`     | Identificador único para reconciliação e reciclagem eficiente de nós DOM.         | `<li :for="item of items" :key="item.id">` |
| `ui:class`   | `:class`   | Bind reativo para classes CSS (suporta String, Array ou Objeto booleano).         | `<div :class="{ active: isActive }">`      |
| `ui:style`   | `:style`   | Bind reativo para estilos inline (recebe objeto chave/valor de propriedades CSS). | `<div :style="{ color: textColor }">`      |
| `ui:ref`     | `:ref`     | Referencia elementos HTML indexados em um Map acessível via `$refs`.              | `<input :ref="myInput">`                   |
| `ui:[attr]`  | `:[attr]`  | Bind de atributos HTML nativos (remove se falsy, ativa se booleano `true`).       | `<button :disabled="count > 10">`          |
| `ui@[event]` | `@[event]` | Escuta eventos DOM nativos ou customizados (com suporte a modificadores).         | `<button @click.prevent="save">`           |

### Modificadores de Eventos

É possível encadear modificadores diretamente na sintaxe do evento (`@event.modificador` ou `ui@event.modificador`):

- **`.prevent`**: Executa `$event.preventDefault()`.
- **`.stop`**: Executa `$event.stopPropagation()`.
- **`.self`**: Dispara o manipulador apenas quando o evento se originou exatamente no próprio elemento (`$event.target === el`).
- **`.outside`**: Dispara quando o evento ocorre fora do elemento (ideal para fechar menus, modais e dropdowns). Gerencia o ouvinte no `document` com remoção e limpeza automáticas quando o elemento for desconectado.

### Variáveis e Helpers de Contexto

Dentro das expressões declaradas no HTML, o framework disponibiliza variáveis e métodos contextuais:

- **`$refs`**: Objeto `Map` nativo contendo as referências registradas via `ui:ref` / `:ref`. Em elementos simples, retorna diretamente o elemento (`this.$refs.get('name')`). Em elementos dentro de loops `ui:for` com `:key`, retorna um `Map` aninhado indexado pela chave (`this.$refs.get('name').get($key)`).
- **`$emit(eventName, detail?)`**: Função injetada em todos os escopos para disparar `CustomEvent` nativos (`bubbles: true`, `composed: true`), facilitando a comunicação com elementos ancestrais (`@custom-event="handle"`).
- **`$event`**: Objeto nativo do evento disparado, disponível nas expressões de manipuladores (`@click="handle($event)"`). Se você referenciar apenas a função (`@click="handle"`), ela receberá `$event` automaticamente como primeiro argumento.
- **`$index`**: Índice numérico (base 0) da iteração atual, disponível dentro do escopo de um `ui:for` / `:for`.

### Detalhes de Comportamento

#### Two-Way Data Binding (`ui:bind` / `:bind`)

Detecta e trata o elemento de acordo com seu tipo:

- **`input[type="checkbox"]`**: Sincroniza a propriedade booleana `checked` e atualiza no evento `change`.
- **`input[type="radio"]`**: Marca como selecionado caso `el.value === String(valor)` e atualiza no evento `change`.
- **`<select>`**: Sincroniza o `value` selecionado e escuta o evento `change`.
- **`<input>` (texto, número, cor, data, etc.) e `<textarea>`**: Sincroniza `value` e atualiza em tempo real no evento `input`.

#### Classes Dinâmicas (`ui:class` / `:class`)

Atualiza classes reativas preservando classes estáticas já presentes no elemento:

- **Objeto**: `:class="{ active: isActive, 'has-error': error }"`
- **Array**: `:class="['badge', isActive && 'badge-success']"`
- **String**: `:class="currentClass"`

#### Reconciliação Inteligente em Listas (`ui:for` / `:for` e `ui:key` / `:key`)

```html
<ul>
  <li :for="item of items" :key="item.id">
    <span :text="$index"></span>: <strong :text="item.title"></strong>
  </li>
</ul>
```

Ao atualizar arrays reativos, o motor rastreia os nós pelo `:key` (ou índice por padrão) e reaproveita as instâncias existentes no DOM, evitando reflows desnecessários e mantendo estados de foco/interação.

#### Referências a Elementos (`ui:ref` / `:ref` e `$refs`)

O atributo `ui:ref` ou `:ref` indexa o elemento diretamente em um objeto `Map` acessível via `this.$refs` em métodos ou `$refs` em templates:

1. **Uso Simples (Elemento Único)**:

   ```html
   <input type="text" :ref="searchBox" />
   <button @click="$refs.get('searchBox').focus()">Focar</button>
   ```

   No código do componente:

   ```javascript
   this.$refs.get('searchBox').focus()
   ```

2. **Uso em Listas (`ui:for` com `:key`)**:
   Quando utilizado dentro de um loop com `:key`, o framework cria automaticamente um `Map` aninhado mapeando cada elemento pela chave do item:

   ```html
   <ul>
     <li :for="user of users" :key="user.id">
       <input type="text" :value="user.name" :ref="userInput" />
     </li>
   </ul>
   ```

   Para resgatar o elemento de um item específico:

   ```javascript
   const input = this.$refs.get('userInput').get(user.id)
   input?.focus()
   ```

3. **Limpeza Automática**:
   Quando um elemento referenciado sai do DOM (seja por remoção do item em lista ou por `ui:if`), ele é desregistrado automaticamente do `Map`, evitando vazamentos de memória e referências a nós órfãos.

## Exemplo de Uso

### HTML

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>JS Web UI</title>
    <script src="https://unpkg.com/@jsweb/ui"></script>
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

      jsweb.ui.createScope('body', { scope })
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
import { createScope, reactive, watch } from '@jsweb/ui'

const scope = reactive({
  count: 0,
  inc: 'Incremento',
  dec: 'Decremento',
  increment() {
    this.count++
  },
  decrement() {
    this.count--
  },
})

// Observa mudanças com suporte a oldValue/newValue e disparo imediato opcional
const unwatch = watch(
  () => scope.count,
  (newVal, oldVal) => {
    console.log(`Contador mudou de ${oldVal} para ${newVal}`)
  },
  { immediate: true },
)

createScope('#container', { scope })
```

## API JavaScript / TypeScript

### `createScope(selectorOrElement, context?)`

Inicializa e amarra a reatividade ao elemento DOM ou seletor especificado.

- **`selectorOrElement`**: Seletor CSS (ex: `'#app'`, `'body'`) ou instância de `HTMLElement`.
- **`context`**: Objeto inicial de contexto/estado compartilhado (opcional). Injeta automaticamente o helper `$emit` no escopo.

### `reactive(target)`

Envolve um objeto ou array em um `Proxy` de reatividade de grão fino (_fine-grained_).

- Suporta reatividade profunda (_deep reactivity_).
- Intercepta mutações em arrays (`push`, `pop`, `splice`, etc.) e mutações de propriedades em objetos.

### `watch(source, callback, options?)`

Observa alterações reativas e executa uma função de callback quando o valor mudar.

- **`source`**: Objeto reativo completo ou função getter que retorna o valor a ser observado (ex: `() => state.count`).
- **`callback`**: `(newValue: any, oldValue: any) => void`.
- **`options`**: `{ immediate?: boolean }` para acionar a callback imediatamente na primeira execução.
- **Retorno**: Função de cancelamento `stop()` que encerra a observação e limpa dependências.
