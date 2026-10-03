import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSyncInstance } from "../src/store/sqlite.ts";

import {
  filterSupersededTurnMemories,
  forgetTurnMemories,
  markMessagesExtracted,
  replaceNavigationTriples,
  saveMessageOnce,
  supersedeConflictingTriples,
  upsertTurnMemory,
} from "../src/store/store.ts";
import { Recaller } from "../src/recaller/recall.ts";
import { DEFAULT_CONFIG, type KmTurnMemory } from "../src/types.ts";
import { createTestDb } from "./helpers.ts";

let db: DatabaseSyncInstance;

beforeEach(() => {
  db = createTestDb();
});

function memory(
  id: string,
  sessionId: string,
  turnIndex: number,
  summary: string,
  triples: Array<{ subject: string; predicate: string; object: string }>,
): KmTurnMemory {
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
  replaceNavigationTriples(db, {
    id: stored.id, sessionId, summary: "", outcome: "completed", sources: [], createdAt: 0, updatedAt: 0,
  } as any, triples);
  markMessagesExtracted(db, [`${id}-user`, `${id}-assistant`]);
  return stored;
}

const recaller = () => new Recaller(db, DEFAULT_CONFIG);

describe("supersedeConflictingTriples", () => {
  it("invalidates an older triple when a newer memory changes the object", () => {
    const old = memory("m1", "dsh:s", 1, "发布端口确认 zzz-old-value。", [
      { subject: "发布端口", predicate: "改为", object: "9090" },
    ]);
    const newer = memory("m2", "dsh:s", 2, "发布端口确认 aaa-new-value。", [
      { subject: "发布端口", predicate: "改为", object: "8080" },
    ]);
    supersedeConflictingTriples(db, newer);

    const triple = db.prepare(
      "SELECT superseded_by FROM km_navigation_triples WHERE memory_id = ?",
    ).get(old.id) as { superseded_by: string | null };
    expect(triple.superseded_by).toBe(newer.id);
    const oldMemory = db.prepare(
      "SELECT superseded_count FROM km_turn_memories WHERE id = ?",
    ).get(old.id) as { superseded_count: number };
    expect(Number(oldMemory.superseded_count)).toBe(1);
  });

  it("does not invalidate when object or predicate differs", () => {
    const sameObject = memory("m1", "dsh:s", 1, "端口记录 kkk-one。", [
      { subject: "发布端口", predicate: "改为", object: "9090" },
    ]);
    const otherPredicate = memory("m2", "dsh:s", 2, "端口记录 kkk-two。", [
      { subject: "发布端口", predicate: "回滚到", object: "9090" },
    ]);
    supersedeConflictingTriples(db, sameObject);
    supersedeConflictingTriples(db, otherPredicate);

    const remaining = db.prepare(
      "SELECT COUNT(*) AS c FROM km_navigation_triples WHERE superseded_by IS NOT NULL",
    ).get() as { c: number };
    expect(Number(remaining.c)).toBe(0);
  });

  // Regression: subject and predicate candidates must pair up per triple.
  // Independent IN-sets used to cross-match and over-invalidate, e.g. marking
  // (A,p1,·) stale when the new memory only asserts (A,p2,·) and (B,p1,·).
  it("requires a matching (subject, predicate) pair, not cross-matched sets", () => {
    const old = memory("m1", "dsh:s", 1, "多事实旧记录。", [
      { subject: "服务端口", predicate: "改为", object: "9090" },
      { subject: "服务端口", predicate: "部署在", object: "网关机" },
    ]);
    const newer = memory("m2", "dsh:s", 2, "多事实新记录。", [
      { subject: "服务端口", predicate: "改为", object: "8080" },
      { subject: "数据库端口", predicate: "部署在", object: "存储机" },
    ]);
    supersedeConflictingTriples(db, newer);

    // (服务端口, 改为) restated with a new object: invalidated.
    const invalidated = db.prepare(
      `SELECT COUNT(*) AS c FROM km_navigation_triples t
       WHERE t.memory_id = ? AND t.predicate = ? AND t.superseded_by IS NOT NULL`,
    ).get(old.id, "改为") as { c: number };
    expect(Number(invalidated.c)).toBe(1);
    // (服务端口, 部署在) was never restated as a pair: must survive.
    const surviving = db.prepare(
      `SELECT COUNT(*) AS c FROM km_navigation_triples t
       WHERE t.memory_id = ? AND t.predicate = ? AND t.superseded_by IS NULL`,
    ).get(old.id, "部署在") as { c: number };
    expect(Number(surviving.c)).toBe(1);
    const oldMemory = db.prepare(
      `SELECT superseded_count FROM km_turn_memories WHERE id = ?`,
    ).get(old.id) as Record<string, number>;
    expect(Number(oldMemory.superseded_count)).toBe(1);
  });
});

describe("filterSupersededTurnMemories", () => {
  it("drops the invalidated memory only when its invalidator is in the candidate set", () => {
    const old = memory("m1", "dsh:s", 1, "发布端口 zzz-old-value 确认。", [
      { subject: "发布端口", predicate: "改为", object: "9090" },
    ]);
    const newer = memory("m2", "dsh:s", 2, "发布端口 aaa-new-value 确认。", [
      { subject: "发布端口", predicate: "改为", object: "8080" },
    ]);
    supersedeConflictingTriples(db, newer);

    expect(filterSupersededTurnMemories(db, [old.id, newer.id])).toEqual([newer.id]);
    // The invalidator was not recalled: the old memory remains the best context.
    expect(filterSupersededTurnMemories(db, [old.id])).toEqual([old.id]);
  });
});

describe("recall integration", () => {
  it("returns only the newest value when both the stale and fresh memories match", async () => {
    memory("m1", "dsh:s", 1, "发布端口改为 9090。", [
      { subject: "发布端口", predicate: "改为", object: "9090" },
    ]);
    const newer = memory("m2", "dsh:s", 2, "发布端口改为 8080。", [
      { subject: "发布端口", predicate: "改为", object: "8080" },
    ]);
    supersedeConflictingTriples(db, newer);

    const result = await recaller().recall("发布端口");
    const ids = result.turnMemories.map(memory => memory.id);
    expect(ids).toContain(newer.id);
    // The invalidated memory must not reach the model context.
    expect(ids).not.toContain(expect.stringMatching(/m1/) ?? "");
    expect(result.turnMemories.length).toBe(1);
  });
});

describe("forget restores invalidated facts", () => {
  it("clears invalidation when the invalidating memory is forgotten", () => {
    const old = memory("m1", "dsh:s", 1, "发布端口 zzz-old-value。", [
      { subject: "发布端口", predicate: "改为", object: "9090" },
    ]);
    const newer = memory("m2", "dsh:s", 2, "发布端口 aaa-new-value。", [
      { subject: "发布端口", predicate: "改为", object: "8080" },
    ]);
    supersedeConflictingTriples(db, newer);

    forgetTurnMemories(db, { memoryId: newer.id });

    const triple = db.prepare(
      "SELECT superseded_by FROM km_navigation_triples WHERE memory_id = ?",
    ).get(old.id) as { superseded_by: string | null };
    expect(triple.superseded_by).toBeNull();
    const oldMemory = db.prepare(
      "SELECT superseded_count FROM km_turn_memories WHERE id = ?",
    ).get(old.id) as { superseded_count: number };
    expect(Number(oldMemory.superseded_count)).toBe(0);
    expect(filterSupersededTurnMemories(db, [old.id, newer.id])).toEqual([old.id, newer.id]);
  });
});
