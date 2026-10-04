/**
 * Web client entry: the plugin detail page's settings form.
 *
 * Contract: this bundle is consumed through the client module table (esbuild
 * CJS output wrapped by the build script in window.__ModuleLoader__.load),
 * `exports.inject` names the Cordis client services, and `exports.apply(ctx)`
 * registers everything inside ctx.effect-managed lifecycles.
 *
 * The form binds to the settings namespace the host serves for this bundle —
 * the patch insert id `dsh-kylin-memory` — and renders through the official
 * settings primitives. The slot is the keyed `plugins.bundle.config` (the
 * seat for a bundle's own configuration; `plugins.item` is reserved for the
 * official settings pages), so the section appears on this bundle's detail
 * page only while the host actually serves the namespace.
 */

export const inject = ["slots", "locale", "configForms"] as const;

// Resolved through the shell's module table at runtime (factory require);
// TypeScript sees the ambient declaration in ./modules.d.ts.
import { SettingsForm, SettingsFormModel, SettingsValueField, settingsNumberField } from "@deepseek-ai/dsh-client-ui-primitives";

/** Settings namespace served by the host for this plugin's config schema. */
const SETTINGS_NS = "dsh-kylin-memory";
/** Dictionary namespace owned by this client plugin. */
const LOCALE_NS = "kylinMemory.settings";

interface Translate {
  (key: string): string;
}

/** Minimal shape of the shared configuration form scope (dsh-client-ui-settings). */
interface ConfigFormScope {
  getSnapshot(): Record<string, unknown>;
  subscribe(listener: () => void): () => void;
  mutate(ops: unknown[], expectedRevision?: number): Promise<boolean>;
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
  configForms: {
    get(ns: string): ConfigFormScope;
    whileServed(namespaces: string[], register: () => unknown): unknown;
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

/** Staged form over the plugin's settings namespace. */
class ConfigCardController {
  private form: {
    shell(): Record<string, unknown>;
    field(field: FieldName): Record<string, unknown>;
    bind(project: () => Record<string, unknown>): {
      set(value: Record<string, unknown>): void;
    };
    actions(): Record<string, unknown>;
    dispose(): void;
  };
  private store: { set(value: Record<string, unknown>): void };

  constructor(scope: ConfigFormScope) {
    const specs = FIELDS.map((field) => settingsNumberField(field));
    this.form = new SettingsFormModel(scope, specs);
    this.store = this.form.bind(() => this.projection());
  }

  private projection(): Record<string, unknown> {
    const projection: Record<string, unknown> = { ...this.form.shell() };
    for (const field of FIELDS) projection[field] = this.form.field(field);
    return projection;
  }

  /** The face the slot registration injects into the card component. */
  inject(): Record<string, unknown> {
    return {
      hooks: { configCard: this.store },
      ...this.form.actions(),
    };
  }

  dispose(): void {
    this.form.dispose();
  }
}

/** One field row of the settings form. */
function ConfigField({ props, state, name, label, hint }: {
  props: Record<string, any>;
  state: Record<string, any>;
  name: FieldName;
  label: string;
  hint: string;
}) {
  return (
    <SettingsValueField
      id={`plugin-config-kylin-memory-${name}`}
      label={label}
      hint={hint}
      overriddenLabel={props.t("overridden")}
      resetLabel={props.t("reset")}
      invalidLabel={props.t("invalidNumber")}
      numeric
      disabled={!state.writable}
      {...state[name]}
      onEdit={(text: string) => props.edit(name, text)}
      onReset={() => props.resetField(name)}
    />
  );
}

/**
 * Render the bundle's settings form. The bundle detail page only asks for
 * `view: "page"`; the summary seat stays empty.
 */
function KylinMemoryConfigCard(props: Record<string, any>) {
  const state = props.useConfigCard((snapshot: Record<string, unknown>) => snapshot);
  if (props.view === "summary") return null;
  const t = props.t as Translate;
  return (
    <SettingsForm
      labels={{
        unavailable: t("unavailable"),
        readOnly: t("readOnly"),
        saveFailed: t("saveFailed"),
        save: t("save"),
        saving: t("saving"),
      }}
      state={state}
      onSave={props.save}
      onDiscard={props.discard}
    >
      <ConfigField props={props} state={state} name="freshTurnCount" label={t("freshTurnCount")} hint={t("freshTurnCountHint")} />
      <ConfigField props={props} state={state} name="maintenanceInterval" label={t("maintenanceInterval")} hint={t("maintenanceIntervalHint")} />
      <ConfigField props={props} state={state} name="recallMaxNodes" label={t("recallMaxNodes")} hint={t("recallMaxNodesHint")} />
      <ConfigField props={props} state={state} name="semanticScoreThreshold" label={t("semanticScoreThreshold")} hint={t("semanticScoreThresholdHint")} />
    </SettingsForm>
  );
}

/** Mount the settings card while the host serves the plugin's namespace. */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(LOCALE_NS);
  ctx.effect(
    () => ctx.locale.register(LOCALE_NS, { zh, en }),
    "kylin-memory: dictionaries",
  );
  const card = new ConfigCardController(ctx.configForms.get(SETTINGS_NS));
  ctx.effect(() => () => {
    card.dispose();
  }, "kylin-memory: form subscription");
  ctx.effect(
    () => ctx.configForms.whileServed([SETTINGS_NS], () => ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
      name: "plugins.bundle.config",
      key: "dsh-kylin-memory",
      locale: LOCALE_NS,
      inject: () => card.inject(),
    }, KylinMemoryConfigCard))),
    "kylin-memory: settings page",
  );
}
