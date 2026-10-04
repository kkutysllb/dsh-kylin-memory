/**
 * Settings-page config contract: the schemastery Config schema the host
 * settings service consumes, and the live-reference reads that make
 * settings-page edits apply without a plugin restart.
 */
import { describe, expect, it } from "vitest";
import z from "@deepseek-ai/schemastery";
import { Config } from "../src/schema.ts";
import { DEFAULT_CONFIG, readLive, type KmConfig, type VolatileRef } from "../src/types.ts";

/** The host reads schemas through the Standard Schema v1 entry. */
function validate(schema: unknown, value: unknown): { value?: unknown; issues?: unknown[] } {
  return (schema as { ["~standard"]: { validate(v: unknown): { value?: unknown; issues?: unknown[] } } })
    ["~standard"].validate(value) as { value?: unknown; issues?: unknown[] };
}

/** Wrap one value in the host's volatile reference protocol (cosmokit). */
const $write = Symbol.for("cosmokit.volatile.write");
function liveRef<T>(value: T): VolatileRef<T> {
  let current = value;
  return Object.freeze({
    get: () => current,
    [$write]: (next: T) => {
      current = next;
    },
  }) as unknown as VolatileRef<T>;
}

describe("settings Config schema", () => {
  it("全部可编辑字段都是 volatile（宿主 revive JSON 后读取 .dict）", () => {
    // The serialized form is a uid+refs table; dsh-settings revives it with
    // `new z(schema.toJSON())` and walks the revived schema's dict.
    const revived = new z(Config.toJSON()) as unknown as {
      dict: Record<string, { meta?: { volatile?: boolean } }>;
    };
    const expected = ["freshTurnCount", "maintenanceInterval", "recallMaxNodes", "semanticScoreThreshold"];
    for (const field of expected) {
      expect(revived.dict[field]?.meta?.volatile, `${field} must be volatile`).toBe(true);
    }
  });

  it("resolve 填充默认值并保留 schema 外的键", () => {
    const raw = {
      dbPath: "/tmp/kylin.db",
      recallScope: "same-workspace",
      messageRetention: { keep: "all", batchSize: 500 },
    };
    const resolved = validate(Config, raw).value as Record<string, unknown>;
    // Defaults ride the volatile reference protocol.
    expect(readLive(resolved.freshTurnCount as number)).toBe(DEFAULT_CONFIG.freshTurnCount);
    expect(readLive(resolved.maintenanceInterval as number)).toBe(DEFAULT_CONFIG.compactTurnCount);
    expect(readLive(resolved.recallMaxNodes as number)).toBe(DEFAULT_CONFIG.recallMaxNodes);
    // No schema default: unset stays unset so the environment fallback keeps working.
    expect(readLive(resolved.semanticScoreThreshold as number)).toBeUndefined();
    // Unknown keys flow through to apply() untouched.
    expect(resolved.dbPath).toBe("/tmp/kylin.db");
    expect(resolved.recallScope).toBe("same-workspace");
    expect(resolved.messageRetention).toEqual({ keep: "all", batchSize: 500 });
  });

  it("拒绝越界的 semanticScoreThreshold 与非法整数", () => {
    expect(validate(Config, { semanticScoreThreshold: 1.5 }).issues).toBeTruthy();
    expect(validate(Config, { semanticScoreThreshold: -2 }).issues).toBeTruthy();
    expect(validate(Config, { freshTurnCount: 0 }).issues).toBeTruthy();
    expect(validate(Config, { maintenanceInterval: 2.5 }).issues).toBeTruthy();
    expect(validate(Config, { recallMaxNodes: 3 }).issues).toBeFalsy();
  });

  it("schema JSON 能被 schemastery 重新解析（宿主 dsh-settings 的读取方式）", () => {
    const revived = new z(Config.toJSON());
    const resolved = validate(revived, { freshTurnCount: 8 }).value as Record<string, unknown>;
    expect(readLive(resolved.freshTurnCount as number)).toBe(8);
    expect(readLive(resolved.recallMaxNodes as number)).toBe(DEFAULT_CONFIG.recallMaxNodes);
  });
});

describe("readLive", () => {
  it("解包 volatile 引用，透传普通值", () => {
    expect(readLive(liveRef(7))).toBe(7);
    expect(readLive(7)).toBe(7);
    expect(readLive(undefined)).toBeUndefined();
    expect(readLive(DEFAULT_CONFIG.freshnessHalfLifeDays)).toBe(0);
  });

  it("引用 .get() 总是返回最新值（模拟宿主原地更新）", () => {
    const ref = liveRef(5);
    const cfg = { freshTurnCount: ref } as unknown as KmConfig;
    expect(readLive(cfg.freshTurnCount)).toBe(5);
    (ref as unknown as Record<symbol, (v: number) => void>)[$write](9);
    expect(readLive(cfg.freshTurnCount)).toBe(9);
  });
});
