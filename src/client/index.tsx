/**
 * Web client entry: the plugin detail page's settings card.
 *
 * Contract: this bundle is consumed through the client module table (esbuild
 * CJS output wrapped by the build script in window.__ModuleLoader__.load),
 * `exports.inject` names the Cordis client services, and `exports.apply(ctx)`
 * registers everything inside ctx.effect-managed lifecycles.
 *
 * The card occupies the keyed slot `plugins.bundle.config` for this bundle and
 * renders through QiLin's `PluginConfigViewProps`: the page owns the settings
 * namespace and hands over `form.state` plus `form.mutate` (`form` is absent
 * while the Host serves no namespace), so this entry stages edits locally and
 * submits them as one `{ op: 'set' | 'unset', path: [field] }` batch fenced by
 * the revision it read. A field is overridden exactly when its key is present
 * in `state.user`.
 */

export const inject = ["slots", "locale"] as const;

// Resolved through the shell's module table at runtime (factory require);
// TypeScript sees the ambient declaration in ./modules.d.ts.
import { useState } from "react";
import { Button, Input } from "@deepseek-ai/dsh-client-ui-primitives";

/** Settings namespace served by the host for this plugin's config schema. */
const SETTINGS_NS = "dsh-kylin-memory";
/** Dictionary namespace owned by this client plugin. */
const LOCALE_NS = "kylinMemory.settings";

interface Translate {
  (key: string): string;
}

/** One atomic write the page's `mutate` accepts. */
type PathOp =
  | { op: "set"; path: string[]; value: number }
  | { op: "unset"; path: string[] };

/** Sync state of the plugin's settings namespace, as the page publishes it. */
interface ConfigFormSnapshot {
  status: "loading" | "ready" | "unavailable";
  value: Record<string, unknown> | undefined;
  user: unknown;
  revision: number | undefined;
  writable: boolean;
}

/** The page-owned form for this entry. */
interface ConfigPageForm {
  state: ConfigFormSnapshot;
  mutate(ops: readonly PathOp[], expectedRevision?: number): Promise<boolean>;
}

/** Props the `plugins.bundle.config` seat supplies. */
interface PluginConfigViewProps {
  view: "summary" | "page";
  form?: ConfigPageForm | undefined;
}

/** Minimal shape of the client plugin context this entry composes against. */
interface ClientContext {
  slots: {
    inject(name: string, register: () => unknown): unknown;
    register(options: Record<string, unknown>, component: unknown): unknown;
  };
  locale: {
    bind(ns: string): Translate;
    register(ns: string, dictionaries: Record<string, Record<string, string>>): unknown;
  };
  effect(register: () => unknown, label?: string): unknown;
}

/** Simplified Chinese copy. */
const zh = {
  freshTurnCount: "保留最近轮数",
  freshTurnCountHint: "模型上下文里保留最近多少个完整问答轮（用户问题 + 最终回答），更早的历史由本插件归档接管。",
  maintenanceInterval: "维护节奏（轮）",
  maintenanceIntervalHint: "每完成多少轮执行一次维护（图维护与消息保留清理）。",
  recallMaxNodes: "单次召回上限",
  recallMaxNodesHint: "一次自动召回最多返回多少条匹配的记忆节点。",
  semanticScoreThreshold: "语义召回阈值",
  semanticScoreThresholdHint: "0 到 1 的余弦相似度下限，低于该值的语义结果不注入；留空使用默认 0.7。",
  overridden: "已覆盖",
  reset: "恢复默认",
  loading: "加载中…",
  readOnly: "本部署的设置为只读。",
  unavailable: "该插件当前未加载，暂时无法配置。",
  save: "保存",
  saving: "保存中…",
  saveFailed: "本部署没有接受这些值，已保留供你修改。",
  invalidNumber: "请填数字；留空表示使用默认值。",
};

/** English copy. */
const en = {
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
  loading: "Loading…",
  readOnly: "This deployment stores settings read-only.",
  unavailable: "This plugin is not loaded, so it cannot be configured right now.",
  save: "Save",
  saving: "Saving…",
  saveFailed: "The deployment did not accept these values; they were left for you to correct.",
  invalidNumber: "Enter a number, or leave blank to use the default.",
};

/** The section fields this card edits, in display order. */
const FIELDS = [
  "freshTurnCount",
  "maintenanceInterval",
  "recallMaxNodes",
  "semanticScoreThreshold",
] as const;

type FieldName = (typeof FIELDS)[number];

/** Each field's label and hint dictionary keys. */
const FIELD_COPY: Record<FieldName, { label: string; hint: string }> = {
  freshTurnCount: { label: "freshTurnCount", hint: "freshTurnCountHint" },
  maintenanceInterval: { label: "maintenanceInterval", hint: "maintenanceIntervalHint" },
  recallMaxNodes: { label: "recallMaxNodes", hint: "recallMaxNodesHint" },
  semanticScoreThreshold: { label: "semanticScoreThreshold", hint: "semanticScoreThresholdHint" },
};

