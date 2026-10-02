#!/usr/bin/env node
/**
 * dsh-kylin-memory → dsh-plugins 真源镜像同步。
 *
 * 方向：本仓（开发真源）→ ../dsh-plugins/dsh-kylin-memory/（分发镜像）。
 * 镜像内容 = package.json files 白名单 + package.json + LICENSE（可安装包形态）；
 * 不镜像 src/tsconfig/tests/node_modules/pnpm-lock/.git 等。
 *
 * 用法：
 *   node scripts/sync-to-dsh-plugins.mjs          # 执行镜像（rm+cp 重建）
 *   node scripts/sync-to-dsh-plugins.mjs --check  # 对账：零差异 exit 0；有差异列详情 exit 1
 *
 * 环境变量：KCODER_PLUGINS_DIR 可覆盖 dsh-plugins 仓位置（缺省 ../dsh-plugins）。
 *
 * 发版约定：本仓改动推送前先跑本脚本同步镜像并在 dsh-plugins 仓提交推送，
 * 保证两个安装入口（独立仓 / dsh-plugins 子目录）内容一致。
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const DEFAULT_PLUGINS_DIR = resolve(REPO_ROOT, '..', 'dsh-plugins')
const PLUGINS_DIR = process.env.KCODER_PLUGINS_DIR
  ? resolve(process.env.KCODER_PLUGINS_DIR)
  : DEFAULT_PLUGINS_DIR
const MIRROR = join(PLUGINS_DIR, 'dsh-kylin-memory')

const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'))
// `files` 白名单 + LICENSE，另**必须**显式带上 package.json：npm 打包时自动
// 包含 manifest 所以 files 里从不写它，但镜像目录是按路径安装的——没有
// manifest 时 pnpm 会以 0.0.0 装进一个没有 `dsh.bundle.patch` / `exports` 的
// 空壳目录，插件根本加载不起来。--check 会把它当差异拦住。
const COPY_ENTRIES = [
  'package.json',
  ...manifest.files.filter(entry => entry !== 'README.md'),
  'LICENSE',
]
const checkMode = process.argv.includes('--check')

if (!existsSync(PLUGINS_DIR)) {
  console.error(`dsh-plugins 仓不存在: ${PLUGINS_DIR}`)
  process.exit(1)
}

/** Flatten one files entry (plain file or directory) into real file paths. */
function flatten(entry) {
  const abs = join(REPO_ROOT, entry)
  if (!existsSync(abs)) throw new Error(`missing files entry: ${entry}`)
  if (statSync(abs).isFile()) return [entry]
  const out = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const rel = relative(REPO_ROOT, join(dir, name))
      if (statSync(join(dir, name)).isDirectory()) walk(join(dir, name))
      else out.push(rel)
    }
  }
  walk(abs)
  return out
}

const expected = new Set()
for (const entry of COPY_ENTRIES) {
  for (const path of flatten(entry)) expected.add(path)
}

/** Relative-path diff between mirror and expectation (null when identical). */
function diffMirror() {
  if (!existsSync(MIRROR)) return { missing: [...expected], extra: [], changed: [] }
  const mirrored = new Set()
  const walkMirror = (dir) => {
    for (const name of readdirSync(dir)) {
      const rel = relative(MIRROR, join(dir, name))
      if (statSync(join(dir, name)).isDirectory()) walkMirror(join(dir, name))
      else mirrored.add(rel)
    }
  }
  walkMirror(MIRROR)
  const missing = [...expected].filter(p => !mirrored.has(p))
  const extra = [...mirrored].filter(p => !expected.has(p))
  const changed = []
  for (const rel of expected) {
    if (!mirrored.has(rel)) continue
    const a = readFileSync(join(REPO_ROOT, rel))
    const b = readFileSync(join(MIRROR, rel))
    if (!a.equals(b)) changed.push(rel)
  }
  return { missing, extra, changed }
}

const diff = diffMirror()
if (checkMode) {
  const clean = diff.missing.length === 0 && diff.extra.length === 0 && diff.changed.length === 0
  if (clean) {
    console.log(`[dsh-kylin-memory] mirror in sync: ${MIRROR}`)
    process.exit(0)
  }
  console.error('[dsh-kylin-memory] mirror out of sync — run: node scripts/sync-to-dsh-plugins.mjs')
  if (diff.missing.length) console.error('  missing : ' + diff.missing.join(', '))
  if (diff.extra.length) console.error('  extra   : ' + diff.extra.join(', '))
  if (diff.changed.length) console.error('  changed : ' + diff.changed.join(', '))
  process.exit(1)
}

rmSync(MIRROR, { recursive: true, force: true })
mkdirSync(MIRROR, { recursive: true })
for (const rel of expected) {
  const dest = join(MIRROR, rel)
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(join(REPO_ROOT, rel), dest)
}
console.log(`[dsh-kylin-memory] mirrored ${expected.size} files → ${MIRROR}`)
console.log('记得在 dsh-plugins 仓提交推送，保持两个安装入口一致。')
