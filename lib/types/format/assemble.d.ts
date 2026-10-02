import { type DatabaseSyncInstance } from "../store/sqlite.ts";
import type { KmNode, KmEdge, KmNavigationTriple, KmTurnMemory } from "../types.ts";
/**
 * 构建知识图谱的 system prompt 引导文字
 */
export declare function buildSystemPromptAddition(params: {
    hasMemory: boolean;
    freshTurnCount?: number;
}): string;
/**
 * 组装知识图谱为 XML context
 */
export declare function assembleContext(db: DatabaseSyncInstance, params: {
    recalledNodes: KmNode[];
    recalledEdges: KmEdge[];
    recalledMemories?: KmTurnMemory[];
    recalledTriples?: KmNavigationTriple[];
    freshTurnCount?: number;
    /** Durable messages already visible verbatim in the host's fresh window. */
    excludedSourceMessageIds?: ReadonlySet<string>;
}): {
    xml: string | null;
    systemPrompt: string;
    memoryXml: string;
    episodicXml: string;
};
