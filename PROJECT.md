# Especificação Técnica: Micro-Framework JS/TS (Codinome: @jsweb/ui)

## 1. Visão Geral

**@jsweb/ui** é um micro-framework frontend focado em _Progressive Enhancement_ e DX (Developer Experience). Ele deve oferecer a reatividade moderna de frameworks como Vue 3 (Composition API) e a simplicidade de uso direto no HTML do Alpine.js, sem a necessidade obrigatória de um build step, mas totalmente otimizado para árvores de dependência (tree-shaking) quando usado em ambientes build-tooling.

## 2. Pilares Arquiteturais

- **No Virtual DOM:** Utilização de reatividade de grão fino (Fine-grained reactivity) via `Proxy` ou `Signals`. Atualizações diretas no DOM real.
- **Dual Distribution:**
  - **Standalone:** Arquivo único (IIFE/UMD) para inclusão via `<script src="...">`.
  - **Module:** Pacote ESM com exports nomeados para suporte a Tree-Shaking.
- **Hybrid Context:** Suporte a definição de estado via Objetos Literais (POJOs) ou Classes TypeScript.
- **Template Engine:** Baseado em atributos customizados no HTML (`ui:*` para diretivas e `ui@*` para eventos, com shorthands `@`, `:`).

## 3. Especificações do Motor (Core)

### A. Sistema de Reatividade

- **Mecanismo:** Proxy-based em conjunto com a classe `ReactiveEffect`. O estado é interceptado para disparar "efeitos" com gerenciamento preciso de dependências, controle de ciclo de vida (`stop`, `cleanup`) e otimizado contra vazamento de memória.
- **Global State:** Deve ser possível exportar um objeto reativo de um arquivo e importá-lo em múltiplos componentes/contextos, tornando-o um estado compartilhado.
- **Global Effect:** Deve ser possível criar efeitos globais que reajam a mudanças em qualquer estado compartilhado.
- **Local State:** Deve ser possível criar estados locais que reajam a mudanças apenas dentro do escopo do componente.
- **Local Effect:** Deve ser possível criar efeitos locais que reajam a mudanças apenas dentro do escopo do componente.
- **Lifecycle:** Deve ser possível criar efeitos que reajam a mudanças no ciclo de vida do componente.
- **Cleanup:** Deve ser possível limpar os efeitos quando os componentes forem removidos do DOM.
- **Watchers:** Deve ser possível criar watchers que reajam a mudanças em propriedades específicas do estado.
- **Computed:** Deve ser possível criar propriedades computadas que reajam a mudanças em propriedades específicas do estado.
- **Composition API:** Deve ser possível usar a Composition API para criar efeitos e reatividade e aninhar efeitos e reatividade em outros efeitos e reatividade.

### B. Avaliador de Expressões (The Evaluator)

- **Implementação:** Uso de `new Function()` com `with(this)`.
- **Estratégia de Execução:** Para avaliar expressões declaradas no HTML de forma encapsulada (sandboxed):
  1. O motor encapsula o objeto/escopo em um Proxy de Contexto para resolução de dependências.
  2. Constrói a função dinâmica: `new Function('with(this) { ... }')`.
  3. Executa a função passando o escopo reativo atrelado ao `this`.
  4. Para eventos, também expõe a variável nativa `$event`.

### C. Parser de Template

- **Traversal:** Utilizar `TreeWalker` ou recursão otimizada para identificar diretivas.
- **Limpeza:** Atributos `ui:*`, `ui:@*`, `@*` e `:*` devem ser removidos do DOM após a inicialização para manter o HTML limpo.

## 4. Sintaxe e Diretivas (v0.1.0)

| Diretiva   | Descrição                                                         | Exemplo                           |
| :--------- | :---------------------------------------------------------------- | :-------------------------------- |
| `ui:scope` | Define o objeto de estado para o elemento e seus filhos.          | `<div ui:scope="{ count: 0 }">`   |
| `ui:text`  | Sincroniza o `textContent` com uma variável.                      | `<span ui:text="count"></span>`   |
| `:attr`    | Shorthand para bind de atributos HTML nativos.                    | `<button :disabled="count > 10">` |
| `@event`   | Shorthand para event listeners (com suporte a modificadores).     | `<button @click.prevent="save">`  |
| `:bind`    | Two-way data binding para inputs, checkboxes, radios e selects.   | `<input :bind="name">`            |
| `ui:if`    | Adiciona/Remove o elemento do DOM (via Comment Node placeholder). | `<div ui:if="count > 0">`         |
| `ui:for`   | Renderiza uma lista de elementos a partir de um array.            | `<li ui:for="item in items">`     |

## 5. Requisitos de Engenharia (Instruções para a IA)

- **Linguagem:** TypeScript Estrito.
- **Bundle Tool:** Vite (configurado para `build.lib` com formatos `es` e `umd`).
- **Memory Management:** Garantir o `cleanup` de event listeners e observadores quando elementos `ui:if` ou `ui:for` forem removidos.
- **Zero Dependencies:** O core não deve ter dependências externas de runtime.
- **Estilo de Código:** Funcional, modular, com comentários JSDoc claros para explicar o funcionamento interno do Proxy, do Parser e das diretivas.

---

### Stack de Build (Vite)

Para o `vite.config.ts`, utilize esta abordagem para satisfazer os requisitos de "Standalone" e "Module":

```typescript
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'jswebui',
      fileName: (format) => `ui.${format}.js`,
      formats: ['es', 'umd'],
    },
    sourcemap: true,
    minify: 'terser',
  },
  plugins: [dts()], // Gera os tipos .d.ts automaticamente
})
```
