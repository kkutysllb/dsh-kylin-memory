/**
 * kylin-memory
 *
 * By: adoresever
 * Email: Wywelljob@gmail.com
 */
import { type DatabaseSyncInstance } from "./sqlite.ts";
import type { KmNode, KmEdge, KmNavigationTriple, KmTurnMemory, EdgeType, NodeTemporal, NodeType, TurnOutcome } from "../types.ts";
export declare function findByName(db: DatabaseSyncInstance, name: string): KmNode | null;
export declare function findById(db: DatabaseSyncInstance, id: string): KmNode | null;
export declare function allActiveNodes(db: DatabaseSyncInstance): KmNode[];
export declare function allEdges(db: DatabaseSyncInstance): KmEdge[];
export declare function upsertNode(db: DatabaseSyncInstance, c: {
    type: NodeType;
    name: string;
    description: string;
    content: string;
    operation?: "create" | "confirm" | "revise";
    temporal?: NodeTemporal;
}, sessionId: string, sources?: Array<{
    messageId: string;
    turnIndex: number;
}>): {
    node: KmNode;
    isNew: boolean;
};
/** Link one graph node to durable message rows that actually exist. */
export declare function saveNodeSources(db: DatabaseSyncInstance, nodeId: string, sessionId: string, sources: Array<{
    messageId: string;
    turnIndex: number;
}>): void;
export interface KmNodeSource {
    nodeId: string;
    sessionId: string;
    messageId: string;
    turnIndex: number;
}
/** Read exact provenance refs without loading or truncating message content. */
export declare function getNodeSources(db: DatabaseSyncInstance, nodeIds: string[]): KmNodeSource[];
/** 按 name 精确更新 description / content；找不到返回 null（调用方决定报错语义） */
export declare function updateNode(db: DatabaseSyncInstance, name: string, patch: {
    description?: string;
    content?: string;
}): KmNode | null;
export declare function deprecate(db: DatabaseSyncInstance, nodeId: string, temporalState?: "historical" | "superseded"): void;
/** 批量更新 PageRank 分数 */
export declare function updatePageranks(db: DatabaseSyncInstance, scores: Map<string, number>): void;
/** 批量更新社区 ID */
export declare function updateCommunities(db: DatabaseSyncInstance, labels: Map<string, string>): void;
export declare function upsertEdge(db: DatabaseSyncInstance, e: {
    fromId: string;
    toId: string;
    type: EdgeType;
    instruction: string;
    condition?: string;
    sessionId: string;
}): void;
export declare function edgesFrom(db: DatabaseSyncInstance, id: string): KmEdge[];
export declare function edgesTo(db: DatabaseSyncInstance, id: string): KmEdge[];
export declare function searchNodes(db: DatabaseSyncInstance, query: string, limit?: number, withoutTurnMemory?: boolean): KmNode[];
/** 热门节点：综合 pagerank + validatedCount 排序 */
export declare function topNodes(db: DatabaseSyncInstance, limit?: number): KmNode[];
export declare function graphWalk(db: DatabaseSyncInstance, seedIds: string[], maxDepth: number): {
    nodes: KmNode[];
    edges: KmEdge[];
};
export declare function getBySession(db: DatabaseSyncInstance, sessionId: string): KmNode[];
/**
 * Nodes supported by the current session's recent completed turns.
 * The turn window follows the host's visible-history policy; it is not a
 * second node-count cap and therefore keeps every concept extracted per turn.
 */
export declare function getRecentBySession(db: DatabaseSyncInstance, sessionId: string, currentTurn: number, turnCount: number): KmNode[];
export declare function saveMessage(db: DatabaseSyncInstance, sid: string, turn: number, role: string, content: unknown): string;
/**
 * Persist one host event exactly once.
 *
 * DSH session events already carry a stable, monotonically increasing seq.
 * Host adapters use that identity instead of the legacy random id so replay,
 * resume and HMR backfill cannot duplicate a message.
 */
export declare function saveMessageOnce(db: DatabaseSyncInstance, eventId: string, sid: string, turn: number, role: string, content: unknown): boolean;
/**
 * Read the oldest pending completed turn as one semantic extraction job.
 * No character/message batching is involved: the DSH adapter persists exactly
 * one user question and one final assistant answer for each completed turn.
 */
export declare function getNextUnextractedTurn(db: DatabaseSyncInstance, sid: string, completedTurn: number): any[];
/**
 * Read one exact completed turn. Live DSH extraction uses this path so an
 * unrelated legacy backlog can never be pulled into a foreground session.
 * Historical retries deliberately use getNextUnextractedTurn instead.
 */
