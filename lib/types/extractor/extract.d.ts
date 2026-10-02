import type { KmConfig, ExtractionResult, KmTurnMemory } from "../types.ts";
import type { CompleteFn } from "../types.ts";
/** Read only visible text from a host message already selected as a Q/A pair. */
export declare function normalizeExtractionContent(value: unknown): string;
export declare class Extractor {
    private _cfg;
    private llm;
    constructor(_cfg: KmConfig, llm: CompleteFn);
    extract(params: {
        messages: any[];
        priorTurns?: KmTurnMemory[];
    }): Promise<ExtractionResult>;
    private parseExtract;
}
