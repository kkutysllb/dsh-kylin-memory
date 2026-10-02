# 0105 RPC 管理通道与 UI 决策记录

> 状态：与 `src/rpc.ts`、`package.json` 当前实现同步。

## UI 决策（2026-10-02，产品定案）

本插件**不注册任何 Web client / slot**，采用上游 graph-memory 同款的纯 Agent 工具入口。理由：核心价值（上下文接管 + 自动召回）完全自动，不需要 UI 参与；管理操作由 `km_*` 工具承担；避免侧边栏拥挤。

- 仓库不含 `src/client/`，构建不产出 client bundle（smoke 强制检查 manifest 无 client 块、仓库无 client 残留）；
- `package.json` 不含 `dsh.client` / `qilin.client` 块与 `./client` 导出；
- 保留 `src/rpc.ts` 的宿主侧 RPC 管理通道作为 **headless 管理 API**：脚本与外部工具可在宿主登录态下经 HTTP 读取统计/列表、执行遗忘，也是未来恢复面板时的现成接入点（届时参照 dsh-kylin-automation 的 `__ModuleLoader__` client 包装，构建脚本注释留有指引）。

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
