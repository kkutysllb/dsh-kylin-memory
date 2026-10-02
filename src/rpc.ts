/** Host RPC adapter for the Kylin Memory web panel over the Connection
 * generic-channel registry (`/dsh-kylin-memory`). The connection service owns
 * the Host/Origin fence and browser authentication; this adapter only
 * validates payloads and maps failures into the result envelope.
 *
 * Registered on both DSH and QiLin: the webServer/connection contract names
 * and semantics are identical across the two hosts.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { ForgetCounts } from "./store/store.ts";

export const RPC_CHANNEL = "/dsh-kylin-memory";

/** Bounded body shapes keep every handler total. */
const MAX_STRING = 300;
const RPC_BODY_LIMIT_BYTES = 1 * 1024 * 1024;

export type RpcResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } };

export class RpcValidationError extends Error {}

function ok<T>(value: T): RpcResult<T> {
  return { ok: true, value };
}

function fail(code: string, message: string): RpcResult<never> {
  return { ok: false, error: { code, message } };
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new RpcValidationError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function optionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new RpcValidationError(`${label} must be a string`);
  if (value.length > MAX_STRING) throw new RpcValidationError(`${label} exceeds ${MAX_STRING} chars`);
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function optionalBoolean(value: unknown, label: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new RpcValidationError(`${label} must be a boolean`);
  return value;
}

function boundedNumber(value: unknown, label: string, min: number, max: number, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new RpcValidationError(`${label} must be an integer ${min}..${max}`);
  }
  return value;
}

export interface MemoryOverviewPayload {
  dbPath: string;
  turnMemories: number;
  navigationTerms: number;
  navigationTriples: number;
  navigationCommunities: number;
  legacyNodes: number;
  legacyEdges: number;
  messages: number;
  extraction: { pending: number; succeeded: number; quarantined: number };
  recallEnabled: boolean;
  embeddingState: string;
  turnVectors: number;
  retention: { keep: string; recentTurns: number; retentionDays: number };
}

export interface MemoryListItem {
  id: string;
  sessionId: string;
  summary: string;
  outcome: string;
  updatedAt: number;
}

export interface MemoryListPayload {
  memories: MemoryListItem[];
  total: number;
}

export interface MemoryRpcDeps {
  overview(): MemoryOverviewPayload;
  listMemories(params: { sessionId?: string; limit: number; offset: number }): MemoryListPayload;
  forget(params: { sessionId?: string; memoryId?: string; dryRun: boolean }): Promise<ForgetCounts>;
}

interface RpcHostContext {
  effect(factory: () => void | (() => void), label?: string): void;
  webServer: {
    /** Returns the channel disposer (same contract the automation plugin
     * relies on for its webServer.register row). */
    register(options: {
      kind: string;
      path: string;
      handler: (req: IncomingMessage, res: ServerResponse) => void;
    }): () => void;
  };
  connection: {
    requestRejection(req: unknown): number | undefined;
  };
}

/** Register the `/dsh-kylin-memory` channel on the caller's injected
 * webServer, replicating the Connection transport semantics: the same
 * Host/Origin + browser-auth fence (`connection.requestRejection`), the same
 * client-request/server-response envelopes, and a bounded buffered body.
 * (Direct registration is the supported path — same rationale as the
 * automation plugin: vendored rpc handlers run on the connection plugin's own
 * fiber, which cannot gain `webServer` from a third-party patch row.) */
export function registerMemoryRpc(ctx: RpcHostContext, deps: MemoryRpcDeps): void {
  ctx.effect(
    () => ctx.webServer.register({
      kind: "prefix",
      path: RPC_CHANNEL,
      handler: (req, res) => { void serveRpcRequest(ctx, deps, req, res); },
    }),
    "kylin-memory: rpc channel",
  );
}

