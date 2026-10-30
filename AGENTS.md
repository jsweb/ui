# AGENTS.md — @jsweb/ui

Guia para agentes de IA que trabalham neste repositório. Leia antes de alterar código, documentação ou configuração de build.

## 1. Visão geral

`@jsweb/ui` é um micro-framework frontend em TypeScript, **sem Virtual DOM** e **sem dependências de runtime**. Combina reatividade de grão fino baseada em `Proxy` (inspirada na Composition API do Vue 3) com diretivas declarativas em atributos HTML (inspiradas no Alpine.js). As atualizações são aplicadas diretamente nos nós reais do DOM.

- **Público-alvo:** aplicações leves, widgets e progressive enhancement, com ou sem build step.
- **Distribuição dupla:** ESM (`dist/index.es.js`) para bundlers e UMD (`dist/index.umd.js`) para `<script src>`.
- **Global no navegador:** `window.jsweb.ui` expõe `createScope`, `reactive`, `watch` e `Scope`.
- **Versão:** consulte `package.json` e `CHANGELOG.md` (não fixe números de versão em código/docs sem atualizar ambos).

## 2. Comandos

| Comando           | O que faz                                                                                        |
| :---------------- | :----------------------------------------------------------------------------------------------- |
| `npm install`     | Instala dependências apenas de desenvolvimento.                                                  |
| `npm run dev`     | Sobe o Vite com o demo `index.html` (teste manual principal do framework).                       |
| `npm run build`   | Executa `tsc` (type-check com `noEmit`), `vite build` e `publish.js` (gera `dist/` + metadados). |
| `npm run preview` | Serve o build de produção.                                                                       |
| `npm run format`  | Aplica Prettier em todo o repositório.                                                           |
| `npm test`        | **Placeholder** (`echo 'test'`). Não existe suíte de testes automatizados no projeto.            |
| `npm run index`   | Gera os índices de contexto: `repomix` (`repomix-output.md`) e `codegraph` (`.codegraph/`).      |
| `npm run dist`    | `npm run build && npm publish ./dist` — somente mantenedores.                                    |
| `npm run push`    | Push de commits/tags + publicação — somente mantenedores.                                        |

Regras de build/publicação:

- **Nunca** rode `npm publish` na raiz. O script `prepublishOnly` aborta, mas a publicação correta é `npm run dist`, que publica apenas `dist/`.
- `publish.js` remove `scripts` e `devDependencies`, reescreve os caminhos de entrada e copia `LICENSE`, `README.md`, `CHANGELOG.md` e `skills/jsweb-ui/SKILL.md` para `dist/`.
- `dist/`, `node_modules/`, `repomix-output.md` e `.codegraph/` são artefatos gerados. Não edite `dist/` nem trate `repomix-output.md` como fonte de verdade; a fonte é `src/`.

## 3. Mapa do repositório

| Caminho                                        | Responsabilidade                                                                                                                 |
| :--------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `src/reactivity.ts`                            | Motor reativo: `ReactiveEffect`, `effect`, `track`, `trigger`, `reactive`, `traverse`, `watch`, classe `Scope` e `ScopeContext`. |
| `src/parser.ts`                                | Montagem e template engine: `createScope`, `createContext`, `parseNode`, diretivas, reconciliação de listas e cleanup.           |
| `src/evaluator.ts`                             | Avaliação de expressões e eventos com `new Function` + `with(this)`.                                                             |
| `src/index.ts`                                 | Única superfície pública de exports; também registra `window.jsweb.ui`.                                                          |
| `index.html`                                   | Demo/manual de fumaça: usa `src/index.ts` via Vite e exercita todas as diretivas.                                                |
| `vite.config.ts`                               | Build de biblioteca (ES + UMD), sourcemap, Terser e geração de `.d.ts` (`vite-plugin-dts`).                                      |
| `tsconfig.json`                                | TypeScript estrito (`strict`, `noUnusedLocals`, `noUnusedParameters`), `noEmit`, target/module `ESNext`.                         |
| `publish.js`                                   | Empacotamento mínimo para publicação em `dist/`.                                                                                 |
| `README.md`                                    | Documentação pública (português): instalação, diretivas, exemplos e API.                                                         |
| `PROJECT.md`                                   | Especificação técnica/arquitetura (português).                                                                                   |
| `CHANGELOG.md`                                 | Histórico no padrão Keep a Changelog (português), com seção `[Unreleased]`.                                                      |
| `skills/jsweb-ui/SKILL.md`                     | Skill para agentes de IA (inglês), publicada no pacote e instalável via `npx skills add jsweb/ui`.                               |
| `.agents/skills/update-documentation/SKILL.md` | Workflow interno de auditoria e sincronização da documentação.                                                                   |

