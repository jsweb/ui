# JS Web UI - Histórico de Desenvolvimento

Este documento serve como contexto histórico de todas as funcionalidades implementadas até o momento no **@jsweb/ui**, um micro-framework reativo, livre de dependências, de alta performance e sem Virtual DOM.

## 🧠 1. Core de Reatividade (`src/reactivity.ts`)
Construímos um motor baseado em **Signals** usando `Proxy` para interceptar leituras (`track`) e escritas (`trigger`).
- **Arquitetura `ReactiveEffect`:** A reatividade é gerenciada pela classe `ReactiveEffect`, permitindo controle refinado sobre o ciclo de vida dos efeitos (`stop`, `cleanup`) e garantindo limpeza eficiente de dependências para evitar vazamentos de memória. Também inclui micro-otimizações no rastreamento do Proxy para evitar buscas redundantes.
- **Deep Reactivity:** A reatividade funciona recursivamente em objetos profundamente aninhados.
- **Arrays e Mutabilidade:** Tratamento especial para arrays, onde a adição ou remoção de itens notifica dependências sobre a propriedade `length`, o que garante que loops reajam adequadamente a `.push`, `.pop`, etc.
- **Transparência:** O usuário final trabalha com dados mutáveis puros sem a necessidade de getters/setters explícitos (ex: `state.count++` em vez de `state.count.value++`).

## ⚙️ 2. Motor de Avaliação (`src/evaluator.ts`)
As expressões declaradas no HTML (ex: `:text="count + 1"`) são avaliadas de forma dinâmica.
- **Execução Sandboxed Contextual:** Utilização do bloco `with(this)` dentro de `new Function` para permitir que expressões acessem propriedades do contexto diretamente, sem poluir o escopo global.
- **Passagem Implícita e Explícita de Eventos:** O método `evaluateEvent` permite o uso de `$event` explícito (ex: `@click="log($event)"`) e também mapeia automaticamente a injeção do evento caso o usuário declare apenas o nome da função (ex: `@click="log"`).

## 🔤 3. Parser de Diretivas e DOM (`src/parser.ts`)
Em vez de Virtual DOM, manipulamos o DOM real empacotando atualizações através da função `effect`. O Parser lê o HTML e amarra os `effects`.

- **`:scope` (ou `ui:scope`):** Criação de escopos aninhados utilizando um esquema de herança de contextos (`createContext`) suportado por Proxies, permitindo "sombreamento" de propriedades corretas.
- **`:text`:** Renderização de conteúdo reativo como `textContent`.
- **`:if`:** Renderização condicional. O framework usa "âncoras" (`Comment Nodes`) para substituir dinamicamente o elemento no DOM quando a condição é falsa e restaurá-lo na posição exata quando for verdadeira.
- **`:for` e Reconciliação:** Renderização de listas utilizando algoritmo de *diffing*. O motor rastreia chaves (`:key` ou fallback para índice) de cada elemento gerado e reutiliza os mesmos nós DOM (`RenderedNode`). Isso traz performance massiva e garante que atributos nativos do navegador (ex: foco de um input) não se percam em mudanças reativas do array.
- **Atributos Genéricos (`:attr`):** Transformação dinâmica de qualquer atributo. Valores booleanos injetam/removem o atributo (ex: `disabled`).
- **Classes e Estilos Dinâmicos (`:class`, `:style`):** Suporte nativo a dicionários, arrays e strings lógicas para manipulação avançada de classes e estilos (ex: `:class="{ 'is-active': active }"`).
- **Eventos (`@event` e Modificadores):** Adição simples de ouvintes a qualquer evento DOM nativo. Inclui suporte nativo a **modificadores encadeados** com sintaxe de ponto (ex: `@submit.prevent`, `@click.stop`, `@click.self`, `@click.outside`) para um controle declarativo do comportamento do evento.
- **Eventos Customizados (`$emit`):** Injeção automática da função `$emit` em todos os escopos criados. Permite que componentes despachem `CustomEvents` nativos na árvore do DOM, facilitando a comunicação entre escopos (`@custom-event`).
- **Two-way Data Binding (`:bind`):** Suporte total a reatividade bidirecional (Tela <-> Estado) para `input[text]`, `input[checkbox]`, `input[radio]`, `<select>` e `<textarea>`. Sincroniza em tempo real tanto via evento `input` quanto `change`.

## 📦 4. Build e Bundling (`vite.config.ts`)
- O framework está formatado como uma biblioteca agnóstica para ser consumida como script direto ou módulo ESM via NPM.
- **Vite + Terser:** Optamos explicitamente por usar o *terser* em vez do *oxc* na etapa de minificação para atingir o nível máximo de compressão (cerca de ~1.8kB gzipped no estágio atual).
- Geração automática de pacotes de tipagem (`dts`).

## 🎯 Próximos Passos (Backlog Futuro Sugerido)
Para outros agentes, o framework atingiu um nível excepcional de maturidade (versão 0.2.0-ready). Os próximos passos lógicos envolvem a criação de testes unitários extensivos e a refatoração ou criação de um sistema robusto de roteamento e componentização via Web Components nativos, integrando esta sintaxe ao shadow DOM.
