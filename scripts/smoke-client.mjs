/**
 * Smoke: load the built client bundle the way the shell's module table does and
 * run its `apply`, proving the entry no longer needs the DSH settings-form API.
 */
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

const code = readFileSync('lib/client.js', 'utf8')
let factory
const sandbox = {
  window: { __ModuleLoader__: { load: ({ id, factory: captured }) => { factory = captured } } },
  console,
  setTimeout,
  clearTimeout,
}
runInContext(code, createContext(sandbox))
if (typeof factory !== 'function') throw new Error('bundle did not register a module factory')

// The module table's own exports, as QiLin's client-ui-primitives publishes them.
const primitives = {
  Button: () => null,
  Input: () => null,
}
const react = {
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  createElement: (type, props, ...children) => ({ type, props, children }),
}
const jsxRuntime = {
  Fragment: 'Fragment',
  jsx: (type, props) => ({ type, props }),
  jsxs: (type, props) => ({ type, props }),
}
const requireStub = (specifier) => {
  if (specifier === 'react') return react
  if (specifier === 'react/jsx-runtime') return jsxRuntime
  if (specifier === '@deepseek-ai/dsh-client-ui-primitives') return primitives
  throw new Error(`unexpected module-table request: ${specifier}`)
}

const mod = factory(requireStub)
if (mod.inject?.includes('configForms')) throw new Error('client entry still injects the retired configForms service')

const registrations = []
const dictionaries = []
const ctx = {
  slots: {
    inject: (name, register) => { registrations.push(name); register() },
    register: (options) => { registrations.push(`${options.name}:${options.key}:${options.locale}`) },
  },
  locale: { register: (ns) => { dictionaries.push(ns) }, bind: () => (key) => key },
  effect: (register) => { register() },
}
mod.apply(ctx)

console.log('registered:', JSON.stringify(registrations))
console.log('dictionaries:', JSON.stringify(dictionaries))
if (!registrations.includes('plugins.bundle.config:dsh-kylin-memory:kylinMemory.settings')) {
  throw new Error('the bundle config card was not registered for the plugin page')
}
console.log('✓ client entry loads and registers against the current module table')
