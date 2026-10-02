# 发版流程（事实源）

每个功能版本一组提交：`feat: ...` + `release(vX.Y.Z): ...`，并打 annotated tag `vX.Y.Z`。

## 步骤

1. **更新文档与版本号**：`package.json` `version`；`release/vX.Y.Z.md` 按七章节写（版本信息/新增/变更/修复/删除/兼容性/验证）；涉及行为变化的，同步更新 `docs/01-tech/*` 与本 README 所在索引——**文档不允许陈旧**。
2. **本地验证**：
   ```bash
   pnpm check        # typecheck + vitest + esbuild
   pnpm smoke        # 发布面契约（双 manifest、静态 patch、零 @deepseek-ai 导入）
   pnpm verify:package
   ```
3. **双通道宿主冒烟**（行为变化触及适配器/manifest 时必须）：
   ```bash
   qilin plugin doctor <本目录>
   # 一次性 profile 安装 + 启动，确认 <home>/kylin-memory/kylin-memory.db 创建
   DSH_HOME=/tmp/dsh-smoke dsh plugin --profile smoke add <本目录>
   QILIN_HOME=/tmp/qilin-smoke qilin plugin --profile smoke add <本目录>
   ```
   完整双通道验证记录见 `docs/01-tech/0101-双通道适配与契约层.md`。
4. **提交与打标**：
   ```bash
   git add -A && git commit -m "release(vX.Y.Z): <一句话>"
   git tag -a vX.Y.Z -m "vX.Y.Z"
   ```
5. **同步镜像仓（推送前必须）**：
   ```bash
   pnpm sync:mirror                                   # 真源 → ../dsh-plugins/dsh-kylin-memory/
   cd ../dsh-plugins && git add -A && git commit -m "sync(dsh-kylin-memory): vX.Y.Z" && git push
   pnpm sync:check                                    # 对账零差异
   ```
   两个安装入口（独立仓 / dsh-plugins 子目录）必须内容一致。
6. **发布**：`npm publish`（`prepack` 自动 check+smoke），推送 tag 后 `node scripts/create-github-releases.mjs v0.1.0` 把 release/vX.Y.Z.md 同步为 GitHub Release（幂等）。

## 注意

- `lib/` 构建产物**必须提交**：GitHub 直装与 npm 包都依赖仓内产物，用户机器上不跑构建。
- `cordis.patch.yml` 保持纯静态 YAML，`dsh` 与 `qilin` manifest 块内容必须一致（smoke 检查）。
- npm 首发前，README 安装命令里 npm 路径注释掉、只留 GitHub 固定版本（对齐上游踩过的坑）。
