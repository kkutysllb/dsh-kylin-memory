/** Client entry: sidebar menu entry (official `sidebar.panellist` list slot) +
 * the independent main panel (official `main` keyed slot). The shell owns the
 * button, tooltip, active state, and panel switching; this plugin contributes
 * the glyph and the page — no DOM-hacked entries, no routing hacks.
 *
 * Contract: this bundle is consumed through the client module table (esbuild
 * CJS output wrapped by the build script in window.__ModuleLoader__.load),
 * `exports.inject` names the Cordis client services, and `exports.apply(ctx)`
 * registers everything inside ctx.effect-managed lifecycles.
 */

import React, { useEffect, useState } from "react";
import type {
  ClientContext,
  ForgetCounts,
  MemoryListItem,
  MemoryOverview,
  Translate,
} from "./contracts.ts";

export const name = "dsh-kylin-memory";

export const inject = [
  "slots",
  "locale",
  "connection",
] as const;

/** Main panel id — shared by the panellist entry and the keyed main entry. */
const PANEL_ID = "kyl-memory";

const RPC_CHANNEL = "/dsh-kylin-memory";
const NS = "dsh-kylin-memory";

/* ── minimal bilingual dictionaries; host locale service when present ───── */

const dictionaries = {
  zh: {
    nav: "记忆",
    title: "Kylin Memory 图谱记忆",
    refresh: "刷新",
    memories: "轮次记忆",
    navigation: "导航词项",
    communities: "社区",
    messages: "原始消息",
    extraction: "抽取队列",
    pending: "待处理",
    succeeded: "已入库",
    quarantined: "已隔离",
    turnVectors: "摘要向量",
    recall: "召回",
    embedding: "向量召回",
    ftsFallback: "词法降级 (FTS5)",
    store: "数据库",
    filterSession: "按会话过滤（session id，留空看全部）",
    forget: "遗忘",
    forgetConfirm: "确认遗忘该条记忆？将删除其 SPO 导航与摘要向量。",
    forgotten: "已遗忘",
    empty: "暂无轮次记忆——完成几轮对话后这里会出现摘要。",
    error: "面板加载失败",
    updated: "更新于",
  },
  en: {
    nav: "Memory",
    title: "Kylin Memory Graph",
    refresh: "Refresh",
    memories: "Turn memories",
    navigation: "Navigation terms",
    communities: "Communities",
    messages: "Raw messages",
    extraction: "Extraction queue",
    pending: "pending",
    succeeded: "stored",
    quarantined: "quarantined",
    turnVectors: "Summary vectors",
    recall: "Recall",
    embedding: "Vector recall",
    ftsFallback: "Lexical fallback (FTS5)",
    store: "Store",
    filterSession: "Filter by session id (empty for all)",
    forget: "Forget",
    forgetConfirm: "Forget this memory? Its SPO navigation and summary vector will be deleted.",
    forgotten: "Forgotten",
    empty: "No turn memories yet — finish a few turns and summaries appear here.",
    error: "Panel failed to load",
    updated: "updated",
  },
};

function fallbackT(lang: "zh" | "en"): Translate {
  const table: Record<string, string> = dictionaries[lang];
  return (key) => table[key] ?? key;
}

/* ── RPC plumbing ────────────────────────────────────────────────────────── */

function unwrapRpcResult<T>(value: unknown): T {
  if (typeof value !== "object" || value === null || !("ok" in value)) {
    throw new Error("Kylin Memory host returned an invalid response");
  }
  const result = value as { ok?: unknown; value?: unknown; error?: { message?: unknown } };
  if (result.ok === true) return result.value as T;
  if (result.ok === false && typeof result.error === "object" && result.error !== null) {
    const message = typeof result.error.message === "string" ? result.error.message : "";
    throw new Error(message === "" ? "Kylin Memory request failed" : message);
  }
  throw new Error("Kylin Memory host returned an invalid response");
}

async function callRpc<T>(ctx: ClientContext, endpoint: string, payload: unknown): Promise<T> {
  const connection = ctx.connection;
  if (!connection?.rpc?.call) throw new Error("connection service unavailable");
  return unwrapRpcResult<T>(await connection.rpc.call(RPC_CHANNEL, endpoint, payload));
}

