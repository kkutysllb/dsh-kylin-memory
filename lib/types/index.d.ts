import { type DshModelInfoService } from "./engine/dsh-extraction-route.ts";
import { type MessageRetentionConfig } from "./store/retention.ts";
export declare const name = "dsh-kylin-memory";
export declare const inject: string[];
interface DshEmbeddingConfig {
    apiKeyEnv?: string;
    baseURL?: string;
    baseUrl?: string;
    model?: string;
    dimensions?: number;
    /** Direct secret resolver; used by the environment fallback path. */
    apiKeyResolver?: () => Promise<string | undefined>;
}
export interface Config {
    dbPath?: string;
    dbBusyTimeoutMs?: number;
    extractionEnabled?: boolean;
    recallEnabled?: boolean;
    recallMaxNodes?: number;
    /** Optional embedding-provider-calibrated cosine floor for every recall path. */
    semanticScoreThreshold?: number;
    maintenanceInterval?: number;
    /** Durable raw-message retention. Defaults to keep=all (no deletion). */
    messageRetention?: MessageRetentionConfig;
    /** Keep this many newest real user turns as native question/final-answer endpoints on the DSH model surface. */
    freshTurnCount?: number;
    /** Let Kylin Memory replace older model-surface history without an LLM call. */
    contextCompactionEnabled?: boolean;
    /** Hide completed-turn tool traces while retaining the native question and final answer. */
    projectCompletedTurnTools?: boolean;
    /** Tools exposed to the assistant. Automatic recall never depends on a tool call. */
    assistantTools?: "search" | "all" | "none";
    /** Dedicated extraction route. When set, it takes precedence over the foreground Agent route. */
    llmProvider?: string;
    llmModel?: string;
    /** Provider-owned effort ID. Omitted: prefer off, then the first advertised effort. */
    llmReasoningEffort?: string;
    /** Optional extraction response cap. Omitted by default. */
    llmMaxTokens?: number;
    embedding?: DshEmbeddingConfig;
}
interface DshContext {
    logger: {
        info(message: unknown, ...args: unknown[]): void;
        warn(message: unknown, ...args: unknown[]): void;
        error(message: unknown, ...args: unknown[]): void;
    };
    llm: DshModelInfoService & {
        stream(options: Record<string, unknown>): AsyncIterable<any>;
    };
    tools: {
        register(definition: Record<string, unknown>): () => void;
    };
    credentials: {
        resolve(ref: string): Promise<{
            value: string;
            source: string;
        } | undefined>;
    };
    agents?: {
        get(id: unknown): any;
        list?(): any[];
    };
    agentPresets?: {
        serviceFor(agent: any, key: string): any;
    };
    get?(name: string): any;
    tokenMeter?: {
        measure(session: unknown): {
            nodes: ReadonlyArray<{
                seq: number;
                heuristicTokens: number;
            }>;
        };
    };
    on(event: string, listener: (...args: any[]) => any, options?: Record<string, unknown>): () => void;
    effect(register: () => (() => void | Promise<void>), label?: string): () => void;
}
export declare function apply(ctx: DshContext, rawInput?: Config): void;
export {};