export declare function getUnextractedTurn(db: DatabaseSyncInstance, sid: string, turn: number): any[];
/** Persist the highest DSH/OpenClaw turn known to be complete. */
export declare function markExtractionTurnCompleted(db: DatabaseSyncInstance, sid: string, completedTurn: number): void;
export declare function getExtractionCompletedTurn(db: DatabaseSyncInstance, sid: string): number | null;
/** Mark only the source rows actually accepted by the extractor. */
export declare function markMessagesExtracted(db: DatabaseSyncInstance, ids: string[]): number;
export declare function recordExtractionFailure(db: DatabaseSyncInstance, ids: string[], error: string, nextRetryAt: number | null): number;
/** A poison message remains durable and explicitly unlearned until retried. */
export declare function quarantineMessages(db: DatabaseSyncInstance, ids: string[], error: string): number;
export declare function requeueQuarantined(db: DatabaseSyncInstance, sid?: string): number;
export declare function getExtractionStats(db: DatabaseSyncInstance): {
    pending: number;
    succeeded: number;
    quarantined: number;
};
export declare function getPendingSessionIds(db: DatabaseSyncInstance, limit?: number): string[];
/** Read exact durable message evidence for one node, in source order. */
export declare function getNodeSourceMessages(db: DatabaseSyncInstance, nodeId: string, excludedMessageIds?: ReadonlySet<string>): Array<{
    sessionId: string;
    turnIndex: number;
    role: string;
    text: string;
    createdAt: number;
}>;
/** Read text from legacy OpenClaw payloads and DSH block-based messages. */
export declare function extractStoredText(value: unknown): string;
/** Store one compact index while retaining exact message provenance. */
export declare function upsertTurnMemory(db: DatabaseSyncInstance, input: {
    sessionId: string;
    summary: string;
    outcome: TurnOutcome;
    sources: Array<{
        messageId: string;
        turnIndex: number;
    }>;
}): KmTurnMemory;
export declare function getTurnMemoriesByIds(db: DatabaseSyncInstance, ids: string[]): KmTurnMemory[];
/**
 * Recent summaries are reference-resolution context, not extraction evidence.
 * `beforeTurn` prevents the current Q/A pair from feeding itself on retries.
 */
export declare function getRecentTurnMemoriesBySession(db: DatabaseSyncInstance, sessionId: string, beforeTurn: number, limit: number): KmTurnMemory[];
/**
 * Atomically replace the navigation generated for one compact turn. The
 * model's subject/predicate/object values are stored verbatim after whitespace
 * normalization; the host applies no semantic gate or inferred relation.
 */
export declare function replaceNavigationTriples(db: DatabaseSyncInstance, memory: KmTurnMemory, triples: Array<{
    subject: string;
    predicate: string;
    object: string;
}>): void;
/** Return navigation in the same memory-relevance order supplied by recall. */
export declare function getNavigationTriplesForMemories(db: DatabaseSyncInstance, memoryIds: string[], termScores?: ReadonlyMap<string, number>): KmNavigationTriple[];
/**
 * Resolve query seeds from the compact SPO index without another model call.
 * Summary vectors handle paraphrases; this path deliberately handles literal
 * entity/attribute mentions and preserves the graph's exact vocabulary.
 */
export declare function findNavigationSeedTermIds(db: DatabaseSyncInstance, query: string, memoryIds?: string[]): string[];
/**
 * A community is a local candidate scope, never prompt content by itself.
 * When fresh terms have not been assigned yet, the complete compact graph is
 * still cheap enough for query-time PPR and avoids a false negative.
 */
export declare function navigationCandidateTermIds(db: DatabaseSyncInstance, seedIds: string[]): string[];
/** Map query-local graph relevance back to the exact dialogue evidence. */
export declare function rankTurnMemoryIdsByNavigation(db: DatabaseSyncInstance, termScores: ReadonlyMap<string, number>): string[];
export declare function updateNavigationCommunities(db: DatabaseSyncInstance, labels: Map<string, string>): void;
export declare function hasTurnMemories(db: DatabaseSyncInstance): boolean;
/** Lexical fallback for hosts without a working embedding provider. */
export declare function searchTurnMemories(db: DatabaseSyncInstance, query: string, limit: number): KmTurnMemory[];
export declare function saveTurnVector(db: DatabaseSyncInstance, memoryId: string, content: string, vec: number[]): void;
export declare function getTurnVectorHash(db: DatabaseSyncInstance, memoryId: string): string | null;
export type ScoredTurnMemory = {
    memory: KmTurnMemory;
    score: number;
};
export declare function turnMemoryVectorSearchWithScore(db: DatabaseSyncInstance, queryVec: number[], limit: number, minScore: number): ScoredTurnMemory[];
/** Resolve graph navigation nodes whose evidence belongs to matched turns. */
export declare function nodesForTurnMemories(db: DatabaseSyncInstance, memoryIds: string[], limit: number): KmNode[];
/** Read exact Q/A evidence for matched compact memories. */
export declare function getTurnMemorySourceMessages(db: DatabaseSyncInstance, memoryId: string, excludedMessageIds?: ReadonlySet<string>): Array<{
    sessionId: string;
    turnIndex: number;
    role: string;
    text: string;
    createdAt: number;
}>;
export declare function getStats(db: DatabaseSyncInstance): {
    totalNodes: number;
    byType: Record<string, number>;
    totalEdges: number;
    byEdgeType: Record<string, number>;
    communities: number;
    turnMemories: number;
    navigationTerms: number;
    navigationTriples: number;
    navigationCommunities: number;
};
export declare function saveVector(db: DatabaseSyncInstance, nodeId: string, content: string, vec: number[]): void;
export declare function getVectorHash(db: DatabaseSyncInstance, nodeId: string): string | null;
export declare function getVectorStats(db: DatabaseSyncInstance): {
    count: number;
    dimensions: number[];
};
export type ScoredNode = {
    node: KmNode;
    score: number;
};
export declare function vectorSearchWithScore(db: DatabaseSyncInstance, queryVec: number[], limit: number, minScore?: number, withoutTurnMemory?: boolean): ScoredNode[];
/** 兼容旧接口 */
export declare function vectorSearch(db: DatabaseSyncInstance, queryVec: number[], limit: number, minScore?: number): KmNode[];
/**
 * 社区代表节点：每个社区取最近更新的 topN 个节点
 * 用于泛化召回 —— 用户问"做了哪些工作"时按领域返回概览
 */
export declare function communityRepresentatives(db: DatabaseSyncInstance, perCommunity?: number): KmNode[];
