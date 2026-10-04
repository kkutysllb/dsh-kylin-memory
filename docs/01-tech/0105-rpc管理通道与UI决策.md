# 0105 RPC 管理通道与 UI 决策记录

> 状态：与 `src/rpc.ts`、`src/client/`、`package.json` 当前实现同步。

## UI 决策（2026-10-02 定案 → 2026-10-04 修订）

2026-10-02 定案：本插件不注册任何 Web client / slot，采用纯 Agent 工具入口。理由：核心价值（上下文接管 + 自动召回）完全自动，不需要 UI 参与；管理操作由 `km_*` 工具承担；避免侧边栏拥挤。

**2026-10-04 修订（v0.1.3）**：增设**插件详情页设置表单**（数据面四个 live 字段：`freshTurnCount` / `maintenanceInterval` / `recallMaxNodes` / `semanticScoreThreshold`）。用户无法从文件层调整滚动保留轮数等参数是实际使用痛点，而宿主设置服务（`dsh-settings`）本身按"活跃插件 Config schema → 自动表单"设计，接入成本远低于面板。边界保持不变：

- 仍然**不做管理面板**：记忆列表/遗忘/统计继续走 `km_*` 工具与 headless RPC，不注册 `plugins.item`（那是官方设置页专用槽位），不新增侧边栏入口；
- 新增 `src/client/`：唯一职责是在 keyed `plugins.bundle.config` 槽位（bundle 详情页配置区，key = 包名）渲染 settings 表单，绑定 `ctx.configForms.get("dsh-kylin-memory")` 命名空间，`ctx.configForms.whileServed` 门控（插件未加载时表单整体消失）；
- 宿主侧 `Config` schema（`src/schema.ts`）只声明这四个 `.volatile()` 字段（免重启 live-edit）；schema 解析保留未知键，patch 的其余配置（`assistantTools`、`messageRetention` 等）仍全部文件层管理；
- smoke 由"无 client 块"反转为正向契约检查（`__ModuleLoader__` 包装、keyed 槽位、configForms 绑定、UI 原语经 shell require）。

### 宿主机制要点（实测 DeepSeek Harness 0.2.0-rc.2 运行时）

- `dsh-settings` 的 `SettingsForms.describe()` 枚举活跃插件条目，读模块导出的 `Config`（须有 `~standard` + `toJSON`），`volatileForm` 抽取 `.volatile()` 字段派生表单；命名空间 = patch insert 的 `id`；无 volatile 字段则整个命名空间不出现；
- volatile 字段在 config resolve 后是 cosmokit 协议的冻结引用（`Symbol.for("cosmokit.volatile.write")`），保存时 `_commitVolatile` 原地换值、**不重挂插件**——因此插件运行时必须用 `readLive()`（types.ts）穿透读取，`freshTurnCount` 等字段在 `apply` 里保留引用而非解包快照；
- 表单保存写入 profile 的用户覆盖层（bundle patch = 默认值层，UI 显示"已覆盖/恢复默认"），写入时按 schema 校验；
- 宿主不向插件提供 `@deepseek-ai/*` 模块：schemastery 3.18.4 + cosmokit 1.8.5（MIT）从宿主运行时原样 vendor 到 `third_party/` 并打进 `lib/index.js`（`Symbol.for` 跨副本互通，`dsh-settings` 用宿主自己的 schemastery `new z(toJSON())` 复原——同版本零漂移）。

## RPC 通道（headless 管理 API）

三个端点（POST `/dsh-kylin-memory/<endpoint>`，信封 `{type:"client-request",rpcId,method,payload}` → `{type:"server-response",rpcId,result}`，result 为 `RpcResult<T>`）：

| endpoint | payload | 返回 |
|---|---|---|
| `overview` | `{}` | 记忆统计全景（turn memories、导航词项/三元组/社区、抽取队列、向量、保留策略） |
| `memories` | `{sessionId?, limit≤200, offset}` | 最新轮次记忆列表（`listTurnMemories`，updated_at 倒序） |
| `forget` | `{sessionId?\|memoryId?, dryRun?}` | `forgetTurnMemories` 计数 |

安全：每个请求先过 `ctx.connection.requestRejection()`（Host/Origin + 浏览器登录态栅栏），body 限 1MB，参数有界校验，失败映射到 `RpcResult.error`。

## 可选面语义（重要设计决策）

`webServer`/`connection` **不进静态 `inject` 列表**。放进 inject 会让插件在没有 web 栈的极简 profile 里永远 pending（实测复现），违背"记忆功能不因面板缺失而失效"的原则。改为 cordis 动态子世界注入：

```ts
ctx.inject?.(["webServer", "connection"], (scoped) => registerMemoryRpc(scoped, deps));
```

web 栈存在时自动注册通道，消失时自动回收；极简 profile 下回调不触发，插件其余功能完整可用。

## 验证记录（2026-10-02，真机）

| 检查 | QiLin 3.0.8 | DSH 0.2.0-rc.2 |
|---|---|---|
| web profile 安装 + 启动，插件激活 | ✅ 数据库创建 | ✅ 数据库创建 |
| `POST /dsh-kylin-memory/overview`（未登录） | ✅ 401 鉴权栅栏（路由存在） | ✅ 401 鉴权栅栏 |
| 极简 profile（无 web 栈） | ✅ 插件正常激活（动态注入跳过通道注册） | 同 |

UI 移除后的回归：`pnpm check` 145/145 + smoke ALL PASS（含"无 client 残留"检查）。
