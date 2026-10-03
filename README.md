# dsh-kylin-memory

<p align="center"><strong>限制上下文，让记忆继续生长。</strong></p>

<p align="center">
  DeepSeek Harness（DSH）与 QiLin/Kylin 双通道知识图谱记忆插件。<br>
  保留最近对话，把旧历史变成可检索图记忆，需要时召回精确来源——不 fork 宿主、不删事件日志。
</p>

核心记忆引擎移植自 [adoresever/graph-memory](https://github.com/adoresever/graph-memory)（MIT），差异账本见 [docs/01-tech/0104-上游移植映射与差异.md](docs/01-tech/0104-上游移植映射与差异.md)。

## 它解决什么

插件接管**发给模型的历史表面**，不动宿主的不可变事件记录：

- 默认保留最近 5 个已完成用户轮次的原生问答；
- 完成轮次的推理/工具轨迹不再重复发送（表面替换为常量标记）；
- 旧轮次与跨会话记忆按当前问题自动召回，携带**精确原始问题与最终回答**（图谱只是导航层，不是事实源）；
- 每轮恰好 1 次辅助抽取 LLM 调用（`summary + outcome + SPO`），社区检测（LPA）与查询排序（Personalized PageRank）全部本地执行。

## 安装

Node.js 22.13+（使用内置 `node:sqlite`，安装期零原生构建）。

```bash
# DSH 通道
dsh plugin --profile web add github:kkutysllb/dsh-kylin-memory#v0.1.1   # npm 发布后可改用包名

# QiLin/Kylin 通道
qilin plugin --profile qilin add github:kkutysllb/dsh-kylin-memory#v0.1.1
```

本地开发：`link:` 前缀直装仓库目录（如 `qilin plugin --profile qilin add link:/Users/libing/kk_Projects/dsh-kylin-memory`），重启宿主生效。安装校验：`qilin plugin doctor dsh-kylin-memory` 应输出 `usable`。

在宿主 **Settings → Plugins** 确认 dsh-kylin-memory 已启用。默认数据库位于 `$DSH_HOME`（或 `$QILIN_HOME`）/`kylin-memory/kylin-memory.db`。

## 能力

| 能力 | 实现方式 |
|---|---|
| 上下文接管 | 最近 N 轮可配置；旧表面由常量归档标记替换（零 LLM 调用，影子 token 记账） |
| 轻量抽取 | 只处理用户问题与最终回答；严格 TypeBox 工具合同；不摄入推理/工具轨迹 |
| 查询优先召回 | 摘要向量 Top-K + 图路线（词项种子→社区→PPR）RRF 融合；无向量时 FTS5/短语降级 |
| 持久记忆 | 本地 SQLite（WAL）、内容寻址幂等写入、跨轮次/跨会话/跨项目召回 |
| 事实失效 | 同 (subject, predicate) 新值标记旧值（m17），召回自动剔除过期事实；km_forget 删除失效者可恢复 |
| 作用域 | `recallScope: "all" \|"same-workspace"`，workspace 维度逻辑隔离（m19） |
| 失败行为 | 合同错误隔离、路由错误待处理可重试；任何记忆子系统失败不阻塞前台对话 |
| 管理通道 | 无 UI（对齐上游纯工具入口）；headless RPC 管理通道 `/dsh-kylin-memory` 供脚本/外部工具经宿主登录态调用 |
| 宿主支持 | DSH 0.1.7+ / Session V4 与 QiLin 3.0+，同一份 bundle，`dsh`/`qilin` 双 manifest |

工具：`km_status` / `km_search` / `km_record` / `km_stats` / `km_maintain` / `km_retry_extraction` / `km_forget`——默认开放 `km_search`（agent 可自主查记忆），`"none"` 恢复被动，`"all"` 开放管理工具。

## 配置

`cordis.patch.yml` 为纯静态 YAML（双通道同文件）；环境变量回退在适配器内解析，显式配置优先：

```bash
# 独立抽取路由（可选；缺省用前台 Agent 路由并自动协商推理档位，优先 off）
export KYLIN_MEMORY_LLM_PROVIDER=...
export KYLIN_MEMORY_LLM_MODEL=...

# 语义向量召回（可选；缺省 FTS5/短语词法）
export KYLIN_MEMORY_EMBEDDING_API_KEY=...
export KYLIN_MEMORY_EMBEDDING_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
export KYLIN_MEMORY_EMBEDDING_MODEL=text-embedding-v4
export KYLIN_MEMORY_EMBEDDING_DIMENSIONS=1024
```

bundle 配置（写入 `cordis.patch.yml` 的 config 块）：`freshTurnCount`（滚动保留轮数，默认 5）、`recallScope`（默认 `all`）、`freshnessHalfLifeDays`（导航新鲜度半衰期天数，默认 0=关）、`assistantTools`（默认 `search`）、`semanticScoreThreshold`（向量召回余弦门槛，默认 0.7）、`messageRetention`（默认 `keep: all`）。

完整变量表与契约层说明见 [docs/01-tech/0101-双通道适配与契约层.md](docs/01-tech/0101-双通道适配与契约层.md)。

## 验证状态（v0.1.1）

- 171/171 自动化测试（vitest），`tsc --noEmit` 零错误，esbuild 产物自包含；GitHub Actions CI；
- `qilin plugin doctor`：usable / no compatibility findings；
- QiLin 3.0.8 与 DSH 0.2.0-rc.2 真实 web profile 安装 + 启动验证通过（21 个迁移完成）；
- RPC 管理通道双宿主验证：`POST /dsh-kylin-memory/overview` 未登录返回 401（鉴权栅栏生效）；
- 极简 profile（无 web 栈）验证：插件正常激活（RPC 通道为动态可选面）。

## 文档索引

| 文档 | 内容 |
|---|---|
| [docs/01-tech/0100-架构与数据流.md](docs/01-tech/0100-架构与数据流.md) | 两层记忆模型、写入/召回数据流、模块地图 |
| [docs/01-tech/0101-双通道适配与契约层.md](docs/01-tech/0101-双通道适配与契约层.md) | dsh/qilin 双 manifest、inject 契约、env 解析、安装与验证记录 |
| [docs/01-tech/0102-抽取合同与失败语义.md](docs/01-tech/0102-抽取合同与失败语义.md) | submit_result 合同、隔离/待处理分拣、串行队列 |
| [docs/01-tech/0103-召回管线.md](docs/01-tech/0103-召回管线.md) | 双路召回、RRF、LPA/PPR、来源回溯 |
| [docs/01-tech/0104-上游移植映射与差异.md](docs/01-tech/0104-上游移植映射与差异.md) | 从 graph-memory 移植了什么、改了什么、裁了什么 |
| [docs/01-tech/0105-rpc管理通道与UI决策.md](docs/01-tech/0105-rpc管理通道与UI决策.md) | headless RPC 管理通道、可选面语义、无 UI 决策记录 |
| [docs/02-design/0201-缺陷分析与业界对标.md](docs/02-design/0201-缺陷分析与业界对标.md) | v0.1.0 缺陷登记册（A/B/C/D 编号）与 Zep/Mem0/Letta/HippoRAG 对标 |
| [docs/03-plan/0301-增强路线图.md](docs/03-plan/0301-增强路线图.md) | 路线图索引（按缺陷编号组织） |
| [docs/03-plan/0302-升级实施计划.md](docs/03-plan/0302-升级实施计划.md) | v0.2/v0.3 实施计划：里程碑、schema 迁移、测试与验收 |
| [release/](release/) | 每版本变更记录与发版流程 |

## 开发

```bash
pnpm install
pnpm check        # typecheck + test + build
pnpm smoke        # 发布面契约检查
pnpm verify:package
```

产物 `lib/` 提交进仓（安装期零构建）。发版流程见 [release/README.md](release/README.md)。

## License

[MIT](LICENSE) © 2026 kkutysllb。核心记忆引擎移植自 [graph-memory](https://github.com/adoresever/graph-memory)（MIT © 2026 adoresever）。
