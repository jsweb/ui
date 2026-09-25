---
name: jsweb-ui
description: Comprehensive guide and operational instructions for building reactive user interfaces with the @jsweb/ui micro-framework. Use this skill whenever creating, modifying, or refactoring web applications that use @jsweb/ui, or when building fine-grained reactive HTML components with custom directives (ui:*, :*, ui@*, @*), two-way data binding, conditional rendering, keyed list loops, DOM refs, and shared reactive stores without a Virtual DOM.
---

# @jsweb/ui Skill Guide

`@jsweb/ui` is a lightweight, zero-dependency frontend micro-framework written in TypeScript. It delivers Vue 3-inspired fine-grained reactivity (`Proxy` + `ReactiveEffect`) combined with Alpine.js-style declarative HTML attributes, applying updates directly to the real DOM without any Virtual DOM overhead.

---

## 1. Quick Start & Installation

### NPM / Bundler (Vite, Webpack, Rollup)

```bash
npm install @jsweb/ui
```

```typescript
import { createScope, reactive, watch } from '@jsweb/ui'

const state = reactive({
  count: 0,
  increment() {
    this.count++
  },
})

createScope('#app', state)
```

### Standalone CDN (Direct HTML / No Build Step)

Available via unpkg or jsDelivr. Exposes the global object `window.jsweb.ui`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script src="https://unpkg.com/@jsweb/ui"></script>
  </head>
  <body>
    <div :scope="{ count: 0 }">
      <h1 :text="count"></h1>
      <button @click="count++">+</button>
    </div>

    <script>
      const { createScope } = window.jsweb.ui
      createScope('body')
    </script>
  </body>
</html>
```

---

## 2. Core Architecture & Mental Model

1. **No Virtual DOM**: Changes to reactive properties mutate the real DOM directly using targeted granular effects.
2. **Deep Proxy Reactivity**: State created with `reactive()` wraps objects and arrays into reactive Proxies. Mutating nested properties or calling array methods (`push`, `pop`, `splice`, `shift`, etc.) triggers targeted DOM re-renders.
3. **Template Directives Cleanup**: Directive attributes (`:text`, `:bind`, `:if`, `:for`, `:class`, etc.) are evaluated and immediately removed from DOM elements after mounting, keeping the HTML clean.
4. **Context Hierarchy**: Scopes inherit variables from outer scopes or parent contexts. Expressions are safely evaluated in the context scope with dynamic evaluation (`with(this)`).
5. **Memory Safe & Auto-Cleanup**: When elements are removed (via `:if` or `:for`), all associated event listeners and reactive effects are automatically cleaned up.

---

## 3. JavaScript / TypeScript API Reference

### `reactive(target)`

Creates a deep reactive Proxy of the given object or array.

- **Object Literal Typing (`ThisType`)**: Wrapped in `ThisType<T & ScopeContext>`, enabling complete IDE autocompletion and strict type checking for `this.property`, `this.method()`, computeds via getters, and framework helpers (`this.$refs`, `this.$emit`).
- **Class Instances**: Fully supports TypeScript class instances (including those extending `Scope`).
- **Deep tracking**: Accessing nested objects returns nested reactive proxies automatically.
- **Array mutations**: Tracks index sets and automatically triggers updates for array length changes.
- **Computed properties**: Use native JavaScript getters (`get prop() { return ... }`). When accessed inside templates or effects, dependencies are automatically tracked.
- **Bypassed types**: `Map`, `Set`, `WeakMap`, `WeakSet`, `Date`, `RegExp`, and DOM `Node` instances are preserved as-is without proxy wrapping.

```typescript
import { reactive } from '@jsweb/ui'

const store = reactive({
  items: ['Learn @jsweb/ui', 'Build an app'],
  filter: '',
  // Native getter acts as a computed property:
  get filteredItems() {
    return this.items.filter((item) =>
      item.toLowerCase().includes(this.filter.toLowerCase()),
    )
  },
  addItem(text: string) {
    if (text.trim()) {
      this.items.push(text.trim())
      this.$emit('item-added', text.trim())
    }
  },
})
```

---

### `Scope` Class & `ScopeContext` Interface

For Object-Oriented component architecture, extend the base `Scope` class. `$refs` is implemented as a read-only `Map` and `$emit` has a standard implementation as `protected`, allowing subclasses to override it:

```typescript
export interface ScopeContext {
  /** Read-only Map indexing referenced DOM nodes */
  readonly $refs: Map<string, any>
  /** Dispatches CustomEvents */
  $emit: (event: string, detail?: any) => void
  /** Root DOM element attached to the scope (read-only) */
  readonly $el: HTMLElement
  /** Current loop index */
  $index?: number
  /** Unique key for loop iteration */
  $key?: any
}

