window.__ModuleLoader__.load({ id: "dsh-kylin-memory", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var name = "dsh-kylin-memory";
var inject = [
  "slots",
  "locale",
  "connection"
];
var PANEL_ID = "kyl-memory";
var RPC_CHANNEL = "/dsh-kylin-memory";
var NS = "dsh-kylin-memory";
var dictionaries = {
  zh: {
    nav: "\u8BB0\u5FC6",
    title: "Kylin Memory \u56FE\u8C31\u8BB0\u5FC6",
    refresh: "\u5237\u65B0",
    memories: "\u8F6E\u6B21\u8BB0\u5FC6",
    navigation: "\u5BFC\u822A\u8BCD\u9879",
    communities: "\u793E\u533A",
    messages: "\u539F\u59CB\u6D88\u606F",
    extraction: "\u62BD\u53D6\u961F\u5217",
    pending: "\u5F85\u5904\u7406",
    succeeded: "\u5DF2\u5165\u5E93",
    quarantined: "\u5DF2\u9694\u79BB",
    turnVectors: "\u6458\u8981\u5411\u91CF",
    recall: "\u53EC\u56DE",
    embedding: "\u5411\u91CF\u53EC\u56DE",
    ftsFallback: "\u8BCD\u6CD5\u964D\u7EA7 (FTS5)",
    store: "\u6570\u636E\u5E93",
    filterSession: "\u6309\u4F1A\u8BDD\u8FC7\u6EE4\uFF08session id\uFF0C\u7559\u7A7A\u770B\u5168\u90E8\uFF09",
    forget: "\u9057\u5FD8",
    forgetConfirm: "\u786E\u8BA4\u9057\u5FD8\u8BE5\u6761\u8BB0\u5FC6\uFF1F\u5C06\u5220\u9664\u5176 SPO \u5BFC\u822A\u4E0E\u6458\u8981\u5411\u91CF\u3002",
    forgotten: "\u5DF2\u9057\u5FD8",
    empty: "\u6682\u65E0\u8F6E\u6B21\u8BB0\u5FC6\u2014\u2014\u5B8C\u6210\u51E0\u8F6E\u5BF9\u8BDD\u540E\u8FD9\u91CC\u4F1A\u51FA\u73B0\u6458\u8981\u3002",
    error: "\u9762\u677F\u52A0\u8F7D\u5931\u8D25",
    updated: "\u66F4\u65B0\u4E8E"
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
    empty: "No turn memories yet \u2014 finish a few turns and summaries appear here.",
    error: "Panel failed to load",
    updated: "updated"
  }
};
function fallbackT(lang) {
  const table = dictionaries[lang];
  return (key) => table[key] ?? key;
}
function unwrapRpcResult(value) {
  if (typeof value !== "object" || value === null || !("ok" in value)) {
    throw new Error("Kylin Memory host returned an invalid response");
  }
  const result = value;
  if (result.ok === true) return result.value;
  if (result.ok === false && typeof result.error === "object" && result.error !== null) {
    const message = typeof result.error.message === "string" ? result.error.message : "";
    throw new Error(message === "" ? "Kylin Memory request failed" : message);
  }
  throw new Error("Kylin Memory host returned an invalid response");
}
async function callRpc(ctx, endpoint, payload) {
  const connection = ctx.connection;
  if (!connection?.rpc?.call) throw new Error("connection service unavailable");
  return unwrapRpcResult(await connection.rpc.call(RPC_CHANNEL, endpoint, payload));
}
var STYLE_TEXT = `
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
function MemoryPanel(props) {
  const { ctx, t } = props;
  const [overview, setOverview] = (0, import_react.useState)();
  const [memories, setMemories] = (0, import_react.useState)();
  const [total, setTotal] = (0, import_react.useState)(0);
  const [sessionFilter, setSessionFilter] = (0, import_react.useState)("");
  const [error, setError] = (0, import_react.useState)();
  const [busy, setBusy] = (0, import_react.useState)(false);
  const refresh = async () => {
    setBusy(true);
    setError(void 0);
    try {
      const nextOverview = await callRpc(ctx, "overview", {});
      const list = await callRpc(ctx, "memories", {
        sessionId: sessionFilter.trim() || void 0,
        limit: 50
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
  (0, import_react.useEffect)(() => {
    void refresh();
  }, []);
  const forgetOne = async (memory) => {
    if (!window.confirm(t("forgetConfirm"))) return;
    try {
      const counts = await callRpc(ctx, "forget", { memoryId: memory.id });
      window.alert(`${t("forgotten")}: ${counts.turnMemories} memory / ${counts.messages} messages / ${counts.navigationTerms} terms`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "km-panel", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: t("title") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "km-sub", children: overview ? `${t("store")}: ${overview.dbPath}` : "" }),
    error !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "km-err", children: [
      t("error"),
      ": ",
      error
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "km-cards", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { num: overview?.turnMemories, label: t("memories") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Card,
        {
          num: overview ? `${overview.navigationTerms}/${overview.navigationTriples}` : void 0,
          label: `${t("navigation")} (SPO)`
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { num: overview?.navigationCommunities, label: t("communities") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { num: overview?.messages, label: t("messages") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { num: overview ? `${overview.turnVectors}/${overview.turnMemories}` : void 0, label: t("turnVectors") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Card,
        {
          num: overview ? overview.extraction.pending : void 0,
          label: `${t("extraction")} \xB7 ${t("pending")}`
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { num: overview?.extraction.succeeded, label: `${t("extraction")} \xB7 ${t("succeeded")}` }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { num: overview?.extraction.quarantined, label: `${t("extraction")} \xB7 ${t("quarantined")}` })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "km-toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          value: sessionFilter,
          placeholder: t("filterSession"),
          onChange: (event) => {
            setSessionFilter(event.target.value);
          },
          onKeyDown: (event) => {
            if (event.key === "Enter") void refresh();
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "km-btn", disabled: busy, onClick: () => {
        void refresh();
      }, children: t("refresh") })
    ] }),
    memories === void 0 ? null : memories.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "km-empty", children: t("empty") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "km-list", children: [
      memories.map((memory) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "km-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `km-badge km-outcome-${memory.outcome}`, children: memory.outcome }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "km-summary", children: [
          memory.summary,
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "km-meta", children: [
            memory.sessionId,
            " \xB7 ",
            t("updated"),
            " ",
            new Date(memory.updatedAt).toLocaleString(),
            " \xB7 ",
            memory.id.slice(0, 12),
            "\u2026"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "km-btn", disabled: busy, onClick: () => {
          void forgetOne(memory);
        }, children: t("forget") })
      ] }, memory.id)),
      total > memories.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "km-meta", style: { textAlign: "center" }, children: [
        total,
        " total"
      ] })
    ] })
  ] });
}
function Card(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "km-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "km-num", children: props.num ?? "\u2013" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "km-label", children: props.label })
  ] });
}
function PanelIcon(props) {
  const size = props.size ?? 18;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.9,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "6", cy: "18", r: "2.4" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "18", cy: "18", r: "2.4" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "12", cy: "6", r: "2.4" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7.6 16.2 10.6 8.6" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M13.4 8.6 16.4 16.2" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8.4 18h7.2" })
      ]
    }
  );
}
function apply(ctx) {
  const lang = (() => {
    try {
      const languages = navigator.languages ?? [navigator.language];
      return (languages[0] ?? "zh").toLowerCase().startsWith("zh") ? "zh" : "en";
    } catch {
      return "zh";
    }
  })();
  let t = fallbackT(lang);
  try {
    ctx.locale?.register?.(NS, dictionaries);
    if (ctx.locale?.bind) t = ctx.locale.bind(NS);
  } catch {
  }
  const style = document.createElement("style");
  style.textContent = STYLE_TEXT;
  document.head.appendChild(style);
  ctx.effect(() => () => {
    style.remove();
  }, "kylin-memory: panel styles");
  if (ctx.slots?.inject === void 0) return;
  try {
    ctx.slots.inject("sidebar.panellist", () => {
      const disposeIcon = ctx.slots.register({
        name: "sidebar.panellist",
        id: PANEL_ID,
        order: 125,
        label: () => t("nav"),
        locale: NS
      }, PanelIcon);
      const disposePanel = ctx.slots.register({
        name: "main",
        key: PANEL_ID,
        locale: NS
      }, function MemoryMount() {
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MemoryPanel, { ctx, t });
      });
      return () => {
        disposePanel();
        disposeIcon();
      };
    });
  } catch (error) {
    console.warn("[dsh-kylin-memory] sidebar/main slot registration skipped:", error);
  }
}
return module.exports; } });
//# sourceMappingURL=client.js.map
