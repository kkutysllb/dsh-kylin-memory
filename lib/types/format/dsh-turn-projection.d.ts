/**
 * Model-surface projection for one completed DeepSeek Harness turn.
 *
 * DSH keeps the immutable event log as the source of truth. Once a turn has
 * completed, Kylin Memory may hide the contiguous tool/reasoning trace between
 * the original user question and the final assistant answer. Both endpoints
 * remain native messages on the model surface; the hidden trace remains in the
 * durable DSH log. Kylin Memory stores only the question and final answer in
 * km_messages for extraction and source-backed recall.
 */
interface DshTurnEvent {
    type?: string;
    seq?: number;
    surfaceOp?: unknown;
    data?: {
        turn?: number;
        source?: {
            kind?: string;
        };
        content?: unknown;
        message?: {
            content?: unknown;
        };
    };
}
export interface DshCompletedTurnMemory {
    turn: number;
    questionSeq: number;
    finalAnswerSeq: number;
    userQuestion: string;
    finalAnswer: string;
}
interface DshTurnSession {
    id?: unknown;
    /** Current DSH public immutable-log snapshot API. */
    snapshotEvents?(): Array<DshTurnEvent>;
    /** Compatibility with older DSH releases and lightweight test doubles. */
    events?: Array<DshTurnEvent | undefined>;
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
export interface DshCompletedTurnTraceRange {
    turn: number;
    start: number;
    end: number;
    shadowedSeqs: number[];
    questionSeq: number;
    finalAnswerSeq: number;
}
export interface DshCompletedTurnProjection {
    replacementSeq: number;
    shadowedSeqs: number[];
    shadowedTokenCount: number;
}
/**
 * Fold one immutable DSH turn into Kylin Memory's semantic source pair.
 *
 * This mirrors DSH's turn-outline lifecycle (first human prompt, newest
 * text-bearing assistant response, commit at turn/end) without its UI preview
 * clipping. Intermediate assistant steps, reasoning and tool traffic are
 * deliberately excluded.
 */
export declare function projectDshCompletedTurnMemory(session: DshTurnSession, turn: number, turnEndSeq?: number): DshCompletedTurnMemory | null;
/**
 * Select only the middle trace of a completed turn. The question and final
 * visible answer are deliberately excluded from the replacement range.
 */
export declare function selectDshCompletedTurnTraceRange(session: DshTurnSession, turn: number, turnEndSeq?: number): DshCompletedTurnTraceRange | null;
/** Replace a completed tool trace with a constant-size, model-free marker. */
export declare function replaceDshCompletedTurnTrace(session: DshTurnSession, tokenMeter: DshTokenMeter, range: DshCompletedTurnTraceRange): DshCompletedTurnProjection;
export {};
