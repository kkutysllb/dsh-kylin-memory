/** Host RPC adapter for the Kylin Memory web panel over the Connection
 * generic-channel registry (`/dsh-kylin-memory`). The connection service owns
 * the Host/Origin fence and browser authentication; this adapter only
 * validates payloads and maps failures into the result envelope.
 *
 * Registered on both DSH and QiLin: the webServer/connection contract names
 * and semantics are identical across the two hosts.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ForgetCounts } from "./store/store.ts";
export declare const RPC_CHANNEL = "/dsh-kylin-memory";
export type RpcResult<T> = {
    readonly ok: true;
    readonly value: T;
} | {
    readonly ok: false;
    readonly error: {
        readonly code: string;
        readonly message: string;
    };
};
export declare class RpcValidationError extends Error {
}
export interface MemoryOverviewPayload {
    dbPath: string;
    turnMemories: number;
    navigationTerms: number;
    navigationTriples: number;
    navigationCommunities: number;
    supersededTriples: number;
    legacyNodes: number;
    legacyEdges: number;
    messages: number;
    extraction: {
        pending: number;
        succeeded: number;
        quarantined: number;
    };
    recallEnabled: boolean;
    embeddingState: string;
    /** Unix ms of the last embedding provider probe (startup or 5-min re-probe); null before the first attempt. */
    lastProbeAt: number | null;
    turnVectors: number;
    /** Turn-memory count grouped by workspace (m19 scope visibility). */
    turnMemoriesByWorkspace: Record<string, number>;
    retention: {
        keep: string;
        recentTurns: number;
        retentionDays: number;
    };
}
export interface MemoryListItem {
    id: string;
    sessionId: string;
    summary: string;
    outcome: string;
    updatedAt: number;
}
export interface MemoryListPayload {
    memories: MemoryListItem[];
    total: number;
}
export interface MemoryRpcDeps {
    overview(): MemoryOverviewPayload;
    listMemories(params: {
        sessionId?: string;
        workspaceId?: string;
        limit: number;
        offset: number;
    }): MemoryListPayload;
    /** Read-only alias-group audit for entity normalization (M4). */
    aliasGroups(): Array<{
        canonical: string;
        aliases: string[];
    }>;
    forget(params: {
        sessionId?: string;
        memoryId?: string;
        workspaceId?: string;
        dryRun: boolean;
    }): Promise<ForgetCounts>;
}
interface RpcHostContext {
    effect(factory: () => void | (() => void), label?: string): void;
    webServer: {
        /** Returns the channel disposer (same contract the automation plugin
         * relies on for its webServer.register row). */
        register(options: {
            kind: string;
            path: string;
            handler: (req: IncomingMessage, res: ServerResponse) => void;
        }): () => void;
    };
    connection: {
        requestRejection(req: unknown): number | undefined;
    };
}
/** Register the `/dsh-kylin-memory` channel on the caller's injected
 * webServer, replicating the Connection transport semantics: the same
 * Host/Origin + browser-auth fence (`connection.requestRejection`), the same
 * client-request/server-response envelopes, and a bounded buffered body.
 * (Direct registration is the supported path — same rationale as the
 * automation plugin: vendored rpc handlers run on the connection plugin's own
 * fiber, which cannot gain `webServer` from a third-party patch row.) */
export declare function registerMemoryRpc(ctx: RpcHostContext, deps: MemoryRpcDeps): void;
/** One endpoint dispatch — exported for direct unit tests. */
export declare function handleMemoryRpc(deps: MemoryRpcDeps, endpoint: string, payload: unknown): Promise<RpcResult<unknown>>;
export {};