## 4. Arquitetura essencial

### 4.1 Reatividade (`src/reactivity.ts`)

- `ReactiveEffect` guarda `fn`, `active` e o conjunto `deps`. `run()` limpa dependências antigas, marca um `Symbol` como efeito ativo, executa a função e restaura o estado anterior. `stop()` limpa e desativa.
- O rastreamento usa `activeEffect` (global de módulo), `targetMap` (`WeakMap<object, Map<key, Set<ReactiveEffect>>>`), `effectMap` e `proxyMap` (cache de proxies).
- `reactive()` faz proxy profundo de objetos/arrays, guarda o cache por alvo e ignora `Map`, `Set`, `WeakMap`, `WeakSet`, `Date`, `RegExp` e nós do DOM. A flag interna `_isReactive` evita re-embrulhar.
- `set` dispara apenas quando a chave é nova ou o valor realmente muda; em arrays, alterações de índice também disparam `length`.
- Propriedades computadas são **getters nativos** (`get total() { ... }`). Não existe `computed()`.
- `watch(source, cb, { immediate })` aceita getter ou objeto (observação profunda via `traverse`) e retorna `stop`.
- `Scope` fornece `$el`, `$refs` e `$emit` (`protected`, sobrescrevível); `$el` é `declare` e atribuído em tempo de montagem — não o inicialize no construtor.

### 4.2 Parser e contexto (`src/parser.ts`)

- `createScope(selectorOrElement, context?)` localiza o elemento, injeta `$el`, `$emit` e `$refs` no contexto (mutando o objeto recebido) e chama `parseNode`.
- `parseNode` processa apenas elementos, nesta ordem: `:scope` → `:for` (retorna imediatamente após processar) → `:if` → atributos → filhos.
- `createContext(scope, parent)` cria um `Proxy` que resolve primeiro no escopo local e depois no pai, permitindo sombreamento e herança. Atribuições a propriedades existentes no pai são gravadas no pai.
- `:scope` avalia a expressão; se o resultado for falsy, o elemento e seus filhos **não são parseados** (`processScope` retorna `undefined`).
- Listas (`:for`): o elemento original é substituído por um comentário-âncora com UUID; cada item é clonado e parseado com um contexto próprio. Nós são reciclados por `:key` (ou índice, se ausente); itens removidos passam por `cleanupTree`, que executa os `stop()` registrados em `_effects`.
- `:if`: usa comentário-âncora, insere/remove o elemento conforme a expressão. **Não** chama `cleanupTree` ao esconder; os efeitos só são encerrados quando um ancestral é limpo (ex.: remoção em lista). Handlers de evento têm guarda `el.isConnected`.
- Toda diretiva processada remove seus atributos do DOM. Qualquer atributo desconhecido com prefixo `ui:` ou `:` é tratado como bind de atributo nativo.
- `ui-cloak` é detectado no início de `parseNode` e removido **depois** do parsing dos filhos, para evitar exibir conteúdo não inicializado. Ele depende de CSS fornecido pela aplicação (`[ui-cloak] { display: none !important; }`) e não é tratado como bind de atributo.
- `bindEffect(node, fn)` registra `stop` em `node._effects`; use-o sempre que criar efeitos para garantir cleanup.

### 4.3 Avaliador (`src/evaluator.ts`)

- Expressões rodam em `new Function("with(this) { return ... }")` com o contexto como `this`.
- `evaluate` engole erros e retorna `undefined`; `evaluateEvent` loga um aviso no console.
- Em eventos, um identificador simples (ex.: `@click="save"`) é chamado como função recebendo `$event`; expressões compostas são executadas como código.
- O uso de `new Function` exige ambientes que permitam `unsafe-eval` (atenção a CSP).

### 4.4 API pública (`src/index.ts`)

