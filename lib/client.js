window.__ModuleLoader__.load({ id: "dsh-kylin-memory", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
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
  KylinMemoryConfigCard: () => KylinMemoryConfigCard,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime = require("react/jsx-runtime");
var inject = ["slots", "locale"];
var SETTINGS_NS = "dsh-kylin-memory";
var LOCALE_NS = "kylinMemory.settings";
var zh = {
  freshTurnCount: "\u4FDD\u7559\u6700\u8FD1\u8F6E\u6570",
  freshTurnCountHint: "\u6A21\u578B\u4E0A\u4E0B\u6587\u91CC\u4FDD\u7559\u6700\u8FD1\u591A\u5C11\u4E2A\u5B8C\u6574\u95EE\u7B54\u8F6E\uFF08\u7528\u6237\u95EE\u9898 + \u6700\u7EC8\u56DE\u7B54\uFF09\uFF0C\u66F4\u65E9\u7684\u5386\u53F2\u7531\u672C\u63D2\u4EF6\u5F52\u6863\u63A5\u7BA1\u3002",
  maintenanceInterval: "\u7EF4\u62A4\u8282\u594F\uFF08\u8F6E\uFF09",
  maintenanceIntervalHint: "\u6BCF\u5B8C\u6210\u591A\u5C11\u8F6E\u6267\u884C\u4E00\u6B21\u7EF4\u62A4\uFF08\u56FE\u7EF4\u62A4\u4E0E\u6D88\u606F\u4FDD\u7559\u6E05\u7406\uFF09\u3002",
  recallMaxNodes: "\u5355\u6B21\u53EC\u56DE\u4E0A\u9650",
  recallMaxNodesHint: "\u4E00\u6B21\u81EA\u52A8\u53EC\u56DE\u6700\u591A\u8FD4\u56DE\u591A\u5C11\u6761\u5339\u914D\u7684\u8BB0\u5FC6\u8282\u70B9\u3002",
  semanticScoreThreshold: "\u8BED\u4E49\u53EC\u56DE\u9608\u503C",
  semanticScoreThresholdHint: "0 \u5230 1 \u7684\u4F59\u5F26\u76F8\u4F3C\u5EA6\u4E0B\u9650\uFF0C\u4F4E\u4E8E\u8BE5\u503C\u7684\u8BED\u4E49\u7ED3\u679C\u4E0D\u6CE8\u5165\uFF1B\u7559\u7A7A\u4F7F\u7528\u9ED8\u8BA4 0.7\u3002",
  overridden: "\u5DF2\u8986\u76D6",
  reset: "\u6062\u590D\u9ED8\u8BA4",
  loading: "\u52A0\u8F7D\u4E2D\u2026",
  readOnly: "\u672C\u90E8\u7F72\u7684\u8BBE\u7F6E\u4E3A\u53EA\u8BFB\u3002",
  unavailable: "\u8BE5\u63D2\u4EF6\u5F53\u524D\u672A\u52A0\u8F7D\uFF0C\u6682\u65F6\u65E0\u6CD5\u914D\u7F6E\u3002",
  save: "\u4FDD\u5B58",
  saving: "\u4FDD\u5B58\u4E2D\u2026",
  saveFailed: "\u672C\u90E8\u7F72\u6CA1\u6709\u63A5\u53D7\u8FD9\u4E9B\u503C\uFF0C\u5DF2\u4FDD\u7559\u4F9B\u4F60\u4FEE\u6539\u3002",
  invalidNumber: "\u8BF7\u586B\u6570\u5B57\uFF1B\u7559\u7A7A\u8868\u793A\u4F7F\u7528\u9ED8\u8BA4\u503C\u3002"
};
var en = {
  freshTurnCount: "Retained recent turns",
  freshTurnCountHint: "How many newest complete Q/A turns stay on the model context; older history is archived by this plugin.",
  maintenanceInterval: "Maintenance cadence (turns)",
  maintenanceIntervalHint: "Run one maintenance tick (graph maintenance and retention GC) every this many completed turns.",
  recallMaxNodes: "Recall limit",
  recallMaxNodesHint: "Upper bound on matched memory nodes returned by one automatic recall.",
  semanticScoreThreshold: "Semantic recall floor",
  semanticScoreThresholdHint: "Cosine similarity floor between 0 and 1; lower-scoring semantic hits are not injected. Leave blank for the default 0.7.",
  overridden: "Overridden",
  reset: "Reset to default",
  loading: "Loading\u2026",
  readOnly: "This deployment stores settings read-only.",
  unavailable: "This plugin is not loaded, so it cannot be configured right now.",
  save: "Save",
  saving: "Saving\u2026",
  saveFailed: "The deployment did not accept these values; they were left for you to correct.",
  invalidNumber: "Enter a number, or leave blank to use the default."
};
var FIELDS = [
  "freshTurnCount",
  "maintenanceInterval",
  "recallMaxNodes",
  "semanticScoreThreshold"
];
var FIELD_COPY = {
  freshTurnCount: { label: "freshTurnCount", hint: "freshTurnCountHint" },
  maintenanceInterval: { label: "maintenanceInterval", hint: "maintenanceIntervalHint" },
  recallMaxNodes: { label: "recallMaxNodes", hint: "recallMaxNodesHint" },
  semanticScoreThreshold: { label: "semanticScoreThreshold", hint: "semanticScoreThresholdHint" }
};
function isOverridden(user, field) {
  return typeof user === "object" && user !== null && Object.prototype.hasOwnProperty.call(user, field);
}
function acceptedText(value, field) {
  const raw = value?.[field];
  return typeof raw === "number" || typeof raw === "string" ? String(raw) : "";
}
function isValid(text) {
  return text.trim() === "" || Number.isFinite(Number(text));
}
function ConfigField(props) {
  const id = `plugin-config-kylin-memory-${props.field}`;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { "data-config-field": props.field, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { htmlFor: id, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: props.label }),
      props.overridden ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "data-overridden": true, children: props.t("overridden") }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      import_dsh_client_ui_primitives.Input,
      {
        id,
        inputMode: "decimal",
        "aria-invalid": props.invalid,
        "aria-describedby": `${id}-hint`,
        disabled: props.disabled,
        value: props.text,
        onChange: (event) => {
          props.onChange(event.target.value);
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { id: `${id}-hint`, children: props.invalid ? props.t("invalidNumber") : props.hint }),
    props.overridden ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "ghost", size: "sm", disabled: props.disabled, onClick: props.onReset, children: props.t("reset") }) : null
  ] });
}
function KylinMemoryConfigCard(props) {
  const form = props.form;
  const [staged, setStaged] = (0, import_react.useState)({});
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [failed, setFailed] = (0, import_react.useState)(false);
  const t = props.t;
  if (props.view === "summary") return null;
  if (form === void 0 || form.state.status === "unavailable") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "status", children: t("unavailable") });
  }
  if (form.state.status === "loading") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "status", children: t("loading") });
  const state = form.state;
  const textOf = (field) => staged[field] ?? acceptedText(state.value, field);
  const changed = FIELDS.filter((field) => textOf(field) !== acceptedText(state.value, field));
  const invalid = FIELDS.some((field) => !isValid(textOf(field)));
  const dirty = changed.length > 0;
  const disabled = !state.writable || saving;
  const save = () => {
    const ops = changed.map((field) => {
      const text = textOf(field).trim();
      return text === "" ? { op: "unset", path: [field] } : { op: "set", path: [field], value: Number(text) };
    });
    if (ops.length === 0) return;
    setSaving(true);
    setFailed(false);
    void form.mutate(ops, state.revision).then((accepted) => {
      if (accepted) setStaged({});
      else setFailed(true);
    }, () => {
      setFailed(true);
    }).finally(() => {
      setSaving(false);
    });
  };
  const reset = (field) => {
    setSaving(true);
    setFailed(false);
    void form.mutate([{ op: "unset", path: [field] }], state.revision).then((accepted) => {
      if (accepted) setStaged((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
      else setFailed(true);
    }, () => {
      setFailed(true);
    }).finally(() => {
      setSaving(false);
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { "data-config-namespace": SETTINGS_NS, children: [
    !state.writable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "status", children: t("readOnly") }) : null,
    FIELDS.map((field) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ConfigField,
      {
        field,
        label: t(FIELD_COPY[field].label),
        hint: t(FIELD_COPY[field].hint),
        text: textOf(field),
        invalid: !isValid(textOf(field)),
        overridden: isOverridden(state.user, field),
        disabled,
        t,
        onChange: (text) => {
          setStaged((current) => ({ ...current, [field]: text }));
        },
        onReset: () => {
          reset(field);
        }
      },
      field
    )),
    failed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "status", children: t("saveFailed") }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      import_dsh_client_ui_primitives.Button,
      {
        variant: "primary",
        size: "sm",
        disabled: !dirty || invalid || disabled,
        onClick: save,
        children: t(saving ? "saving" : "save")
      }
    ) })
  ] });
}
function apply(ctx) {
  ctx.effect(
    () => ctx.locale.register(LOCALE_NS, { zh, en }),
    "kylin-memory: dictionaries"
  );
  ctx.effect(
    () => ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
      name: "plugins.bundle.config",
      key: SETTINGS_NS,
      locale: LOCALE_NS
    }, KylinMemoryConfigCard)),
    "kylin-memory: settings page"
  );
}
return module.exports; } });
//# sourceMappingURL=client.js.map
