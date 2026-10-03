import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSyncInstance } from "../src/store/sqlite.ts";

import {
  forgetTurnMemories,
  markExtractionTurnCompleted,
  markMessagesExtracted,
  replaceNavigationTriples,
  saveMessageOnce,
  upsertTurnMemory,
} from "../src/store/store.ts";
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
): string {
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
    id: stored.id,
    sessionId,
    summary: "",
    outcome: "completed",
    sources: [],
    createdAt: 0,
    updatedAt: 0,
  } as any, triples);
  markMessagesExtracted(db, [`${id}-user`, `${id}-assistant`]);
  markExtractionTurnCompleted(db, sessionId, turnIndex);
  return stored.id;
}

function tableCount(table: string, where = "", ...params: string[]): number {
  const row = db.prepare(`SELECT COUNT(*) AS c FROM ${table} ${where}`).get(...params) as { c: number };
  return Number(row.c);
}

describe("forgetTurnMemories", () => {
  it("requires exactly one scope", () => {
    expect(() => forgetTurnMemories(db, {})).toThrow(TypeError);
    expect(() => forgetTurnMemories(db, { sessionId: "s", memoryId: "m" })).toThrow(TypeError);
  });

  it("forgets a whole session and reclaims only orphaned navigation terms", () => {
    // 发布端口 term is shared across sessions; 临时令牌 exists only in session-a.
    memory("m1", "dsh:session-a", 1, "发布端口改为 9090。", [
      { subject: "发布端口", predicate: "改为", object: "9090" },
    ]);
    memory("m2", "dsh:session-a", 2, "临时令牌已轮换。", [
      { subject: "临时令牌", predicate: "轮换于", object: "周五" },
    ]);
    memory("m3", "dsh:session-b", 1, "发布端口保持 9090。", [
      { subject: "发布端口", predicate: "保持", object: "9090" },
    ]);

    const counts = forgetTurnMemories(db, { sessionId: "dsh:session-a" });

    expect(counts).toEqual({
      turnMemories: 2,
      messages: 4,
      navigationTriples: 2,
      navigationTerms: 2,
      extractionSessions: 1,
    });
    expect(tableCount("km_turn_memories")).toBe(1);
    expect(tableCount("km_messages", "WHERE session_id = 'dsh:session-a'")).toBe(0);
    expect(tableCount("km_turn_memory_sources")).toBe(2);
    expect(tableCount("km_turn_vectors")).toBe(0);
    // Shared term survives (session-b still cites 发布端口); orphans reclaimed.
    expect(tableCount("km_navigation_terms", "WHERE normalized LIKE '%发布端口%'")).toBe(1);
    expect(tableCount("km_navigation_terms", "WHERE normalized LIKE '%临时令牌%'")).toBe(0);
    expect(tableCount("km_extraction_sessions", "WHERE session_id = 'dsh:session-a'")).toBe(0);
  });

  it("forgets one memory but keeps messages another memory still cites", () => {
    memory("m1", "dsh:session-a", 1, "端口 9090 已生效。", [
      { subject: "发布端口", predicate: "改为", object: "9090" },
    ]);
    const m2 = memory("m2", "dsh:session-a", 2, "回滚端口配置。", [
      { subject: "发布端口", predicate: "回滚到", object: "8080" },
    ]);
    // Simulate a shared source: m2 also cites m1's user message.
    db.prepare(
      "INSERT INTO km_turn_memory_sources (memory_id, message_id, turn_index, source_order) VALUES (?, ?, ?, ?)",
    ).run(m2, "m1-user", 2, 2);

    const counts = forgetTurnMemories(db, { memoryId: m2 });

    expect(counts.turnMemories).toBe(1);
    // m2 cited three messages (its own two plus m1-user); m1-user survives
    // because m1 still cites it, so exactly two are deleted.
    expect(counts.messages).toBe(2);
    expect(tableCount("km_messages", "WHERE id = 'm1-user'")).toBe(1);
    expect(tableCount("km_messages", "WHERE id = 'm2-user'")).toBe(0);
    // 发布端口 term survives: m1 still has its triple.
    expect(tableCount("km_navigation_terms")).toBe(2);
  });

  it("dry run reports counts without deleting", () => {
    memory("m1", "dsh:session-a", 1, "摘要。", [
      { subject: "A", predicate: "指向", object: "B" },
    ]);

    const counts = forgetTurnMemories(db, { sessionId: "dsh:session-a" }, { dryRun: true });

    expect(counts.turnMemories).toBe(1);
    expect(counts.messages).toBe(2);
    expect(tableCount("km_turn_memories")).toBe(1);
    expect(tableCount("km_messages")).toBe(2);
    expect(tableCount("km_navigation_terms")).toBe(2);
  });

  it("accepts an unknown session id and deletes nothing", () => {
    memory("m1", "dsh:session-a", 1, "摘要。", []);
    const counts = forgetTurnMemories(db, { sessionId: "dsh:missing" });
    expect(counts.turnMemories).toBe(0);
    expect(tableCount("km_turn_memories")).toBe(1);
  });

  it("workspaceId narrows a session forget and keeps other workspaces' evidence", () => {
    const m1 = memory("m1", "dsh:session-a", 1, "项目甲的记忆。", [
      { subject: "甲端口", predicate: "改为", object: "9090" },
    ]);
    const m2 = memory("m2", "dsh:session-a", 2, "项目乙的记忆。", [
      { subject: "乙端口", predicate: "改为", object: "8080" },
    ]);
    db.prepare("UPDATE km_turn_memories SET workspace_id = 'ws-b' WHERE id = ?").run(m2);

    const first = forgetTurnMemories(db, { sessionId: "dsh:session-a", workspaceId: "default" });
    expect(first).toMatchObject({ turnMemories: 1, messages: 2, navigationTriples: 1, extractionSessions: 0 });
    expect(tableCount("km_turn_memories", "WHERE id = ?", m1)).toBe(0);
    expect(tableCount("km_turn_memories", "WHERE id = ?", m2)).toBe(1);
    expect(tableCount("km_messages")).toBe(2);
    expect(tableCount("km_deletion_journal")).toBe(1);

    // Emptying the last workspace of the session also drops its watermark.
    const second = forgetTurnMemories(db, { sessionId: "dsh:session-a", workspaceId: "ws-b" });
    expect(second).toMatchObject({ turnMemories: 1, messages: 2, extractionSessions: 1 });
    expect(tableCount("km_messages")).toBe(0);
    expect(tableCount("km_extraction_sessions", "WHERE session_id = 'dsh:session-a'")).toBe(0);
    expect(tableCount("km_deletion_journal")).toBe(2);
  });

  it("rejects workspaceId combined with memoryId", () => {
    expect(() => forgetTurnMemories(db, { memoryId: "m", workspaceId: "ws" })).toThrow(TypeError);
  });
});