export class Scope {
  readonly $el: HTMLElement
  protected readonly $refs: Map<string, any>
  protected $emit(event: string, detail?: any): void
  declare $index?: number
  declare $key?: any
  constructor(init?: Record<string, any>)
}
```

#### OOP Example:

```typescript
import { createScope, reactive, Scope } from '@jsweb/ui'

class TodoListScope extends Scope {
  tasks: string[] = []
  newTask = ''

  get count() {
    return this.tasks.length
  }

  addTask() {
    if (this.newTask.trim()) {
      this.tasks.push(this.newTask.trim())
      this.newTask = ''
      this.$emit('tasks-updated', this.tasks)
      this.$refs.get('taskInput')?.focus()
    }
  }

  // Can override $emit if custom logic is needed:
  protected override $emit(event: string, detail?: any) {
    console.log(`[Event: ${event}]`, detail)
    super.$emit(event, detail)
  }
}

const todoScope = reactive(new TodoListScope())
createScope('#todo-app', todoScope)
```

---

### `watch<T>(source, callback, options?)`

Watches a reactive property or getter function and fires a callback when its value changes.

- `source`: A getter function `() => value` or a reactive object/array directly (auto-traversed).
- `callback`: `(newValue: T, oldValue: T | undefined) => void`.
- `options`: `{ immediate?: boolean }`. If `immediate: true`, the callback runs immediately on registration (`oldValue` will be `undefined`).
- **Returns**: A `stop()` function to cancel the watcher.

```typescript
import { reactive, watch } from '@jsweb/ui'

const state = reactive({ count: 0 })

const unwatch = watch(
  () => state.count,
  (newVal, oldVal) => {
    console.log(`Count changed from ${oldVal} to ${newVal}`)
  },
  { immediate: true },
)

// When done:
// unwatch()
```

---

### `createScope<T>(selectorOrElement, context?)`

Mounts the reactive engine on a DOM element and parses directives within that tree.

- `selectorOrElement`: A CSS selector string (e.g. `'#app'`, `'body'`) or an `HTMLElement`.
- `context`: An optional initial state object or shared context, typed contextually with `ThisType<T & ScopeContext>`.
- **Automatic Injections**:
  - `context.$emit`: Dispatches bubbling, composed `CustomEvent`s.
  - `context.$refs`: Native `Map<string, any>` storing DOM element references.

```typescript
import { createScope, reactive } from '@jsweb/ui'

const appState = reactive({
  title: 'My Application',
  user: { name: 'Alice' },
})

createScope('#app', appState)
```

---

## 4. Template Directives & Attributes

All directives support both the full syntax (`ui:*`, `ui@*`) and the concise shorthand (`:*`, `@*`). The shorthand is recommended for concise templates.

| Directive    | Shorthand  | Purpose                                                | Example                                    |
| :----------- | :--------- | :----------------------------------------------------- | :----------------------------------------- |
| `ui:scope`   | `:scope`   | Defines local state scope for element and descendants  | `<div :scope="{ open: false }">`           |
| `ui:text`    | `:text`    | Sets reactive `textContent`                            | `<span :text="username"></span>`           |
| `ui:bind`    | `:bind`    | Two-way data binding for form inputs                   | `<input type="text" :bind="query" />`      |
| `ui:if`      | `:if`      | Conditionally mounts/unmounts element in DOM           | `<div :if="isLoggedIn">Welcome</div>`      |
| `ui:for`     | `:for`     | Repeats element over an array (`in` or `of`)           | `<li :for="item of items">`                |
| `ui:key`     | `:key`     | Reconciliation key for list recycling                  | `<li :for="user of users" :key="user.id">` |
| `ui:class`   | `:class`   | Reactive CSS classes (Object, Array, or String)        | `<div :class="{ active: isActive }">`      |
| `ui:style`   | `:style`   | Reactive inline styles (Object key-value)              | `<div :style="{ color: themeColor }">`     |
| `ui:ref`     | `:ref`     | Registers DOM element into `$refs` `Map`               | `<input :ref="searchField" />`             |
| `ui:[attr]`  | `:[attr]`  | Dynamic attribute binding (`:disabled`, `:href`, etc.) | `<button :disabled="isSubmitting">`        |
| `ui@[event]` | `@[event]` | Event listener with modifier support                   | `<button @click.prevent="submit">`         |

---

### Detailed Directive Specifications

#### 1. `:scope`

Sets up a local reactive scope. If an object is supplied, it is merged into the context hierarchy.

```html
<div :scope="{ count: 0, title: 'Counter' }">
  <h2 :text="title"></h2>
  <button @click="count++">Increment</button>
  <span :text="count"></span>
