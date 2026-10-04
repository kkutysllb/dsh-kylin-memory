/**
 * Plugin configuration schema for the DSH/QiLin settings service.
 *
 * The host's `dsh-settings` reads the plugin module's `Config` export and
 * derives the plugin detail page's settings form from the `.volatile()`
 * fields (live-editable without a plugin restart). Non-volatile keys stay
 * file-managed through cordis.patch.yml; schema resolution preserves unknown
 * keys, so the patch's full config block still reaches `apply()` untouched.
 *
 * Defaults here stay in sync with `PLAIN_DEFAULTS` (types.ts) and the bundle
 * defaults in cordis.patch.yml — they are the base layer the settings form's
 * "reset to default" falls back to when neither the patch nor the user
 * profile carries a value.
 *
 * Vendored runtime: this import resolves to third_party/schemastery (the
 * host's own library version) at bundle time; the host provides no
 * `@deepseek-ai/*` modules to plugins.
 */
import z from "@deepseek-ai/schemastery";
import { PLAIN_DEFAULTS } from "./types.ts";

export const Config = z.object({
  /** Newest completed user turns kept on the native model surface. */
  freshTurnCount: z.number().step(1).min(1).default(PLAIN_DEFAULTS.freshTurnCount).volatile(),
  /** Completed turns between two maintenance ticks (graph + retention GC). */
  maintenanceInterval: z.number().step(1).min(1).default(PLAIN_DEFAULTS.compactTurnCount).volatile(),
  /** Query-matched memory nodes returned by one recall. */
  recallMaxNodes: z.number().step(1).min(1).default(PLAIN_DEFAULTS.recallMaxNodes).volatile(),
  /**
   * Cosine floor for automatic prompt injection. No schema default on
   * purpose: unset stays unset so the environment fallback
   * (KYLIN_MEMORY_SEMANTIC_SCORE_THRESHOLD) keeps working, and the form's
   * blank state reads as "use the documented default".
   */
  semanticScoreThreshold: z.number().min(-1).max(1).volatile(),
});
