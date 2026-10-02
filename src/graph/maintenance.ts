/**
 * kylin-memory — 图谱维护
 *
 *
 * 调用时机：session_end
 *
 * 执行顺序：
 *   1. 全局 PageRank（基线分数写入 DB，供 topNodes 兜底用）
 *   2. 社区检测（重新划分知识域）
 *
 * 注意：个性化 PPR 不在这里跑，它在 recall 时实时计算。
 */

import { DatabaseSync, type DatabaseSyncInstance } from "../store/sqlite.ts";
import type { KmConfig } from "../types.ts";
import { computeGlobalPageRank, invalidateGraphCache, type GlobalPageRankResult } from "./pagerank.ts";
import { detectCommunities, detectNavigationCommunities, type CommunityResult } from "./community.ts";

export interface MaintenanceResult {
  pagerank: GlobalPageRankResult;
  community: CommunityResult;
  navigationCommunity: CommunityResult;
  durationMs: number;
}

export async function runMaintenance(db: DatabaseSyncInstance, cfg: KmConfig): Promise<MaintenanceResult> {
  const start = Date.now();

  // New graph writes require a fresh ranking/cache view.
  invalidateGraphCache(db);

  // 1. 全局 PageRank（基线）
  const pagerankResult = computeGlobalPageRank(db, cfg);

  // 2. 社区检测
  const communityResult = detectCommunities(db);
  const navigationCommunityResult = detectNavigationCommunities(db);

  return {
    pagerank: pagerankResult,
    community: communityResult,
    navigationCommunity: navigationCommunityResult,
    durationMs: Date.now() - start,
  };
}

// ─── 实体归一化 v1：embedding 相似度离线聚类 → 别名间接层 ──────

/** Conservative floor (docs/03-plan/0302 M4): a wrong merge poisons the
 * navigation graph, so only near-identical display texts cluster. */
const TERM_ALIAS_SIMILARITY = 0.85;

function termCosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/**
 * Cluster navigation terms whose display texts embed near-identically and
 * record the groups as alias rows (term_id → canonical_term_id). Triples are
 * never rewritten; recall expands seeds through the alias layer instead.
 * Deterministic: representatives are chosen by (longest display, then id).
 * Full rebuild per run — idempotent and self-healing after deletes.
 */
export async function mergeAliasTerms(
  db: DatabaseSyncInstance,
  embed: (text: string, kind: "db") => Promise<number[]>,
): Promise<{ merged: number; groups: number }> {
  const terms = db.prepare(
    "SELECT id, display_text FROM km_navigation_terms ORDER BY id",
  ).all() as Array<{ id: string; display_text: string }>;
  if (terms.length < 2) return { merged: 0, groups: 0 };

  const vectors = new Map<string, number[]>();
  const cached = new Set(
    (db.prepare("SELECT term_id FROM km_term_vectors").all() as Array<{ term_id: string }>).map(r => r.term_id),
  );
  const putVec = db.prepare(
    "INSERT OR REPLACE INTO km_term_vectors (term_id, content_hash, embedding) VALUES (?,?,?)",
  );
  for (const term of terms) {
    if (cached.has(term.id)) {
      const row = db.prepare("SELECT embedding FROM km_term_vectors WHERE term_id = ?").get(term.id) as
        | { embedding: Uint8Array } | undefined;
      if (row) { vectors.set(term.id, Array.from(new Float32Array(row.embedding.buffer))); continue; }
    }
    try {
      const vec = await embed(term.display_text, "db");
      if (!vec.length) continue;
      putVec.run(term.id, term.display_text, new Float32Array(vec));
      vectors.set(term.id, vec);
    } catch { /* a term that fails to embed simply never merges */ }
  }

  const ordered = terms
    .filter(t => vectors.has(t.id))
    .sort((l, r) => r.display_text.length - l.display_text.length || l.id.localeCompare(r.id));
  const representatives: Array<{ id: string; vec: number[] }> = [];
  const aliasOf = new Map<string, string>();
  for (const term of ordered) {
    const vec = vectors.get(term.id)!;
    const hit = representatives.find(rep => termCosine(vec, rep.vec) >= TERM_ALIAS_SIMILARITY);
    if (hit) aliasOf.set(term.id, hit.id);
    else representatives.push({ id: term.id, vec });
  }

  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM km_term_aliases");
    const insert = db.prepare(
      "INSERT OR IGNORE INTO km_term_aliases (term_id, canonical_term_id, created_at) VALUES (?,?,?)",
    );
    const now = Date.now();
    for (const [termId, canonicalId] of aliasOf) insert.run(termId, canonicalId, now);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { merged: aliasOf.size, groups: representatives.length };
}