</div>
```

#### 2. `:text`

Updates `textContent`. If the evaluated value is `null` or `undefined`, sets empty text `""`.

```html
<p>Total: <strong :text="totalPrice"></strong></p>
```

#### 3. `:bind` (Two-Way Data Binding)

Automatically handles different input types:

- **Text / Number / Search / Textarea**: Binds `value` property, updates state on the `'input'` event.
- **Checkbox (`type="checkbox"`)**: Binds boolean `checked` property, updates state on `'change'`.
- **Radio (`type="radio"`)**: Sets `checked = (el.value === String(stateValue))`, updates state on `'change'`.
- **Select (`<select>`)**: Binds `value` property, updates state on `'change'`.

```html
<!-- Text / Textarea -->
<input type="text" :bind="user.name" />
<textarea :bind="user.bio"></textarea>

<!-- Checkbox (boolean) -->
<input type="checkbox" :bind="user.agreeToTerms" />

<!-- Radios -->
<input type="radio" name="plan" value="free" :bind="selectedPlan" /> Free
<input type="radio" name="plan" value="pro" :bind="selectedPlan" /> Pro

<!-- Select -->
<select :bind="selectedCountry">
  <option value="BR">Brazil</option>
  <option value="US">USA</option>
</select>
```

#### 4. `:if`

Performs true conditional rendering. When false, the element is detached from the DOM and replaced by a lightweight comment node placeholder. When true, it is inserted back.

```html
<div :if="errorMessage" class="alert alert-danger">
  <span :text="errorMessage"></span>
</div>
```

#### 5. `:for` and `:key`

Iterates over an array using `item of items` or `item in items`.

- **Always provide `:key`** for optimal performance and reliable reconciliation.
- Exposes `$index` (0-based numeric index) and `$key` in the loop's context.
- Recycles existing DOM nodes based on key matches, preserving focus, scroll, and component state.

```html
<ul>
  <li :for="task of tasks" :key="task.id">
    <span :text="$index + 1"></span>.
    <span :text="task.title"></span>
    <button @click="removeTask(task.id)">Delete</button>
  </li>
</ul>
```

#### 6. `:class`

Dynamically manages CSS classes without removing existing static classes on the element.

- **Object Syntax**: Keys are class names, values are boolean conditions.
  ```html
  <div
    class="card"
    :class="{ 'card-active': isActive, 'border-danger': hasError }"
  ></div>
  ```
- **Array Syntax**: Array of class name strings or ternary expressions.
  ```html
  <div
    :class="['badge', isPrimary ? 'badge-primary' : 'badge-secondary']"
  ></div>
  ```
- **String Syntax**: Single dynamic class name string.
  ```html
  <div :class="themeClass"></div>
  ```

#### 7. `:style`

Receives an object of CSS properties. Automatically removes previous styles when keys are removed or cleared.

```html
<div
  :style="{ backgroundColor: bgColor, transform: `scale(${scale})`, opacity: isVisible ? 1 : 0 }"
