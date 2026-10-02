/**
 * kylin-memory — 跨对话召回
 *
 *
 * Query recall is deliberately relevance-first: vector ranking is preserved,
 * with FTS5 as an exact-term/failure fallback. Graph centrality is useful for
 * offline graph inspection, but must not displace the memories most similar
 * to the current user question.
 */
import { type DatabaseSyncInstance } from "../store/sqlite.ts";
import type { KmConfig, RecallResult, KmNode, KmTurnMemory } from "../types.ts";
import type { EmbedFn } from "../engine/embed.ts";
export declare class Recaller {
    private db;
    private cfg;
    private embed;
    private embeddingFingerprint;
    constructor(db: DatabaseSyncInstance, cfg: KmConfig);
    setEmbedFn(fn: EmbedFn, fingerprint?: string): void;
    recall(query: string, options?: {
        workspaceId?: string;
    }): Promise<RecallResult>;
    /**
     * Fuse independent summary and graph ranks without mixing incomparable
     * cosine and PageRank score scales. A memory supported by both routes rises;
     * exact summary matches keep tie priority over graph-only expansion.
     */
    private mergeTurnMemoryRanks;
    private recallTurnMemories;
    /**
     * Preserve semantic rank. FTS5 contributes exact terms and is the complete
     * fallback when the embedding provider is absent or temporarily fails.
     */
    private recallPrecise;
    /** 异步同步 embedding，不阻塞主流程 */
    syncEmbed(node: KmNode): Promise<void>;
    /** Keep the compact episodic layer independently searchable. */
    syncTurnMemoryEmbed(memory: KmTurnMemory): Promise<void>;
}