Exporta apenas `reactive`, `watch`, `createScope`, `Scope`, `ScopeContext` e `Context`. Mudanças de assinatura ou remoções são potencialmente **breaking changes**: exigem atualização de documentação, `CHANGELOG.md` e, conforme o caso, major em SemVer.

## 5. Diretivas, modificadores e helpers

Toda diretiva de expressão aceita forma longa (`ui:*`, `ui@*`) e shorthand (`:*`, `@*`). Ao criar ou alterar uma diretiva desse tipo, suporte **as duas formas**. A exceção é `ui-cloak`: marcador estático baseado na presença do atributo, sem expressão e sem shorthand (usa hífen para manter o seletor CSS `[ui-cloak]` simples).

| Diretiva     | Atalho     | Função                                                              |
| :----------- | :--------- | :------------------------------------------------------------------ |
| `ui:scope`   | `:scope`   | Define estado local e o mescla ao contexto pai.                     |
| `ui:text`    | `:text`    | Sincroniza `textContent` (null/undefined → string vazia).           |
| `ui:bind`    | `:bind`    | Two-way binding para input, textarea, checkbox, radio e select.     |
| `ui:if`      | `:if`      | Monta/desmonta o elemento via nó de comentário.                     |
| `ui:for`     | `:for`     | Itera arrays com sintaxe `item in/of lista`.                        |
| `ui:key`     | `:key`     | Chave de reconciliação de listas.                                   |
| `ui:class`   | `:class`   | Classes por string, array ou objeto booleano.                       |
| `ui:style`   | `:style`   | Estilos inline por objeto, com remoção de chaves antigas.           |
| `ui:ref`     | `:ref`     | Registra o elemento em `$refs` (Map).                               |
| `ui-cloak`   | —          | Oculta via CSS até o parsing; removido após a subárvore.            |
| `ui:[attr]`  | `:[attr]`  | Bind de atributo nativo (falsy remove, `true` vira atributo vazio). |
| `ui@[event]` | `@[event]` | Listener de evento com modificadores.                               |

Modificadores de evento: `.prevent`, `.stop`, `.self`, `.outside` (listener no `document` com cleanup registrado em `_effects`).

Helpers no contexto: `$refs` (`Map`; em listas com `:key`, `$refs.get(nome)` retorna um `Map` aninhado por chave), `$emit(event, detail?)` (`CustomEvent` com `bubbles` e `composed`), `$event`, `$index`, `$key`, `$el`.

## 6. Regras críticas para agentes

1. **Zero dependências de runtime.** Novas libs só podem entrar como `devDependencies` e com justificativa.
2. **Não introduza Virtual DOM, JSX ou APIs de framework externo.** O motor opera diretamente no DOM real.
3. **Sempre use `:key` em `:for`.** Sem chave, a reconciliação cai para o índice e pode vazar estado entre itens.
4. **Use getters nativos para computeds.** Não crie `computed()` nem cache manual.
5. **Estado mutado fora do JavaScript deve passar por `reactive()`.** Mutar o objeto bruto não dispara efeitos.
6. **Registre todo efeito/listener com cleanup.** Efeitos via `bindEffect`; listeners no `document`/externos devem ser removidos no `cleanupTree` e/ou protegidos por `isConnected`.
7. **Remova os atributos de diretiva após o processamento.** CSS e queries externas não podem depender deles em runtime.
8. **Acesse refs como `Map`:** `$refs.get('nome')` e, em listas com chave, `$refs.get('nome').get(chave)`.
9. **Não edite artefatos gerados** (`dist/`, `.codegraph/`, `repomix-output.md`, `package-lock.json` manualmente).
10. **Não publique pela raiz.** Use `npm run dist` apenas quando for solicitado.
11. **Preserve a compatibilidade standalone:** nada de APIs exclusivas de Node em `src/`, e proteja acessos a `window`/`document` com guards quando executados na importação.
12. **Não presuma testes automatizados.** `npm test` é placeholder; valide com `npm run build` e manualmente via `npm run dev` + `index.html`.

## 7. Convenções de código