/* ── panel styles (single injected sheet, disposed with the plugin) ──────── */

const STYLE_TEXT = `
.km-panel { padding: 20px 24px 48px; max-width: 980px; margin: 0 auto; color: var(--km-ink, #111827); }
.km-panel h2 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.km-panel .km-sub { font-size: 12px; opacity: .65; margin-bottom: 16px; word-break: break-all; }
.km-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-bottom: 18px; }
.km-card { border: 1px solid rgba(17,24,39,.12); padding: 10px 12px; }
.km-card .km-num { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
.km-card .km-label { font-size: 11px; opacity: .6; margin-top: 2px; }
.km-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
.km-toolbar input { flex: 1 1 260px; border: 1px solid rgba(17,24,39,.2); padding: 6px 9px; font-size: 12px; }
.km-btn { border: 1px solid rgba(17,24,39,.25); background: transparent; padding: 6px 12px; font-size: 12px; cursor: pointer; }
.km-btn:hover { background: rgba(23,72,209,.08); }
.km-list { display: flex; flex-direction: column; gap: 8px; }
.km-row { border: 1px solid rgba(17,24,39,.12); padding: 10px 12px; display: flex; gap: 10px; align-items: flex-start; }
.km-row .km-summary { flex: 1; font-size: 13px; line-height: 1.55; }
.km-row .km-meta { font-size: 11px; opacity: .55; margin-top: 4px; word-break: break-all; }
.km-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border: 1px solid currentColor; white-space: nowrap; }
.km-outcome-completed { color: #167a58; } .km-outcome-partial { color: #996318; }
.km-outcome-failed { color: #e16645; } .km-outcome-informational, .km-outcome-unknown { color: #586174; }
.km-err { color: #e16645; font-size: 12px; margin: 8px 0; }
.km-empty { opacity: .55; font-size: 13px; padding: 24px 0; text-align: center; }
`;

/* ── panel view ───────────────────────────────────────────────────────────── */

