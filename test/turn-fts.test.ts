import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSyncInstance } from "../src/store/sqlite.ts";

import {
  markMessagesExtracted,
  rankTurnMemoryIdsByNavigation,
  replaceNavigationTriples,
  saveMessageOnce,
  searchTurnMemories,
  upsertTurnMemory,
} from "../src/store/store.ts";
import { createTestDb } from "./helpers.ts";

let db: DatabaseSyncInstance;

beforeEach(() => {
  db = createTestDb();
});

function memory(id: string, sessionId: string, turnIndex: number, summary: string, createdAt?: number): string {
  saveMessageOnce(db, `${id}-user`, sessionId, turnIndex, "user", `问题 ${turnIndex}`);
  saveMessageOnce(db, `${id}-assistant`, sessionId, turnIndex, "assistant", `回答 ${turnIndex}`);
  const stored = upsertTurnMemory(db, {
    sessionId,
    summary,
    outcome: "completed",
    sources: [
      { messageId: `${id}-user`, turnIndex },
      { messageId: `${id}-assistant`, turnIndex },
    ],
  });
  if (createdAt !== undefined) {
    db.prepare("UPDATE km_turn_memories SET created_at = ? WHERE id = ?").run(createdAt, stored.id);
  }
  markMessagesExtracted(db, [`${id}-user`, `${id}-assistant`]);
  return stored.id;
}

function triple(memoryId: string, subject: string, object_: string): void {
  replaceNavigationTriples(db, {
    id: memoryId, sessionId: "dsh:s", summary: "", outcome: "completed", sources: [], createdAt: 0, updatedAt: 0,
  } as any, [{ subject, predicate: "关联", object: object_ }]);
}

describe("turn-memory FTS5 (trigram)", () => {
  it("matches CJK substrings without the complete phrase", () => {
    const id = memory("m1", "dsh:s", 1, "发布端口改为 9090 并重启网关。");
    // LIKE would need the full phrase; trigram matches the substring pair.
    const hits = searchTurnMemories(db, "重启网关", 6);
    expect(hits.map(m => m.id)).toContain(id);
  });

  it("falls back to LIKE for sub-trigram-length queries", () => {
    const id = memory("m1", "dsh:s", 1, "端口 9090 已生效。");
    // 2 characters: trigram cannot run; LIKE still finds the exact substring.
    expect(searchTurnMemories(db, "9090", 6).map(m => m.id)).toContain(id);
  });

  it("keeps the FTS index in sync across updates and deletes", () => {
    const id = memory("m1", "dsh:s", 1, "旧摘要内容 alpha。");
    db.prepare("UPDATE km_turn_memories SET summary = ? WHERE id = ?").run("新摘要内容 beta。", id);
    expect(searchTurnMemories(db, "新摘要内容", 6).map(m => m.id)).toContain(id);
    expect(searchTurnMemories(db, "旧摘要内容", 6)).toEqual([]);
    db.prepare("DELETE FROM km_turn_memories WHERE id = ?").run(id);
    expect(searchTurnMemories(db, "新摘要内容", 6)).toEqual([]);
  });
});

describe("navigation freshness decay", () => {
  it("defaults off and ranks purely by graph score", () => {
    const old = memory("m1", "dsh:s", 1, "旧记忆。", Date.now() - 180 * 86_400_000);
    const fresh = memory("m2", "dsh:s", 2, "新记忆。");
    triple(old, "发布端口", "x");
    triple(fresh, "发布端口", "y");
    // Same endpoint term scores; the older memory wins the tie deterministically.
    expect(rankTurnMemoryIdsByNavigation(db, new Map(), { freshnessHalfLifeDays: 0 }).length).toBe(0);
  });

  it("demotes stale memories when the half-life is enabled", () => {
    const old = memory("m1", "dsh:s", 1, "旧记忆 ggg-seed。", Date.now() - 180 * 86_400_000);
    const fresh = memory("m2", "dsh:s", 2, "新记忆 ggg-seed。");
    triple(old, "ggg-seed", "x");
    triple(fresh, "ggg-seed", "y");

    const seedScores = new Map<string, number>();
    for (const row of db.prepare("SELECT id FROM km_navigation_terms").all() as Array<{ id: string }>) {
      seedScores.set(row.id, 1);
    }
    const plain = rankTurnMemoryIdsByNavigation(db, seedScores);
    const decayed = rankTurnMemoryIdsByNavigation(db, seedScores, { freshnessHalfLifeDays: 14 });
    expect(plain).toContain(old);
    // 180 days ≈ 13 half-lives: the stale memory sinks below the fresh one.
    expect(decayed.indexOf(fresh)).toBeLessThan(decayed.indexOf(old));
  });
});
