/**
 * Pure DeepSeek Harness surface selection for Kylin Memory rolling compaction.
 *
 * DSH keeps the durable event log intact and exposes a replaceable model-facing
 * surface. Kylin Memory owns the historical projection: it replaces a complete
 * old prefix with a constant-size archive marker and retrieves relevant facts
 * from the durable memory store. No summarizer model call is involved.
 */
interface DshSurfaceEvent {
    type?: string;
    data?: {
        source?: {
            kind?: string;
        };
    };
}
interface DshSurfaceSession {
    id?: unknown;
    /** Current DSH public immutable-log snapshot API. */
    snapshotEvents?(): Array<DshSurfaceEvent>;
    /** Compatibility with older DSH releases and lightweight test doubles. */
    events?: Array<DshSurfaceEvent | undefined>;
    surface?: {
        nodes?: number[];
    };
    append?(type: string, data: unknown, options?: Record<string, unknown>): {
        seq: number;
    };
}
interface DshTokenMeter {
    measure(session: unknown): {
        nodes: ReadonlyArray<{
            seq: number;
            heuristicTokens: number;
        }>;
    };
}
export interface DshCompactionRange {
    start: number;
    end: number;
    shadowedSeqs: number[];
    retainedUserTurns: number;
}
export interface DshArchiveReplacement {
    replacementSeq: number;
    shadowedSeqs: number[];
    shadowedTokenCount: number;
}
export declare const DSH_ARCHIVE_MARKER: string;
/** Whether one surface event is a real user prompt that starts a logical turn. */
export declare function isDshUserTurn(event: DshSurfaceEvent | undefined): boolean;
/**
 * Select the oldest complete surface prefix while retaining the newest N real
 * user turns. Their question/final-answer endpoints remain native; completed
 * intermediate traces may already have been projected separately. Plugin-owned
 * snapshots, skill catalogs and compaction checkpoints do not count as turns.
 */
export declare function selectDshRollingCompactionRange(session: DshSurfaceSession, freshTurnCount: number, currentUserAlreadyOnSurface?: boolean): DshCompactionRange | null;
/**
 * Replace an archived surface prefix without invoking DSH's LLM compactor.
 *
 * The adjacent compaction/prune event is DSH's public shadow-price protocol:
 * it lets token-meter subtract the exact heuristic price of the replaced
 * surface while the immutable source events remain available for provenance.
 */
export declare function replaceDshArchivedPrefix(session: DshSurfaceSession, tokenMeter: DshTokenMeter, range: DshCompactionRange): DshArchiveReplacement;
export {};
