import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSyncInstance } from "../src/store/sqlite.ts";

import {
  expandSeedTermIds,
  forgetTurnMemories,
  markMessagesExtracted,
  replaceNavigationTriples,
  saveMessageOnce,
  upsertTurnMemory,
} from "../src/store/store.ts";
import { mergeAliasTerms } from "../src/graph/maintenance.ts";
import { createTestDb } from "./helpers.ts";

let db: DatabaseSyncInstance;

beforeEach(() => {
  db = createTestDb();
});

function seedTerm(id: string, text: string): string {
  saveMessageOnce(db, `${id}-u`, "dsh:s", 1, "user", "q");
  saveMessageOnce(db, `${id}-a`, "dsh:s", 1, "assistant", "a");
  const stored = upsertTurnMemory(db, {
    sessionId: "dsh:s", summary: `摘要 ${text}`, outcome: "completed",
    sources: [{ messageId: `${id}-u`, turnIndex: 1 }, { messageId: `${id}-a`, turnIndex: 1 }],
  });
  replaceNavigationTriples(db, {
    id: stored.id, sessionId: "dsh:s", summary: "", outcome: "completed", sources: [], createdAt: 0, updatedAt: 0,
  } as any, [{ subject: text, predicate: "涉及", object: `${id}-obj` }]);
  markMessagesExtracted(db, [`${id}-u`, `${id}-a`]);
  return stored.id;
}

/** Embedding stub: subject texts cluster, objects stay mutually distinct. */
const VECTORS: Record<string, number[]> = {
  "发布端口": [1, 0, 0],
  "发布端口配置": [0.99, 0.1, 0],
  "数据库主机": [0, 1, 0],
  "m1-obj": [1, 1, 0],
  "m2-obj": [1, 0, 1],
  "m3-obj": [0, 1, 1],
};
const fakeEmbed = (text: string): Promise<number[]> =>
  Promise.resolve(VECTORS[text] ?? [0, 0, 1]);

describe("mergeAliasTerms (M4)", () => {
  it("clusters near-identical terms into alias groups deterministically", async () => {
    seedTerm("m1", "发布端口");
    seedTerm("m2", "发布端口配置");
    seedTerm("m3", "数据库主机");

    const result = await mergeAliasTerms(db, fakeEmbed);
    expect(result.merged).toBe(1);
    // One representative per distinct cluster (objects stay mutually distinct).
    expect(result.groups).toBe(5);

    // Longest display wins the canonical seat.
    const canonical = db.prepare(`
      SELECT c.display_text AS display FROM km_term_aliases a
      JOIN km_navigation_terms c ON c.id = a.canonical_term_id
    `).get() as { display: string };
    expect(canonical.display).toBe("发布端口配置");

    // Re-running is idempotent.
    expect((await mergeAliasTerms(db, fakeEmbed)).merged).toBe(1);
  });

  it("expands seeds through the alias layer so original triples stay reachable", async () => {
    seedTerm("m1", "发布端口");
    seedTerm("m2", "发布端口配置");
    seedTerm("m3", "数据库主机");
    await mergeAliasTerms(db, fakeEmbed);

    const aliasTermId = (display: string): string =>
      (db.prepare("SELECT id FROM km_navigation_terms WHERE display_text = ?").get(display) as { id: string }).id;
    // Query matched the shorter member: the canonical's siblings join the seeds,
    // keeping the triple that references the original term reachable via PPR.
    const expanded = expandSeedTermIds(db, [aliasTermId("发布端口")]);
    expect(expanded).toContain(aliasTermId("发布端口配置"));
    expect(expanded).not.toContain(aliasTermId("数据库主机"));
  });
});

describe("deletion journal (C5)", () => {
  it("records what was destroyed before deletion", () => {
    const id = seedTerm("m1", "发布端口");
    forgetTurnMemories(db, { memoryId: id }, { deletedBy: "km_forget" });

    const row = db.prepare(
      "SELECT memory_id, summary, deleted_by FROM km_deletion_journal",
    ).get() as { memory_id: string; summary: string; deleted_by: string };
    expect(row.memory_id).toBe(id);
    expect(row.summary).toContain("发布端口");
    expect(row.deleted_by).toBe("km_forget");
    // The memory itself is gone; only the journal remembers it.
    expect(db.prepare("SELECT COUNT(*) AS c FROM km_turn_memories").get()).toEqual({ c: 0 });
  });
});