></div>
```

#### 8. `:ref` and `$refs`

Registers the DOM element into the context's `$refs` `Map`.

- **Single Element**: Directly stored as the `HTMLElement`.
  ```html
  <input type="text" :ref="nameInput" />
  <button @click="$refs.get('nameInput').focus()">Focus Input</button>
  ```
- **Inside Keyed `:for` Loops**: Stored as a nested `Map<Key, HTMLElement>`.
  ```html
  <ul>
    <li :for="item of items" :key="item.id">
      <input :ref="itemField" :value="item.name" />
      <button @click="$refs.get('itemField').get(item.id)?.focus()">
        Focus this row
      </button>
    </li>
  </ul>
  ```
- **Automatic Lifecycle Cleanup**: When an element leaves the DOM (via `:if` or `:for`), its entry is removed from the `$refs` map to prevent memory leaks.

#### 9. Dynamic Attributes (`:[attr]`)

Binds any HTML attribute dynamically:

- If evaluated value is `false`, `null`, or `undefined`: attribute is removed.
- If evaluated value is `true`: attribute is added with empty value (`el.setAttribute(attr, '')`).
- Otherwise: `el.setAttribute(attr, String(value))`.

```html
<button :disabled="isLoading">Submit</button>
<a :href="user.profileUrl" :title="user.bio">Profile</a>
<img :src="imageUrl" :alt="imageAlt" />
```

---

## 5. Event Handling & Modifiers

### Event Directives (`@[event]` / `ui@[event]`)

Attach DOM event listeners.

```html
<!-- Method reference: automatically receives $event as first argument -->
<button @click="handleClick">Click Me</button>

<!-- Inline expression: $event is explicitly available -->
<button @click="handleClick($event, 'customArg')">Click Me</button>

<!-- Direct mutation -->
<button @click="count++">Increment</button>
```

### Event Modifiers

Modifiers can be chained directly to the event name:

- **`.prevent`**: Calls `$event.preventDefault()`.
- **`.stop`**: Calls `$event.stopPropagation()`.
- **`.self`**: Only executes the handler if `$event.target === el` (the event originated on the bound element itself).
- **`.outside`**: Dispatches when a click or event occurs outside the element (ideal for dropdowns, tooltips, and modals). Sets up a document listener with automatic cleanup when the element unmounts.

```html
<!-- Prevent default form submission -->
<form @submit.prevent="saveData">
  <input :bind="formData.title" />
  <button type="submit">Save</button>
</form>

<!-- Stop event propagation -->
<div @click="outerClick">
  <button @click.stop="innerClick">Inner</button>
</div>

<!-- Click outside to close modal or dropdown -->
<div class="dropdown-menu" :if="isOpen" @click.outside="isOpen = false">
  <p>Dropdown Content</p>
</div>
```

---

## 6. Context Helpers & Variables

Available within template expressions and component methods:

| Variable                | Type               | Description                                                                 |
| :---------------------- | :----------------- | :-------------------------------------------------------------------------- |
| `$refs`                 | `Map<string, any>` | Map of registered element refs.                                             |
| `$emit(event, detail?)` | `Function`         | Dispatches a bubbling composed `CustomEvent` from the scope's root element. |
| `$el`                   | `HTMLElement`      | The root DOM element attached to the scope (read-only).                     |
| `$event`                | `Event`            | The native DOM event object (available in event expressions).               |
| `$index`                | `number`           | The current 0-based iteration index in a `:for` loop.                       |
| `$key`                  | `any`              | The current key value evaluated for the item in a `:for` loop.              |

### Component Communication with `$emit`

Child scopes can dispatch events up the DOM tree, and parents can listen with standard `@` event syntax:

```html
<div id="parent-component" @task-added="handleNewTask">
  <!-- Child Component / Scope -->
  <div :scope="{ newTaskName: '' }">
    <input :bind="newTaskName" placeholder="New task..." />
    <button
      @click="$emit('task-added', { name: newTaskName }); newTaskName = ''"
    >
      Add Task
    </button>
  </div>
</div>
```

---

## 7. Common Patterns & Best Practices

### Pattern 1: Standalone Interactive Widget (HTML Only)

No build step needed. Place everything in an HTML file:

```html
<div
  id="calculator"
  :scope="{
  a: 0,
  b: 0,
  get sum() { return Number(this.a) + Number(this.b) }
}"
>
  <input type="number" :bind="a" /> + <input type="number" :bind="b" /> =
  <span :text="sum"></span>
</div>

<script>
  window.jsweb.ui.createScope('#calculator')
</script>
```

### Pattern 2: Global Shared Store (TypeScript / ESM)

Export a `reactive` store from a module and import it across multiple views or components:

```typescript
// store.ts
import { reactive } from '@jsweb/ui'

