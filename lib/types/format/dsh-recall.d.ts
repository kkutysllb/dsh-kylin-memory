import type { KmNode, KmTurnMemory } from "../types.ts";
import type { KmNodeSource } from "../store/store.ts";
/** Keep recalled history before the live human instruction on the model surface. */
export declare function insertDshRecallBeforeCurrentUser(messages: any[], recalledMessage: any): any[];
/**
 * Remove only memory that is already visible verbatim in DSH's fresh window.
 * Archived same-session evidence is first-class memory, alongside evidence
 * from other sessions; filtering the whole current session loses exactly the
 * history Kylin Memory took off the provider surface.
 */
export declare function filterDshRecallNodes(nodes: KmNode[], sources: KmNodeSource[], currentSession: string, visibleMessageIds: ReadonlySet<string>, hasArchivedHistory: boolean): KmNode[];
/** Avoid replaying a compact summary whose exact Q/A is still visible. */
export declare function filterDshRecallMemories(memories: KmTurnMemory[], currentSession: string, visibleMessageIds: ReadonlySet<string>): KmTurnMemory[];
