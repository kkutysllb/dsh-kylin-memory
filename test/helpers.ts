/**
 * kylin-memory — 测试辅助
 *
 * 内存 SQLite 数据库，每个测试用例独立。Schema 一律来自真实的 migrate()，
 * 不再手工复刻（曾经的漂移是真实 bug 来源：m17 新列在手工 schema 里缺失）。
 */

import { migrate } from "../src/store/db.ts";
import { DatabaseSync, type DatabaseSyncInstance } from "../src/store/sqlite.ts";

/**
 * 创建内存数据库并跑完整迁移。
 */
export function createTestDb(): DatabaseSyncInstance {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  // Schema 一律来自真实 migrate()：手工复刻曾在 m17 加列时当场漂移（C4 债务）。
  migrate(db);

  return db;
}

/**
 * 快速插入测试节点
 */
export function insertNode(
  db: DatabaseSyncInstance,
  opts: {
    id?: string;
    type?: string;
    name: string;
    description?: string;
    content?: string;
    status?: string;
    validatedCount?: number;
    sessions?: string[];
  },
): string {
  const id = opts.id ?? `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(`
    INSERT INTO km_nodes (id, type, name, description, content, status, validated_count, source_sessions, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    opts.type ?? "SKILL",
    opts.name,
    opts.description ?? `desc of ${opts.name}`,
    opts.content ?? `content of ${opts.name}`,
    opts.status ?? "active",
    opts.validatedCount ?? 1,
    JSON.stringify(opts.sessions ?? ["test-session"]),
    Date.now(),
    Date.now(),
  );
  return id;
}

/**
 * 快速插入测试边
 */
export function insertEdge(
  db: DatabaseSyncInstance,
  opts: {
    fromId: string;
    toId: string;
    type?: string;
    instruction?: string;
  },
): void {
  const id = `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(`
    INSERT INTO km_edges (id, from_id, to_id, type, instruction, session_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    opts.fromId,
    opts.toId,
    opts.type ?? "USED_SKILL",
    opts.instruction ?? "test instruction",
    "test-session",
    Date.now(),
  );
}
