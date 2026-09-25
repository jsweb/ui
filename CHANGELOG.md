# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e este projeto adere ao [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

---

## [1.3.1] - 2026-09-24

### Added

- **Tipagem Contextual `ThisType<T & ScopeContext>`**: Inclusão de `ThisType` na assinatura de `reactive` e `createScope`, fornecendo autocomplete e tipagem estrita de `this` em métodos e _getters_ de objetos literais, com acesso direto a `$refs`, `$emit` e `$el` como propriedades não-opcionais.
- **Classe Base `Scope` e Interface `ScopeContext`**: Exportação da classe utilitária `Scope` e da interface `ScopeContext` para suporte nativo e tipado a arquiteturas orientadas a objetos (`class MyScope extends Scope`). Na classe `Scope`, `$el` e `$refs` são propriedades somente leitura (com `$refs` mantendo sua instância original de Map viva) e `$emit` como método `protected` com disparo nativo em `$el`, permitindo sobrescrita (`override`) nas subclasses.
- **Tipagem Genérica em `watch<T>`**: Aprimoramento da assinatura de `watch` para inferência de tipos em `newValue` e `oldValue`.
- **Skill Aberta para Agentes de IA (`SKILL.md`)**: Arquivo [`SKILL.md`](./SKILL.md) na raiz do projeto para integração direta com agentes de IA via `npx skills add @jsweb/ui`.
- **Skill de Workspace (`update-documentation`)**: Skill em [`.agents/skills/update-documentation/SKILL.md`](./.agents/skills/update-documentation/SKILL.md) para auditoria e sincronização contínua de documentação.
- **Histórico Semântico de Versões (`CHANGELOG.md`)**: Arquivo [`CHANGELOG.md`](./CHANGELOG.md) baseado no padrão Keep a Changelog.
- **Automação de Build e Metadados**: Atualização do script [`publish.js`](./publish.js) para sincronizar `SKILL.md` e `CHANGELOG.md` na pasta `dist/` durante o build do pacote NPM.
- **Script de Publicação**: Adicionado script `npm run push` no `package.json` para automatizar o envio de tags git e publicação no NPM.

---

## [1.3.0] - 2026-09-18

### Added

- **Diretiva `:ref` / `ui:ref`**: Indexação reativa de elementos DOM no helper contextual `$refs` (`Map`).
- **Refs Aninhadas em Listas**: Em loops `:for` com `:key`, `$refs.get(name)` retorna um `Map` aninhado indexado pela chave do item (`$key`).
- **Cleanup Automático de Refs**: Remoção de referências do `$refs` quando nós são destruídos por `:if` ou `:for`.
- **Modificador de Evento `.outside`**: Captura cliques e eventos fora do elemento (ideal para modais e dropdowns) com remoção automática do listener no `document` ao desconectar o nó.
- **Reconciliação e Reciclagem de Nós DOM em Listas**: Rastreamento de nós pelo `:key` em `:for`, reaproveitando instâncias existentes e evitando reflows desnecessários.

---

## [1.2.8] - 2026-05-20

### Refactored

- Limpeza de imports e remoção de código não utilizado no parser e no core.

---

## [1.2.7] - 2026-05-20

### Added

- Suporte aprimorado à função `watch` com observação profunda (_deep traverse_) e suporte a `{ immediate: true }`.

---

## [1.2.6] - 2026-05-20

### Added

- **Diretiva `:class` / `ui:class`**: Bind reativo de classes CSS via objeto booleano, array ou string, preservando classes estáticas.
- **Diretiva `:style` / `ui:style`**: Bind reativo para estilos inline com limpeza automática de propriedades removidas.

---

## [1.2.5] - 2026-05-18

### Fixed

- Tratamento de erros nas funções de avaliação (`evaluate` e `evaluateEvent`).
- Ajuste no contexto `this` para getters em propriedades computadas.

---

## [1.2.4] - 2026-05-18

### Added

- Suporte automático a propriedades computadas via _getters_ nativos (`get prop() { ... }`) em objetos envolvidos por `reactive()`.

---

## [1.2.3] - 2026-05-18

### Added

- Script de automação `preversion` no `package.json` para executar o build antes de gerar versões.

### Refactored

- Remoção da função legada `hasDirective`.

---

## [1.2.2] - 2026-05-18

### Refactored

- Simplificação do logging de avisos no motor de avaliação.

---

## [1.2.1] - 2026-05-17

### Added

- Script `publish.js` para geração de pacote mínimo em `dist/` e automação de publicação NPM.

---

## [1.2.0] - 2026-05-09

### Added

- Exportação da API `watch(source, callback, options?)` para observação de estados reativos.
- Reorganização dos exports principais (`createScope`, `reactive`, `watch`).

---

## [1.1.0] - 2026-05-09

### Added

- Injeção do helper contextual `$emit(eventName, detail?)` para disparo de `CustomEvent` nativos (`bubbles: true`, `composed: true`).
- Padronização do nome do método de montagem para `createScope`.

---

## [1.0.0] - 2026-05-07

### Added

- Primeiro lançamento estável do `@jsweb/ui`.
- Motor de reatividade de grão fino baseado em `Proxy` e `ReactiveEffect` (sem Virtual DOM).
- Avaliador de expressões dinâmicas em sandbox.
- Diretivas fundamentais: `ui:scope`, `ui:text`, `ui:bind`, `ui:if`, `ui:for`, `ui:[attr]` e `ui@[event]`.
- Modificadores de evento `.prevent`, `.stop` e `.self`.
- Distribuição dual: ESM para bundlers e UMD/Standalone para uso direto via CDN.