/** Whether the user layer carries this field (presence marks an override, not its value). */
function isOverridden(user: unknown, field: FieldName): boolean {
  return typeof user === "object" && user !== null && Object.prototype.hasOwnProperty.call(user, field);
}

/** Read one accepted field as the text an input shows. */
function acceptedText(value: Record<string, unknown> | undefined, field: FieldName): string {
  const raw = value?.[field];
  return typeof raw === "number" || typeof raw === "string" ? String(raw) : "";
}

/** Whether one staged edit is a number or blank. */
function isValid(text: string): boolean {
  return text.trim() === "" || Number.isFinite(Number(text));
}

/** One labelled numeric row with its override state and reset control. */
function ConfigField(props: {
  field: FieldName;
  label: string;
  hint: string;
  text: string;
  invalid: boolean;
  overridden: boolean;
  disabled: boolean;
  t: Translate;
  onChange(text: string): void;
  onReset(): void;
}) {
  const id = `plugin-config-kylin-memory-${props.field}`;
  return (
    <div data-config-field={props.field}>
      <label htmlFor={id}>
        <span>{props.label}</span>
        {props.overridden ? <span data-overridden>{props.t("overridden")}</span> : null}
      </label>
      <Input
        id={id}
        inputMode="decimal"
        aria-invalid={props.invalid}
        aria-describedby={`${id}-hint`}
        disabled={props.disabled}
        value={props.text}
        onChange={(event) => { props.onChange(event.target.value); }}
      />
      <small id={`${id}-hint`}>
        {props.invalid ? props.t("invalidNumber") : props.hint}
      </small>
      {props.overridden ? (
        <Button variant="ghost" size="sm" disabled={props.disabled} onClick={props.onReset}>
          {props.t("reset")}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Render the bundle's settings card for the plugin detail page.
 *
 * The page supplies the namespace state and the write; this component stages
 * edits locally, so leaving the page drops them, and one save submits every
 * changed field against the revision it read.
 */
export function KylinMemoryConfigCard(props: PluginConfigViewProps & { t: Translate }) {
  const form = props.form;
  const [staged, setStaged] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const t = props.t;

  // The summary seat stays empty: the page draws the title and one-liner itself.
  if (props.view === "summary") return null;
  if (form === undefined || form.state.status === "unavailable") {
    return <p role="status">{t("unavailable")}</p>;
  }
  if (form.state.status === "loading") return <p role="status">{t("loading")}</p>;

  const state = form.state;
  const textOf = (field: FieldName): string => staged[field] ?? acceptedText(state.value, field);
  const changed = FIELDS.filter((field) => textOf(field) !== acceptedText(state.value, field));
  const invalid = FIELDS.some((field) => !isValid(textOf(field)));
  const dirty = changed.length > 0;
  const disabled = !state.writable || saving;

  const save = (): void => {
    const ops: PathOp[] = changed.map((field) => {
      const text = textOf(field).trim();
      return text === ""
        ? { op: "unset", path: [field] }
        : { op: "set", path: [field], value: Number(text) };
    });
    if (ops.length === 0) return;
    setSaving(true);
    setFailed(false);
    void form.mutate(ops, state.revision)
      .then((accepted) => {
        if (accepted) setStaged({});
        else setFailed(true);
      }, () => { setFailed(true); })
      .finally(() => { setSaving(false); });
  };

  const reset = (field: FieldName): void => {
    setSaving(true);
    setFailed(false);
    void form.mutate([{ op: "unset", path: [field] }], state.revision)
      .then((accepted) => {
        if (accepted) setStaged((current) => { const next = { ...current }; delete next[field]; return next; });
        else setFailed(true);
      }, () => { setFailed(true); })
      .finally(() => { setSaving(false); });
  };

  return (
    <div data-config-namespace={SETTINGS_NS}>
      {!state.writable ? <p role="status">{t("readOnly")}</p> : null}
      {FIELDS.map((field) => (
        <ConfigField
          key={field}
          field={field}
          label={t(FIELD_COPY[field].label)}
          hint={t(FIELD_COPY[field].hint)}
          text={textOf(field)}
          invalid={!isValid(textOf(field))}
          overridden={isOverridden(state.user, field)}
          disabled={disabled}
          t={t}
          onChange={(text) => { setStaged((current) => ({ ...current, [field]: text })); }}
          onReset={() => { reset(field); }}
        />
      ))}
      {failed ? <p role="status">{t("saveFailed")}</p> : null}
      <div>
        <Button
          variant="primary"
          size="sm"
          disabled={!dirty || invalid || disabled}
          onClick={save}
        >
          {t(saving ? "saving" : "save")}
        </Button>
      </div>
    </div>
  );
}

/** Mount the bundle's settings card on the plugin detail page. */
export function apply(ctx: ClientContext): void {
  ctx.effect(
    () => ctx.locale.register(LOCALE_NS, { zh, en }),
    "kylin-memory: dictionaries",
  );
  ctx.effect(
    () => ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
      name: "plugins.bundle.config",
      key: SETTINGS_NS,
      locale: LOCALE_NS,
    }, KylinMemoryConfigCard)),
    "kylin-memory: settings page",
  );
}
