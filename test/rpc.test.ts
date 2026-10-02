import { describe, expect, it } from "vitest";

import { handleMemoryRpc, type MemoryRpcDeps } from "../src/rpc.ts";

const deps: MemoryRpcDeps = {
  overview: () => ({
    dbPath: "/tmp/test.db",
    turnMemories: 2,
    navigationTerms: 5,
    navigationTriples: 4,
    navigationCommunities: 1,
    legacyNodes: 0,
    legacyEdges: 0,
    messages: 4,
    extraction: { pending: 0, succeeded: 2, quarantined: 0 },
    recallEnabled: true,
    embeddingState: "fts-only",
    turnVectors: 2,
    retention: { keep: "all", recentTurns: 0, retentionDays: 0 },
  }),
  listMemories: (params) => ({
    memories: [{
      id: "m1", sessionId: params.sessionId ?? "dsh:all", summary: "摘要", outcome: "completed", updatedAt: 1,
    }],
    total: 1,
  }),
  forget: async (params) => ({
    turnMemories: 1,
    messages: params.dryRun ? 0 : 2,
    navigationTriples: 1,
    navigationTerms: 0,
    extractionSessions: params.sessionId ? 1 : 0,
  }),
};

describe("memory rpc endpoints", () => {
  it("serves the overview snapshot", async () => {
    const result = await handleMemoryRpc(deps, "overview", {});
    expect(result).toEqual({ ok: true, value: expect.objectContaining({ turnMemories: 2, messages: 4 }) });
  });

  it("bounds list params and forwards the session filter", async () => {
    const result = await handleMemoryRpc(deps, "memories", { sessionId: "dsh:s1", limit: 200, offset: 5 });
    expect(result).toEqual({
      ok: true,
      value: { memories: [expect.objectContaining({ sessionId: "dsh:s1" })], total: 1 },
    });
    await expect(handleMemoryRpc(deps, "memories", { limit: 1.5 })).resolves.toMatchObject({
      ok: false,
      error: { code: "invalid" },
    });
    await expect(handleMemoryRpc(deps, "memories", { offset: -5 })).resolves.toMatchObject({
      ok: false,
      error: { code: "invalid" },
    });
  });

  it("requires exactly one forget scope and reports validation errors", async () => {
    await expect(handleMemoryRpc(deps, "forget", {})).resolves.toMatchObject({
      ok: false, error: { code: "invalid" },
    });
    await expect(handleMemoryRpc(deps, "forget", { sessionId: "a", memoryId: "b" })).resolves.toMatchObject({
      ok: false, error: { code: "invalid" },
    });
    await expect(handleMemoryRpc(deps, "forget", { memoryId: "m1", dryRun: true })).resolves.toMatchObject({
      ok: true, value: expect.objectContaining({ messages: 0 }),
    });
  });

  it("maps unknown endpoints and non-object payloads to failures", async () => {
    await expect(handleMemoryRpc(deps, "nope", {})).resolves.toMatchObject({
      ok: false, error: { code: "not-found" },
    });
    await expect(handleMemoryRpc(deps, "overview", "oops")).resolves.toMatchObject({
      ok: false, error: { code: "invalid" },
    });
  });
});
