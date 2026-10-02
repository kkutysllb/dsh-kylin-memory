/** Build: typecheck-clean declarations + Host ESM bundle.
 *
 * - lib/types: declaration emit (package.json `types` export).
 * - lib/index.js: Host bundle; `@deepseek-ai/*` stay external (provided by
 *   the harness); @sinclair/typebox is bundled for a self-contained install.
 * - Artifacts are committed to the repository: plugin installation must not
 *   run a build step on the user's machine.
 *
 * UI 决策（2026-10-02）：本插件不注册任何 Web client / slot——纯 Agent 工具
 * 入口（上游 graph-memory 同款）。宿主侧 /dsh-kylin-memory RPC 管理通道保留
 * （src/rpc.ts，headless 管理 API）；若未来恢复面板，client bundle 在此脚本
 * 追加，参照 dsh-kylin-automation 的 __ModuleLoader__ 包装。
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
