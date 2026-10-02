import type { TurnOutcome } from "../types.ts";
/**
 * Provider-facing extraction contract.
 *
 * Keep every required value at the top level. DSH's public ToolSchema does
 * not currently expose pi-ai constrained sampling, so custom OpenAI-compatible
 * routes receive an advisory schema. A flat shape and a single JSON `enum`
 * are followed more reliably across providers than nested required objects and
 * an `anyOf` of literals, while the runtime still validates every field.
 */
export declare const GRAPH_EXTRACTION_SCHEMA: import("@sinclair/typebox").TObject<{
    summary: import("@sinclair/typebox").TString;
    outcome: import("@sinclair/typebox").TString;
    triples: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        subject: import("@sinclair/typebox").TString;
        predicate: import("@sinclair/typebox").TString;
        object: import("@sinclair/typebox").TString;
    }>>;
}>;
export interface StructuredGraphExtraction {
    summary: string;
    outcome: TurnOutcome;
    triples: Array<{
        subject: string;
        predicate: string;
        object: string;
    }>;
}
export declare const GRAPH_EXTRACTION_TOOL_NAME = "submit_result";
export declare const GRAPH_EXTRACTION_TOOL: Readonly<{
    name: "submit_result";
    description: "Submit exactly the three required fields summary, outcome, and triples. Derive zero or more subject-predicate-object triples only from the summary; triples must be [] when no relation is explicit. Emit no text.";
    parameters: import("@sinclair/typebox").TObject<{
        summary: import("@sinclair/typebox").TString;
        outcome: import("@sinclair/typebox").TString;
        triples: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            subject: import("@sinclair/typebox").TString;
            predicate: import("@sinclair/typebox").TString;
            object: import("@sinclair/typebox").TString;
        }>>;
    }>;
}>;
/** Fail closed before normalization or persistence when the contract is incomplete. */
export declare function assertGraphExtractionContract(value: unknown): asserts value is StructuredGraphExtraction;
