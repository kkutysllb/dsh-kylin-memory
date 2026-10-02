/**
 * kylin-memory — 图谱维护
 *
 * By: adoresever
 * Email: Wywelljob@gmail.com
 *
 * 调用时机：session_end
 *
 * 执行顺序：
 *   1. 全局 PageRank（基线分数写入 DB，供 topNodes 兜底用）
 *   2. 社区检测（重新划分知识域）
 *
 * 注意：个性化 PPR 不在这里跑，它在 recall 时实时计算。
 */
import { type DatabaseSyncInstance } from "../store/sqlite.ts";
import type { KmConfig } from "../types.ts";
import { type GlobalPageRankResult } from "./pagerank.ts";
import { type CommunityResult } from "./community.ts";
export interface MaintenanceResult {
    pagerank: GlobalPageRankResult;
    community: CommunityResult;
    navigationCommunity: CommunityResult;
    durationMs: number;
}
export declare function runMaintenance(db: DatabaseSyncInstance, cfg: KmConfig): Promise<MaintenanceResult>;