async function serveRpcRequest(
  ctx: RpcHostContext,
  deps: MemoryRpcDeps,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const reply = (status: number, payload: unknown): void => {
    res.writeHead(status, { "content-type": "application/json", connection: "close" });
    res.end(JSON.stringify(payload));
  };
  // The same Host/Origin + persistent browser-auth fence the /api route uses.
  const rejection = ctx.connection.requestRejection(req);
  if (rejection !== undefined) {
    res.writeHead(rejection);
    res.end(rejection === 401 ? "unauthorized" : "forbidden");
    return;
  }
  if (req.method !== "POST") {
    res.writeHead(405, { "content-type": "text/plain" });
    res.end("method not allowed");
    return;
  }
  const url = new URL(req.url ?? "/", "http://kylin.internal");
  const endpoint = url.pathname === RPC_CHANNEL ? "" : url.pathname.startsWith(`${RPC_CHANNEL}/`)
    ? url.pathname.slice(RPC_CHANNEL.length + 1)
    : undefined;
  if (endpoint === undefined || !/^[A-Za-z0-9_$.:-]+$/.test(endpoint)) {
    reply(404, { type: "server-response", rpcId: "invalid-request", result: fail("not-found", "unknown endpoint") });
    return;
  }
  const contentType = String(req.headers["content-type"] ?? "").split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    reply(415, { type: "server-response", rpcId: "invalid-request", result: fail("invalid", "content type must be application/json") });
    return;
  }
  let raw = "";
  let received = 0;
  try {
    for await (const chunk of req) {
      received += (chunk as Buffer).byteLength;
      if (received > RPC_BODY_LIMIT_BYTES) throw new Error("body too large");
      raw += String(chunk);
    }
  } catch {
    res.writeHead(400, { connection: "close" });
    res.end("body read failure");
    req.destroy();
    return;
  }
  let envelope: { type?: unknown; rpcId?: unknown; method?: unknown; payload?: unknown };
  try {
    envelope = JSON.parse(raw) as typeof envelope;
  } catch {
    reply(400, { type: "server-response", rpcId: "invalid-request", result: fail("invalid", "body is not JSON") });
    return;
  }
  if (envelope?.type !== "client-request" || typeof envelope.rpcId !== "string"
    || typeof envelope.method !== "string") {
    reply(200, {
      type: "server-response",
      rpcId: typeof envelope?.rpcId === "string" ? envelope.rpcId : "invalid-request",
      result: fail("invalid", "invalid client-request message"),
    });
    return;
  }
  const result = await handleMemoryRpc(deps, envelope.method, envelope.payload);
  reply(200, { type: "server-response", rpcId: envelope.rpcId, result });
}

/** One endpoint dispatch — exported for direct unit tests. */
export async function handleMemoryRpc(
  deps: MemoryRpcDeps,
  endpoint: string,
  payload: unknown,
): Promise<RpcResult<unknown>> {
  try {
    const body = record(payload ?? {}, "payload");
    if (endpoint === "overview") {
      return ok(deps.overview());
    }
    if (endpoint === "memories") {
      return ok(deps.listMemories({
        sessionId: optionalString(body.sessionId, "sessionId"),
        limit: boundedNumber(body.limit, "limit", 1, 200, 50),
        offset: boundedNumber(body.offset, "offset", 0, 1_000_000, 0),
      }));
    }
    if (endpoint === "forget") {
      const sessionId = optionalString(body.sessionId, "sessionId");
      const memoryId = optionalString(body.memoryId, "memoryId");
      if (Boolean(sessionId) === Boolean(memoryId)) {
        return fail("invalid", "forget requires exactly one of sessionId or memoryId");
      }
      return ok(await deps.forget({
        sessionId,
        memoryId,
        dryRun: optionalBoolean(body.dryRun, "dryRun") ?? false,
      }));
    }
    return fail("not-found", `unknown endpoint ${endpoint}`);
  } catch (error) {
    if (error instanceof RpcValidationError) return fail("invalid", error.message);
    return fail("internal", error instanceof Error ? error.message : String(error));
  }
}
