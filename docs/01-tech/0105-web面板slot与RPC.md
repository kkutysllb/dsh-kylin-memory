# 0105 Web 面板：slot 注册与 RPC 通道

> 状态：与 `src/client/`、`src/rpc.ts`、`package.json` 的 `dsh.client`/`qilin.client` 块当前实现同步。

## 结构

```
src/rpc.ts              Host 侧：/dsh-kylin-memory 通道（webServer.register + connection 鉴权栅栏）
src/client/index.tsx    客户端入口：sidebar.panellist 图标 + main 键控面板（React 18）
src/client/contracts.ts 注入客户端服务的手写类型面（slots/locale/connection，全部软探测）
lib/client.js           esbuild CJS 产物，window.__ModuleLoader__.load({id, factory}) 协议
```

## slot 注册（双宿主同一份代码）

客户端 bundle 经 package.json `dsh.client.inject` / `qilin.client.inject` 声明的包名装入宿主模块表，`exports.apply(ctx)` 中：

```ts
ctx.slots.inject("sidebar.panellist", () => {
  const disposeIcon = ctx.slots.register({ name: "sidebar.panellist", id: "kyl-memory", order: 125, label, locale: NS }, PanelIcon);
  const disposePanel = ctx.slots.register({ name: "main", key: "kyl-memory", locale: NS }, MemoryMount);
  return () => { disposePanel(); disposeIcon(); };
});
```

宿主缺 slot 时 try/catch 降级为纯 Agent 工具入口（与 ssh-tunnel/automation 同款语义）。

## RPC 通道

三个端点（POST `/dsh-kylin-memory/<endpoint>`，信封 `{type:"client-request",rpcId,method,payload}` → `{type:"server-response",rpcId,result}`，result 为 `RpcResult<T>`）：

| endpoint | payload | 返回 |
|---|---|---|
| `overview` | `{}` | 记忆统计全景（turn memories、导航词项/三元组/社区、抽取队列、向量、保留策略） |
| `memories` | `{sessionId?, limit≤200, offset}` | 最新轮次记忆列表（`listTurnMemories`，updated_at 倒序） |
| `forget` | `{sessionId?\|memoryId?, dryRun?}` | `forgetTurnMemories` 计数（面板按钮先 confirm 再调，dryRun 预览） |

安全：每个请求先过 `ctx.connection.requestRejection()`（Host/Origin + 浏览器登录态栅栏），body 限 1MB，参数有界校验，失败映射到 `RpcResult.error`。

## 可选面语义（重要设计决策）

`webServer`/`connection` **不进静态 `inject` 列表**。放进 inject 会让插件在没有 web 栈的极简 profile 里永远 pending（实测复现），违背"记忆功能不因面板缺失而失效"的原则。改为 cordis 动态子世界注入：

```ts
ctx.inject?.(["webServer", "connection"], (scoped) => registerMemoryRpc(scoped, deps));
```

web 栈存在时自动注册通道，消失时自动回收；极简 profile 下回调不触发，插件其余功能完整可用。极简 profile 下 `ctx.inject` 不可用时的兜底是直接属性探测。

## 构建

`scripts/build.mjs` 产出 `lib/client.js`（CJS、browser、react 系 external 走宿主静态模块表、`__ModuleLoader__` 自注册包装）。`scripts/smoke-plugin.mjs` 校验：协议头、无裸 ESM export、require("react")、注册 id 与包名一致、panellist+main 双 slot、RPC 通道常量、体积下限。

## 验证记录（2026-10-02）

| 检查 | QiLin 3.0.8 | DSH 0.2.0-rc.2 |
|---|---|---|
| web profile 安装 + 启动，插件激活 | ✅ 数据库创建 | ✅ 数据库创建 |
| `POST /dsh-kylin-memory/overview`（未登录） | ✅ 401 鉴权栅栏（路由存在） | ✅ 401 鉴权栅栏 |
| 极简 profile（无 web 栈） | ✅ 插件正常激活（动态注入跳过面板） | 同 |

面板 UI 的端到端人工验收（浏览器内 slot 渲染）待首次真机使用时确认。