function MemoryPanel(props: { ctx: ClientContext; t: Translate }): React.ReactElement {
  const { ctx, t } = props;
  const [overview, setOverview] = useState<MemoryOverview | undefined>();
  const [memories, setMemories] = useState<MemoryListItem[] | undefined>();
  const [total, setTotal] = useState(0);
  const [sessionFilter, setSessionFilter] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const refresh = async (): Promise<void> => {
    setBusy(true);
    setError(undefined);
    try {
      const nextOverview = await callRpc<MemoryOverview>(ctx, "overview", {});
      const list = await callRpc<{ memories: MemoryListItem[]; total: number }>(ctx, "memories", {
        sessionId: sessionFilter.trim() || undefined,
        limit: 50,
      });
      setOverview(nextOverview);
      setMemories(list.memories);
      setTotal(list.total);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const forgetOne = async (memory: MemoryListItem): Promise<void> => {
    if (!window.confirm(t("forgetConfirm"))) return;
    try {
      const counts = await callRpc<ForgetCounts>(ctx, "forget", { memoryId: memory.id });
      window.alert(`${t("forgotten")}: ${counts.turnMemories} memory / ${counts.messages} messages / ${counts.navigationTerms} terms`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <div className="km-panel">
      <h2>{t("title")}</h2>
      <div className="km-sub">{overview ? `${t("store")}: ${overview.dbPath}` : ""}</div>
      {error !== undefined && <div className="km-err">{t("error")}: {error}</div>}

      <div className="km-cards">
        <Card num={overview?.turnMemories} label={t("memories")} />
        <Card num={overview ? `${overview.navigationTerms}/${overview.navigationTriples}` : undefined}
          label={`${t("navigation")} (SPO)`} />
        <Card num={overview?.navigationCommunities} label={t("communities")} />
        <Card num={overview?.messages} label={t("messages")} />
        <Card num={overview ? `${overview.turnVectors}/${overview.turnMemories}` : undefined} label={t("turnVectors")} />
        <Card
          num={overview ? overview.extraction.pending : undefined}
          label={`${t("extraction")} · ${t("pending")}`}
        />
        <Card num={overview?.extraction.succeeded} label={`${t("extraction")} · ${t("succeeded")}`} />
        <Card num={overview?.extraction.quarantined} label={`${t("extraction")} · ${t("quarantined")}`} />
      </div>

      <div className="km-toolbar">
        <input
          value={sessionFilter}
          placeholder={t("filterSession")}
          onChange={(event) => { setSessionFilter(event.target.value); }}
          onKeyDown={(event) => { if (event.key === "Enter") void refresh(); }}
        />
        <button className="km-btn" disabled={busy} onClick={() => { void refresh(); }}>{t("refresh")}</button>
      </div>

      {memories === undefined
        ? null
        : memories.length === 0
          ? <div className="km-empty">{t("empty")}</div>
          : (
            <div className="km-list">
              {memories.map((memory) => (
                <div className="km-row" key={memory.id}>
                  <span className={`km-badge km-outcome-${memory.outcome}`}>{memory.outcome}</span>
                  <div className="km-summary">
                    {memory.summary}
                    <div className="km-meta">
                      {memory.sessionId} · {t("updated")} {new Date(memory.updatedAt).toLocaleString()} · {memory.id.slice(0, 12)}…
                    </div>
                  </div>
                  <button className="km-btn" disabled={busy} onClick={() => { void forgetOne(memory); }}>
                    {t("forget")}
                  </button>
                </div>
              ))}
              {total > memories.length && (
                <div className="km-meta" style={{ textAlign: "center" }}>{total} total</div>
              )}
            </div>
          )}
    </div>
  );
}

function Card(props: { num?: number | string; label: string }): React.ReactElement {
  return (
    <div className="km-card">
      <div className="km-num">{props.num ?? "–"}</div>
      <div className="km-label">{props.label}</div>
    </div>
  );
}

/** Sidebar glyph: three graph nodes joined by edges (memory navigation). */
function PanelIcon(props: { size?: number }): React.ReactElement {
  const size = props.size ?? 18;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6" cy="18" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <circle cx="12" cy="6" r="2.4" />
      <path d="M7.6 16.2 10.6 8.6" />
      <path d="M13.4 8.6 16.4 16.2" />
      <path d="M8.4 18h7.2" />
    </svg>
  );
}

/* ── apply: locale + slots registration ──────────────────────────────────── */

export function apply(ctx: ClientContext): void {
  const lang: "zh" | "en" = (() => {
    try {
      const languages = (navigator as { languages?: readonly string[] }).languages ?? [navigator.language];
      return (languages[0] ?? "zh").toLowerCase().startsWith("zh") ? "zh" : "en";
    } catch {
      return "zh";
    }
  })();

  let t: Translate = fallbackT(lang);
  try {
    ctx.locale?.register?.(NS, dictionaries);
    if (ctx.locale?.bind) t = ctx.locale.bind(NS);
  } catch {
    // Stay on the built-in dictionary when the locale service is absent.
  }

  const style = document.createElement("style");
  style.textContent = STYLE_TEXT;
  document.head.appendChild(style);
  ctx.effect(() => () => { style.remove(); }, "kylin-memory: panel styles");

  if (ctx.slots?.inject === undefined) return;
  try {
    ctx.slots.inject("sidebar.panellist", () => {
      const disposeIcon = ctx.slots.register({
        name: "sidebar.panellist",
        id: PANEL_ID,
        order: 125,
        label: () => t("nav"),
        locale: NS,
      }, PanelIcon);
      const disposePanel = ctx.slots.register({
        name: "main",
        key: PANEL_ID,
        locale: NS,
      }, function MemoryMount(): React.ReactElement {
        return <MemoryPanel ctx={ctx} t={t} />;
      });
      return () => {
        disposePanel();
        disposeIcon();
      };
    });
  } catch (error) {
    // Hosts without these slots stay usable through the Agent tools only.
    console.warn("[dsh-kylin-memory] sidebar/main slot registration skipped:", error);
  }
}
