/** Build: typecheck-clean declarations + Host ESM bundle.
 *
 * - lib/types: declaration emit (package.json `types` export).
 * - lib/index.js: Host bundle; `@deepseek-ai/*` stay external (provided by
 *   the harness); @sinclair/typebox is bundled for a self-contained install.
 * - Artifacts are committed to the repository: plugin installation must not
 *   run a build step on the user's machine.
 *
 * The web client bundle (lib/client.js) is added when the slot panel ships;
 * see docs/03-plan for the schedule.
 */

import { readFile, rm, writeFile } from 'node:fs/promises'
import { build } from 'esbuild'
import ts from 'typescript'

const PACKAGE_ID = 'dsh-kylin-memory'

await rm('lib', { recursive: true, force: true })

// ── declaration emit ──────────────────────────────────────────────────────────
const rootNames = ts.sys.readDirectory('src', ['.ts'])
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

// Whitespace-only lines inside generated template literals keep committed
// artifacts diff-dirty; normalize them.
for (const file of ['lib/index.js']) {
  const source = await readFile(file, 'utf8')
  await writeFile(file, source.replace(/[ \t]+$/gm, ''))
}

console.log(`[${PACKAGE_ID}] built host bundle`)
