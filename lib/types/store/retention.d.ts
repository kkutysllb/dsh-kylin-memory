import type { DatabaseSyncInstance } from "./sqlite.ts";
export type MessageRetentionMode = "all" | "referenced" | "recent";
export interface MessageRetentionConfig {
    /** all keeps every raw row; referenced/recent opt in to bounded pruning. */
    keep?: MessageRetentionMode;
    /** Preserve this many newest real user turns in every session. */
    recentTurns?: number;
    /** Preserve rows ingested within this many days. */
    retentionDays?: number;
    /** Maximum rows considered by one maintenance tick. */
    batchSize?: number;
    /** Report candidates without deleting them. */
    dryRun?: boolean;
}
export interface NormalizedMessageRetentionPolicy {
    keep: MessageRetentionMode;
    recentTurns: number;
    retentionDays: number;
    batchSize: number;
    dryRun: boolean;
}
export interface MessageRetentionResult {
    policy: MessageRetentionMode;
    policyRevision: string;
    dryRun: boolean;
    selectedRows: number;
    selectedBytes: number;
    deletedRows: number;
    deletedBytes: number;
    selectedSessions: number;
    byRole: Record<string, number>;
    oldestCreatedAt: number | null;
    newestCreatedAt: number | null;
    hasMore: boolean;
    cutoffAt: number;
    durationMs: number;
}
export declare const DEFAULT_MESSAGE_RETENTION: Readonly<NormalizedMessageRetentionPolicy>;
/** Validate once before opening the database. Invalid policies fail closed. */
export declare function normalizeMessageRetentionPolicy(input: MessageRetentionConfig | undefined): NormalizedMessageRetentionPolicy;
export declare function messageRetentionPolicyRevision(policy: NormalizedMessageRetentionPolicy): string;
/**
 * Run one bounded retention batch.
 *
 * A write-intent transaction freezes the candidate/reference boundary across
 * connections. The DELETE still re-checks extracted state and provenance so
 * a future refactor cannot silently turn candidate selection into authority.
 * VACUUM is intentionally separate: deleting rows is the policy operation;
 * rewriting the whole database file is an explicit administrative choice.
 */
export declare function runMessageRetention(db: DatabaseSyncInstance, policy: NormalizedMessageRetentionPolicy, now?: number): MessageRetentionResult;
