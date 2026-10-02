import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSyncInstance } from "../src/store/sqlite.ts";

import {
  listTurnMemories,
  markMessagesExtracted,
  rankTurnMemoryIdsByNavigation,
  replaceNavigationTriples,
  saveMessageOnce,
  searchTurnMemories,
  upsertTurnMemory,
} from "../src/store/store.ts";
import { Recaller } from "../src/recaller/recall.ts";
import { DEFAULT_CONFIG } from "../src/types.ts";
import { createTestDb } from "./helpers.ts";

let db: DatabaseSyncInstance;

beforeEach(() => {
  db = createTestDb();
});

function memory(id: string, sessionId: string, workspaceId: string, summary: string): string {
  saveMessageOnce(db, `${id}-user`, sessionId, 1, "user", "q", workspaceId);
  saveMessageOnce(db, `${id}-assistant`, sessionId, 1, "assistant", "a", workspaceId);
  const stored = upsertTurnMemory(db, {
    sessionId,
    summary,
    outcome: "completed",
    sources: [
      { messageId: `${id}-user`, turnIndex: 1 },
      { messageId: `${id}-assistant`, turnIndex: 1 },
    ],
    workspaceId,
  });
  markMessagesExtracted(db, [`${id}-user`, `${id}-assistant`]);
  replaceNavigationTriples(db, {
    id: stored.id, sessionId, summary: "", outcome: "completed", sources: [], createdAt: 0, updatedAt: 0,
  } as any, [{ subject: `${id}-term`, predicate: "涉及", object: `${id}-obj` }]);
  return stored.id;
}

const scopedRecaller = () => new Recaller(db, { ...DEFAULT_CONFIG, recallScope: "same-workspace" });

describe("workspace scoping", () => {
  it("defaults every write to the implicit default workspace", () => {
    const id = upsertTurnMemory(db, {
      sessionId: "dsh:s", summary: "默认工作区记忆。", outcome: "completed",
      sources: [{ messageId: "u1", turnIndex: 1 }, { messageId: "a1", turnIndex: 1 }],
    }).id;
    const row = db.prepare("SELECT workspace_id FROM km_turn_memories WHERE id = ?").get(id) as { workspace_id: string };
    expect(row.workspace_id).toBe("default");
  });

  it("lexical recall honours the workspace filter", async () => {
    const inA = memory("m1", "dsh:s-a", "ws-a", "工作区 A 的发布端口说明。");
    memory("m2", "dsh:s-b", "ws-b", "工作区 B 的发布端口说明。");

    expect(searchTurnMemories(db, "发布端口", 6, "ws-a").map(m => m.id)).toEqual([inA]);
    const global = await new Recaller(db, DEFAULT_CONFIG).recall("发布端口");
    expect(global.turnMemories.length).toBe(2);
  });

  it("same-workspace recall excludes other workspaces through both routes", async () => {
    memory("m1", "dsh:s-a", "ws-a", "数据库迁移方案 mmm-key。");
    memory("m2", "dsh:s-b", "ws-b", "数据库迁移方案 mmm-key。");

    const recalled = await scopedRecaller().recall("数据库迁移方案", { workspaceId: "ws-a" });
    expect(recalled.turnMemories.map(m => m.summary)).toEqual(["数据库迁移方案 mmm-key。"]);
    // No filter passed and no embedding: lexical path still applies the
    // configured scope to every row it would return.
    const unscoped = await new Recaller(db, DEFAULT_CONFIG).recall("数据库迁移方案");
    expect(unscoped.turnMemories.length).toBe(2);
  });

  it("navigation ranking honours the workspace filter", () => {
    const inA = memory("m1", "dsh:s-a", "ws-a", "术语导航 ooo-key。");
    memory("m2", "dsh:s-b", "ws-b", "术语导航 ooo-key。");
    const seedScores = new Map<string, number>();
    for (const row of db.prepare("SELECT id FROM km_navigation_terms").all() as Array<{ id: string }>) {
      seedScores.set(row.id, 1);
    }
    const scoped = rankTurnMemoryIdsByNavigation(db, seedScores, { workspaceId: "ws-a" });
    expect(scoped).toEqual([inA]);
  });

  it("listing filters by workspace and legacy rows read as default", () => {
    memory("m1", "dsh:s-a", "ws-a", "工作区 A 记忆。");
    memory("m2", "dsh:s-b", "ws-b", "工作区 B 记忆。");
    expect(listTurnMemories(db, { workspaceId: "ws-b" }).memories.map(m => m.summary))
      .toEqual(["工作区 B 记忆。"]);
    // Rows written before m19 exist in migrations' default backfill.
    const legacyId = memory("m3", "dsh:s-c", "default", "默认工作区记忆。");
    expect(listTurnMemories(db, { workspaceId: "default" }).memories.map(m => m.id)).toContain(legacyId);
  });
});
