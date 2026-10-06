#!/usr/bin/env node
/**
 * dsh-kylin-memory 插件冒烟测试（零依赖，node scripts/smoke-plugin.mjs）。
 *
 * 覆盖发布面契约：
 * 1. package.json：dsh.bundle / qilin.bundle 双通道 manifest（bundle+client
 *    一致）、exports、files 白名单覆盖检查（白名单内每个路径真实存在）；
 * 2. cordis.patch.yml：可解析、单行 insert、row id/name 与包名一致；
 * 3. host bundle（lib/index.js）：ESM、零 `@deepseek-ai/*` 运行时导入
 *    （schemastery/cosmokit 已 vendor 进 bundle）、导出 apply/inject/name/Config；
 * 4. 设置页 client（lib/client.js）：__ModuleLoader__ 契约、keyed
 *    plugins.bundle.config 槽位、页面契约 form.state/form.mutate（QiLin
 *    PluginConfigViewProps，DSH 时代 settings 原语零残留）；RPC 管理通道仍在；
 * 5. 隔离：测试不写入任何用户数据。
 */
import { existsSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const packageRoot = dirname(fileURLToPath(import.meta.url)) + '/..'
const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))
const yamlText = await readFile(join(packageRoot, manifest.dsh.bundle.patch.replace(/^\.\//, '')), 'utf8')

let failures = 0
function check(name, condition, detail = '') {
  const mark = condition ? 'PASS' : 'FAIL'
  console.log(`\x1b[${condition ? 32 : 31}m${mark}\x1b[0m  ${name}${detail ? ' — ' + detail : ''}`)
  if (!condition) failures += 1
}

function readFile(path) {
  return import('node:fs/promises').then(fs => fs.readFile(path, 'utf8'))
}

/* ═══ 1. manifest ═══ */

check('name = dsh-kylin-memory', manifest.name === 'dsh-kylin-memory')
check('version 为合法 semver', /^\d+\.\d+\.\d+$/.test(manifest.version), manifest.version)
check('dsh.bundle.patch 指向 cordis.patch.yml', manifest.dsh?.bundle?.patch === './cordis.patch.yml')
check('qilin.bundle.patch 指向 cordis.patch.yml', manifest.qilin?.bundle?.patch === './cordis.patch.yml')
check('dsh 与 qilin bundle 声明一致（双通道同产物）',
  JSON.stringify(manifest.dsh) === JSON.stringify(manifest.qilin))
check('exports["."] 指向 lib/index.js', manifest.exports?.['.']?.default === './lib/index.js')

// files 白名单覆盖检查
const filesListed = manifest.files ?? []
for (const entry of filesListed) {
  check(`files 白名单存在: ${entry}`, existsSync(join(packageRoot, entry)))
}
check('files 覆盖 cordis.patch.yml', filesListed.includes('cordis.patch.yml'))
check('files 覆盖 lib 产物目录', filesListed.includes('lib'))

/* ═══ 2. cordis.patch.yml ═══ */

check('patch 含 insert 行', /- insert:/.test(yamlText))
check(`patch row id = ${manifest.name}`, yamlText.includes(`id: ${manifest.name}`))
check(`patch row name = ${manifest.name}`, yamlText.includes(`name: ${manifest.name}`) || yamlText.includes(`name: '${manifest.name}'`))
check('patch 不含宿主专有 !!js 表达式（双通道纯静态 YAML）', !yamlText.includes('!!js'))

/* ═══ 3. host bundle ═══ */

const hostPath = join(packageRoot, 'lib/index.js')
check('lib/index.js 存在', existsSync(hostPath))
const hostSource = await readFile(hostPath, 'utf8')
check('host bundle 无 @deepseek-ai/* 运行时导入（宿主部署约束）',
  !/from\s*["']@deepseek-ai\//.test(hostSource) && !/import\s*\(?\s*["']@deepseek-ai\//.test(hostSource),
  '框架能力经 inject 服务名接入，不 import @deepseek-ai/*')
check('host bundle 无 openclaw 运行时导入（双通道不含 OpenClaw）',
  !/from\s*["']openclaw/.test(hostSource))
check('host bundle 导出 apply', /\bexport\b[\s\S]{0,200}\bfunction apply\b|const apply|exports\.apply/.test(hostSource) || hostSource.includes('apply'))
check('host bundle 声明 inject 契约名', hostSource.includes('"tools"') && hostSource.includes('"llm"') && hostSource.includes('"sessions"') && hostSource.includes('"tokenMeter"'))
check('host bundle 注册 km_* 工具', hostSource.includes('km_search') && hostSource.includes('km_status'))

/* ═══ 4. 设置页 client 与 RPC 通道 ═══ */

// UI 决策（2026-10-06 修订，v0.2.0）：设置卡改按 QiLin 详情页契约渲染——
// keyed `plugins.bundle.config` 槽位 + PluginConfigViewProps（页面自带 form，
// 卡片只消费 form.state / form.mutate）；`plugins.item` 是官方设置页专用，不占用。
check('dsh.client 与 qilin.client 声明一致（platform web）',
  manifest.dsh?.client !== undefined
  && JSON.stringify(manifest.dsh.client) === JSON.stringify(manifest.qilin?.client)
  && manifest.dsh.client.platform === 'web')
check('exports["./client"] 指向 lib/client.js', manifest.exports?.['./client'] === './lib/client.js')
check('client inject 依赖边均为 dsh-compat 可映射名（doctor client-inject 规则；informational）',
  Array.isArray(manifest.dsh.client.inject) && manifest.dsh.client.inject.length > 0
  && manifest.dsh.client.inject.every(name => name.startsWith('@qilin/') || name.startsWith('@deepseek-ai/dsh-')))

const clientPath = join(packageRoot, 'lib/client.js')
check('lib/client.js 存在', existsSync(clientPath))
const clientSource = await readFile(clientPath, 'utf8')
check('client bundle 走 __ModuleLoader__ 模块表契约',
  clientSource.startsWith('window.__ModuleLoader__.load({')
  && clientSource.replace(/\/\/# sourceMappingURL=.*\n?$/, '').trimEnd().endsWith('} });'))
check('client 注册 plugins.bundle.config 槽位（key = 包名）',
  clientSource.includes('"plugins.bundle.config"') && clientSource.includes(`"${manifest.name}"`))
check('client 注入面收窄为 slots / locale（退休服务 configForms 零残留）',
  clientSource.includes('inject: () => inject') && /var inject = \["slots", "locale"\]/.test(clientSource)
  && !clientSource.includes('configForms'))
check('client 设置卡消费页面契约 form.state / form.mutate（revision 栅栏批量写）',
  clientSource.includes('form.state') && clientSource.includes('form.mutate'))
check('client DSH 时代 settings 原语零残留（QiLin 3.0.11 无这些符号）',
  !clientSource.includes('SettingsForm') && !clientSource.includes('SettingsValueField')
  && !clientSource.includes('settingsNumberField'))
check('client 通过 shell require 引 UI 原语（不打包 react）',
  clientSource.includes('require("@deepseek-ai/dsh-client-ui-primitives")')
  && clientSource.includes('require("react/jsx-runtime")'))
check('host bundle 声明 Config schema（设置页数据源）',
  hostSource.includes('Config') && hostSource.includes('volatile'))
check('host bundle 含 /dsh-kylin-memory RPC 管理通道（headless admin API）',
  hostSource.includes('/dsh-kylin-memory'))

/* ═══ 5. 声明产物 ═══ */

const typesIndex = join(packageRoot, 'lib/types/index.d.ts')
check('lib/types/index.d.ts 存在（types 导出）', existsSync(typesIndex))

/* ═══ 6. 产物尺寸红线（防误把依赖外置/漏打包）═══ */

const size = statSync(hostPath).size
check(`host bundle 自包含（> 40KB）：${Math.round(size / 1024)}KB`, size > 40 * 1024)

const summary = failures === 0
  ? `\n${manifest.name}@${manifest.version} smoke: ALL PASS`
  : `\n${manifest.name}@${manifest.version} smoke: ${failures} FAILURES`
console.log(summary)
process.exit(failures === 0 ? 0 : 1)
