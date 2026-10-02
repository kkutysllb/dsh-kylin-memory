/**
 * kylin-memory
 *
 * By: adoresever
 * Email: Wywelljob@gmail.com
 */
/**
 * 社区检测 — Label Propagation Algorithm
 *
 * 原理：每个节点初始自成一个社区，迭代中每个节点采纳邻居中最频繁的社区标签。
 *       收敛后自然形成社区划分。
 *
 * 为什么选 Label Propagation：
 *   - 不需要外部依赖，也不需要预先指定社区数量
 *   - O(iterations * edges)，适合随对话异步更新的小型导航图
 *   - 社区仅缩小查询候选范围；查询相关性仍由实时 PPR 决定
 *
 * 用途：
 *   - 发现知识域（Docker 相关技能自动聚成一组）
 *   - recall 时把社区作为候选范围，不把整个社区注入提示词
 *   - PPR 选中 memory 后再回溯其原始问答证据
 *   - kg_stats 展示社区分布
 */
import { type DatabaseSyncInstance } from "../store/sqlite.ts";
export interface CommunityResult {
    labels: Map<string, string>;
    /** 社区 ID → 成员节点 ID 列表 */
    communities: Map<string, string[]>;
    count: number;
}
/**
 * 运行 Label Propagation 并写回 km_nodes.community_id
 *
 * 把有向边当无向边处理（知识关联不分方向）
 */
export declare function detectCommunities(db: DatabaseSyncInstance, maxIter?: number): CommunityResult;
/** Build communities on the generic SPO navigation graph. */
export declare function detectNavigationCommunities(db: DatabaseSyncInstance, maxIter?: number): CommunityResult;
/**
 * 获取旧概念图中同社区的节点 ID 列表。
 */
export declare function getCommunityPeers(db: DatabaseSyncInstance, nodeId: string, limit?: number): string[];
