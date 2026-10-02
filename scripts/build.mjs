/** Build: typecheck-clean declarations + Host ESM bundle + Web client bundle.
 *
 * - lib/types: declaration emit (package.json `types` export).
 * - lib/index.js: Host bundle; `@deepseek-ai/*` stay external (provided by
 *   the harness); @sinclair/typebox is bundled for a self-contained install.
 * - lib/client.js: Web client bundle in the client module-table contract —
 *   wrapped in window.__ModuleLoader__.load({ id, factory }) with `react`
 *   resolved through the shell's static module table.
 * - Artifacts are committed to the repository: plugin installation must not
 *   run a build step on the user's machine.
 */

import { readFile, rm, writeFile } from 'node:fs/promises'
import { build } from 'esbuild'
import ts from 'typescript'

const PACKAGE_ID = 'dsh-kylin-memory'

await rm('lib', { recursive: true, force: true })

// ── declaration emit ──────────────────────────────────────────────────────────
const rootNames = ts.sys.readDirectory('src', ['.ts', '.tsx'])
const program = ts.createProgram({
  rootNames,
  options: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowImportingTsExtensions: true,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    skipLibCheck: true,
    declaration: true,
    emitDeclarationOnly: true,
    outDir: 'lib/types',
    rootDir: 'src',
    types: ['node'],
  },
})
const emit = program.emit()
const diagnostics = ts.getPreEmitDiagnostics(program).concat(emit.diagnostics)
if (diagnostics.length > 0) {
  const host = {
    getCanonicalFileName: file => file,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => '\n',
  }
  process.stderr.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, host))
  process.exit(1)
}

// ── host bundle ───────────────────────────────────────────────────────────────
await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  outfile: 'lib/index.js',
  external: ['@deepseek-ai/*', 'cordis'],
})

// ── web client bundle ─────────────────────────────────────────────────────────
await build({
  entryPoints: ['src/client/index.tsx'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  outfile: 'lib/client.js',
  sourcemap: true,
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  banner: {
    js: [
      `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {`,
      'var module = { exports: {} }; var exports = module.exports;',
    ].join('\n'),
  },
  footer: {
    js: 'return module.exports; } });',
  },
})

// Whitespace-only lines inside generated template literals keep committed
// artifacts diff-dirty; normalize them.
for (const file of ['lib/index.js', 'lib/client.js']) {
  const source = await readFile(file, 'utf8')
  await writeFile(file, source.replace(/[ \t]+$/gm, ''))
}

console.log(`[${PACKAGE_ID}] built host and web client bundles`)