export const authStore = reactive({
  user: null as { name: string; token: string } | null,
  get isAuthenticated() {
    return this.user !== null
  },
  login(name: string, token: string) {
    this.user = { name, token }
  },
  logout() {
    this.user = null
  },
})
```

```typescript
// main.ts
import { createScope } from '@jsweb/ui'
import { authStore } from './store'

createScope('#navbar', { auth: authStore })
createScope('#main-content', { auth: authStore })
```

### Pattern 3: Full CRUD List with Keys & Refs

```html
<div id="todo-app">
  <h2>Todo List</h2>

  <form @submit.prevent="addTodo">
    <input
      type="text"
      :bind="newTitle"
      :ref="titleInput"
      placeholder="Add task..."
    />
    <button type="submit" :disabled="!newTitle.trim()">Add</button>
  </form>

  <ul>
    <li :for="todo of todos" :key="todo.id">
      <input type="checkbox" :bind="todo.completed" />
      <span
        :style="{ textDecoration: todo.completed ? 'line-through' : 'none' }"
        :text="todo.title"
      ></span>
      <button @click="deleteTodo(todo.id)">✕</button>
    </li>
  </ul>
</div>

<script type="module">
  import { createScope, reactive } from '@jsweb/ui'

  let nextId = 1
  const app = reactive({
    newTitle: '',
    todos: [
      { id: nextId++, title: 'Buy milk', completed: false },
      { id: nextId++, title: 'Write tests', completed: true },
    ],
    addTodo() {
      if (!this.newTitle.trim()) return
      this.todos.push({
        id: nextId++,
        title: this.newTitle.trim(),
        completed: false,
      })
      this.newTitle = ''
      this.$refs.get('titleInput')?.focus()
    },
    deleteTodo(id) {
      const idx = this.todos.findIndex((t) => t.id === id)
      if (idx !== -1) this.todos.splice(idx, 1)
    },
  })

  createScope('#todo-app', app)
</script>
```

### Pattern 4: Modal / Popover with `@click.outside`

```html
<div :scope="{ isOpen: false }">
  <button @click="isOpen = true">Open Details</button>

  <div class="modal-backdrop" :if="isOpen">
    <div class="modal-card" @click.outside="isOpen = false">
      <h3>Modal Title</h3>
      <p>Clicking outside this box automatically closes the modal.</p>
      <button @click="isOpen = false">Close</button>
    </div>
  </div>
</div>
```

---

## 8. Critical Rules for AI Coding Agents

When generating, editing, or diagnosing `@jsweb/ui` code, adhere to these rules:

1. **Do NOT inject Virtual DOM or JSX**: `@jsweb/ui` operates directly on standard HTML DOM nodes. Do not import React, JSX runtimes, or attempt to return VNodes.
2. **Always supply `:key` in `:for` loops**: When generating lists with `:for`, always include `:key="item.id"` (or another unique identifier) to ensure efficient element recycling and avoid state leakage between list items.
3. **Use Native Getters for Computed State**: Do not invent a `computed()` function. `@jsweb/ui` uses standard JavaScript getters on reactive objects (`get myProp() { ... }`).
4. **Wrap Root State with `reactive()`**: If mutating properties from JavaScript, ensure the object was wrapped in `reactive()`. Mutating a plain unproxied object will not trigger DOM updates.
5. **Remember Directive Attributes Disappear from DOM**: Directives like `:text`, `:bind`, and `:if` are stripped during parsing. Do not write CSS selectors or external DOM queries relying on directive attributes remaining on elements in runtime.
6. **Use `$refs.get('key')`**: `$refs` is a JavaScript `Map`. Access references using `$refs.get('name')`, not `$refs.name`. In keyed `:for` loops, access nested elements with `$refs.get('name').get(key)`.
7. **Two-Way Binding on Inputs**: Always use `:bind="prop"`. Avoid manually pairing `:value="prop"` and `@input="prop = $event.target.value"` unless custom debouncing or data conversion is needed.
8. **Scope Merging**: When calling `createScope(selector, state)`, the properties of `state` become directly accessible in that DOM subtree. If `:scope="{ ... }"` is also defined on the HTML element, the inline scope inherits and shadows properties from the parent state.
