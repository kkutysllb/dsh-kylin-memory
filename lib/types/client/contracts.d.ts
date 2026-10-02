/** Hand-typed face of the injected client services this plugin composes
 * against. Every consumer soft-probes before use; hosts without a service
 * degrade instead of failing the panel. Shapes mirror the automation
 * plugin's audited contract (slots/locale/connection). */
export interface Translate {
    (key: string, params?: Record<string, unknown>): string;
}
export interface ClientContext {
    effect(factory: () => void | (() => void), label?: string): void;
    slots: {
        inject(name: string, register: () => void | (() => void)): void;
        register(options: Record<string, unknown>, component: unknown): () => void;
    };
    locale?: {
        register(namespace: string, dictionaries: Record<string, Record<string, string>>): () => void;
        bind(namespace: string): Translate;
    };
    connection?: {
        readonly rpc: {
            call(channel: string, endpoint: string, payload: unknown): Promise<unknown>;
        };
    };
}
/** Shape the sidebar icon component receives (owner share of the list slot). */
export interface PanelIconProps {
    readonly size?: number;
}
export interface MemoryOverview {
    dbPath: string;
    turnMemories: number;
    navigationTerms: number;
    navigationTriples: number;
    navigationCommunities: number;
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
    turnVectors: number;
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
export interface ForgetCounts {
    turnMemories: number;
    messages: number;
    navigationTriples: number;
    navigationTerms: number;
    extractionSessions: number;
}
