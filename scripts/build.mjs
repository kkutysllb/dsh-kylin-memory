/** Build: typecheck-clean declarations + Host ESM bundle + Web client bundle.
 *
 * - lib/types: declaration emit (package.json `types` export); the client
 *   entry is host-internal and stays out of the published types.
 * - lib/index.js: Host bundle; framework `@deepseek-ai/*` imports stay
 *   external (the harness provides none to plugins), while the settings
 *   schema's schemastery + cosmokit are vendored under third_party/ and
 *   bundled in; @sinclair/typebox is bundled for a self-contained install.
 * - lib/client.js: Web client bundle in the client module-table contract —
 *   wrapped in window.__ModuleLoader__.load({ id, factory }) with `react` and
 *   the client UI packages resolved through the shell's require shim
 *   (参照 dsh-kylin-automation 的 __ModuleLoader__ 包装).
 * - Artifacts are committed to the repository: plugin installation must not
 *   run a build step on the user's machine.
 */

import { readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import ts from 'typescript'

const PACKAGE_ID = 'dsh-kylin-memory'

await rm('lib', { recursive: true, force: true })

// ── declaration emit ──────────────────────────────────────────────────────────
const rootNames = ts.sys.readDirectory('src', ['.ts'])
  .filter(name => !name.startsWith('src/client/'))
const program = ts.createProgram({
  rootNames,
  options: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowImportingTsExtensions: true,
    lib: ['lib.es2022.d.ts'],
    strict: true,
    skipLibCheck: true,
    declaration: true,
    emitDeclarationOnly: true,
    outDir: 'lib/types',
    rootDir: 'src',
    types: ['node'],
    // The vendored settings-schema library resolves like tsconfig.json's paths.
    baseUrl: '.',
    paths: { '@deepseek-ai/schemastery': ['./third_party/schemastery/index.d.mts'] },
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

// The settings schema library is vendored (third_party/) because the host
// runtime provides no @deepseek-ai/* modules to plugins; every other
// framework import stays external. onResolve takes precedence over the
// external glob, which pins the two vendored packages into the bundle.
const vendorSchemaLibs = {
  name: 'vendor-schema-libs',
  setup(build) {
    const vendored = {
      '@deepseek-ai/schemastery': 'third_party/schemastery/index.mjs',
      '@deepseek-ai/cosmokit': 'third_party/cosmokit/index.js',
    }
    build.onResolve({ filter: /^@deepseek-ai\/(schemastery|cosmokit)$/ }, (args) => ({
      path: resolve(vendored[args.path]),
    }))
  },
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
  plugins: [vendorSchemaLibs],
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
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', '@deepseek-ai/*'],
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