- TypeScript estrito, módulos ESM, `target`/`module` `ESNext`.
- Prettier: sem ponto e vírgula, aspas simples, indentação de 2 espaços, largura 80 (`npm run format`).
- Código funcional e modular; mantenha a separação `reactivity` / `parser` / `evaluator`.
- Comentários e JSDoc em **português** no código-fonte; a skill pública (`skills/jsweb-ui/SKILL.md`) é em **inglês**; `README`, `PROJECT` e `CHANGELOG` em **português**.
- Não use `any` onde um tipo preciso for viável; os internos do parser usam `any` para o contexto dinâmico.
- Commits no padrão Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `build:`, `chore:`).
- Versões seguem SemVer; registre mudanças em `CHANGELOG.md` antes de publicar.

## 8. Checklist para alterar ou criar diretiva

1. Implemente em `src/parser.ts`, integrando ao fluxo correto (`parseNode` para diretivas estruturais; `processAttributes` para as demais).
2. Trate as duas grafias (`ui:x` e `:x`, ou `ui@x` e `@x`) quando aplicável; `ui-cloak` é a exceção intencional, sem shorthand.
3. Garanta a ordem de detecção antes do fallback genérico de bind de atributo.
4. Crie efeitos com `bindEffect` e registre cleanup de listeners/refs.
5. Remova os atributos do DOM após a inicialização.
6. Preserve herança/sombreamento de contexto e o comportamento de `$index`/`$key` em listas.
7. Atualize a documentação: `README.md`, `PROJECT.md`, `skills/jsweb-ui/SKILL.md` e `CHANGELOG.md`.
8. Rode `npm run format` e `npm run build`.
9. Valide manualmente o caso de uso em `index.html` com `npm run dev` (incluindo remoção de itens/condicionais para checar vazamentos).

## 9. Sincronização de documentação

O projeto mantém quatro documentos que devem permanecer coerentes entre si e com `src/`:

| Arquivo                    | Público       | Conteúdo                                         |
| :------------------------- | :------------ | :----------------------------------------------- |
| `README.md`                | Usuários/devs | Instalação, diretivas, exemplos e API.           |
| `PROJECT.md`               | Mantenedores  | Especificação técnica e decisões arquiteturais.  |
| `skills/jsweb-ui/SKILL.md` | Agentes de IA | Referência operacional, regras e padrões de uso. |
| `CHANGELOG.md`             | Todos         | Mudanças notáveis no padrão Keep a Changelog.    |

Há um workflow detalhado em `.agents/skills/update-documentation/SKILL.md`; use-o quando a tarefa for atualizar documentação. Observação: alguns links desse arquivo usam caminhos absolutos antigos de Windows (`d:/Projetos/...`); trate-os como relativos à raiz deste repositório. Após atualizar docs, rode `npm run format` e `npm run build` e confirme que `dist/README.md`, `dist/CHANGELOG.md` e `dist/SKILL.md` foram regravados.

## 10. Pegadinhas conhecidas

- `evaluate` falha silenciosamente (`undefined`); se um binding “não aparece”, verifique erros de sintaxe e o contexto disponível, e use `evaluateEvent`/console para eventos.
- `createScope` injeta `$el`, `$emit` e `$refs` **no objeto de contexto recebido**; reutilizar o mesmo objeto em múltiplas montagens compartilha `$refs`.
- `:if` não limpa efeitos ao esconder o elemento; não presuma que efeitos internos pararam. Só a remoção via `cleanupTree` os encerra.
- `:for` substitui o elemento original por um clone por item; atributos no próprio elemento do loop são processados no clone.
- `processAttributes` trata qualquer `ui:`/`:` desconhecido como bind de atributo — uma nova diretiva precisa ser reconhecida antes desse fallback.
- `.outside` adiciona listener no `document`; sem cleanup (ou guarda `isConnected`) ele continua vivo após o nó sair do DOM.
- `ui-cloak` só é removido se a subárvore for parseada; com `:scope` avaliando falsy, o elemento permanece oculto (comportamento seguro, pois o conteúdo não foi processado).
- `crypto.randomUUID()` é usado como âncora de `:if`/`:for`; requer ambiente moderno/secure context.
- `new Function` + `with` é intencional (sandbox de expressões) e incompatível com CSP restritiva.
- `Scope.$refs` é `protected` e `Scope.$el` é apenas `declare`; a atribuição real acontece no parser.
